"""Delete queued private blobs after the referencing database transaction commits."""

from sqlalchemy import select

from .db import SessionLocal
from .models import BlobDeletion
from .storage import storage


def cleanup():
    with SessionLocal.begin() as db:
        for row in db.scalars(select(BlobDeletion).with_for_update(skip_locked=True).limit(100)):
            storage.delete(row.storage_key)
            db.delete(row)


if __name__ == "__main__":
    cleanup()
