import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Get fresh user data
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      isAdmin: true,
      isBanned: true,
    },
  });

  if (!user || user.isBanned) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Sidebar user={{ username: user.username, isAdmin: user.isAdmin }} />
      
      <main className="lg:pl-64 min-h-screen pb-20 lg:pb-0">
        {children}
      </main>
      
      <MobileNav />
    </div>
  );
}
