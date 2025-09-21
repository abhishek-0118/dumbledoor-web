'use client';

import React, { useState } from 'react';
import { authService } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const authUrl = await authService.initiateGoogleLogin();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login failed:', error);
      setError('Failed to initiate Google login. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ffe0a3] via-[#ffc266] to-[#ffb347] flex items-center justify-center p-4 safe-area-inset">
      <div className="max-w-md w-full space-y-6 sm:space-y-8 bg-white/90 backdrop-blur-lg rounded-xl p-6 sm:p-8 border border-white/40 shadow-lg mx-4">
        <div className="text-center">
          <div className="mb-6">
            <Image
              src="/jarvis.png"
              alt="Jarvis Logo"
              width={80}
              height={80}
              className="w-20 h-20 rounded-full object-cover mx-auto shadow-lg"
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Welcome to Jarvis
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            AI-powered code assistant for analyzing and understanding codebases
          </p>
        </div>

        {/* Login Form */}
        <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3 sm:p-4 text-red-700 text-xs sm:text-sm">
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 sm:py-4 px-4 border border-transparent text-sm sm:text-base font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
            </span>
{isLoading ? 'Signing in...' : ' Continue with Google'}
          </button>

          {/* Features List */}
          <div className="mt-6 sm:mt-8 text-center text-gray-600 text-xs sm:text-sm">
            <p className="mb-3 sm:mb-4">What you can do with Jarvis:</p>
            <ul className="space-y-1 sm:space-y-2 text-left">
              <li className="flex items-center">
                <span className="text-orange-500 mr-2">•</span>
                Ask questions about your codebase
              </li>
              <li className="flex items-center">
                <span className="text-orange-500 mr-2">•</span>
                Get AI-powered code insights
              </li>
              <li className="flex items-center">
                <span className="text-orange-500 mr-2">•</span>
                Save and organize your conversations
              </li>
              <li className="flex items-center">
                <span className="text-orange-500 mr-2">•</span>
                Access up to 10 queries per session
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-xs">
          <p className="leading-relaxed">
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}
