FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SPACE_ID
ARG NEXT_PUBLIC_ACCESS_TOKEN
RUN if [ -n "$NEXT_PUBLIC_SPACE_ID" ]; then printf 'NEXT_PUBLIC_SPACE_ID=%s\n' "$NEXT_PUBLIC_SPACE_ID" >> .env.production; fi \
 && if [ -n "$NEXT_PUBLIC_ACCESS_TOKEN" ]; then printf 'NEXT_PUBLIC_ACCESS_TOKEN=%s\n' "$NEXT_PUBLIC_ACCESS_TOKEN" >> .env.production; fi \
 && yarn build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/next-i18next.config.js ./next-i18next.config.js
# Writable by the app user: incremental static regeneration writes cache files under .next.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
