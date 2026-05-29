import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'ChildcareGPT — Find & afford child care in New York',
  description:
    'ChildcareGPT helps New York families find licensed child care, see what it costs, and check if they qualify for help paying — built on real OCFS provider data and U.S. Department of Labor cost figures.',
  applicationName: 'ChildcareGPT',
  keywords: [
    'child care New York', 'NY daycare', 'licensed child care providers',
    'child care costs', 'CCAP eligibility', 'child care assistance',
    'OCFS providers', 'infant care cost', 'New York childcare', 'find daycare near me',
  ],
  authors: [{ name: 'ChildcareGPT' }],
  openGraph: {
    type: 'website',
    siteName: 'ChildcareGPT',
    title: 'ChildcareGPT — Find & afford child care in New York',
    description:
      'Find licensed New York child care, see what it costs, and check if you qualify for help paying.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChildcareGPT — Find & afford child care in New York',
    description:
      'Find licensed New York child care, see what it costs, and check if you qualify for help paying.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full" style={{ fontFamily: "'DM Sans', sans-serif", background: 'var(--paper-ground)' }}>
        {children}
      </body>
    </html>
  )
}
