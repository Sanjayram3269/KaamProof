import uuid
from datetime import datetime,timezone
from sqlalchemy import String,Text,DateTime,ForeignKey,Integer,Numeric,UniqueConstraint
from sqlalchemy.orm import Mapped,mapped_column
from app.db import Base
def uid():return str(uuid.uuid4())
def now():return datetime.now(timezone.utc)
class User(Base):
 __tablename__="users"
 id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
 name:Mapped[str]=mapped_column(String(120))
 email:Mapped[str]=mapped_column(String(255),unique=True,index=True)
 phone:Mapped[str|None]=mapped_column(String(32),nullable=True)
 password_hash:Mapped[str]=mapped_column(String(255))
 language:Mapped[str]=mapped_column(String(8),default="en")
 created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class Job(Base):
 __tablename__="jobs"
 id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
 worker_id:Mapped[str]=mapped_column(ForeignKey("users.id",ondelete="CASCADE"),index=True)
 customer_name:Mapped[str]=mapped_column(String(120))
 customer_phone:Mapped[str|None]=mapped_column(String(32),nullable=True)
 title:Mapped[str]=mapped_column(String(180))
 description:Mapped[str]=mapped_column(Text)
 category:Mapped[str]=mapped_column(String(80))
 location_label:Mapped[str|None]=mapped_column(String(180),nullable=True)
 status:Mapped[str]=mapped_column(String(40),default="draft",index=True)
 created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
 updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)
class Agreement(Base):
 __tablename__="agreements"
 __table_args__=(UniqueConstraint("job_id","version",name="uq_agreement_job_version"),)
 id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
 job_id:Mapped[str]=mapped_column(ForeignKey("jobs.id",ondelete="CASCADE"),index=True)
 version:Mapped[int]=mapped_column(Integer)
 scope:Mapped[str]=mapped_column(Text)
 exclusions:Mapped[str|None]=mapped_column(Text,nullable=True)
 labour_amount:Mapped[float]=mapped_column(Numeric(12,2))
 materials_amount:Mapped[float]=mapped_column(Numeric(12,2))
 total_amount:Mapped[float]=mapped_column(Numeric(12,2))
 currency:Mapped[str]=mapped_column(String(3),default="INR")
 valid_until:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True)
 created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class CustomerLink(Base):
 __tablename__="customer_links"
 id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
 job_id:Mapped[str]=mapped_column(ForeignKey("jobs.id",ondelete="CASCADE"),index=True)
 token_hash:Mapped[str]=mapped_column(String(64),unique=True)
 expires_at:Mapped[datetime]=mapped_column(DateTime(timezone=True))
 revoked_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True)
 created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class Approval(Base):
 __tablename__="approvals"
 id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
 job_id:Mapped[str]=mapped_column(ForeignKey("jobs.id",ondelete="CASCADE"),index=True)
 agreement_id:Mapped[str]=mapped_column(ForeignKey("agreements.id"))
 decision:Mapped[str]=mapped_column(String(20))
 note:Mapped[str|None]=mapped_column(Text,nullable=True)
 decided_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class JobEvent(Base):
 __tablename__="job_events"
 id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
 job_id:Mapped[str]=mapped_column(ForeignKey("jobs.id",ondelete="CASCADE"),index=True)
 actor_type:Mapped[str]=mapped_column(String(20))
 actor_id:Mapped[str|None]=mapped_column(String(36),nullable=True)
 event_type:Mapped[str]=mapped_column(String(60))
 message:Mapped[str]=mapped_column(Text)
 metadata_json:Mapped[str|None]=mapped_column(Text,nullable=True)
 created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class Evidence(Base):
 __tablename__="evidence"
 id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
 job_id:Mapped[str]=mapped_column(ForeignKey("jobs.id",ondelete="CASCADE"),index=True)
 uploader_id:Mapped[str]=mapped_column(ForeignKey("users.id"))
 storage_key:Mapped[str]=mapped_column(String(500))
 original_name:Mapped[str]=mapped_column(String(255))
 content_type:Mapped[str]=mapped_column(String(100))
 size_bytes:Mapped[int]=mapped_column(Integer)
 caption:Mapped[str|None]=mapped_column(String(500),nullable=True)
 created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class CompletionDecision(Base):
 __tablename__="completion_decisions"
 id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
 job_id:Mapped[str]=mapped_column(ForeignKey("jobs.id",ondelete="CASCADE"),index=True)
 decision:Mapped[str]=mapped_column(String(20))
 note:Mapped[str|None]=mapped_column(Text,nullable=True)
 decided_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class PaymentEntry(Base):
 __tablename__="payment_entries"
 id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
 job_id:Mapped[str]=mapped_column(ForeignKey("jobs.id",ondelete="CASCADE"),index=True)
 amount:Mapped[float]=mapped_column(Numeric(12,2))
 method:Mapped[str|None]=mapped_column(String(40),nullable=True)
 reference:Mapped[str|None]=mapped_column(String(120),nullable=True)
 note:Mapped[str|None]=mapped_column(String(500),nullable=True)
 recorded_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
