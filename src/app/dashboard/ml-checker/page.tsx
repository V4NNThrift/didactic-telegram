'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  HiOutlineSearch, 
  HiOutlineClipboardCopy,
  HiOutlineRefresh,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineExclamation,
  HiOutlineTrash,
} from 'react-icons/hi';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn, copyToClipboard, formatRelativeTime } from '@/lib/utils';
import { ML_SERVERS } from '@/lib/ml-checker';

interface CheckResult {
  id: string;
  mlUserId: string;
  mlServerId: string;
  nickname: string | null;
  status: string;
  responseJson: string | null;
  createdAt: string;
}

export default function MLCheckerPage() {
  const [userId, setUserId] = useState('');
  const [serverId, setServerId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [history, setHistory] = useState<CheckResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load history
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/ml-checker/history');
      const data = await response.json();
      if (data.history) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCheck = async () => {
    // Validation
    if (!userId.trim()) {
      toast.error('Masukkan User ID');
      return;
    }
    if (!serverId.trim()) {
      toast.error('Masukkan Server ID');
      return;
    }
    if (!/^\d+$/.test(userId.trim())) {
      toast.error('User ID harus berupa angka');
      return;
    }
    if (!/^\d+$/.test(serverId.trim())) {
      toast.error('Server ID harus berupa angka');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/ml-checker/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId.trim(),
          serverId: serverId.trim(),
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.result) {
        setResult(data.result);
        // Add to history
        setHistory(prev => [data.result, ...prev.slice(0, 9)]);
        
        if (data.result.status === 'success') {
          toast.success('Akun ditemukan!');
        } else {
          toast.error('Akun tidak ditemukan');
        }
      }
    } catch (error) {
      toast.error('Terjadi kesalahan. Coba lagi nanti.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResult = async () => {
    if (!result) return;
    
    const text = result.status === 'success'
      ? `ML Account: ${result.nickname}\nUser ID: ${result.mlUserId}\nServer ID: ${result.mlServerId}`
      : `User ID: ${result.mlUserId}\nServer ID: ${result.mlServerId}\nStatus: Not Found`;
    
    await copyToClipboard(text);
    toast.success('Copied!');
  };

  const handleClear = () => {
    setUserId('');
    setServerId('');
    setResult(null);
  };

  const handleUseFromHistory = (item: CheckResult) => {
    setUserId(item.mlUserId);
    setServerId(item.mlServerId);
    setResult(null);
  };

  const clearHistory = async () => {
    if (!confirm('Hapus semua history?')) return;
    
    try {
      await fetch('/api/ml-checker/history', { method: 'DELETE' });
      setHistory([]);
      toast.success('History cleared');
    } catch (error) {
      toast.error('Failed to clear history');
    }
  };

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <Badge variant="primary" className="mb-2">ML Checker</Badge>
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Mobile Legends Account Checker
        </h1>
        <p className="text-dark-400">
          Verifikasi akun Mobile Legends berdasarkan User ID dan Server ID
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Checker form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardTitle className="mb-4">Check Account</CardTitle>
            
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <Input
                label="User ID"
                placeholder="Contoh: 123456789"
                value={userId}
                onChange={(e) => setUserId(e.target.value.replace(/\D/g, ''))}
                hint="ID akun Mobile Legends (6-12 digit)"
              />
              <Input
                label="Server ID"
                placeholder="Contoh: 9123"
                value={serverId}
                onChange={(e) => setServerId(e.target.value.replace(/\D/g, ''))}
                hint="Server/Zone ID (3-5 digit)"
              />
            </div>

            {/* Server regions info */}
            <div className="mb-6 p-4 bg-dark-900/50 rounded-lg">
              <p className="text-sm font-medium text-dark-300 mb-2">Server Regions:</p>
              <div className="flex flex-wrap gap-2">
                {ML_SERVERS.map(server => (
                  <span key={server.id} className="text-xs text-dark-400">
                    {server.prefix} = {server.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCheck}
                isLoading={isLoading}
                className="flex-1"
                leftIcon={<HiOutlineSearch className="w-5 h-5" />}
              >
                Check Account
              </Button>
              <Button variant="ghost" onClick={handleClear}>
                Clear
              </Button>
            </div>
          </Card>

          {/* Result */}
          {isLoading && (
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-16 h-16 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          )}

          {result && !isLoading && (
            <Card className={cn(
              'border-l-4',
              result.status === 'success' ? 'border-l-emerald-500' : 'border-l-red-500'
            )}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar placeholder */}
                  <div className={cn(
                    'w-16 h-16 rounded-xl flex items-center justify-center',
                    result.status === 'success' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/20 text-red-400'
                  )}>
                    {result.status === 'success' ? (
                      <HiOutlineCheckCircle className="w-8 h-8" />
                    ) : (
                      <HiOutlineXCircle className="w-8 h-8" />
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white">
                        {result.status === 'success' ? result.nickname : 'Account Not Found'}
                      </h3>
                      <Badge variant={result.status === 'success' ? 'success' : 'danger'}>
                        {result.status === 'success' ? 'Valid' : 'Invalid'}
                      </Badge>
                    </div>
                    <p className="text-dark-400 text-sm">
                      User ID: {result.mlUserId} | Server: {result.mlServerId}
                    </p>
                  </div>
                </div>

                <Button variant="ghost" size="sm" onClick={handleCopyResult}>
                  <HiOutlineClipboardCopy className="w-4 h-4" />
                </Button>
              </div>

              {/* Details */}
              <div className="mt-4 pt-4 border-t border-dark-700">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-dark-500">User ID</p>
                    <p className="text-white font-mono">{result.mlUserId}</p>
                  </div>
                  <div>
                    <p className="text-dark-500">Server ID</p>
                    <p className="text-white font-mono">{result.mlServerId}</p>
                  </div>
                  <div>
                    <p className="text-dark-500">Region</p>
                    <p className="text-white">
                      {ML_SERVERS.find(s => result.mlServerId.startsWith(s.id))?.name || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-dark-500">Checked At</p>
                    <p className="text-white">{formatRelativeTime(result.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Response data */}
              {result.responseJson && result.status === 'success' && (
                <div className="mt-4 pt-4 border-t border-dark-700">
                  <p className="text-sm text-dark-500 mb-2">Response Data:</p>
                  <pre className="bg-dark-900/50 rounded-lg p-3 text-xs text-dark-300 overflow-x-auto">
                    {result.responseJson}
                  </pre>
                </div>
              )}
            </Card>
          )}

          {/* Tips */}
          <Card className="bg-gradient-to-br from-primary-500/10 to-accent-purple/10 border-primary-500/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <HiOutlineExclamation className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h4 className="font-medium text-white mb-1">Cara Mendapatkan User ID & Server ID</h4>
                <ul className="text-sm text-dark-400 space-y-1">
                  <li>1. Buka game Mobile Legends</li>
                  <li>2. Tap profile di pojok kiri atas</li>
                  <li>3. User ID dan Server ID ada di bawah avatar</li>
                  <li>4. Format: User ID (Server ID)</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* History sidebar */}
        <div>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Recent Checks</CardTitle>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-dark-400 hover:text-red-400 transition-colors"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              )}
            </div>

            {loadingHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <HiOutlineClock className="w-12 h-12 text-dark-600 mx-auto mb-2" />
                <p className="text-dark-400 text-sm">No history yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleUseFromHistory(item)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-colors',
                      item.status === 'success'
                        ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                        : 'bg-dark-800/50 border-dark-700 hover:border-dark-600'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white text-sm truncate">
                        {item.status === 'success' ? item.nickname : 'Not Found'}
                      </span>
                      <Badge 
                        variant={item.status === 'success' ? 'success' : 'danger'} 
                        size="sm"
                      >
                        {item.status === 'success' ? '✓' : '✗'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-dark-400">
                      <span>{item.mlUserId} ({item.mlServerId})</span>
                      <span>{formatRelativeTime(item.createdAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
