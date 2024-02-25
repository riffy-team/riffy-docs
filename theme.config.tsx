import React from 'react'
import Head from 'next/head'
import type { NextraThemeLayoutProps } from 'nextra'

export default {
  primaryHue: 50,
  useNextSeoProps() {
    return {
      titleTemplate: '%s – Riffy'
    }
  },
  logo: (
    <>
      <img src="/logo.svg" alt="logo" width="20" height="20" />
      <span style={{ marginLeft: '.4em', fontWeight: 800 }}>
        Riffy
      </span>
    </>
  ),
  footer: {
    text: (
      <span>
        MIT {new Date().getFullYear()} ©{' '}
        <a href="" target="_blank">
          Riffy
        </a>
        .
      </span>
    )
  },
  Layout({ children, pageOpts }: NextraThemeLayoutProps) {
    const { title, frontMatter, headings } = pageOpts

    return (
      <div>
        <Head>
          <title>{title}</title>
          <link rel="icon" type="image/x-icon" href="/favicon.ico" />
          <meta name="og:image" content={frontMatter.image} />
        </Head>
        <h1>My Theme</h1>
        Table of Contents:
        <ul>
          {headings.map(heading => (
            <li key={heading.id}>{heading.value}</li>
          ))}
        </ul>
        <div style={{ border: '1px solid' }}>{children}</div>
      </div>
    )
  }
}
