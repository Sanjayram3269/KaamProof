import hashlib
import secrets

from fastapi import Depends, HTTPException, Request, Response
from pwdlib import PasswordHash
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from .config import APP_ORIGIN, PRODUCTION, REFRESH_SECONDS, SESSION_SECONDS
from .db import SessionLocal, database
from .models import AuthSession, RateBucket, User, now

passwords = PasswordHash.recommended()
DUMMY_PASSWORD = passwords.hash("not-an-account-password")


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def fail(status, message):
    raise HTTPException(status, message)


def throttle(key, limit=20, seconds=60):
    # Separate transaction ensures failed attempts count too. Atomic UPSERT across workers.
    window = now() // seconds
    with SessionLocal.begin() as db:
        insert = sqlite_insert if db.bind.dialect.name == "sqlite" else pg_insert
        stmt = insert(RateBucket).values(key=digest(key), window=window, count=1)
        stmt = stmt.on_conflict_do_update(
            index_elements=[RateBucket.key],
            set_={"window": window, "count": RateBucket.count + 1},
            where=RateBucket.window == window,
        )
        db.execute(stmt)
        bucket = db.get(RateBucket, digest(key))
        if bucket.window != window:
            bucket.window, bucket.count = window, 1
        over = bucket.count > limit
    if over:
        raise HTTPException(
            429, "Too many requests. Try again later.", {"Retry-After": str(seconds)}
        )


def auth_limit(request: Request):
    throttle("auth:" + (request.client.host if request.client else "unknown"), 30, 300)


def csrf(request, session):
    supplied = request.headers.get("x-csrf-token", "")
    if not supplied or not secrets.compare_digest(digest(supplied), session.csrf_hash):
        fail(403, "CSRF validation failed. Reload and try again.")


def authenticated(request: Request, db=Depends(database, scope="function")):
    token = request.cookies.get("kp_session", "")
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == digest(token)))
    if not session or session.expires_at <= now():
        fail(401, "Please sign in again")
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        csrf(request, session)
    user = db.get(User, session.user_id)
    if not user:
        fail(401, "Please sign in again")
    request.state.session = session
    return user


def issue_session(db, user, request: Request, response: Response, existing=None):
    access, refresh, xsrf = (secrets.token_urlsafe(32) for _ in range(3))
    if existing:
        result = db.execute(
            delete(AuthSession).where(
                AuthSession.id == existing.id, AuthSession.refresh_hash == existing.refresh_hash
            ),
            execution_options={"synchronize_session": False},
        )
        if result.rowcount != 1:
            fail(401, "Refresh token already used. Please sign in again.")
        db.flush()
    session = AuthSession(
        user_id=user.id,
        token_hash=digest(access),
        refresh_hash=digest(refresh),
        csrf_hash=digest(xsrf),
        expires_at=now() + SESSION_SECONDS,
        refresh_expires_at=now() + REFRESH_SECONDS,
        agent=request.headers.get("user-agent", "")[:250],
    )
    db.add(session)
    for name, value, ttl, http_only in (
        ("kp_session", access, SESSION_SECONDS, True),
        ("kp_refresh", refresh, REFRESH_SECONDS, True),
        ("kp_csrf", xsrf, REFRESH_SECONDS, False),
    ):
        response.set_cookie(
            name,
            value,
            max_age=ttl,
            httponly=http_only,
            secure=PRODUCTION,
            samesite="strict",
            path="/",
        )


def clear_cookies(response):
    for name in ("kp_session", "kp_refresh", "kp_csrf"):
        response.delete_cookie(name, path="/", secure=PRODUCTION, samesite="strict")


def revoke_sessions(db, user_id):
    db.execute(delete(AuthSession).where(AuthSession.user_id == user_id))


def origin_allowed(request):
    origin = request.headers.get("origin")
    return origin is None or origin == APP_ORIGIN
