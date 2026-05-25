import Link from 'next/link';
import { HiOutlineSparkles } from 'react-icons/hi';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-dark-950">
      {/* Background effects */}
      <div className="fixed inset-0 mesh-bg opacity-30 pointer-events-none" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
              <HiOutlineSparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Nexus AI</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-4 text-center">
        <p className="text-dark-500 text-sm">
          © 2024 Nexus AI. Secure authentication powered by Telegram.
        </p>
      </footer>
    </div>
  );
}
