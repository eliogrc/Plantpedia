import { FormEvent, useState } from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getServerSession } from 'next-auth/next'
import { signIn } from 'next-auth/react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import { Alert } from '@ui/Alert'
import { Button } from '@ui/Button'
import { Typography } from '@ui/Typography'
import { authOptions } from 'pages/api/auth/[...nextauth]'

function getSafeCallbackUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '/'
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    return raw
  }
  try {
    const parsed = new URL(raw)
    if (
      typeof window !== 'undefined' &&
      parsed.origin === window.location.origin
    ) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    // ignore malformed URLs
  }
  return '/'
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  context.res.setHeader(
    'Cache-Control',
    'private, no-cache, no-store, max-age=0, must-revalidate'
  )

  const session = await getServerSession(context.req, context.res, authOptions)
  if (session) {
    const localePrefix =
      context.locale && context.locale !== context.defaultLocale
        ? `/${context.locale}`
        : ''
    return {
      redirect: {
        destination: localePrefix || '/',
        permanent: false,
      },
    }
  }

  const i18n = await serverSideTranslations(context.locale!, [
    'common',
    'page-signin',
  ])

  return {
    props: {
      ...i18n,
    },
  }
}

export default function SignInPage() {
  const router = useRouter()
  const { t } = useTranslation(['page-signin'])
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const callbackUrl = getSafeCallbackUrl(router.query.callbackUrl)
  const queryError =
    typeof router.query.error === 'string' ? router.query.error : null

  const displayedError =
    errorMessage ||
    (queryError === 'CredentialsSignin'
      ? t('invalidCredentials')
      : queryError
      ? t('authError')
      : null)

  const handleCredentialsSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!password.trim() || submitting) return

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const result = await signIn('credentials', {
        password,
        callbackUrl,
        redirect: false,
      })

      if (result?.ok) {
        const hasLocalePrefix = (router.locales || []).some(
          (loc) =>
            callbackUrl === `/${loc}` || callbackUrl.startsWith(`/${loc}/`)
        )
        await router.push(
          callbackUrl,
          undefined,
          hasLocalePrefix ? { locale: false } : undefined
        )
      } else {
        setErrorMessage(t('invalidCredentials'))
        setSubmitting(false)
      }
    } catch {
      setErrorMessage(t('authError'))
      setSubmitting(false)
    }
  }

  return (
    <>
      <Head>
        <title>{`${t('title')} | Plantpedia`}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="text-center mb-6">
            <Link
              href="/"
              prefetch={false}
              className="inline-block no-underline text-gray-900"
            >
              <Typography variant="h4" component="h1">
                🌿 Plantpedia
              </Typography>
            </Link>
            <Typography variant="body2" color="textSecondary" className="mt-2">
              {t('subtitle')}
            </Typography>
          </div>

          {displayedError ? (
            <div className="mb-5">
              <Alert severity="error">{displayedError}</Alert>
            </div>
          ) : null}

          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="plantpedia-password"
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
                {t('passwordLabel')}
              </label>
              <input
                id="plantpedia-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-gray-800"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-medium transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting ? t('signingIn') : t('signInWithPlantpedia')}
            </button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-gray-200" />
            <span className="px-3 text-sm text-gray-500">{t('or')}</span>
            <div className="flex-grow border-t border-gray-200" />
          </div>

          <button
            type="button"
            onClick={() => signIn('github', { callbackUrl })}
            className="w-full py-2.5 px-4 rounded-lg bg-gray-900 hover:bg-black text-white font-medium flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="w-5 h-5 mr-2 fill-current"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            {t('signInWithGitHub')}
          </button>

          <div className="mt-6 pt-5 border-t border-gray-200 text-center">
            <Link href="/" prefetch={false} className="no-underline">
              <Button variant="text" color="primary" component="span">
                ← {t('backHome')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
