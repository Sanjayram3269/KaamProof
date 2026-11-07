import io
import os
import warnings

from PIL import Image, ImageOps, UnidentifiedImageError

from .config import DATA_DIR, MAX_IMAGE_BYTES
from .security import fail

Image.MAX_IMAGE_PIXELS = 16_000_000


def clean_image(raw):
    if len(raw) > MAX_IMAGE_BYTES:
        fail(413, "Image must be 8 MB or smaller")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as image:
                if image.format not in ("JPEG", "PNG", "WEBP"):
                    fail(415, "Use a JPEG, PNG or WebP image")
                image.verify()
            with Image.open(io.BytesIO(raw)) as image:
                image = ImageOps.exif_transpose(image).convert("RGB")
                image.thumbnail((2400, 2400))
                output = io.BytesIO()
                image.save(output, format="JPEG", quality=88)
                return output.getvalue()
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        SyntaxError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ):
        fail(415, "Invalid or unsafe image content")


class PrivateStorage:
    def __init__(self):
        self.bucket = os.getenv("S3_BUCKET")
        if self.bucket:
            import boto3

            self.s3 = boto3.client("s3", endpoint_url=os.getenv("S3_ENDPOINT_URL") or None)
        self.root = DATA_DIR / "evidence"
        self.root.mkdir(exist_ok=True)

    def put(self, key, data):
        if self.bucket:
            self.s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=data,
                ContentType="image/jpeg",
                ServerSideEncryption="AES256",
            )
        else:
            (self.root / key).write_bytes(data)

    def get(self, key):
        if self.bucket:
            return self.s3.get_object(Bucket=self.bucket, Key=key)["Body"].read()
        return (self.root / key).read_bytes()

    def delete(self, key):
        if self.bucket:
            self.s3.delete_object(Bucket=self.bucket, Key=key)
        else:
            (self.root / key).unlink(missing_ok=True)


storage = PrivateStorage()
