'use client';

import { useState, useEffect } from 'react';
import { Github, Folder, ExternalLink, Code, Database, Globe, Smartphone, Server } from 'lucide-react';
import { apiService, Repository } from '@/lib/api';

interface RepositoryInfoProps {
  isDarkMode?: boolean;
}

export default function RepositoryInfo({ isDarkMode = false }: RepositoryInfoProps) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        setIsLoading(true);
        const response = await apiService.getRepositories();
        setRepositories(response.repositories);
        setError(null);
      } catch (err) {
        console.error('Error fetching repositories:', err);
        setError('Failed to load repository information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepositories();
  }, []);

  const getRepositoryIcon = (repo: Repository) => {
    const name = repo.name.toLowerCase();
    
    if (name.includes('web') || name.includes('ui') || name.includes('frontend')) {
      return <Globe size={16} className="text-blue-500" />;
    } else if (name.includes('api') || name.includes('service') || name.includes('backend')) {
      return <Server size={16} className="text-green-500" />;
    } else if (name.includes('app') || name.includes('mobile')) {
      return <Smartphone size={16} className="text-purple-500" />;
    } else if (name.includes('db') || name.includes('database') || name.includes('data')) {
      return <Database size={16} className="text-orange-500" />;
    } else {
      return <Code size={16} className="text-gray-500" />;
    }
  };

  const getRepositoryTypeIcon = (repo: Repository) => {
    return repo.type === 'github' ? (
      <Github size={14} className="text-gray-400" />
    ) : (
      <Folder size={14} className="text-gray-400" />
    );
  };

  const handleRepositoryClick = (repo: Repository) => {
    if (repo.url) {
      window.open(repo.url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`animate-pulse rounded-lg p-4 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}
            >
              <div className={`h-4 w-3/4 rounded mb-2 ${
                isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
              }`}></div>
              <div className={`h-3 w-1/2 rounded ${
                isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
              }`}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className={`text-center p-6 rounded-lg ${
          isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
        }`}>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className={`text-center p-6 rounded-lg ${
          isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
        }`}>
          <p className="text-sm">No repositories found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-4">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
          Available Repositories ({repositories.length})
        </h3>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Click on any repository to view it on GitHub
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
        {repositories.map((repo, index) => (
          <div
            key={index}
            onClick={() => handleRepositoryClick(repo)}
            className={`group cursor-pointer rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600' 
                : 'bg-white hover:bg-gray-50 border border-gray-200'
            } ${repo.url ? 'hover:scale-105' : ''}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {getRepositoryIcon(repo)}
                <span className={`text-sm font-medium truncate ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`} title={repo.name}>
                  {repo.name}
                </span>
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0">
                {getRepositoryTypeIcon(repo)}
                {repo.url && (
                  <ExternalLink size={12} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                )}
              </div>
            </div>
            
            <div className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {repo.type === 'github' ? 'GitHub Repository' : 'Local Repository'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
