import type { ReactNode } from 'react';
const SITE = 'jA3c3bsLx8AlgD6EL71B';
export const metadata = { title: 'Test SaaS', description: 'Sitevento test SaaS', other: { sitevento: SITE } };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://sitevento12.vercel.app/sitevento.js" data-site={SITE} defer />
        <script dangerouslySetInnerHTML={{ __html: 'window.sitevento=window.sitevento||function(){(window.sitevento.q=window.sitevento.q||[]).push(arguments)};' }} />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0f1115', color: '#e8eaf0' }}>{children}</body>
    </html>
  );
}
