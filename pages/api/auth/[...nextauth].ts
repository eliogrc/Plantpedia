import crypto from 'crypto'
import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import Providers from 'next-auth/providers'

const loginAttempts = new Map<string, { count: number; timestamp: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_TRACKED_IPS = 1000

function getClientIp(req?: { headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const cfIp = req?.headers?.['cf-connecting-ip']
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cfIp.trim()
  }
  const xff = req?.headers?.['x-forwarded-for']
  const rawXff = Array.isArray(xff) ? xff[xff.length - 1] : xff
  if (typeof rawXff === 'string' && rawXff.trim()) {
    const parts = rawXff.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length > 0) {
      return parts[parts.length - 1]
    }
  }
  return req?.socket?.remoteAddress || 'unknown'
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  if (loginAttempts.size > MAX_TRACKED_IPS) {
    loginAttempts.forEach((value, key) => {
      if (now - value.timestamp >= WINDOW_MS) {
        loginAttempts.delete(key)
      }
    })
    if (loginAttempts.size > MAX_TRACKED_IPS) {
      const oldestKey = loginAttempts.keys().next().value
      if (oldestKey) loginAttempts.delete(oldestKey)
    }
  }

  const attempts = loginAttempts.get(ip)
  if (!attempts || now - attempts.timestamp >= WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, timestamp: now })
    return false
  }
  if (attempts.count >= MAX_ATTEMPTS) {
    return true
  }
  attempts.count += 1
  return false
}

function timingSafeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest()
  const hashB = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(hashA, hashB) && a.length === b.length
}

const options: NextAuthOptions = {
  theme: 'light',
  debug: process.env.NODE_ENV === 'development',
  session: {
    jwt: true,
    maxAge: 60 * 15, // 15 minutes
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    signingKey: process.env.JWT_SIGNING_PRIVATE_KEY,
    encryption: true,
    encryptionKey: process.env.JWT_ENCRYPTION_KEY,
  },
  providers: [
    Providers.Credentials({
      name: 'Plantpedia',
      credentials: {
        password: {
          type: 'password',
          label: 'Ingresa tu contraseña',
        },
      },
      async authorize(credentials: Record<string, string>, req: any) {
        const expectedPassword = process.env.PLANTPEDIA_PASSWORD
        const providedPassword = credentials?.password
        if (
          typeof expectedPassword !== 'string' ||
          expectedPassword.length === 0 ||
          typeof providedPassword !== 'string' ||
          providedPassword.length === 0
        ) {
          return null
        }

        const clientIp = getClientIp(req)
        if (isRateLimited(clientIp)) {
          return null
        }

        if (timingSafeCompare(providedPassword, expectedPassword)) {
          loginAttempts.delete(clientIp)
          return {
            name: 'Plantpedia user',
            email: 'user@plantpedia.com',
            image: '',
          }
        }

        return null
      },
    }),
    Providers.GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
}

export default NextAuth(options)