import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException

from . import auth, jobs, portal
from .body_limit import BodyLimitMiddleware
from .db import SessionLocal
from .security import origin_allowed

app = FastAPI(title="KaamProof", version="1.0.0")
app.add_middleware(BodyLimitMiddleware)


@app.middleware("http")
async def protections(request: Request, call_next):
    request_id = str(uuid.uuid4())
    if request.method not in ("GET", "HEAD", "OPTIONS") and not origin_allowed(request):
        return JSONResponse({"error": {"message": "Origin not allowed"}}, status_code=403)
    length = request.headers.get("content-length", "0")
    if not length.isdigit() or int(length) > 9 * 1024 * 1024:
        return JSONResponse({"error": {"message": "Request too large"}}, status_code=413)
    try:
        response = await call_next(request)
    except Exception:
        logging.exception("Request failed: %s", request_id)
        response = JSONResponse(
            {"error": {"message": "Unexpected server error", "request_id": request_id}},
            status_code=500,
        )
    response.headers.update(
        {
            "X-Request-ID": request_id,
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
            "Cache-Control": "no-store",
            "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        }
    )
    return response


@app.exception_handler(HTTPException)
async def http_error(request, exc):
    return JSONResponse(
        {"error": {"message": exc.detail}}, status_code=exc.status_code, headers=exc.headers
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    fields = [
        {"field": ".".join(str(x) for x in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()
    ]
    return JSONResponse(
        {"error": {"message": "Check the entered values", "fields": fields}}, status_code=422
    )


@app.exception_handler(IntegrityError)
async def conflict(request, exc):
    return JSONResponse(
        {"error": {"message": "Record conflict. Reload and try again."}}, status_code=409
    )


@app.get("/api/v1/health")
def health():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(portal.router)
