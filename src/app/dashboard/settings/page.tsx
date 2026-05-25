'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { 
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineBell,
  HiOutlineGlobe,
  HiOutlineShieldCheck,
  HiOutlineTrash,
  HiOutlineInformationCircle,
} from 'react-icons/hi';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    theme: 'dark',
    notifications: true,
    language: 'id',
    twoFactor: false,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('Setting updated');
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Badge variant="primary" className="mb-2">Settings</Badge>
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Settings
        </h1>
        <p className="text-dark-400">
          Customize your experience
        </p>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <Card>
          <CardTitle className="flex items-center gap-2 mb-4">
            <HiOutlineMoon className="w-5 h-5" />
            Appearance
          </CardTitle>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-dark-700/50">
              <div>
                <p className="font-medium text-white">Theme</p>
                <p className="text-sm text-dark-400">Select your preferred theme</p>
              </div>
              <div className="flex gap-2">
                {[
                  { value: 'dark', label: 'Dark', icon: HiOutlineMoon },
                  { value: 'light', label: 'Light', icon: HiOutlineSun },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSettings(prev => ({ ...prev, theme: option.value }))}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                      settings.theme === option.value
                        ? 'bg-primary-600 text-white'
                        : 'bg-dark-700 text-dark-300 hover:text-white'
                    )}
                  >
                    <option.icon className="w-4 h-4" />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <CardTitle className="flex items-center gap-2 mb-4">
            <HiOutlineBell className="w-5 h-5" />
            Notifications
          </CardTitle>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-dark-700/50">
              <div>
                <p className="font-medium text-white">Telegram Notifications</p>
                <p className="text-sm text-dark-400">Receive notifications via Telegram</p>
              </div>
              <button
                onClick={() => handleToggle('notifications')}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  settings.notifications ? 'bg-primary-600' : 'bg-dark-600'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    settings.notifications ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-white">Login Alerts</p>
                <p className="text-sm text-dark-400">Get notified on new login attempts</p>
              </div>
              <Badge variant="success">Always On</Badge>
            </div>
          </div>
        </Card>

        {/* Language */}
        <Card>
          <CardTitle className="flex items-center gap-2 mb-4">
            <HiOutlineGlobe className="w-5 h-5" />
            Language & Region
          </CardTitle>
          
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-white">Language</p>
              <p className="text-sm text-dark-400">Select your preferred language</p>
            </div>
            <select
              value={settings.language}
              onChange={(e) => {
                setSettings(prev => ({ ...prev, language: e.target.value }));
                toast.success('Language updated');
              }}
              className="bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </div>
        </Card>

        {/* Security */}
        <Card>
          <CardTitle className="flex items-center gap-2 mb-4">
            <HiOutlineShieldCheck className="w-5 h-5" />
            Security
          </CardTitle>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-dark-700/50">
              <div>
                <p className="font-medium text-white">Two-Factor Authentication</p>
                <p className="text-sm text-dark-400">Add an extra layer of security</p>
              </div>
              <Badge variant="info">Via Telegram OTP</Badge>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-white">Session Management</p>
                <p className="text-sm text-dark-400">Manage your active sessions</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = '/dashboard/profile'}>
                Manage
              </Button>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-500/30">
          <CardTitle className="flex items-center gap-2 mb-2 text-red-400">
            <HiOutlineTrash className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="mb-4">
            Irreversible actions. Please be careful.
          </CardDescription>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-dark-700/50">
              <div>
                <p className="font-medium text-white">Delete All Data</p>
                <p className="text-sm text-dark-400">Remove all your chats, notes, and history</p>
              </div>
              <Button 
                variant="danger" 
                size="sm"
                onClick={() => toast.error('Contact admin to delete data')}
              >
                Delete Data
              </Button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-white">Delete Account</p>
                <p className="text-sm text-dark-400">Permanently delete your account</p>
              </div>
              <Button 
                variant="danger" 
                size="sm"
                onClick={() => toast.error('Contact admin to delete account')}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </Card>

        {/* About */}
        <Card>
          <CardTitle className="flex items-center gap-2 mb-4">
            <HiOutlineInformationCircle className="w-5 h-5" />
            About
          </CardTitle>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-400">Version</span>
              <span className="text-white">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Platform</span>
              <span className="text-white">Nexus AI</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Built with</span>
              <span className="text-white">Next.js, React, TailwindCSS</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
