FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json tsconfig.json ./

# Install dependencies (use npm install if lock file doesn't exist)
COPY package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source code and public files in a single layer
COPY src/ ./src/
COPY public/ ./public/

# Build the application
RUN npm run build

# Production stage - using a smaller base image
FROM node:20-alpine AS runtime

# Install wget for healthchecks
RUN apk add --no-cache wget

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy built files from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

# Create data directory with proper permissions
RUN mkdir -p /app/data/notes && \
    chown -R nodejs:nodejs /app/data

# Switch to non-root user
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]