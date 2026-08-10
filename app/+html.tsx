import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Web document shell. The inline background is visible before the JavaScript
 * bundle hydrates, so slow networks never leave users staring at a white page.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#120D0D" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #root {
            background: #120D0D;
            min-height: 100%;
            margin: 0;
          }
          body { color: #FFFFFF; }
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
