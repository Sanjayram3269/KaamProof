import hashlib,secrets
from datetime import datetime,timedelta,timezone
from pathlib import Path
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from fastapi import HTTPException
from app.config import settings
from app.models import Job,Agreement,CustomerLink,JobEvent
def digest_token(token:str)->str:return hashlib.sha256(token.encode()).hexdigest()
def create_customer_link(db,job:Job)->str:
 raw=secrets.token_urlsafe(32)
 db.add(CustomerLink(job_id=job.id,token_hash=digest_token(raw),expires_at=datetime.now(timezone.utc)+timedelta(days=settings.customer_link_days)))
 return raw
def get_customer_job(db,raw_token:str):
 link=db.query(CustomerLink).filter_by(token_hash=digest_token(raw_token),revoked_at=None).first()
 if not link:raise HTTPException(404,"Customer link invalid or expired")
 exp=link.expires_at
 if exp.tzinfo is None:exp=exp.replace(tzinfo=timezone.utc)
 if exp<datetime.now(timezone.utc):raise HTTPException(404,"Customer link invalid or expired")
 job=db.get(Job,link.job_id)
 if not job:raise HTTPException(404,"Job not found")
 return job
def add_event(db,job_id,actor_type,actor_id,event_type,message,metadata_json=None):
 db.add(JobEvent(job_id=job_id,actor_type=actor_type,actor_id=actor_id,event_type=event_type,message=message,metadata_json=metadata_json))
def store_upload(content:bytes,job_id:str,filename:str)->str:
 folder=Path(settings.upload_dir)/job_id;folder.mkdir(parents=True,exist_ok=True)
 key=secrets.token_hex(16)+Path(filename).suffix.lower()
 (folder/key).write_bytes(content)
 return str(folder/key)
def make_pdf(job:Job,agreement:Agreement|None,events:list[JobEvent])->bytes:
 out=BytesIO();pdf=canvas.Canvas(out,pagesize=A4);_,height=A4;y=height-54
 pdf.setTitle(f"KaamProof Job Record - {job.id}")
 pdf.setFont("Helvetica-Bold",17);pdf.drawString(48,y,"KaamProof — Job Record");y-=32;pdf.setFont("Helvetica",9)
 lines=[f"Job ID: {job.id}",f"Title: {job.title}",f"Category: {job.category}",f"Customer: {job.customer_name}",f"Status: {job.status}"]
 if agreement:lines += [f"Agreement version: {agreement.version}",f"Scope: {agreement.scope}",f"Exclusions: {agreement.exclusions or 'None recorded'}",f"Labour INR: {agreement.labour_amount}",f"Materials INR: {agreement.materials_amount}",f"Total INR: {agreement.total_amount}"]
 lines += ["","Activity history:"]+[f"{e.created_at}: {e.event_type} — {e.message}" for e in events]+["","Participant-entered information; not independent identity verification or work-quality certification."]
 for line in lines:
  for chunk in [line[i:i+100] for i in range(0,len(line),100)]:
   if y<55:pdf.showPage();y=height-55;pdf.setFont("Helvetica",9)
   pdf.drawString(48,y,chunk);y-=14
 pdf.save();return out.getvalue()
