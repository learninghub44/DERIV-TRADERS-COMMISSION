'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  PieChart,
  FileText,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Zap,
  ChevronDown,
  Shield,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Markup', href: '/markup', icon: BarChart3 },
  { name: 'Commissions', href: '/commissions', icon: TrendingUp },
  { name: 'Earnings', href: '/earnings', icon: DollarSign },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Trading Activity', href: '/trading', icon: Activity },
  { name: 'Analytics', href: '/analytics', icon: PieChart },
  { name: 'Reports', href: '/reports', icon: FileText },
];

const secondaryNav = [
  { name: 'Deriv Integration', href: '/settings/deriv-integration', icon: Link, highlight: true },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Notifications', href: '/notifications', icon: Bell },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-surface-900 border-r border-surface-800">
            <div className="flex items-center justify-between p-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-white">DERIV TECH</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="text-surface-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-brand-600/10 text-brand-500'
                      : 'text-surface-400 hover:text-white hover:bg-surface-800'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-surface-800">
                {secondaryNav.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      pathname === item.href
                        ? 'bg-brand-600/10 text-brand-500'
                        : 'text-surface-400 hover:text-white hover:bg-surface-800'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-surface-900 border-r border-surface-800">
          <div className="flex items-center gap-2 p-4">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white">DERIV TECH</span>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-brand-600/10 text-brand-500'
                    : 'text-surface-400 hover:text-white hover:bg-surface-800'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-surface-800">
              {secondaryNav.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-brand-600/10 text-brand-500'
                      : 'text-surface-400 hover:text-white hover:bg-surface-800'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>

          <div className="p-4 border-t border-surface-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex items-center gap-4 px-4 py-3 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-surface-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center">
                <span className="text-sm font-medium text-brand-500">U</span>
              </div>
              <ChevronDown className="w-4 h-4 text-surface-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface-800 border border-surface-700 rounded-lg shadow-xl py-1">
                <Link
                  href="/settings/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-surface-300 hover:bg-surface-700"
                >
                  <Settings className="w-4 h-4" />
                  Profile
                </Link>
                <Link
                  href="/settings/organization"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-surface-300 hover:bg-surface-700"
                >
                  <Shield className="w-4 h-4" />
                  Organization
                </Link>
                <hr className="my-1 border-surface-700" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-surface-300 hover:bg-surface-700"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
