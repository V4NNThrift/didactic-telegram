import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#020617',
};

export const metadata: Metadata = {
  title: 'Nexus AI - Premium AI Platform',
  description: 'Modern AI tools and chat platform with premium experience',
  keywords: ['AI', 'Chat', 'Tools', 'Premium', 'Modern'],
  authors: [{ name: 'Nexus AI Team' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="min-h-screen bg-dark-950 text-dark-100">
        <Toaster
          position="top-center"
          toastOptions={{
            className: 'bg-dark-800 text-white border border-dark-700',
            duration: 4000,
            style: {
              background: 'rgb(30 41 59)',
              color: '#fff',
              border: '1px solid rgb(51 65 85)',
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
        {children}
      </body>
    </html>
  );
}
