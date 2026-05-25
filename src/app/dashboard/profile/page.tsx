'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  HiOutlineUser,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
  HiOutlineDeviceMobile,
  HiOutlineClock,
  HiOutlineTrash,
  HiOutlineLogout,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineEye,
  HiOutlineEyeOff,
} from 'react-icons/hi';
import { FaTelegram } from 'react-icons/fa';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn, formatDateTime, formatRelativeTime } from '@/lib/utils';

interface UserProfile {
  id: string;
  username: string;
  telegramId: string;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface Session {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  isActive: boolean;
  createdAt: string;
  expiresAt: string;
}

interface LoginLog {
  id: string;
  ipAddress: string | null;
  deviceInfo: string | null;
  status: string;
  createdAt: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form states
  const [usernameForm, setUsernameForm] = useState({ username: '', isEditing: false, isLoading: false });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrent: false,
    showNew: false,
    isLoading: false,
  });
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: 'Weak' });

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    // Password strength checker
    const password = passwordForm.newPassword;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password)) score++;
    
    const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'];
    setPasswordStrength({ score, label: labels[score] });
  }, [passwordForm.newPassword]);

  const loadProfile = async () => {
    try {
      const [profileRes, sessionsRes, logsRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/profile/sessions'),
        fetch('/api/profile/login-logs'),
      ]);

      const [profileData, sessionsData, logsData] = await Promise.all([
        profileRes.json(),
        sessionsRes.json(),
        logsRes.json(),
      ]);

      if (profileData.user) {
        setUser(profileData.user);
        setUsernameForm(prev => ({ ...prev, username: profileData.user.username }));
      }
      if (sessionsData.sessions) setSessions(sessionsData.sessions);
      if (logsData.logs) setLoginLogs(logsData.logs);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!usernameForm.username.trim()) {
      toast.error('Username required');
      return;
    }

    if (usernameForm.username.length < 3) {
      toast.error('Username min 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(usernameForm.username)) {
      toast.error('Only letters, numbers, and underscore allowed');
      return;
    }

    setUsernameForm(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameForm.username.toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update');
      }

      setUser(prev => prev ? { ...prev, username: data.user.username } : null);
      setUsernameForm(prev => ({ ...prev, isEditing: false }));
      toast.success('Username updated');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUsernameForm(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('All fields required');
      return;
    }

    if (passwordStrength.score < 5) {
      toast.error('Password does not meet requirements');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setPasswordForm(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        showCurrent: false,
        showNew: false,
        isLoading: false,
      });
      toast.success('Password changed successfully');
    } catch (error: any) {
      toast.error(error.message);
      setPasswordForm(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Revoke this session?')) return;

    try {
      await fetch(`/api/profile/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Session revoked');
    } catch (error) {
      toast.error('Failed to revoke session');
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('Revoke all other sessions? You will stay logged in.')) return;

    try {
      await fetch('/api/profile/sessions', { method: 'DELETE' });
      await loadProfile();
      toast.success('All other sessions revoked');
    } catch (error) {
      toast.error('Failed to revoke sessions');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Badge variant="primary" className="mb-2">Profile</Badge>
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Account Settings
        </h1>
        <p className="text-dark-400">
          Manage your account information and security
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Info */}
        <Card>
          <div className="flex items-start gap-4 mb-6">
            <Avatar name={user?.username} size="xl" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white">{user?.username}</h2>
              <p className="text-dark-400">
                {user?.isAdmin ? 'Administrator' : 'Member'}
              </p>
              <p className="text-sm text-dark-500 mt-1">
                Joined {user?.createdAt ? formatDateTime(user.createdAt) : 'N/A'}
              </p>
            </div>
            <Badge variant={user?.isAdmin ? 'primary' : 'default'}>
              {user?.isAdmin ? 'Admin' : 'Member'}
            </Badge>
          </div>

          {/* Username edit */}
          <div className="border-t border-dark-700 pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                  <HiOutlineUser className="w-5 h-5 text-dark-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Username</p>
                  <p className="text-sm text-dark-400">Your unique identifier</p>
                </div>
              </div>
              {!usernameForm.isEditing && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setUsernameForm(prev => ({ ...prev, isEditing: true }))}
                >
                  Edit
                </Button>
              )}
            </div>

            {usernameForm.isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={usernameForm.username}
                  onChange={(e) => setUsernameForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Username"
                  className="flex-1"
                />
                <Button 
                  onClick={handleUpdateUsername} 
                  isLoading={usernameForm.isLoading}
                  size="sm"
                >
                  Save
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setUsernameForm(prev => ({ 
                    ...prev, 
                    isEditing: false, 
                    username: user?.username || '' 
                  }))}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <p className="text-white font-mono bg-dark-700/50 px-3 py-2 rounded-lg">
                {user?.username}
              </p>
            )}
          </div>

          {/* Telegram linked */}
          <div className="border-t border-dark-700 pt-4 mt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0088cc]/20 flex items-center justify-center">
                <FaTelegram className="w-5 h-5 text-[#0088cc]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Telegram Linked</p>
                <p className="text-sm text-dark-400">ID: {user?.telegramId}</p>
              </div>
              <Badge variant="success">Connected</Badge>
            </div>
          </div>
        </Card>

        {/* Change Password */}
        <Card>
          <CardTitle className="flex items-center gap-2 mb-4">
            <HiOutlineLockClosed className="w-5 h-5" />
            Change Password
          </CardTitle>
          
          <div className="space-y-4">
            <div className="relative">
              <Input
                label="Current Password"
                type={passwordForm.showCurrent ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setPasswordForm(prev => ({ ...prev, showCurrent: !prev.showCurrent }))}
                    className="text-dark-400 hover:text-white"
                  >
                    {passwordForm.showCurrent ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                  </button>
                }
              />
            </div>

            <div>
              <Input
                label="New Password"
                type={passwordForm.showNew ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setPasswordForm(prev => ({ ...prev, showNew: !prev.showNew }))}
                    className="text-dark-400 hover:text-white"
                  >
                    {passwordForm.showNew ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                  </button>
                }
              />
              
              {/* Password strength */}
              {passwordForm.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          'h-full transition-all duration-300',
                          passwordStrength.score >= 5 ? 'bg-emerald-500' :
                          passwordStrength.score >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
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
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {[
                      { check: passwordForm.newPassword.length >= 8, label: 'Min 8 characters' },
                      { check: /[a-z]/.test(passwordForm.newPassword), label: 'Lowercase' },
                      { check: /[A-Z]/.test(passwordForm.newPassword), label: 'Uppercase' },
                      { check: /[0-9]/.test(passwordForm.newPassword), label: 'Number' },
                      { check: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(passwordForm.newPassword), label: 'Symbol' },
                    ].map((item, i) => (
                      <span 
                        key={i} 
                        className={cn(
                          'flex items-center gap-1',
                          item.check ? 'text-emerald-400' : 'text-dark-500'
                        )}
                      >
                        {item.check ? <HiOutlineCheck className="w-3 h-3" /> : <HiOutlineX className="w-3 h-3" />}
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Confirm New Password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirm new password"
              error={
                passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword
                  ? 'Passwords do not match'
                  : undefined
              }
            />

            <Button 
              onClick={handleChangePassword}
              isLoading={passwordForm.isLoading}
              disabled={passwordStrength.score < 5 || passwordForm.newPassword !== passwordForm.confirmPassword}
            >
              Update Password
            </Button>
          </div>
        </Card>

        {/* Active Sessions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="flex items-center gap-2">
              <HiOutlineDeviceMobile className="w-5 h-5" />
              Active Sessions
            </CardTitle>
            {sessions.length > 1 && (
              <Button variant="ghost" size="sm" onClick={handleRevokeAllSessions}>
                Revoke All Others
              </Button>
            )}
          </div>
          
          <div className="space-y-3">
            {sessions.map((session, i) => (
              <div 
                key={session.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg',
                  i === 0 ? 'bg-primary-500/10 border border-primary-500/30' : 'bg-dark-700/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    i === 0 ? 'bg-primary-500/20' : 'bg-dark-600'
                  )}>
                    <HiOutlineDeviceMobile className={cn(
                      'w-5 h-5',
                      i === 0 ? 'text-primary-400' : 'text-dark-400'
                    )} />
                  </div>
                  <div>
                    <p className="font-medium text-white flex items-center gap-2">
                      {session.deviceInfo || 'Unknown Device'}
                      {i === 0 && <Badge variant="primary" size="sm">Current</Badge>}
                    </p>
                    <p className="text-sm text-dark-400">
                      {session.ipAddress || 'Unknown IP'} • {formatRelativeTime(session.createdAt)}
                    </p>
                  </div>
                </div>
                {i !== 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleRevokeSession(session.id)}
                  >
                    <HiOutlineLogout className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Login History */}
        <Card>
          <CardTitle className="flex items-center gap-2 mb-4">
            <HiOutlineClock className="w-5 h-5" />
            Login History
          </CardTitle>
          
          <div className="space-y-2">
            {loginLogs.length === 0 ? (
              <p className="text-dark-400 text-center py-4">No login history</p>
            ) : (
              loginLogs.slice(0, 10).map((log) => (
                <div 
                  key={log.id}
                  className="flex items-center justify-between py-2 border-b border-dark-700/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      log.status === 'success' ? 'bg-emerald-500/20' :
                      log.status === 'failed' ? 'bg-red-500/20' : 'bg-yellow-500/20'
                    )}>
                      {log.status === 'success' ? (
                        <HiOutlineCheck className="w-4 h-4 text-emerald-400" />
                      ) : log.status === 'failed' ? (
                        <HiOutlineX className="w-4 h-4 text-red-400" />
                      ) : (
                        <HiOutlineShieldCheck className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-white">
                        {log.deviceInfo || 'Unknown Device'}
                      </p>
                      <p className="text-xs text-dark-400">
                        {log.ipAddress || 'Unknown IP'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={
                        log.status === 'success' ? 'success' :
                        log.status === 'failed' ? 'danger' : 'warning'
                      }
                      size="sm"
                    >
                      {log.status}
                    </Badge>
                    <p className="text-xs text-dark-500 mt-1">
                      {formatRelativeTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
