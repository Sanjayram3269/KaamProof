from datetime import datetime,timezone
from pathlib import Path
from fastapi import FastAPI,Depends,HTTPException,UploadFile,File,Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from PIL import Image
from io import BytesIO
from app.config import settings
from app.db import get_db
from app.models import User,Job,Agreement,Approval,JobEvent,Evidence,CompletionDecision,PaymentEntry,CustomerLink
from app.schemas import RegisterIn,LoginIn,UserOut,TokenOut,JobCreate,AgreementCreate,DecisionIn,EventIn,CompletionIn,CompletionDecisionIn,PaymentIn
from app.security import hash_password,verify_password,create_access_token,get_current_user
from app.services import create_customer_link,get_customer_job,add_event,make_pdf,store_upload
app=FastAPI(title="KaamProof API",version="0.1.0")
app.add_middleware(CORSMiddleware,allow_origins=settings.cors_list,allow_credentials=True,allow_methods=["GET","POST","OPTIONS"],allow_headers=["Authorization","Content-Type"])
@app.get("/health")
def health():return {"status":"ok","service":"kaamproof-api"}
def owned_job(db,job_id,user):
 job=db.query(Job).filter(Job.id==job_id,Job.worker_id==user.id).first()
 if not job:raise HTTPException(404,"Job not found")
 return job
def latest_agreement(db,job_id):return db.query(Agreement).filter_by(job_id=job_id).order_by(desc(Agreement.version)).first()
@app.post("/api/v1/auth/register",response_model=TokenOut)
def register(data:RegisterIn,db:Session=Depends(get_db)):
 email=data.email.lower()
 if db.query(User).filter_by(email=email).first():raise HTTPException(409,"Email already registered")
 if data.language not in {"en","hi","ta","kn"}:raise HTTPException(422,"Unsupported language")
 user=User(name=data.name,email=email,phone=data.phone,password_hash=hash_password(data.password),language=data.language)
 db.add(user);db.commit();db.refresh(user)
 return {"access_token":create_access_token(user.id),"user":user}
@app.post("/api/v1/auth/login",response_model=TokenOut)
def login(data:LoginIn,db:Session=Depends(get_db)):
 user=db.query(User).filter_by(email=data.email.lower()).first()
 if not user or not verify_password(data.password,user.password_hash):raise HTTPException(401,"Invalid email or password")
 return {"access_token":create_access_token(user.id),"user":user}
@app.get("/api/v1/auth/me",response_model=UserOut)
def me(user:User=Depends(get_current_user)):return user
@app.get("/api/v1/dashboard")
def dashboard(db:Session=Depends(get_db),user:User=Depends(get_current_user)):
 jobs=db.query(Job).filter_by(worker_id=user.id).all();counts={}
 for j in jobs:counts[j.status]=counts.get(j.status,0)+1
 recent=sorted(jobs,key=lambda x:x.created_at,reverse=True)[:6]
 return {"total_jobs":len(jobs),"by_status":counts,"recent_jobs":[{"id":j.id,"title":j.title,"customer_name":j.customer_name,"category":j.category,"status":j.status,"created_at":j.created_at} for j in recent]}
@app.get("/api/v1/jobs")
def list_jobs(db:Session=Depends(get_db),user:User=Depends(get_current_user)):return db.query(Job).filter_by(worker_id=user.id).order_by(desc(Job.created_at)).all()
@app.post("/api/v1/jobs")
def create_job(data:JobCreate,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
 job=Job(worker_id=user.id,customer_name=data.customer_name,customer_phone=data.customer_phone,title=data.title,description=data.description,category=data.category,location_label=data.location_label,status="awaiting_customer")
 db.add(job);db.flush()
 agreement=Agreement(job_id=job.id,version=1,scope=data.scope,exclusions=data.exclusions,labour_amount=data.labour_amount,materials_amount=data.materials_amount,total_amount=data.labour_amount+data.materials_amount,valid_until=data.valid_until)
 db.add(agreement);db.flush();token=create_customer_link(db,job);add_event(db,job.id,"worker",user.id,"job_created","Job and agreement version 1 created")
 db.commit();db.refresh(job);db.refresh(agreement)
 return {"job":job,"agreement":agreement,"customer_url":f"{settings.web_origin.rstrip('/')}/customer/{token}"}
@app.get("/api/v1/jobs/{job_id}")
def get_job(job_id:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
 job=owned_job(db,job_id,user)
 return {"job":job,"agreements":db.query(Agreement).filter_by(job_id=job.id).order_by(Agreement.version).all(),"events":db.query(JobEvent).filter_by(job_id=job.id).order_by(JobEvent.created_at).all(),"evidence":db.query(Evidence).filter_by(job_id=job.id).order_by(Evidence.created_at).all(),"approvals":db.query(Approval).filter_by(job_id=job.id).order_by(Approval.decided_at).all(),"completion_decisions":db.query(CompletionDecision).filter_by(job_id=job.id).all(),"payments":db.query(PaymentEntry).filter_by(job_id=job.id).all()}
@app.post("/api/v1/jobs/{job_id}/agreements")
def new_agreement(job_id:str,data:AgreementCreate,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
 job=owned_job(db,job_id,user)
 if job.status in {"completed","cancelled"}:raise HTTPException(409,"Closed jobs cannot be amended")
 latest=latest_agreement(db,job.id);version=(latest.version if latest else 0)+1
 agreement=Agreement(job_id=job.id,version=version,scope=data.scope,exclusions=data.exclusions,labour_amount=data.labour_amount,materials_amount=data.materials_amount,total_amount=data.labour_amount+data.materials_amount,valid_until=data.valid_until)
 db.add(agreement);job.status="awaiting_customer";add_event(db,job.id,"worker",user.id,"agreement_created",f"Agreement version {version} created; customer review required")
 db.commit();db.refresh(agreement);return agreement
@app.post("/api/v1/jobs/{job_id}/customer-link")
def rotate_link(job_id:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
 job=owned_job(db,job_id,user)
 for old in db.query(CustomerLink).filter_by(job_id=job.id,revoked_at=None).all():old.revoked_at=datetime.now(timezone.utc)
 token=create_customer_link(db,job);db.commit()
 return {"customer_url":f"{settings.web_origin.rstrip('/')}/customer/{token}"}
@app.get("/api/v1/customer/{token}")
def customer_view(token:str,db:Session=Depends(get_db)):
 job=get_customer_job(db,token);a=latest_agreement(db,job.id)
 events=db.query(JobEvent).filter_by(job_id=job.id).order_by(JobEvent.created_at).all()
 approvals=db.query(Approval).filter_by(job_id=job.id).order_by(desc(Approval.decided_at)).all()
 return {"job":{"id":job.id,"title":job.title,"description":job.description,"category":job.category,"customer_name":job.customer_name,"status":job.status},"agreement":{"id":a.id,"version":a.version,"scope":a.scope,"exclusions":a.exclusions,"labour_amount":str(a.labour_amount),"materials_amount":str(a.materials_amount),"total_amount":str(a.total_amount),"valid_until":a.valid_until} if a else None,"approvals":[{"decision":x.decision,"agreement_version":db.get(Agreement,x.agreement_id).version,"note":x.note,"decided_at":x.decided_at} for x in approvals],"events":[{"event_type":x.event_type,"message":x.message,"created_at":x.created_at} for x in events]}
@app.post("/api/v1/customer/{token}/decision")
def customer_decision(token:str,data:DecisionIn,db:Session=Depends(get_db)):
 job=get_customer_job(db,token);a=latest_agreement(db,job.id)
 if not a or a.version!=data.agreement_version:raise HTTPException(409,"Agreement changed; refresh before deciding")
 if db.query(Approval).filter_by(agreement_id=a.id).first():raise HTTPException(409,"A decision already exists for this version")
 db.add(Approval(job_id=job.id,agreement_id=a.id,decision=data.decision,note=data.note))
 job.status="confirmed" if data.decision=="approve" else "rejected"
 add_event(db,job.id,"customer",None,f"agreement_{data.decision}",f"Customer {data.decision}d agreement version {a.version}")
 db.commit();return {"status":job.status,"decision":data.decision}
@app.post("/api/v1/jobs/{job_id}/events")
def add_job_event(job_id:str,data:EventIn,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
 job=owned_job(db,job_id,user)
 if data.event_type=="work_started" and job.status!="confirmed":raise HTTPException(409,"Customer must approve the agreement first")
 event=JobEvent(job_id=job.id,actor_type="worker",actor_id=user.id,event_type=data.event_type,message=data.message);db.add(event)
 if data.event_type=="work_started":job.status="in_progress"
 db.commit();db.refresh(event);return event
@app.post("/api/v1/jobs/{job_id}/evidence")
async def upload_evidence(job_id:str,file:UploadFile=File(...),caption:str=Form(""),db:Session=Depends(get_db),user:User=Depends(get_current_user)):
 job=owned_job(db,job_id,user)
 if file.content_type not in {"image/jpeg","image/png","image/webp"}:raise HTTPException(415,"Only JPEG, PNG and WebP images are accepted")
 content=await file.read(settings.max_upload_mb*1024*1024+1)
 if len(content)>settings.max_upload_mb*1024*1024:raise HTTPException(413,"File too large")
 try:
  image=Image.open(BytesIO(content));image.verify()
  if image.format not in {"JPEG","PNG","WEBP"}:raise ValueError()
 except Exception:raise HTTPException(415,"Invalid image content")
 filename=Path(file.filename or "evidence").name[:255];key=store_upload(content,job.id,filename)
 rec=Evidence(job_id=job.id,uploader_id=user.id,storage_key=key,original_name=filename,content_type=file.content_type,size_bytes=len(content),caption=caption[:500])
 db.add(rec);add_event(db,job.id,"worker",user.id,"evidence_added",caption or "Evidence image uploaded");db.commit();db.refresh(rec)
 return {"id":rec.id,"original_name":rec.original_name,"content_type":rec.content_type,"size_bytes":rec.size_bytes,"caption":rec.caption,"created_at":rec.created_at}
@app.post("/api/v1/jobs/{job_id}/completion")
def submit_completion(job_id:str,data:CompletionIn,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
 job=owned_job(db,job_id,user)
 if job.status!="in_progress":raise HTTPException(409,"Only in-progress jobs can be submitted")
 job.status="completion_submitted";add_event(db,job.id,"worker",user.id,"completion_submitted",data.note or "Worker submitted completion");db.commit();return {"status":job.status}
@app.post("/api/v1/customer/{token}/completion-decision")
def completion_decision(token:str,data:CompletionDecisionIn,db:Session=Depends(get_db)):
 job=get_customer_job(db,token)
 if job.status!="completion_submitted":raise HTTPException(409,"Completion has not been submitted")
 if db.query(CompletionDecision).filter_by(job_id=job.id).first():raise HTTPException(409,"Completion decision already recorded")
 db.add(CompletionDecision(job_id=job.id,decision=data.decision,note=data.note))
 job.status="completed" if data.decision=="acknowledge" else "disputed"
 add_event(db,job.id,"customer",None,f"completion_{data.decision}",data.note or f"Customer {data.decision}d completion");db.commit();return {"status":job.status}
@app.post("/api/v1/jobs/{job_id}/payments")
def add_payment(job_id:str,data:PaymentIn,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
 job=owned_job(db,job_id,user);entry=PaymentEntry(job_id=job.id,amount=data.amount,method=data.method,reference=data.reference,note=data.note)
 db.add(entry);add_event(db,job.id,"worker",user.id,"payment_recorded",f"Worker recorded payment of INR {data.amount}; settlement not verified")
 db.commit();db.refresh(entry);return entry
@app.get("/api/v1/jobs/{job_id}/pdf")
def export_pdf(job_id:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
 job=owned_job(db,job_id,user);a=latest_agreement(db,job.id);events=db.query(JobEvent).filter_by(job_id=job.id).order_by(JobEvent.created_at).all()
 pdf=make_pdf(job,a,events)
 return StreamingResponse(iter([pdf]),media_type="application/pdf",headers={"Content-Disposition":f'attachment; filename="kaamproof-{job.id}.pdf"'})
