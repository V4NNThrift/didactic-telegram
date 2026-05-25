'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  HiOutlineSparkles, 
  HiOutlineChat, 
  HiOutlineLightningBolt,
  HiOutlineShieldCheck,
  HiOutlineDeviceMobile,
  HiOutlineArrowRight,
  HiOutlineCheck,
  HiOutlineChevronDown,
  HiOutlineMenu,
  HiOutlineX,
} from 'react-icons/hi';

const features = [
  {
    icon: HiOutlineChat,
    title: 'AI Chat Premium',
    description: 'Percakapan AI dengan multiple mode - Fast, Smart, Thinking, Creative, dan Focus.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: HiOutlineLightningBolt,
    title: 'AI Tool Hub',
    description: 'Koleksi tools AI lengkap: Summarize, Rewrite, Translate, Grammar Check, dan lainnya.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: HiOutlineDeviceMobile,
    title: 'ML Account Checker',
    description: 'Cek akun Mobile Legends dengan cepat dan akurat. Validasi User ID dan Server.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: HiOutlineShieldCheck,
    title: 'Secure Auth',
    description: 'Login aman dengan OTP Telegram. Enkripsi end-to-end untuk data Anda.',
    color: 'from-emerald-500 to-teal-500',
  },
];

const faqItems = [
  {
    q: 'Bagaimana cara mendaftar?',
    a: 'Klik Register, masukkan Telegram ID Anda, dan verifikasi dengan OTP yang dikirim ke Telegram. Setelah itu, buat username dan password.',
  },
  {
    q: 'Apakah gratis?',
    a: 'Ya! Semua fitur dasar gratis digunakan. Nikmati AI Chat, Tools, dan ML Checker tanpa biaya.',
  },
  {
    q: 'Bagaimana cara mendapatkan Telegram ID?',
    a: 'Buka @userinfobot di Telegram, kirim pesan apapun, dan bot akan mengirimkan Telegram ID Anda.',
  },
  {
    q: 'Apakah data saya aman?',
    a: 'Keamanan adalah prioritas kami. Password di-hash dengan bcrypt, dan semua koneksi terenkripsi.',
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-950/80 backdrop-blur-lg border-b border-dark-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
                <HiOutlineSparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Nexus AI</span>
            </Link>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-dark-300 hover:text-white transition-colors">Features</a>
              <a href="#faq" className="text-dark-300 hover:text-white transition-colors">FAQ</a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/login"
                className="text-dark-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-dark-300 hover:text-white"
            >
              {mobileMenuOpen ? <HiOutlineX className="w-6 h-6" /> : <HiOutlineMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-dark-900 border-b border-dark-800"
          >
            <div className="px-4 py-4 space-y-4">
              <a href="#features" className="block text-dark-300 hover:text-white">Features</a>
              <a href="#faq" className="block text-dark-300 hover:text-white">FAQ</a>
              <hr className="border-dark-800" />
              <Link href="/login" className="block text-dark-300 hover:text-white">Login</Link>
              <Link
                href="/register"
                className="block bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium text-center"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 mesh-bg opacity-50" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-purple/20 rounded-full blur-3xl animate-pulse-slow delay-1000" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
              <span className="text-sm text-primary-400">AI-Powered Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Premium AI Experience
              <span className="block mt-2 gradient-text">Without Complexity</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-dark-300 max-w-2xl mx-auto mb-10">
              Platform AI modern dengan fitur lengkap. Chat AI, Tools produktivitas, 
              dan ML Checker dalam satu tempat.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40"
              >
                Mulai Sekarang
                <HiOutlineArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-dark-800 hover:bg-dark-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-all border border-dark-700"
              >
                Lihat Fitur
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
              {[
                { value: '5+', label: 'AI Modes' },
                { value: '10+', label: 'AI Tools' },
                { value: '24/7', label: 'Available' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-dark-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <HiOutlineChevronDown className="w-6 h-6 text-dark-400" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Fitur Lengkap
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              Semua yang Anda butuhkan dalam satu platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-6 lg:p-8 rounded-2xl bg-dark-800/30 border border-dark-700/50 hover:border-dark-600 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-dark-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Chat Preview */}
      <section className="py-20 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 mesh-bg opacity-30" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                AI Chat dengan
                <span className="block gradient-text">Multiple Modes</span>
              </h2>
              <p className="text-dark-400 mb-8">
                Pilih mode yang sesuai dengan kebutuhan Anda. Dari respon cepat hingga 
                pemikiran mendalam.
              </p>
              
              <div className="space-y-4">
                {[
                  { mode: 'Fast', desc: 'Respon cepat dan ringan', color: 'text-yellow-400' },
                  { mode: 'Smart', desc: 'Keseimbangan kecepatan & kualitas', color: 'text-blue-400' },
                  { mode: 'Thinking', desc: 'Reasoning lebih dalam', color: 'text-purple-400' },
                  { mode: 'Creative', desc: 'Jawaban kreatif dan unik', color: 'text-pink-400' },
                  { mode: 'Focus', desc: 'Singkat dan to the point', color: 'text-emerald-400' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <HiOutlineCheck className={`w-5 h-5 ${item.color}`} />
                    <span className="text-white font-medium">{item.mode}</span>
                    <span className="text-dark-500">—</span>
                    <span className="text-dark-400">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat preview mockup */}
            <div className="relative">
              <div className="rounded-2xl bg-dark-800/50 border border-dark-700 p-4 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-dark-700">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-2 text-sm text-dark-400">AI Chat</span>
                </div>
                
                <div className="space-y-4">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="bg-primary-600 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-[80%]">
                      Jelaskan apa itu Machine Learning?
                    </div>
                  </div>
                  
                  {/* AI message */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center flex-shrink-0">
                      <HiOutlineSparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-dark-700 text-dark-200 px-4 py-3 rounded-2xl rounded-bl-md max-w-[80%]">
                      <p className="text-sm">
                        <strong className="text-white">Machine Learning</strong> adalah cabang dari 
                        AI yang memungkinkan komputer belajar dari data tanpa diprogram secara eksplisit...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative blur */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary-500/20 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 lg:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Pertanyaan Umum
            </h2>
            <p className="text-dark-400">
              Jawaban untuk pertanyaan yang sering diajukan
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <div 
                key={i}
                className="rounded-xl bg-dark-800/50 border border-dark-700/50 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-medium text-white">{item.q}</span>
                  <HiOutlineChevronDown 
                    className={`w-5 h-5 text-dark-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} 
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-dark-400">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-accent-purple/20" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Siap Untuk Memulai?
          </h2>
          <p className="text-dark-300 mb-10 max-w-2xl mx-auto">
            Bergabung dengan ribuan pengguna lainnya dan nikmati pengalaman AI premium.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-dark-900 px-8 py-4 rounded-xl font-semibold hover:bg-dark-100 transition-colors"
          >
            Daftar Sekarang — Gratis
            <HiOutlineArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
                <HiOutlineSparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Nexus AI</span>
            </div>
            
            <p className="text-dark-500 text-sm">
              © 2024 Nexus AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
