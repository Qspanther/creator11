'use client';

import React, { ReactNode, Suspense, lazy, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from './lib/auth-context';
import Sidebar from './components/layout/Sidebar';
import AdminSidebar from './components/layout/AdminSidebar';
import TopBar from './components/layout/TopBar';
import MobileBottomNav from './components/layout/MobileBottomNav';
import StageControls3D from './components/ui/StageControls3D';

const ParticleBackground = lazy(() => import('./components/three/ParticleBackground'));

const publicPaths = ['/', '/login', '/signup', '/verify-otp', '/forgot-password'];
const authOnlyPaths = ['/login', '/signup', '/verify-otp', '/forgot-password'];

function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();

  const isPublicPage = publicPaths.includes(pathname || '');
  const isAuthPage = authOnlyPaths.includes(pathname || '');
  const isAdminRoute = pathname?.startsWith('/admin');

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated && !isPublicPage) {
        router.push('/login');
      } else if (isAuthenticated && isAuthPage) {
        router.push('/dashboard');
      }
      if (isAdminRoute && user?.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [loading, isAuthenticated, isPublicPage, isAuthPage, isAdminRoute, user, router]);

  if (loading && !isPublicPage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#06060b]">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#06060b] text-slate-100 overflow-x-hidden">
      {/* 3D WebGL Particle Arena Background */}
      <Suspense fallback={null}>
        <ParticleBackground />
      </Suspense>

      {/* 3D Stage Preset Switcher & SFX */}
      <StageControls3D />

      {isAuthPage ? (
        <main className="relative z-10 min-h-screen flex items-center justify-center p-4">
          {children}
        </main>
      ) : (
        <div className="relative z-10 flex min-h-screen">
          {isAdminRoute ? <AdminSidebar /> : <Sidebar />}
          <div
            className={`flex-1 flex flex-col min-w-0 pb-20 lg:pb-8 ${
              isAdminRoute ? 'ml-0 md:ml-[240px]' : ''
            }`}
          >
            <TopBar />
            <main className="flex-1 w-full max-w-full overflow-x-hidden">{children}</main>
          </div>
          <MobileBottomNav />
        </div>
      )}
    </div>
  );
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
