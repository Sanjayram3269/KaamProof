from starlette.exceptions import HTTPException


class BodyLimitMiddleware:
    """Bound actual streamed bytes, including requests without Content-Length."""

    def __init__(self, app, limit=9 * 1024 * 1024):
        self.app, self.limit = app, limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        total = 0

        async def bounded_receive():
            nonlocal total
            message = await receive()
            if message["type"] == "http.request":
                total += len(message.get("body", b""))
                if total > self.limit:
                    raise HTTPException(413, "Request too large")
            return message

        await self.app(scope, bounded_receive, send)
