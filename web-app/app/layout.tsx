import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Accessibility Navigator - Enterprise WCAG Compliance',
    template: '%s | Accessibility Navigator'
  },
  description: 'AI-powered WCAG 2.2 compliance scanning that reduces accessibility work by 25-40% while minimizing legal risk. Enterprise-grade scanning with 95% accuracy.',
  keywords: [
    'WCAG compliance',
    'ADA compliance',
    'accessibility testing',
    'accessibility scanner',
    'WCAG 2.2',
    'web accessibility',
    'AI accessibility',
    'enterprise accessibility',
    'accessibility automation'
  ],
  authors: [{ name: 'Accessibility Navigator Team' }],
  creator: 'Accessibility Navigator',
  publisher: 'Accessibility Navigator',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://accessibility-navigator.com',
    siteName: 'Accessibility Navigator',
    title: 'Accessibility Navigator - Enterprise WCAG Compliance',
    description: 'AI-powered WCAG 2.2 compliance scanning for enterprise teams. Reduce accessibility work by 25-40% with 95% accuracy.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Accessibility Navigator - AI-Powered WCAG Compliance'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Accessibility Navigator - Enterprise WCAG Compliance',
    description: 'AI-powered WCAG 2.2 compliance scanning. Reduce accessibility work by 25-40% with 95% accuracy.',
    images: ['/og-image.png']
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Favicon and icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#0ea5e9" />
        
        {/* Apple touch bar icon */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        
        
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="font-sans antialiased bg-white text-secondary-900">
        <Providers>
          <div className="min-h-screen">
            {/* Skip to main content link for accessibility */}
            <a 
              href="#main-content" 
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 z-50"
            >
              Skip to main content
            </a>
            
            {/* Main content wrapper */}
            <div id="main-content">
              {children}
            </div>
            
            {/* Accessibility announcement region */}
            <div 
              aria-live="polite" 
              aria-atomic="true" 
              className="sr-only"
              id="accessibility-announcements"
            />
          </div>
          
          {/* Toast notifications */}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#374151',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Providers>
        
        {/* Scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Theme detection and management
              (function() {
                // Check for saved theme preference or default to light
                const theme = localStorage.getItem('theme') || 'light';
                document.documentElement.classList.toggle('dark', theme === 'dark');
                
                // Listen for system theme changes
                const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                mediaQuery.addListener((e) => {
                  if (!localStorage.getItem('theme')) {
                    document.documentElement.classList.toggle('dark', e.matches);
                  }
                });
              })();
              
              // Error tracking for debugging
              window.addEventListener('error', function(e) {
                console.error('Accessibility Navigator Error:', e.error);
              });
            `
          }}
        />
      </body>
    </html>
  )
}