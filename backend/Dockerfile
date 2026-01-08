# Multi-stage build for monorepo backend only
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

# Copy root package files (for workspace support)
COPY package.json package-lock.json ./

# Copy backend package files
COPY backend/package.json backend/package-lock.json* ./backend/
COPY backend/tsconfig.json ./backend/

# Install only backend workspace dependencies (skip other workspaces)
# Use --workspace flag to only install backend, not all workspaces
RUN npm ci --workspace=@nefol/backend --include=dev || \
    (cd backend && npm ci --include=dev) && npm cache clean --force

# Build stage
FROM base AS build

# Copy backend source
COPY backend/src ./backend/src

# Build TypeScript (only backend)
WORKDIR /app/backend
RUN npm run build

# Production stage
FROM base AS production

# Copy built files and production dependencies
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules

# Create uploads directory
RUN mkdir -p backend/uploads

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 2000

# Start server
CMD ["npm", "start"]

