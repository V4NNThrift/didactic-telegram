'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  HiOutlineLockClosed, 
  HiOutlineUser, 
  HiOutlineEye, 
  HiOutlineEyeOff,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
} from 'react-icons/hi';
import { FaTelegram } from 'react-icons/fa';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/utils';

type Step = 'telegram' | 'otp' | 'account';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('telegram');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  
  const [formData, setFormData] = useState({
    telegramId: '',
    otp: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    label: string;
    color: string;
    checks: { label: string; passed: boolean }[];
  }>({
    score: 0,
    label: 'Lemah',
    color: 'bg-red-500',
    checks: [],
  });

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Password strength checker
  useEffect(() => {
    const password = formData.password;
    const checks = [
      { label: 'Minimal 8 karakter', passed: password.length >= 8 },
      { label: 'Huruf kecil (a-z)', passed: /[a-z]/.test(password) },
      { label: 'Huruf besar (A-Z)', passed: /[A-Z]/.test(password) },
      { label: 'Angka (0-9)', passed: /[0-9]/.test(password) },
      { label: 'Simbol (!@#$%...)', passed: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password) },
    ];
    
    const score = checks.filter(c => c.passed).length;
    
    let label = 'Lemah';
    let color = 'bg-red-500';
    
    if (score >= 5) {
      label = 'Kuat';
      color = 'bg-emerald-500';
    } else if (score >= 3) {
      label = 'Sedang';
      color = 'bg-yellow-500';
    }
    
    setPasswordStrength({ score, label, color, checks });
  }, [formData.password]);

  // Step 1: Request OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.telegramId.trim()) {
      toast.error('Masukkan Telegram ID');
      return;
    }

    if (!/^\d+$/.test(formData.telegramId)) {
      toast.error('Telegram ID harus berupa angka');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: formData.telegramId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      toast.success('OTP terkirim ke Telegram!');
      setStep('otp');
      setCountdown(60);
      setAttempts(0);
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.otp.length !== 6) {
      toast.error('OTP harus 6 digit');
      return;
    }

    if (attempts >= 5) {
      toast.error('Terlalu banyak percobaan. Minta OTP baru.');
      return;
    }

    setIsLoading(true);
    setAttempts(prev => prev + 1);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          telegramId: formData.telegramId,
          otp: formData.otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OTP tidak valid');
      }

      toast.success('OTP terverifikasi!');
      setStep('account');
    } catch (error: any) {
      toast.error(error.message || 'OTP tidak valid');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Create account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate username
    if (formData.username.length < 3) {
      toast.error('Username minimal 3 karakter');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      toast.error('Username hanya boleh huruf, angka, dan underscore');
      return;
    }

    // Validate password
    if (passwordStrength.score < 5) {
      toast.error('Password harus memenuhi semua kriteria');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Password tidak cocok');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: formData.telegramId,
          otp: formData.otp,
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      toast.success('Registrasi berhasil! Silakan login.');
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: formData.telegramId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend OTP');
      }

      toast.success('OTP baru terkirim!');
      setCountdown(60);
      setAttempts(0);
      setFormData(prev => ({ ...prev, otp: '' }));
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengirim OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-dark-800/50 backdrop-blur-xl border border-dark-700/50 rounded-2xl p-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['telegram', 'otp', 'account'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div 
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step === s 
                    ? 'bg-primary-600 text-white' 
                    : i < ['telegram', 'otp', 'account'].indexOf(step)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-dark-700 text-dark-400'
                )}
              >
                {i < ['telegram', 'otp', 'account'].indexOf(step) ? (
                  <HiOutlineCheck className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && (
                <div className={cn(
                  'w-12 h-0.5 mx-2',
                  i < ['telegram', 'otp', 'account'].indexOf(step)
                    ? 'bg-emerald-600'
                    : 'bg-dark-700'
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Telegram ID */}
        {step === 'telegram' && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#0088cc]/20 flex items-center justify-center">
                <FaTelegram className="w-8 h-8 text-[#0088cc]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Masukkan Telegram ID</h1>
              <p className="text-dark-400 text-sm">
                Pastikan Anda sudah mengirim /start ke bot kami
              </p>
            </div>

            <form onSubmit={handleRequestOTP} className="space-y-5">
              <Input
                label="Telegram ID"
                type="text"
                placeholder="Contoh: 123456789"
                value={formData.telegramId}
                onChange={(e) => setFormData({ ...formData, telegramId: e.target.value })}
                hint="Dapatkan ID Anda di @userinfobot"
                required
              />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
                rightIcon={<HiOutlineArrowRight className="w-5 h-5" />}
              >
                Kirim OTP
              </Button>
            </form>
          </>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Verifikasi OTP</h1>
              <p className="text-dark-400 text-sm">
                Masukkan kode 6 digit yang dikirim ke Telegram
              </p>
            </div>

            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div>
                <Input
                  label="Kode OTP"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  error={attempts >= 5 ? 'Terlalu banyak percobaan' : undefined}
                  required
                />
                <p className="mt-2 text-sm text-dark-400">
                  Sisa percobaan: {Math.max(0, 5 - attempts)}/5
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
                disabled={attempts >= 5}
                rightIcon={<HiOutlineArrowRight className="w-5 h-5" />}
              >
                Verifikasi
              </Button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('telegram')}
                  className="text-sm text-dark-400 hover:text-white flex items-center gap-1"
                >
                  <HiOutlineArrowLeft className="w-4 h-4" />
                  Kembali
                </button>
                
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={countdown > 0}
                  className={cn(
                    'text-sm',
                    countdown > 0 
                      ? 'text-dark-500 cursor-not-allowed' 
                      : 'text-primary-400 hover:text-primary-300'
                  )}
                >
                  {countdown > 0 ? `Kirim ulang (${countdown}s)` : 'Kirim ulang OTP'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Step 3: Create Account */}
        {step === 'account' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Buat Akun</h1>
              <p className="text-dark-400 text-sm">
                Lengkapi data untuk menyelesaikan registrasi
              </p>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-5">
              <Input
                label="Username"
                type="text"
                placeholder="Pilih username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                leftIcon={<HiOutlineUser className="w-5 h-5" />}
                hint="Huruf, angka, dan underscore saja"
                required
              />

              <div>
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Buat password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  leftIcon={<HiOutlineLockClosed className="w-5 h-5" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-dark-400 hover:text-white transition-colors"
                    >
                      {showPassword ? (
                        <HiOutlineEyeOff className="w-5 h-5" />
                      ) : (
                        <HiOutlineEye className="w-5 h-5" />
                      )}
                    </button>
                  }
                  required
                />
                
                {/* Password strength indicator */}
                {formData.password && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                        <div 
                          className={cn('h-full transition-all duration-300', passwordStrength.color)}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className={cn(
                        'text-xs font-medium',
                        passwordStrength.score >= 5 ? 'text-emerald-400' :
                        passwordStrength.score >= 3 ? 'text-yellow-400' : 'text-red-400'
                      )}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1">
                      {passwordStrength.checks.map((check, i) => (
                        <div 
                          key={i}
                          className={cn(
                            'flex items-center gap-1.5 text-xs',
                            check.passed ? 'text-emerald-400' : 'text-dark-500'
                          )}
                        >
                          {check.passed ? (
                            <HiOutlineCheck className="w-3.5 h-3.5" />
                          ) : (
                            <HiOutlineX className="w-3.5 h-3.5" />
                          )}
                          {check.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Input
                label="Konfirmasi Password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Ulangi password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                leftIcon={<HiOutlineLockClosed className="w-5 h-5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-dark-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? (
                      <HiOutlineEyeOff className="w-5 h-5" />
                    ) : (
                      <HiOutlineEye className="w-5 h-5" />
                    )}
                  </button>
                }
                error={
                  formData.confirmPassword && formData.password !== formData.confirmPassword
                    ? 'Password tidak cocok'
                    : undefined
                }
                required
              />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Daftar Sekarang
              </Button>
            </form>
          </>
        )}

        {/* Login link */}
        <div className="mt-6 pt-6 border-t border-dark-700">
          <p className="text-center text-dark-400">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
