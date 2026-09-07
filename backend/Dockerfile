# Twitter Monitor backend — small self-hosted service (Raspberry Pi / VPS / home server).

FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build


FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Note: we keep the `prisma` devDependency here (not --omit=dev) because
# the container itself runs `prisma migrate deploy` against the mounted
# SQLite volume at startup, below.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci && npm cache clean --force

COPY --from=build /app/dist ./dist

# Persistent volume mount point for the SQLite DB + cached session cookies.
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000

# Apply any pending Prisma migrations, then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
