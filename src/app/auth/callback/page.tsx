'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Image from 'next/image';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
          setError(`Authentication failed: ${error}`);
          setIsLoading(false);
          return;
        }

        if (!token) {
          setError('No authentication token received');
          setIsLoading(false);
          return;
        }

        // Login with the received token
        await login(token);
        
        // Redirect to main app
        router.push('/');
        
      } catch (error) {
        console.error('Authentication callback error:', error);
        setError('Failed to complete authentication');
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, login, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 text-center">
          <div className="mx-auto h-16 w-16 relative mb-6">
            <Image
              src="/jarvis.png"
              alt="Jarvis"
              fill
              className="object-contain"
              priority
            />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Authentication Failed
            </h2>
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 text-sm mb-6">
              {error}
            </div>
            <button
              onClick={() => router.push('/auth/signin')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 text-center">
        <div className="mx-auto h-16 w-16 relative mb-6">
          <Image
            src="/jarvis.png"
            alt="Jarvis"
            fill
            className="object-contain"
            priority
          />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Completing Sign In
          </h2>
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <p className="text-gray-300 text-sm mt-4">
            Please wait while we complete your authentication...
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 text-center">
        <div className="mx-auto h-16 w-16 relative mb-6">
          <Image
            src="/jarvis.png"
            alt="Jarvis"
            fill
            className="object-contain"
            priority
          />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Loading...
          </h2>
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <p className="text-gray-300 text-sm mt-4">
            Please wait while we load your authentication...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
