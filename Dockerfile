# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Etapa 1: deps -- instala node_modules por separado para cachear esta capa
# mientras solo cambie el código fuente (no package*.json).
# ---------------------------------------------------------------------------
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---------------------------------------------------------------------------
# Etapa 2: builder -- compila Next.js. Las variables `NEXT_PUBLIC_*` deben
# estar presentes EN BUILD TIME (Next.js las inlinea en el bundle del
# navegador, no se pueden inyectar después vía `docker run -e`), por eso se
# reciben como `ARG`/`ENV` aquí en vez de solo en `docker-compose`.
# ---------------------------------------------------------------------------
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BASE_DOMAIN
ARG NEXT_PUBLIC_TENANT_DOMAIN
ARG NEXT_PUBLIC_USE_HTTPS
ARG NEXT_PUBLIC_API_SAME_ORIGIN
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_BASE_DOMAIN=$NEXT_PUBLIC_BASE_DOMAIN \
    NEXT_PUBLIC_TENANT_DOMAIN=$NEXT_PUBLIC_TENANT_DOMAIN \
    NEXT_PUBLIC_USE_HTTPS=$NEXT_PUBLIC_USE_HTTPS \
    NEXT_PUBLIC_API_SAME_ORIGIN=$NEXT_PUBLIC_API_SAME_ORIGIN \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------------------------------------------------------------------------
# Etapa 3: runner -- solo el server standalone + estáticos, sin código
# fuente ni node_modules completos (ver `output: 'standalone'` en
# next.config.ts).
# ---------------------------------------------------------------------------
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Solo para el HEALTHCHECK de abajo: sin un Host que coincida con
# `NEXT_PUBLIC_BASE_DOMAIN`, el middleware multi-tenant (`src/middleware.ts`)
# trata cualquier otro Host (incluido el propio `127.0.0.1:3000` del
# healthcheck) como si fuera el subdominio de un tenant real, y la página
# intenta pedirle su catálogo a un tenant que no existe -- ruidoso en los
# logs aunque no afecte el resultado del healthcheck en sí.
ARG NEXT_PUBLIC_BASE_DOMAIN
ENV HEALTHCHECK_HOST=$NEXT_PUBLIC_BASE_DOMAIN

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/', {headers: {Host: process.env.HEALTHCHECK_HOST || '127.0.0.1:3000'}}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
