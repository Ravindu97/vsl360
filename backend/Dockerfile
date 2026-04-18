FROM node:20-slim AS build

# Install Chromium and dependencies for Puppeteer PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Install all dependencies (including devDeps for build)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and Prisma schema
COPY prisma ./prisma/
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Copy Handlebars templates (tsc doesn't handle .hbs files)
RUN mkdir -p dist/templates && cp src/templates/*.hbs dist/templates/

# Prune dev dependencies for production image
RUN npm prune --production

# ------- Production stage -------
FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
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
