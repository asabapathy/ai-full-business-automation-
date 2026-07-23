FROM node:22-alpine AS base
WORKDIR /app

FROM base AS development
COPY package.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--workspace=apps/web"]

FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm install
RUN npm run build --workspace=apps/web

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "apps/web/server.js"]
