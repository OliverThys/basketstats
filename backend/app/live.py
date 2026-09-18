from fastapi import WebSocket


class LiveGameBroadcaster:
    """Fans out live game updates to connected spectator websockets.

    In-process only: sufficient for a single backend worker, which is what
    docker-compose runs today. If the API is ever scaled to multiple workers,
    swap this for Redis pub/sub (already a project dependency) without
    changing the router/frontend contract.
    """

    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = {}

    async def connect(self, share_token: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(share_token, set()).add(websocket)

    def disconnect(self, share_token: str, websocket: WebSocket) -> None:
        peers = self._connections.get(share_token)
        if not peers:
            return
        peers.discard(websocket)
        if not peers:
            self._connections.pop(share_token, None)

    async def broadcast(self, share_token: str, message: dict) -> None:
        peers = self._connections.get(share_token)
        if not peers:
            return
        stale: list[WebSocket] = []
        for websocket in peers:
            try:
                await websocket.send_json(message)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(share_token, websocket)


broadcaster = LiveGameBroadcaster()
