# Dockerfile — Renergizr Backend (Node.js 20)
# Deployment: AWS ECS Fargate
# Build: docker build -t renergizr-api .
# Run:   docker run -p 8001:8001 --env-file .env renergizr-api

FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies first (cached layer unless package.json changes)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src/ ./src/

# Non-root user for security (AWS ECS best practice)
RUN addgroup -S renergizr && adduser -S renergizr -G renergizr
USER renergizr

EXPOSE 8001

# Health check — AWS ALB uses /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8001/health || exit 1

CMD ["node", "src/server.js"]
