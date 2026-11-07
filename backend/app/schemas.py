import re
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Credentials(Input):
    email: str = Field(max_length=254)
    password: str = Field(min_length=10, max_length=128)

    @field_validator("email")
    @classmethod
    def email_format(cls, value):
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address")
        return value.lower()


class Register(Credentials):
    name: str = Field(min_length=1, max_length=120)


class Profile(Input):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(max_length=30, default="")
    language: Literal["en", "hi", "ta", "kn"] = "en"
    email_notifications: bool = False


class EmailInput(Input):
    email: str = Field(min_length=3, max_length=254)


class Reset(Input):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=10, max_length=128)


class CustomerInput(Input):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(max_length=30, default="")
    email: str = Field(max_length=254, default="")


class JobInput(Input):
    title: str = Field(min_length=1, max_length=180)
    description: str = Field(max_length=10000, default="")
    category: str = Field(min_length=1, max_length=60, default="General")
    location: str = Field(max_length=250, default="")
    customer_id: str


class JobEdit(Input):
    title: str = Field(min_length=1, max_length=180)
    description: str = Field(max_length=10000, default="")
    category: str = Field(min_length=1, max_length=60, default="General")
    location: str = Field(max_length=250, default="")


Money = Field(ge=0, le=999999999, max_digits=12, decimal_places=2)


class AgreementInput(Input):
    scope: str = Field(min_length=1, max_length=10000)
    exclusions: str = Field(max_length=5000, default="")
    labour: Decimal = Money
    materials: Decimal = Money
    other: Decimal = Money
    tax: Decimal = Money
    currency: Literal["INR", "USD", "EUR", "GBP"] = "INR"
    valid_until: int
    terms: str = Field(max_length=10000, default="")


class LinkInput(Input):
    days: int = Field(default=7, ge=1, le=30)


class Notes(Input):
    notes: str = Field(min_length=1, max_length=5000)


class Decision(Input):
    agreement_id: str
    decision: Literal["approved", "rejected"]
    notes: str = Field(max_length=5000, default="")


class CompletionDecision(Input):
    completion_number: int = Field(ge=1)
    decision: Literal["acknowledged", "disputed"]
    notes: str = Field(max_length=5000, default="")


class PaymentInput(Input):
    amount: Decimal = Field(gt=0, le=999999999, max_digits=12, decimal_places=2)
    method: Literal["cash", "bank", "upi", "card", "other"]
    reference: str = Field(max_length=120, default="")
    paid_at: int
    idempotency_key: str = Field(min_length=10, max_length=100)


class DeleteAccount(Input):
    password: str = Field(max_length=128)
