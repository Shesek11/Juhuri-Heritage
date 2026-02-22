# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (better cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build frontend
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built frontend and server
COPY --from=build /app/dist ./dist
COPY server ./server
COPY migrations ./migrations

# Create uploads directory
RUN mkdir -p uploads/suggestion-audio public/uploads/suggestion-audio

# Non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

ENV NODE_ENV=production
ENV PORT=3002

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3002/api/health || exit 1

CMD ["node", "server/index.js"]
