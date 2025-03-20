// This file is not used in app router but providing it for compatibility
// with certain deployment environments
import { DocumentProps, Head, Html, Main, NextScript } from 'next/document';
import React from 'react';

export default function Document(props: DocumentProps) {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#000000" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
