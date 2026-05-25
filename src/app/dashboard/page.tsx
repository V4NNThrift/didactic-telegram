import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { 
  HiOutlineChat, 
  HiOutlineLightningBolt, 
  HiOutlineDeviceMobile,
  HiOutlineCollection,
  HiOutlineArrowRight,
  HiOutlineSparkles,
  HiOutlineClock,
  HiOutlineTrendingUp,
} from 'react-icons/hi';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const quickActions = [
  {
    href: '/dashboard/chat',
    icon: HiOutlineChat,
    title: 'AI Chat',
    description: 'Mulai percakapan dengan AI',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    href: '/dashboard/tools',
    icon: HiOutlineLightningBolt,
    title: 'AI Tools',
    description: 'Akses tools AI lengkap',
    color: 'from-purple-500 to-pink-500',
  },
  {
    href: '/dashboard/ml-checker',
    icon: HiOutlineDeviceMobile,
    title: 'ML Checker',
    description: 'Cek akun Mobile Legends',
    color: 'from-orange-500 to-red-500',
  },
  {
    href: '/dashboard/hub',
    icon: HiOutlineCollection,
    title: 'Personal Hub',
    description: 'Notes, todos & activities',
    color: 'from-emerald-500 to-teal-500',
  },
];

export default async function DashboardPage() {
  const session = await getSession();
  
  const user = await prisma.user.findUnique({
    where: { id: session!.userId },
    select: {
      username: true,
      createdAt: true,
      _count: {
        select: {
          aiChats: true,
          notes: true,
          todos: true,
        },
      },
    },
  });

  // Get recent activities
  const recentActivities = await prisma.activity.findMany({
    where: { userId: session!.userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Get stats
  const chatCount = user?._count.aiChats || 0;
  const noteCount = user?._count.notes || 0;
  const todoCount = user?._count.todos || 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 17) return 'Selamat Siang';
    if (hour < 21) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="primary">Dashboard</Badge>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          {getGreeting()}, {user?.username}! 👋
        </h1>
        <p className="text-dark-400">
          Selamat datang kembali. Apa yang ingin Anda kerjakan hari ini?
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Chats', value: chatCount, icon: HiOutlineChat, color: 'text-blue-400' },
          { label: 'Notes', value: noteCount, icon: HiOutlineCollection, color: 'text-purple-400' },
          { label: 'Todos', value: todoCount, icon: HiOutlineTrendingUp, color: 'text-emerald-400' },
          { label: 'Member sejak', value: user?.createdAt.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }), icon: HiOutlineClock, color: 'text-orange-400' },
        ].map((stat, i) => (
          <Card key={i} className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-dark-400 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color} opacity-50`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, i) => (
            <Link key={i} href={action.href}>
              <Card hover className="h-full group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="group-hover:text-primary-400 transition-colors">
                  {action.title}
                </CardTitle>
                <CardDescription>{action.description}</CardDescription>
                <div className="mt-4 flex items-center text-primary-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Open <HiOutlineArrowRight className="w-4 h-4 ml-1" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity & AI Preview */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Recent Activity</CardTitle>
            <HiOutlineClock className="w-5 h-5 text-dark-400" />
          </div>
          
          {recentActivities.length === 0 ? (
            <div className="text-center py-8">
              <HiOutlineSparkles className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400">Belum ada aktivitas</p>
              <p className="text-dark-500 text-sm">Mulai gunakan fitur untuk melihat aktivitas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-dark-700/50 last:border-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'chat' ? 'bg-blue-500/20 text-blue-400' :
                    activity.type === 'tool' ? 'bg-purple-500/20 text-purple-400' :
                    activity.type === 'login' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-dark-700 text-dark-400'
                  }`}>
                    {activity.type === 'chat' ? <HiOutlineChat className="w-4 h-4" /> :
                     activity.type === 'tool' ? <HiOutlineLightningBolt className="w-4 h-4" /> :
                     <HiOutlineSparkles className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{activity.action}</p>
                    <p className="text-xs text-dark-500">
                      {new Date(activity.createdAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* AI Chat Preview */}
        <Card className="bg-gradient-to-br from-dark-800/80 to-dark-900/80">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>AI Chat</CardTitle>
            <Badge variant="success">Online</Badge>
          </div>
          
          <div className="space-y-4 mb-6">
            {/* Sample messages */}
            <div className="flex justify-end">
              <div className="bg-primary-600 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-[80%] text-sm">
                Hai, apa yang bisa kamu lakukan?
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center flex-shrink-0">
                <HiOutlineSparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-dark-700/50 text-dark-200 px-4 py-2 rounded-2xl rounded-bl-md max-w-[80%] text-sm">
                Saya bisa membantu Anda dengan berbagai hal: menjawab pertanyaan, menulis kode, membuat konten, dan banyak lagi!
              </div>
            </div>
          </div>

          <Link 
            href="/dashboard/chat"
            className="flex items-center justify-center gap-2 w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
          >
            <HiOutlineChat className="w-5 h-5" />
            Mulai Chat
          </Link>
        </Card>
      </div>
    </div>
  );
}
