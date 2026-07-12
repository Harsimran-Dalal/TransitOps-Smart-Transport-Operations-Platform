# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json* ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm install --workspaces --include-workspace-root

FROM deps AS build
COPY tsconfig.base.json ./
COPY shared shared
COPY backend backend
RUN npm run build --workspace=@transitops/shared
RUN npm run build --workspace=@transitops/backend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl tini

COPY package.json package-lock.json* ./
COPY shared/package.json shared/
COPY backend/package.json backend/
RUN npm install --omit=dev --workspaces --include-workspace-root

COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/backend/prisma backend/prisma
COPY --from=build /app/node_modules/.prisma node_modules/.prisma
COPY --from=build /app/node_modules/@prisma node_modules/@prisma

EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "cd backend && npx prisma migrate deploy && node dist/server.js"]
