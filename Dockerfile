# Next.js 10 predates the standalone output, so the runtime image installs only
# production dependencies (devDependencies such as TypeScript, Tailwind, Prettier,
# and GraphQL codegen are excluded from the final image to shrink image size,
# Artifact Registry storage cost, and attack surface).
# Node 24 instead of the 16.x in package.json (no longer patched); webpack 5 in
# Next 10 still hashes with md4, hence the legacy OpenSSL provider.
FROM node:24-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile --ignore-engines --network-timeout 600000

FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-engines --network-timeout 600000
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--openssl-legacy-provider
# Called directly: `yarn build` would refuse to run over the 16.x engines field.
RUN node node_modules/next/dist/bin/next build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--openssl-legacy-provider PORT=8080
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/next.config.js /app/next-i18next.config.js ./
COPY --from=builder /app/public ./public
# Writable by the app user: incremental static regeneration rewrites pages here.
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
USER nextjs
EXPOSE 8080
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "8080"]
