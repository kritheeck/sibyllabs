# Sibyl Memory Production Server

Production HTTP/SSE wrapper for Sibyl Memory MCP Server.

## Architecture

In production (e.g. Vercel, AWS Lambda, Cloudflare Pages), serverless runtimes cannot run persistent background Python processes or write to local SQLite files across invocations.

This service packages `sibyl-memory-mcp` with an HTTP/REST and SSE gateway that can be deployed with persistent storage to:
- **Railway** (Recommended: 1-click Dockerfile with persistent volume)
- **Render** (Web Service with Disk mounted at `/data`)
- **Fly.io** (App with volume mounted at `/data`)
- **GCP Cloud Run** (Cloud Run with Cloud Storage volume / Persistent Disk)
- **Self-hosted VPS** (Docker compose or systemd)

## Endpoints

- `GET  /health` - Health check and SQLite database verification
- `POST /tools/call` - Standard MCP tool execution (`{ "name": "...", "arguments": { ... } }`)
- `POST /tools/{tool_name}` - Direct REST tool execution (`{ ...args }`)
- `GET  /mcp/sse` - FastMCP Server-Sent Events stream

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Listening port | `8080` |
| `HOST` | Listening host | `0.0.0.0` |
| `SIBYL_MEMORY_DB` | Path to persistent SQLite memory database | `/data/memory.db` |
| `SIBYL_CREDENTIALS` | Path to Sibyl credentials.json | `/data/credentials.json` |
| `SIBYL_API_KEY` | Optional bearer token to authenticate requests | `""` (no auth) |

## Connecting from Next.js (Vercel)

Set these environment variables in your Vercel project settings:

```env
SIBYL_MCP_URL=https://your-sibyl-service.up.railway.app
SIBYL_API_KEY=your_secret_token
```
