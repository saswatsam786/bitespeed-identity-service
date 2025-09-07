# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev dependencies for building)
RUN npm ci --include=dev

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Remove dev dependencies to reduce size
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ===============================================
# Stage 2: Production stage
FROM node:20-alpine AS production

# Install curl for health checks (alpine doesn't have it by default)
RUN apk add --no-cache curl

WORKDIR /app

# Create non-root user with proper group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bitespeed-identity-service -u 1001 -G nodejs

# Copy built application from builder stage
COPY --from=builder --chown=bitespeed-identity-service:nodejs /app/dist ./dist
COPY --from=builder --chown=bitespeed-identity-service:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=bitespeed-identity-service:nodejs /app/package*.json ./

# Copy database migrations (needed at runtime)
COPY --chown=bitespeed-identity-service:nodejs src/database ./src/database

# Set production environment
ENV NODE_ENV=production

# Switch to non-root user
USER bitespeed-identity-service

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]

