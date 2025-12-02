# Base stage
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Development stage
FROM base AS development

WORKDIR /app

# Copy all source files
COPY . .

ENV NODE_ENV=development

EXPOSE 5000

CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder

WORKDIR /app

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && \
    npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 5000

CMD ["npm", "start"]
