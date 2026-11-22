import { serialize, CookieSerializeOptions } from 'cookie'
import { NextApiHandler, NextApiResponse } from 'next'

// Sadly, getting the locale info in API Routes is not officially supported.
// It should match next.config::i18n
const DEFAULT_LOCALE = 'en-US'
const ALLOWED_LOCALES = new Set(['en-US', 'es'])

// Learn more: https://nextjs.org/docs/advanced-features/i18n-routing#leveraging-the-next_locale-cookie
const PREFERRED_LOCALE_COOKIE = 'NEXT_LOCALE'

const language: NextApiHandler = (request, response): any => {
  if (request.method === 'GET') {
    const cookieLocale = request.cookies[PREFERRED_LOCALE_COOKIE] || ''
    const preferredLocale = ALLOWED_LOCALES.has(cookieLocale) ? cookieLocale : ''

    return response.status(200).json({
      preferredLocale,
      defaultLocale: DEFAULT_LOCALE,
    })
  }

  if (request.method === 'POST') {
    const newPreferredLocale = request.body?.preferredLocale as
      | string
      | undefined

    if (typeof newPreferredLocale !== 'string' || !ALLOWED_LOCALES.has(newPreferredLocale)) {
      return response.status(400).json({ error: 'Invalid locale' })
    }

    setCookie(response, PREFERRED_LOCALE_COOKIE, newPreferredLocale, {
      // Heads-up: the NEXT_LOCALE must be set to the `/` path
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    // 307 (temporary) redirect to homepage
    response.redirect('/')
    return response.end()
  }

  // Not other supported method
  response.status(405).end()
}

function setCookie(
  res: NextApiResponse,
  name: string,
  value: unknown,
  options: CookieSerializeOptions = {}
) {
  const stringValue =
    typeof value === 'object' ? 'j:' + JSON.stringify(value) : String(value)

  if ('maxAge' in options) {
    options.expires = new Date(Date.now() + options.maxAge!)
    options.maxAge! /= 1000
  }

  res.setHeader('Set-Cookie', serialize(name, String(stringValue), options))
}

export default language