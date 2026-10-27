'use client';

import { ReactNode, Suspense, lazy, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from './lib/auth-context';
import Sidebar from './components/layout/Sidebar';
import AdminSidebar from './components/layout/AdminSidebar';
import TopBar from './components/layout/TopBar';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load 3D background for performance
const ParticleBackground = lazy(() => import('./components/three/ParticleBackground'));

const publicPaths = ['/', '/login', '/signup', '/verify-otp', '/forgot-password'];

function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();
  const isPublicPage = publicPaths.includes(pathname);
  const showAppShell = isAuthenticated && !isPublicPage;
  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated && !isPublicPage) {
        router.push('/login');
      } else if (isAuthenticated && isPublicPage) {
        // If they are an admin, dashboard could be regular or admin, but let's default to regular dashboard for now unless they click admin panel
        router.push('/dashboard');
      }
      if (isAdminRoute && user?.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [loading, isAuthenticated, isPublicPage, isAdminRoute, user, router]);

  if (loading && !isPublicPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* 3D Background — always mounted */}
      <Suspense fallback={null}>
        <ParticleBackground />
      </Suspense>

      {showAppShell ? (
        <div className="flex min-h-screen">
          {isAdminRoute ? <AdminSidebar /> : <Sidebar />}
          <div className="flex-1 ml-[220px]">
            <TopBar />
            <main className="pt-20 px-6 pb-8 relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      ) : (
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </>
  );
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
