'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  HiOutlineUsers,
  HiOutlineChartBar,
  HiOutlineBan,
  HiOutlineChat,
  HiOutlineLightningBolt,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineShieldCheck,
  HiOutlineShieldExclamation,
  HiOutlineCog,
  HiOutlineSpeakerphone,
} from 'react-icons/hi';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn, formatDateTime, formatRelativeTime, formatNumber } from '@/lib/utils';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  totalChats: number;
  totalMessages: number;
  totalLogins: number;
  todayLogins: number;
  aiUsage: number;
}

interface User {
  id: string;
  username: string;
  telegramId: string;
  isAdmin: boolean;
  isBanned: boolean;
  banReason: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  _count: {
    aiChats: number;
    loginLogs: number;
  };
}

interface LoginLog {
  id: string;
  userId: string;
  ipAddress: string | null;
  deviceInfo: string | null;
  status: string;
  createdAt: string;
  user: {
    username: string;
  };
}

type Tab = 'overview' | 'users' | 'logs' | 'broadcast' | 'settings';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'banned'>('all');
  
  // Modals
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState('');
  
  // Broadcast
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const response = await fetch('/api/admin/check');
      const data = await response.json();
      
      if (!data.isAdmin) {
        router.push('/dashboard');
        return;
      }
      
      setIsAdmin(true);
      loadData();
    } catch (error) {
      router.push('/dashboard');
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes, logsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/logs'),
      ]);

      const [statsData, usersData, logsData] = await Promise.all([
        statsRes.json(),
        usersRes.json(),
        logsRes.json(),
      ]);

      if (statsData.stats) setStats(statsData.stats);
      if (usersData.users) setUsers(usersData.users);
      if (logsData.logs) setLogs(logsData.logs);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ban: !selectedUser.isBanned,
          reason: banReason,
        }),
      });

      const data = await response.json();

      if (data.user) {
        setUsers(prev => prev.map(u => u.id === data.user.id ? { ...u, ...data.user } : u));
        toast.success(selectedUser.isBanned ? 'User unbanned' : 'User banned');
      }

      setShowBanModal(false);
      setSelectedUser(null);
      setBanReason('');
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete this user? This action cannot be undone.')) return;

    try {
      await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('User deleted');
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error('Message required');
      return;
    }

    if (!confirm('Send this message to all users?')) return;

    setIsBroadcasting(true);

    try {
      const response = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: broadcastMessage }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Broadcast sent to ${data.sent} users`);
        setBroadcastMessage('');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send broadcast');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.telegramId.includes(searchQuery);
    const matchesFilter = userFilter === 'all' ||
                         (userFilter === 'banned' && user.isBanned) ||
                         (userFilter === 'active' && !user.isBanned);
    return matchesSearch && matchesFilter;
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: HiOutlineChartBar },
    { id: 'users', label: 'Users', icon: HiOutlineUsers },
    { id: 'logs', label: 'Logs', icon: HiOutlineShieldCheck },
    { id: 'broadcast', label: 'Broadcast', icon: HiOutlineSpeakerphone },
  ];

  if (!isAdmin) {
    return (
      <div className="p-4 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Badge variant="danger" className="mb-2">Admin Panel</Badge>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
            Administration
          </h1>
          <p className="text-dark-400">
            Manage users, view statistics, and system settings
          </p>
        </div>
        <Button variant="ghost" onClick={loadData} leftIcon={<HiOutlineRefresh className="w-5 h-5" />}>
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-dark-800 pb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors',
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-dark-400 hover:text-white hover:bg-dark-800'
            )}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Stats cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users', value: stats.totalUsers, icon: HiOutlineUsers, color: 'text-blue-400' },
                  { label: 'Active Today', value: stats.todayLogins, icon: HiOutlineChartBar, color: 'text-emerald-400' },
                  { label: 'Banned Users', value: stats.bannedUsers, icon: HiOutlineBan, color: 'text-red-400' },
                  { label: 'AI Requests', value: formatNumber(stats.aiUsage), icon: HiOutlineLightningBolt, color: 'text-purple-400' },
                ].map((stat, i) => (
                  <Card key={i}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-dark-400 text-sm">{stat.label}</p>
                        <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                      </div>
                      <stat.icon className={cn('w-8 h-8', stat.color)} />
                    </div>
                  </Card>
                ))}
              </div>

              {/* More stats */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardTitle className="flex items-center gap-2 mb-4">
                    <HiOutlineChat className="w-5 h-5" />
                    Chat Stats
                  </CardTitle>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-dark-400">Total Chats</span>
                      <span className="text-white font-medium">{stats.totalChats}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">Total Messages</span>
                      <span className="text-white font-medium">{stats.totalMessages}</span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardTitle className="flex items-center gap-2 mb-4">
                    <HiOutlineShieldCheck className="w-5 h-5" />
                    Login Stats
                  </CardTitle>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-dark-400">Total Logins</span>
                      <span className="text-white font-medium">{stats.totalLogins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">Today</span>
                      <span className="text-white font-medium">{stats.todayLogins}</span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardTitle className="flex items-center gap-2 mb-4">
                    <HiOutlineUsers className="w-5 h-5" />
                    User Stats
                  </CardTitle>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-dark-400">Active Users</span>
                      <span className="text-white font-medium">{stats.activeUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">Banned</span>
                      <span className="text-white font-medium">{stats.bannedUsers}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Recent logins */}
              <Card>
                <CardTitle className="mb-4">Recent Logins</CardTitle>
                <div className="space-y-2">
                  {logs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex items-center justify-between py-2 border-b border-dark-700/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <Avatar name={log.user.username} size="sm" />
                        <div>
                          <p className="text-sm text-white">{log.user.username}</p>
                          <p className="text-xs text-dark-400">{log.ipAddress || 'Unknown IP'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={log.status === 'success' ? 'success' : 'danger'} size="sm">
                          {log.status}
                        </Badge>
                        <p className="text-xs text-dark-500 mt-1">{formatRelativeTime(log.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  {['all', 'active', 'banned'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setUserFilter(filter as any)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
                        userFilter === filter
                          ? 'bg-primary-600 text-white'
                          : 'bg-dark-800 text-dark-300 hover:text-white'
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users list */}
              <Card padding="none">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dark-700">
                        <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">User</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">Telegram ID</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">Status</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">Chats</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">Joined</th>
                        <th className="text-right px-4 py-3 text-sm font-medium text-dark-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="border-b border-dark-700/50 hover:bg-dark-800/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={user.username} size="sm" />
                              <div>
                                <p className="font-medium text-white">{user.username}</p>
                                {user.isAdmin && (
                                  <Badge variant="primary" size="sm">Admin</Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-sm text-dark-300">{user.telegramId}</code>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={user.isBanned ? 'danger' : 'success'}>
                              {user.isBanned ? 'Banned' : 'Active'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-dark-300">
                            {user._count.aiChats}
                          </td>
                          <td className="px-4 py-3 text-sm text-dark-400">
                            {formatRelativeTime(user.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setBanReason(user.banReason || '');
                                  setShowBanModal(true);
                                }}
                              >
                                {user.isBanned ? (
                                  <HiOutlineShieldCheck className="w-4 h-4" />
                                ) : (
                                  <HiOutlineShieldExclamation className="w-4 h-4" />
                                )}
                              </Button>
                              {!user.isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="hover:text-red-400"
                                >
                                  <HiOutlineTrash className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <Card>
              <CardTitle className="mb-4">Login Logs</CardTitle>
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center justify-between py-3 border-b border-dark-700/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        log.status === 'success' ? 'bg-emerald-500/20' :
                        log.status === 'failed' ? 'bg-red-500/20' : 'bg-yellow-500/20'
                      )}>
                        <HiOutlineShieldCheck className={cn(
                          'w-5 h-5',
                          log.status === 'success' ? 'text-emerald-400' :
                          log.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                        )} />
                      </div>
                      <div>
                        <p className="text-white font-medium">{log.user.username}</p>
                        <p className="text-sm text-dark-400">
                          {log.deviceInfo || 'Unknown Device'} • {log.ipAddress || 'Unknown IP'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        log.status === 'success' ? 'success' :
                        log.status === 'failed' ? 'danger' : 'warning'
                      }>
                        {log.status}
                      </Badge>
                      <p className="text-xs text-dark-500 mt-1">{formatDateTime(log.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Broadcast Tab */}
          {activeTab === 'broadcast' && (
            <Card>
              <CardTitle className="flex items-center gap-2 mb-2">
                <HiOutlineSpeakerphone className="w-5 h-5" />
                Broadcast Message
              </CardTitle>
              <CardDescription className="mb-6">
                Send a message to all users via Telegram
              </CardDescription>

              <div className="space-y-4">
                <Textarea
                  label="Message"
                  placeholder="Enter your broadcast message..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={6}
                  hint="HTML formatting supported: <b>bold</b>, <i>italic</i>, <code>code</code>"
                />

                <div className="flex items-center justify-between">
                  <p className="text-sm text-dark-400">
                    Will be sent to {stats?.totalUsers || 0} users
                  </p>
                  <Button
                    onClick={handleBroadcast}
                    isLoading={isBroadcasting}
                    disabled={!broadcastMessage.trim()}
                    leftIcon={<HiOutlineSpeakerphone className="w-5 h-5" />}
                  >
                    Send Broadcast
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Ban Modal */}
      <Modal
        isOpen={showBanModal}
        onClose={() => {
          setShowBanModal(false);
          setSelectedUser(null);
          setBanReason('');
        }}
        title={selectedUser?.isBanned ? 'Unban User' : 'Ban User'}
      >
        <div className="space-y-4">
          <p className="text-dark-300">
            {selectedUser?.isBanned 
              ? `Unban ${selectedUser?.username}?`
              : `Ban ${selectedUser?.username}?`
            }
          </p>
          
          {!selectedUser?.isBanned && (
            <Input
              label="Reason (optional)"
              placeholder="Enter ban reason..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowBanModal(false)}>
              Cancel
            </Button>
            <Button
              variant={selectedUser?.isBanned ? 'primary' : 'danger'}
              onClick={handleBanUser}
            >
              {selectedUser?.isBanned ? 'Unban' : 'Ban User'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
