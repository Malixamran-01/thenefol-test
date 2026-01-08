# Multi-stage build for faster deployments
FROM node:20-slim AS base

# Install only essential Puppeteer dependencies (minimal set)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS build

# Install dev dependencies for build
RUN npm install --include=dev

# Copy source
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM base AS production

# Copy built files
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 2000

# Start server
CMD ["npm", "start"]

