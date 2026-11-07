from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel,EmailStr,Field,ConfigDict
class RegisterIn(BaseModel):
 name:str=Field(min_length=2,max_length=120);email:EmailStr;password:str=Field(min_length=10,max_length=128);phone:str|None=None;language:str="en"
class LoginIn(BaseModel):email:EmailStr;password:str
class UserOut(BaseModel):
 model_config=ConfigDict(from_attributes=True)
 id:str;name:str;email:str;phone:str|None;language:str
class TokenOut(BaseModel):access_token:str;token_type:str="bearer";user:UserOut
class JobCreate(BaseModel):
 customer_name:str=Field(min_length=2,max_length=120);customer_phone:str|None=Field(default=None,max_length=32)
 title:str=Field(min_length=3,max_length=180);description:str=Field(min_length=5,max_length=5000);category:str=Field(min_length=2,max_length=80)
 location_label:str|None=Field(default=None,max_length=180);scope:str=Field(min_length=3,max_length=5000);exclusions:str|None=None
 labour_amount:Decimal=Field(ge=0,max_digits=12,decimal_places=2);materials_amount:Decimal=Field(ge=0,max_digits=12,decimal_places=2);valid_until:datetime|None=None
class AgreementCreate(BaseModel):
 scope:str=Field(min_length=3,max_length=5000);exclusions:str|None=None
 labour_amount:Decimal=Field(ge=0,max_digits=12,decimal_places=2);materials_amount:Decimal=Field(ge=0,max_digits=12,decimal_places=2);valid_until:datetime|None=None
class DecisionIn(BaseModel):decision:str=Field(pattern="^(approve|reject)$");agreement_version:int=Field(ge=1);note:str|None=Field(default=None,max_length=2000)
class EventIn(BaseModel):event_type:str=Field(min_length=2,max_length=60);message:str=Field(min_length=2,max_length=2000)
class CompletionIn(BaseModel):note:str|None=Field(default=None,max_length=2000)
class CompletionDecisionIn(BaseModel):decision:str=Field(pattern="^(acknowledge|dispute)$");note:str|None=Field(default=None,max_length=2000)
class PaymentIn(BaseModel):amount:Decimal=Field(gt=0,max_digits=12,decimal_places=2);method:str|None=None;reference:str|None=None;note:str|None=None
