FROM node:18-slim AS builder
WORKDIR /app

# Copy dependency configs
copy package*.json ./
copy prisma ./prisma/

# Install openssl and dependencies
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm ci

# Copy the rest of the application code
COPY . .

# Generate Prisma Client and build Next.js app
RUN npx prisma generate
RUN npm run build

# Production image
FROM node:18-slim AS runner
WORKDIR /app

# Install openssl in runner stage
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Copy built application and required configuration
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000

# Default command to start Next.js web application
CMD ["npm", "run", "start"]
