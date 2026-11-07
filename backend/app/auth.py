import secrets

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import delete, select

from .config import APP_ORIGIN
from .db import database
from .models import ActionToken, AuthSession, Outbox, User, now
from .schemas import Credentials, DeleteAccount, EmailInput, Profile, Register, Reset
from .security import (
    DUMMY_PASSWORD,
    auth_limit,
    authenticated,
    clear_cookies,
    csrf,
    digest,
    fail,
    issue_session,
    passwords,
    revoke_sessions,
)
from .services import public_user, serialize

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])


@router.post("/register", dependencies=[Depends(auth_limit)], status_code=201)
def register(
    data: Register, request: Request, response: Response, db=Depends(database, scope="function")
):
    if db.scalar(select(User).where(User.email == data.email)):
        fail(409, "This email is already registered")
    user = User(
        email=data.email,
        password=passwords.hash(data.password),
        name=data.name,
        language=data.language,
    )
    db.add(user)
    db.flush()
    issue_session(db, user, request, response)
    return public_user(user)


@router.post("/login", dependencies=[Depends(auth_limit)])
def login(
    data: Credentials, request: Request, response: Response, db=Depends(database, scope="function")
):
    user = db.scalar(select(User).where(User.email == data.email))
    valid = passwords.verify(data.password, user.password if user else DUMMY_PASSWORD)
    if not user or not valid:
        fail(401, "Invalid email or password")
    issue_session(db, user, request, response)
    return public_user(user)


@router.get("/me")
def me(user=Depends(authenticated, scope="function")):
    return public_user(user)


@router.post("/refresh", dependencies=[Depends(auth_limit)])
def refresh(request: Request, response: Response, db=Depends(database, scope="function")):
    session = db.scalar(
        select(AuthSession)
        .where(AuthSession.refresh_hash == digest(request.cookies.get("kp_refresh", "")))
        .with_for_update()
    )
    if not session or session.refresh_expires_at <= now():
        fail(401, "Please sign in again")
    csrf(request, session)
    user = db.get(User, session.user_id)
    issue_session(db, user, request, response, session)
    return public_user(user)


@router.post("/logout")
def logout(
    response: Response,
    request: Request,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    db.delete(request.state.session)
    clear_cookies(response)
    return {"message": "Signed out"}


@router.put("/profile")
def profile(
    data: Profile,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    for field, value in data.model_dump().items():
        setattr(user, field, value)
    return public_user(user)


@router.get("/sessions")
def sessions(
    request: Request,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    rows = db.scalars(select(AuthSession).where(AuthSession.user_id == user.id)).all()
    return [
        {
            **serialize(s, ("token_hash", "refresh_hash", "csrf_hash")),
            "current": s.id == request.state.session.id,
        }
        for s in rows
    ]


@router.delete("/sessions/{session_id}")
def revoke(
    session_id: str,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    db.execute(
        delete(AuthSession).where(AuthSession.id == session_id, AuthSession.user_id == user.id)
    )
    return {"message": "Session revoked"}


@router.post("/forgot-password", dependencies=[Depends(auth_limit)])
def forgot(data: EmailInput, db=Depends(database, scope="function")):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if user:
        queue_action(db, user, "reset", 1800)
    return {"message": "If the account exists, a reset message has been queued"}


def queue_action(db, user, purpose, seconds):
    db.execute(
        delete(ActionToken).where(ActionToken.user_id == user.id, ActionToken.purpose == purpose)
    )
    raw = secrets.token_urlsafe(32)
    db.add(
        ActionToken(
            user_id=user.id, token_hash=digest(raw), purpose=purpose, expires_at=now() + seconds
        )
    )
    route = "reset-password" if purpose == "reset" else "verify-email"
    db.add(
        Outbox(
            user_id=user.id,
            recipient=user.email,
            subject=f"KaamProof {purpose}",
            body=f"Open {APP_ORIGIN}/{route}#{raw}\nExpires in {seconds // 60} minutes.",
        )
    )


@router.post("/reset-password", dependencies=[Depends(auth_limit)])
def reset(data: Reset, response: Response, db=Depends(database, scope="function")):
    token = db.scalar(
        select(ActionToken)
        .where(ActionToken.token_hash == digest(data.token), ActionToken.purpose == "reset")
        .with_for_update()
    )
    if not token or token.expires_at <= now():
        fail(400, "Invalid or expired reset link")
    consumed = db.execute(
        delete(ActionToken).where(ActionToken.id == token.id),
        execution_options={"synchronize_session": False},
    )
    if consumed.rowcount != 1:
        fail(400, "Reset link already used")
    user = db.get(User, token.user_id)
    user.password = passwords.hash(data.password)
    revoke_sessions(db, user.id)
    clear_cookies(response)
    return {"message": "Password changed. Please sign in."}


@router.post("/request-verification", dependencies=[Depends(auth_limit)])
def request_verification(
    user=Depends(authenticated, scope="function"), db=Depends(database, scope="function")
):
    if not user.verified:
        queue_action(db, user, "verify", 86400)
    return {"message": "Verification message queued"}


@router.post("/verify-email", dependencies=[Depends(auth_limit)])
def verify_email(data: dict, db=Depends(database, scope="function")):
    raw = data.get("token", "")
    if not isinstance(raw, str) or len(raw) > 200:
        fail(400, "Invalid verification link")
    token = db.scalar(
        select(ActionToken)
        .where(ActionToken.token_hash == digest(raw), ActionToken.purpose == "verify")
        .with_for_update()
    )
    if not token or token.expires_at <= now():
        fail(400, "Invalid or expired verification link")
    consumed = db.execute(
        delete(ActionToken).where(ActionToken.id == token.id),
        execution_options={"synchronize_session": False},
    )
    if consumed.rowcount != 1:
        fail(400, "Verification link already used")
    db.get(User, token.user_id).verified = True
    return {"message": "Email verified"}


@router.delete("/account")
def delete_account(
    data: DeleteAccount,
    response: Response,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    if not passwords.verify(data.password, user.password):
        fail(401, "Incorrect password")
    # Cascade order: customers have restrictive job references, so remove jobs first.
    from .models import BlobDeletion, Customer, Evidence, Job

    keys = db.scalars(select(Evidence.storage_key).join(Job).where(Job.owner_id == user.id)).all()
    for key in keys:
        if not db.get(BlobDeletion, key):
            db.add(BlobDeletion(storage_key=key))
    db.execute(delete(Job).where(Job.owner_id == user.id))
    db.execute(delete(Customer).where(Customer.owner_id == user.id))
    db.delete(user)
    clear_cookies(response)
    return {"message": "Account and associated records deleted"}
