import React from 'react'
import Head from 'next/head'
import { Header } from '@components/Header/Header'
import { Footer } from '@components/Footer'

type LayoutProps = { title?: string; children?: React.ReactNode }

const siteTitle = "Plantpedia"

const FOOTER_OFFSET = 450

export const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  return (
    <>
      <Head>
        <title>{!title ? siteTitle : `${title} | ${siteTitle}`}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <Header />
      <div className="local-container container mx-auto max-w-screen-xl w-95">
        <main className="pt-16">{children}</main>
      </div>
      <Footer className="absolute bottom-0 inset-x-0" />

      {/* Keep the footer at the bottom */}
      <style jsx>{`
        .local-container {
          padding-bottom: ${FOOTER_OFFSET}px;
        }
      `}</style>
      <style jsx global>{`
        #__next {
          min-height: 100vh;
          position: relative;
        }
      `}</style>
    </>
  )
}
