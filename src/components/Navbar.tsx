'use client';

import { LogOut, User, Settings, Moon, Sun } from 'lucide-react';
import Image from 'next/image';
import { AppConfig } from '@/config/app.config';
import { useAuth } from './AuthProvider';

interface NavbarProps {
  onSettingsClick: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Navbar({ onSettingsClick, isDarkMode, onToggleDarkMode }: NavbarProps) {
  const { user, logout } = useAuth();
  
  return (
    <nav className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 py-3 flex-shrink-0`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <img src="/jarvis.png" alt="Jarvis" className="w-8 h-8" />
            <h1 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {AppConfig.app.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleDarkMode}
            className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'} px-3 py-1 rounded-md hover:bg-gray-100 ${isDarkMode ? 'hover:bg-gray-700' : ''} transition-colors`}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            <span className="text-sm">{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>
          
          <button
            onClick={onSettingsClick}
            className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'} px-3 py-1 rounded-md hover:bg-gray-100 ${isDarkMode ? 'hover:bg-gray-700' : ''} transition-colors`}
          >
            <Settings size={16} />
            <span className="text-sm">Settings</span>
          </button>
          
          {/* User Info and Controls */}
          {user && (
            <div className="flex items-center space-x-3">
              {/* Query Usage */}
              <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <span className="font-medium">{user.settings.queries_used}</span>
                <span>/{user.settings.query_limit} queries</span>
              </div>
              
              {/* User Info */}
              <div className="flex items-center space-x-2">
                {user.picture ? (
                  <Image
                    src={user.picture}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className={`w-8 h-8 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded-full flex items-center justify-center`}>
                    <User size={16} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                  </div>
                )}
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {user.name}
                </span>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={logout}
                className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'} px-3 py-1 rounded-md hover:bg-gray-100 ${isDarkMode ? 'hover:bg-gray-700' : ''} transition-colors`}
              >
                <LogOut size={16} />
                <span className="text-sm">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
