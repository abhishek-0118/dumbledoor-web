'use client';

import { X, Settings, LogOut, User } from 'lucide-react';
import Image from 'next/image';
import { AppConfig } from '@/config/app.config';
import { useAuth } from '@/components/AuthProvider';

interface SearchSettings {
  k: number;
  searchType: 'hybrid' | 'semantic' | 'keyword';
  alpha: number;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SearchSettings;
  onSettingsChange: (settings: SearchSettings) => void;
}

export default function SettingsPanel({ isOpen, onClose, settings, onSettingsChange }: SettingsPanelProps) {
  const { user, logout } = useAuth();
  
  if (!isOpen) return null;

  const handleSettingChange = (key: keyof SearchSettings, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Settings size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Search Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* User Information */}
          {user && (
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {user.picture ? (
                    <Image
                      src={user.picture}
                      alt={user.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <User size={20} className="text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  <p className="text-xs text-gray-400">
                    Queries: {user.settings.queries_used}/{user.settings.query_limit}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-3 w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Number of Results */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Results (k)
            </label>
            <input
              type="range"
              min={AppConfig.search.limits.minK}
              max={AppConfig.search.limits.maxK}
              step="1"
              value={settings.k}
              onChange={(e) => handleSettingChange('k', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{AppConfig.search.limits.minK}</span>
              <span className="font-medium">{settings.k}</span>
              <span>{AppConfig.search.limits.maxK}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Number of code snippets to retrieve and analyze
            </p>
          </div>

          {/* Search Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Search Type
            </label>
            <div className="space-y-2">
              {AppConfig.search.types.map((option) => (
                <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="searchType"
                    value={option.value}
                    checked={settings.searchType === option.value}
                    onChange={(e) => handleSettingChange('searchType', e.target.value)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Alpha Parameter (only for hybrid) */}
          {settings.searchType === 'hybrid' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hybrid Balance (α)
              </label>
              <input
                type="range"
                min={AppConfig.search.limits.minAlpha}
                max={AppConfig.search.limits.maxAlpha}
                step={AppConfig.search.limits.alphaStep}
                value={settings.alpha}
                onChange={(e) => handleSettingChange('alpha', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Semantic</span>
                <span className="font-medium">{settings.alpha}</span>
                <span>Keyword</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Lower values favor semantic search, higher values favor keyword search
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
