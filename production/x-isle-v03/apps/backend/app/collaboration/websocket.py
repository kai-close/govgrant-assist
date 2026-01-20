"""
WebSocket Handler - pycrdt-websocket Integration

Sets up WebSocket endpoints for real-time collaboration:
- /ws/{room_id} - Main CRDT sync endpoint
- Awareness protocol for presence/cursors
"""

import asyncio
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query
from pycrdt.websocket import WebsocketServer, ASGIServer
from pycrdt.websocket.websocket import Websocket
import structlog

from app.collaboration.room_manager import RoomManager
from app.auth.jwt import validate_token, CurrentUser


logger = structlog.get_logger()

# Global room manager instance
room_manager = RoomManager()


class XIsleWebsocket(Websocket):
    """
    Custom websocket wrapper for pycrdt-websocket.

    Adds authentication and presence tracking.
    """

    def __init__(self, websocket: WebSocket, user: Optional[CurrentUser] = None):
        self._websocket = websocket
        self.user = user
        self._room_id: Optional[str] = None

    @property
    def path(self) -> str:
        return self._websocket.url.path

    def __aiter__(self):
        return self

    async def __anext__(self) -> bytes:
        try:
            message = await self._websocket.receive_bytes()
            return message
        except WebSocketDisconnect:
            raise StopAsyncIteration

    async def send(self, message: bytes):
        await self._websocket.send_bytes(message)

    async def recv(self) -> bytes:
        return await self._websocket.receive_bytes()


async def setup_collaboration(app: FastAPI):
    """
    Set up collaboration WebSocket endpoints.

    This is called during app startup.
    """
    # Start room manager
    await room_manager.start()

    @app.websocket("/ws/{room_id}")
    async def websocket_endpoint(
        websocket: WebSocket,
        room_id: str,
        token: Optional[str] = Query(None),
    ):
        """
        WebSocket endpoint for CRDT collaboration.

        Connection URL: ws://host/ws/{presentation_id}?token={jwt_token}
        """
        # Validate token
        user: Optional[CurrentUser] = None
        if token:
            user = validate_token(token)

        if not user:
            logger.warning("WebSocket connection rejected: invalid token", room_id=room_id)
            await websocket.close(code=4001, reason="Authentication required")
            return

        # Accept connection
        await websocket.accept()

        logger.info(
            "WebSocket connected",
            room_id=room_id,
            user_id=user.id,
            user_name=user.name,
        )

        try:
            # Join room
            room = await room_manager.join_room(
                room_id=room_id,
                user_id=user.id,
                name=user.name or "Anonymous",
                email=user.email,
                image=user.image,
            )

            # Create wrapped websocket
            ws = XIsleWebsocket(websocket, user)
            ws._room_id = room_id

            # Handle CRDT sync using pycrdt-websocket protocol
            await handle_sync(ws, room)

        except WebSocketDisconnect:
            logger.info(
                "WebSocket disconnected",
                room_id=room_id,
                user_id=user.id,
            )
        except Exception as e:
            logger.error(
                "WebSocket error",
                room_id=room_id,
                user_id=user.id,
                error=str(e),
            )
        finally:
            # Leave room
            await room_manager.leave_room(room_id, user.id)

            # Broadcast user left to other clients
            await broadcast_presence_update(room_id, user.id, "left")


async def handle_sync(ws: XIsleWebsocket, room):
    """
    Handle CRDT sync messages using Yjs protocol.

    Protocol messages:
    - 0: sync step 1 (request)
    - 1: sync step 2 (response)
    - 2: update
    - 3: awareness query
    - 4: awareness update
    """
    # Send initial sync
    # Get current state vector
    state_vector = room.doc.get_state()

    # Send sync step 1 (state vector)
    await ws.send(bytes([0]) + state_vector)

    # Send current users (awareness)
    await send_awareness(ws, room)

    # Handle incoming messages
    async for message in ws:
        if len(message) == 0:
            continue

        msg_type = message[0]
        data = message[1:]

        if msg_type == 0:  # Sync step 1 (client requesting sync)
            # Client sent their state vector, send diff
            diff = room.doc.get_update(data)
            if diff:
                await ws.send(bytes([1]) + diff)

        elif msg_type == 1:  # Sync step 2 (receiving updates)
            # Apply updates from client
            room.doc.apply_update(data)
            # Persist update
            await room.store.write(data)
            # Broadcast to other clients
            await broadcast_update(room.room_id, ws.user.id, data)

        elif msg_type == 2:  # Update
            # Apply update
            room.doc.apply_update(data)
            # Persist
            await room.store.write(data)
            # Broadcast
            await broadcast_update(room.room_id, ws.user.id, data)

        elif msg_type == 3:  # Awareness query
            # Send current awareness state
            await send_awareness(ws, room)

        elif msg_type == 4:  # Awareness update
            # Parse awareness update and update room state
            await handle_awareness_update(room, ws.user.id, data)
            # Broadcast to other clients
            await broadcast_awareness(room.room_id, ws.user.id, data)


async def send_awareness(ws: XIsleWebsocket, room):
    """Send current room awareness state to a client."""
    users = room_manager.get_users(room.room_id)

    # Encode awareness as JSON (simplified for now)
    import json

    awareness_data = {
        "users": [
            {
                "id": u.user_id,
                "name": u.name,
                "email": u.email,
                "image": u.image,
                "color": u.color,
                "cursor": u.cursor,
                "selection": u.selection,
            }
            for u in users
        ]
    }

    # Send as awareness update (type 4)
    await ws.send(bytes([4]) + json.dumps(awareness_data).encode())


async def handle_awareness_update(room, user_id: str, data: bytes):
    """Handle awareness update from a client."""
    import json

    try:
        awareness = json.loads(data.decode())

        if "cursor" in awareness:
            cursor = awareness["cursor"]
            if cursor:
                room_manager.update_cursor(
                    room.room_id,
                    user_id,
                    cursor.get("x", 0),
                    cursor.get("y", 0),
                    cursor.get("slideId", ""),
                )
            else:
                # Clear cursor
                room.users[user_id].cursor = None

        if "selection" in awareness:
            selection = awareness["selection"]
            if selection:
                room_manager.update_selection(
                    room.room_id,
                    user_id,
                    selection.get("slideId", ""),
                    selection.get("cardIds", []),
                )
            else:
                room.users[user_id].selection = None

    except Exception as e:
        logger.error("Failed to parse awareness update", error=str(e))


# Store active connections for broadcasting
_connections: dict[str, dict[str, WebSocket]] = {}  # room_id -> {user_id -> websocket}


async def register_connection(room_id: str, user_id: str, websocket: WebSocket):
    """Register a connection for broadcasting."""
    if room_id not in _connections:
        _connections[room_id] = {}
    _connections[room_id][user_id] = websocket


async def unregister_connection(room_id: str, user_id: str):
    """Unregister a connection."""
    if room_id in _connections and user_id in _connections[room_id]:
        del _connections[room_id][user_id]
        if not _connections[room_id]:
            del _connections[room_id]


async def broadcast_update(room_id: str, sender_id: str, data: bytes):
    """Broadcast a CRDT update to all clients except sender."""
    if room_id not in _connections:
        return

    message = bytes([2]) + data  # Type 2 = update

    for user_id, ws in list(_connections[room_id].items()):
        if user_id != sender_id:
            try:
                await ws.send_bytes(message)
            except Exception:
                pass  # Connection might be closed


async def broadcast_awareness(room_id: str, sender_id: str, data: bytes):
    """Broadcast awareness update to all clients except sender."""
    if room_id not in _connections:
        return

    message = bytes([4]) + data  # Type 4 = awareness

    for user_id, ws in list(_connections[room_id].items()):
        if user_id != sender_id:
            try:
                await ws.send_bytes(message)
            except Exception:
                pass


async def broadcast_presence_update(room_id: str, user_id: str, action: str):
    """Broadcast presence update (user joined/left)."""
    import json

    room = room_manager.get_room(room_id)
    if not room:
        return

    users = room_manager.get_users(room_id)

    awareness_data = {
        "action": action,
        "userId": user_id,
        "users": [
            {
                "id": u.user_id,
                "name": u.name,
                "email": u.email,
                "image": u.image,
                "color": u.color,
            }
            for u in users
        ],
    }

    message = bytes([4]) + json.dumps(awareness_data).encode()

    if room_id in _connections:
        for uid, ws in list(_connections[room_id].items()):
            try:
                await ws.send_bytes(message)
            except Exception:
                pass
