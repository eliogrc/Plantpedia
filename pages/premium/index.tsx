import { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import { Typography } from '@ui/Typography'
import { Button } from '@ui/Button'
import { Layout } from '@components/Layout'
import { AccessDenied } from '@components/AccessDenied'

import { getServerSession } from 'next-auth/next'
import { useSession } from '@auth/client'
import { authOptions } from 'pages/api/auth/[...nextauth]'

export const getServerSideProps: GetServerSideProps<{}> = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  const i18n = await serverSideTranslations(context.locale!)

  if (session == null) {
    const localePrefix =
      context.locale && context.locale !== context.defaultLocale
        ? `/${context.locale}`
        : ''
    return {
      redirect: {
        destination: `${localePrefix}/auth/signin?callbackUrl=${encodeURIComponent(
          `${localePrefix}/premium`
        )}`,
        permanent: false,
      },
    }
  }

  return {
    props: { session, ...i18n },
  }
}

function PremiumPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const loading = status === 'loading'
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [refetchCounter, refetch] = useState(0)
  const { t } = useTranslation(['page-premium'])

  const hasSession = session != null

  useEffect(() => {
    if (!hasSession) return
    let cancelled = false

    fetch('/api/premium')
      .then((response) => {
        if (response.status === 401) {
          const localePrefix =
            router.locale && router.locale !== router.defaultLocale
              ? `/${router.locale}`
              : ''
          router.replace(
            `${localePrefix}/auth/signin?callbackUrl=${encodeURIComponent(
              `${localePrefix}/premium`
            )}`,
            undefined,
            { locale: false }
          )
          return null
        }
        if (!response.ok) return null
        return response.json()
      })
      .then((payload) => {
        if (!cancelled && payload?.data) {
          setImageUrl(payload.data)
        }
      })
      .catch(() => {
        // ignore transient network errors
      })

    return () => {
      cancelled = true
    }
  }, [refetchCounter, hasSession])

  if (loading) {
    return null
  }

  if (session == null) {
    return <AccessDenied />
  }

  return (
    <Layout title="Premium content">
      <div className="text-center">
        <Typography variant="h2">
          {t('welcome', { name: session.user?.name })}
        </Typography>
        <Typography variant="body2" className="mt-1">
          {t('hereIsYourPremiumContent')}
        </Typography>
        <div className="max-w-lg mx-auto text-center my-8">
          {imageUrl == null ? null : (
            <img
              key={imageUrl}
              src={imageUrl}
              alt="Random fox"
              className="rounded"
            />
          )}
        </div>
        <Button variant="outlined" onClick={() => refetch((c) => ++c)}>
          {t('more')}
        </Button>
      </div>
    </Layout>
  )
}

export default PremiumPage
