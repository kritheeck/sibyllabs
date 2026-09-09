"""Production HTTP/SSE wrapper for Sibyl Memory MCP Server.

Provides:
- Standard FastMCP SSE endpoints (/sse, /messages)
- REST tool call endpoint: POST /tools/call  { "name": "...", "arguments": { ... } }
- Direct tool endpoints:  POST /tools/{tool_name}  { ...args }
- Health check:           GET /health
- Token authorization:    SIBYL_API_KEY (optional bearer token)
"""

import os
import json
import asyncio
from typing import Any
from pathlib import Path
from starlette.applications import Starlette
from starlette.responses import JSONResponse, Response
from starlette.routing import Route, Mount
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
import uvicorn
from sibyl_memory_mcp.server import build_server

mcp = build_server()

API_KEY = os.environ.get("SIBYL_API_KEY", "").strip()

def is_authorized(headers) -> bool:
    if not API_KEY:
        return True
    auth = headers.get("authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:].strip()
        return token == API_KEY
    return False

async def health_check(request):
    db_path = Path(os.environ.get("SIBYL_MEMORY_DB", Path.home() / ".sibyl-memory" / "memory.db"))
    return JSONResponse({
        "ok": True,
        "status": "healthy",
        "service": "sibyl-memory-http",
        "db_path": str(db_path),
        "db_exists": db_path.exists(),
        "auth_enabled": bool(API_KEY),
    })

async def handle_call_tool(request):
    if not is_authorized(request.headers):
        return JSONResponse({"ok": False, "error": "Unauthorized"}, status_code=401)

    try:
        data = await request.json()
    except Exception as e:
        return JSONResponse({"ok": False, "error": f"Invalid JSON body: {e}"}, status_code=400)

    name = data.get("name")
    args = data.get("arguments", {})

    if not name or not isinstance(name, str):
        return JSONResponse({"ok": False, "error": "Tool 'name' is required"}, status_code=400)

    try:
        content_parts, context = await mcp.call_tool(name, args)
        # Parse text content
        result = None
        if content_parts and len(content_parts) > 0:
            first = content_parts[0]
            text = getattr(first, "text", "")
            if text:
                try:
                    result = json.loads(text)
                except Exception:
                    result = text

        return JSONResponse({
            "ok": True,
            "tool": name,
            "result": result if result is not None else context,
        })
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=500)

async def handle_direct_tool(request):
    if not is_authorized(request.headers):
        return JSONResponse({"ok": False, "error": "Unauthorized"}, status_code=401)

    tool_name = request.path_params.get("tool_name")
    try:
        args = await request.json() if request.method == "POST" else {}
    except Exception:
        args = {}

    try:
        content_parts, context = await mcp.call_tool(tool_name, args)
        result = None
        if content_parts and len(content_parts) > 0:
            first = content_parts[0]
            text = getattr(first, "text", "")
            if text:
                try:
                    result = json.loads(text)
                except Exception:
                    result = text

        return JSONResponse({
            "ok": True,
            "tool": tool_name,
            "result": result if result is not None else context,
        })
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=500)

# Build base Starlette routes
routes = [
    Route("/health", health_check, methods=["GET"]),
    Route("/tools/call", handle_call_tool, methods=["POST"]),
    Route("/tools/{tool_name}", handle_direct_tool, methods=["POST"]),
]

# Mount FastMCP SSE app
sse_app = mcp.sse_app()

app = Starlette(
    routes=routes,
    middleware=[
        Middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_methods=["*"],
            allow_headers=["*"],
        )
    ],
)

# Mount the SSE app at root or /sse
app.mount("/mcp", sse_app)

def main():
    port = int(os.environ.get("PORT", "8080"))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"[SibylServer] Starting Sibyl Memory HTTP server on {host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")

if __name__ == "__main__":
    main()
