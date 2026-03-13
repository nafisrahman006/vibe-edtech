# Only for development, not for production
# FROM node:20-alpine3.22
# WORKDIR /app
# COPY package.json ./
# RUN npm install
# COPY analyzer.js ./
# CMD ["node", "analyzer.js"]


# Stage 1: Build
FROM node:20-alpine3.22 AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ─────────────────────────────────────────
# Stage 2: Production Runtime
# ─────────────────────────────────────────
FROM node:20-alpine3.22 AS production

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY analyzer.js ./
COPY package.json ./


CMD ["node", "analyzer.js"]