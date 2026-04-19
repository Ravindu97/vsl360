# syntax=docker/dockerfile:1
# BuildKit cache mounts speed up rebuilds (npm + apt); first build is still slow (downloads).
FROM node:20-slim AS build

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Install all dependencies (including devDeps for build)
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source and Prisma schema
COPY prisma ./prisma/
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma client (downloads engines for each binaryTargets entry — one-time cost per cold build)
RUN --mount=type=cache,target=/root/.npm \
    npx prisma generate

# Build TypeScript
RUN npm run build

# Copy Handlebars templates (tsc doesn't handle .hbs files)
RUN mkdir -p dist/templates && cp src/templates/*.hbs dist/templates/

# Prune dev dependencies for production image
RUN --mount=type=cache,target=/root/.npm \
    npm prune --omit=dev

# ------- Production stage -------
FROM node:20-slim

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production

WORKDIR /app

# Copy built application and production dependencies
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma

# Create uploads directory
RUN mkdir -p /app/uploads/documents

EXPOSE 3000

CMD ["node", "dist/index.js"]
