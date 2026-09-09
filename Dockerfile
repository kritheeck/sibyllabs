# Multi-stage production Dockerfile for MEMORYOS
# Bundles Next.js frontend/runtime + Python Sibyl Memory MCP engine

FROM node:20-bookworm-slim AS runner

# Install Python 3, venv, and SQLite for Sibyl Memory MCP
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Setup dedicated Python virtual environment for Sibyl
RUN python3 -m venv /opt/sibyl-venv
ENV PATH="/opt/sibyl-venv/bin:$PATH"

# Install Sibyl Memory dependencies
COPY sibyl-server/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

WORKDIR /app

# Install Node.js dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy project source
COPY . .

# Build Next.js production bundle
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Runtime configurations
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV SIBYL_MCP_COMMAND="/opt/sibyl-venv/bin/sibyl-memory-mcp"
ENV SIBYL_MEMORY_DB="/data/.sibyl-memory/memory.db"
ENV SIBYL_CREDENTIALS="/data/.sibyl-memory/credentials.json"

# Persistent storage mount point for SQLite & FTS5 database
VOLUME ["/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/memory || exit 1

CMD ["npm", "run", "start"]
