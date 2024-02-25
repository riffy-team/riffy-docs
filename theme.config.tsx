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
      <img src="https://avatars.githubusercontent.com/u/141020173?s=400&v=4" alt="logo" width="30" height="30" />
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
          A3PIRE
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
          <meta name="og:image" content={frontMatter.image} />
        </Head>
        <h1>My Theme</h1>
        Table of Contents:
        <ul>
          {headings.map(heading => (
            <li key={heading.value}>{heading.value}</li>
          ))}
        </ul>
        <div style={{ border: '1px solid' }}>{children}</div>
      </div>
    )
  }
}
