"""Transactional outbox. Run `python -m app.mail` via a scheduler/worker.

Local transport writes private .eml files, never marks these as externally delivered.
SMTP transport sets delivered_at only after send_message succeeds; exponential retry.
"""

import os
import smtplib
import ssl
from email.message import EmailMessage

from sqlalchemy import select

from .config import DATA_DIR, PRODUCTION
from .db import SessionLocal
from .models import Outbox, now


def deliver():
    host = os.getenv("SMTP_HOST")
    if PRODUCTION and not host:
        raise RuntimeError("Configure SMTP_HOST for production email delivery")
    with SessionLocal.begin() as db:
        rows = db.scalars(
            select(Outbox)
            .where(Outbox.delivered_at.is_(None), Outbox.next_attempt <= now(), Outbox.attempts < 8)
            .with_for_update(skip_locked=True)
            .limit(50)
        ).all()
        for row in rows:
            message = EmailMessage()
            message["From"] = os.getenv("SMTP_FROM", "KaamProof <local@localhost>")
            message["To"], message["Subject"] = row.recipient, row.subject
            message.set_content(row.body)
            row.attempts += 1
            row.next_attempt = now() + min(3600, 30 * 2**row.attempts)
            try:
                if host:
                    with smtplib.SMTP(host, int(os.getenv("SMTP_PORT", "587")), timeout=20) as smtp:
                        smtp.starttls(context=ssl.create_default_context())
                        if os.getenv("SMTP_USER"):
                            smtp.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
                        smtp.send_message(message)
                    row.delivered_at = now()
                    row.body = "[Delivered message content removed]"
                else:
                    target = DATA_DIR / "mail"
                    target.mkdir(exist_ok=True)
                    (target / f"{row.id}.eml").write_bytes(message.as_bytes())
                    # Local preview only; no external delivery claimed.
                    row.next_attempt = now() + 86400
            except (OSError, smtplib.SMTPException):
                # Preserve retry metadata; never log credentials or capability tokens.
                continue


if __name__ == "__main__":
    deliver()
