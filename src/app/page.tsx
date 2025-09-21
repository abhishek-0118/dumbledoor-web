'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';
import { useAuth } from '@/components/AuthProvider';
import { authService } from '@/lib/auth';
import { AppConfig } from '@/config/app.config';

export default function Home() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const token = authService.handleOAuthRedirect();
    if (token) {
      login(token).catch((error) => {
        console.error('OAuth login failed:', error);
        router.push('/auth/signin');
      });
      return;
    }

    if (!isLoading && !isAuthenticated) {
      router.push('/auth/signin');
    }
  }, [isAuthenticated, isLoading, router, login]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen overflow-hidden">
      <ChatInterface />
    </div>
  );
}
