FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g turbo@^2.1.3

FROM base AS development
COPY package.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/ai-core/package.json ./packages/ai-core/
RUN npm install
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev", "--workspace=apps/api"]

FROM base AS builder
COPY . .
RUN npm install
RUN npm run build --workspace=apps/api

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database/generated ./packages/database/generated
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/v1/health || exit 1
CMD ["node", "dist/index.js"]
