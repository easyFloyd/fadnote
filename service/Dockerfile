FROM node:20-alpine as base

WORKDIR /app

# Copy package files
COPY package.json tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src
COPY public ./public

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./
COPY --from=base /app/public ./public

# Create data directory for filesystem storage
RUN mkdir -p /app/data/notes

EXPOSE 3000

CMD ["node", "dist/index.js"]