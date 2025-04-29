FROM node:16-alpine as builder

WORKDIR /app

# Copy package.json files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm run install-all

# Copy source code
COPY . .

# Build client
RUN npm run build

# Production stage
FROM node:16-alpine

WORKDIR /app

# Copy built assets and server code
COPY --from=builder /app/client/build ./client/build
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create data directory
RUN mkdir -p /app/data/rdf

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "server/index.js"]