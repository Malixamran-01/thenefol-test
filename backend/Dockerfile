# Multi-stage build for backend only (skip monorepo workspaces)
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

# Copy backend files only (treat as standalone, not monorepo)
COPY backend/package.json backend/package-lock.json* ./
COPY backend/tsconfig.json ./

# Install dependencies directly (skip workspace resolution)
# Skip Puppeteer Chromium download to speed up build significantly
# This avoids installing all monorepo workspaces
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_CACHE_DIR=/tmp
# Use --ignore-scripts to skip Puppeteer postinstall script
RUN npm install --include=dev --legacy-peer-deps --prefer-offline --no-audit --no-fund --ignore-scripts || \
    (npm install --include=dev --legacy-peer-deps --prefer-offline --no-audit --no-fund && npm cache clean --force)

# Build stage
FROM base AS build

# Copy backend source
COPY backend/src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM base AS production

# Install only production dependencies
RUN npm install --only=production --legacy-peer-deps --prefer-offline --no-audit --no-fund

# Copy built files from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 2000

# Start server
CMD ["npm", "start"]

