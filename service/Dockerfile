FROM oven/bun:1 as base

WORKDIR /app

# Copy package files
COPY package.json tsconfig.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY src ./src
COPY public ./public

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy built files
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./
COPY --from=base /app/public ./public

# Create data directory for filesystem storage
RUN mkdir -p /app/data/notes

EXPOSE 3000

CMD ["bun", "run", "start"]