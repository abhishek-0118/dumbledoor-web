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
    return null;
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
