# Only for development, not for production
# # Use Node.js 20 as the base image
# FROM node:20-alpine

# # Set the working directory
# WORKDIR /app

# # Copy package.json and package-lock.json
# COPY package*.json ./

# # Install dependencies
# RUN npm install

# # Copy the rest of the application code
# COPY . .

# # Build the frontend (Vite)
# RUN npm run build

# # Expose the port the app runs on
# EXPOSE 3000

# # Start the application
# CMD ["npm", "run", "dev"]

# ─────────────────────────────────────────
# Stage 1: Build Frontend (Vite)
# ─────────────────────────────────────────
FROM node:20-alpine3.22 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─────────────────────────────────────────
# Stage 2: Production Runtime
# ─────────────────────────────────────────
FROM node:20-alpine3.22 AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy backend TypeScript source
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src

# Create non-root user AND fix ownership BEFORE switching user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
  && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]