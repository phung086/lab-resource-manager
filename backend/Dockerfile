FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npm run db:generate

FROM deps AS dev

WORKDIR /app

COPY src ./src
COPY scripts ./scripts

EXPOSE 8000
CMD ["sh", "-c", "npm run db:migrate && npm run db:seed:admin && npm run dev"]

FROM node:22-alpine AS runner

RUN apk add --no-cache postgresql-client

WORKDIR /app

ENV NODE_ENV=production
RUN mkdir -p /app/data

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:8000/health || exit 1
CMD ["sh", "-c", "npm run db:deploy && npm run start:prod"]
