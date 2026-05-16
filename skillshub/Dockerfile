# ── Stage 1: Install dependencies ──────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
COPY prisma ./prisma

RUN npm install
RUN npx prisma generate

# ── Stage 2: DB migrations + seed runner ───────────────────────────────────────
FROM node:20-alpine AS migrator
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY tsconfig.json ./

RUN npx prisma generate

CMD ["sh", "-c", "npx prisma db push && npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts"]

# ── Stage 3: Build the Next.js app ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
# Placeholder env vars so next build doesn't fail — real values injected at runtime
ENV DATABASE_URL="postgresql://placeholder:5432/db"
ENV NEXTAUTH_SECRET="build-placeholder"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV OLLAMA_HOST="http://localhost:11434"
ENV OLLAMA_MODEL="llama3.2"

RUN npm run build

# ── Stage 4: Production runner ──────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Pre-create upload directory owned by nextjs so the Docker volume inherits the right permissions
RUN mkdir -p /data/uploads/resumes && chown -R nextjs:nodejs /data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
