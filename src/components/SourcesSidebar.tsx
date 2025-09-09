'use client';

import { ExternalLink, FileText, Code, FileCode, Settings, TestTube, Eye, GripVertical } from 'lucide-react';
import { Source } from '@/types/chat';
import { useState, useRef, useEffect } from 'react';

interface SourcesSidebarProps {
  sources: Source[];
  width: number;
  onWidthChange: (width: number) => void;
  minWidth: number;
  maxWidth: number;
}

export default function SourcesSidebar({ sources, width, onWidthChange, minWidth, maxWidth }: SourcesSidebarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const windowWidth = window.innerWidth;
      const newWidth = windowWidth - e.clientX;
      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      
      onWidthChange(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, minWidth, maxWidth, onWidthChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  return (
    <div 
      ref={sidebarRef}
      className="h-full bg-gray-50 flex relative"
      style={{ width: `${width}px` }}
    >
      {/* Draggable Resize Handle */}
      <div
        className={`absolute left-0 top-0 w-2 h-full cursor-col-resize z-10 transition-all duration-200 ${
          isDragging 
            ? 'bg-blue-500 shadow-lg' 
            : 'bg-gray-300 hover:bg-blue-400'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-colors ${
          isDragging ? 'text-white' : 'text-gray-500 hover:text-white'
        }`}>
          <GripVertical size={12} className="rotate-90" />
        </div>
        
        {/* Visual indicator when dragging */}
        {isDragging && (
          <div className="absolute -right-20 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {Math.round((width / window.innerWidth) * 100)}% of screen
          </div>
        )}
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 flex flex-col border-l border-gray-200 ml-2">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Sources</h3>
              <p className="text-sm text-gray-500 mt-1">
                {sources.length} source{sources.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
        </div>

        {/* Sources List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sources.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 text-sm">No sources available</p>
              <p className="text-gray-400 text-xs mt-1">
                Sources will appear here when you ask questions
              </p>
            </div>
          ) : (
            sources.map((source) => (
              <SourceCard key={source.id} source={source} width={width} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SourceCard({ source, width }: { source: Source; width: number }) {
  const getFileIcon = (fileType?: string, isTest?: boolean, isConfig?: boolean) => {
    if (isTest) return <TestTube size={16} className="text-green-600" />;
    if (isConfig) return <Settings size={16} className="text-yellow-600" />;
    
    switch (fileType) {
      case 'python':
      case 'py':
        return <Code size={16} className="text-blue-600" />;
      case 'javascript':
      case 'typescript':
      case 'js':
      case 'ts':
        return <FileCode size={16} className="text-yellow-500" />;
      case 'go':
        return <Code size={16} className="text-cyan-600" />;
      default:
        return <FileText size={16} className="text-gray-600" />;
    }
  };

  const getLanguageBadge = (language?: string) => {
    if (!language) return null;
    
    const colors: Record<string, string> = {
      python: 'bg-blue-100 text-blue-800',
      javascript: 'bg-yellow-100 text-yellow-800',
      typescript: 'bg-blue-100 text-blue-800',
      go: 'bg-cyan-100 text-cyan-800',
      java: 'bg-red-100 text-red-800',
      rust: 'bg-orange-100 text-orange-800',
      cpp: 'bg-purple-100 text-purple-800',
      c: 'bg-gray-100 text-gray-800',
    };

    const colorClass = colors[language.toLowerCase()] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
        {language}
      </span>
    );
  };

  const handleSourceClick = (source: Source) => {
    // If it's a GitHub URL, open it directly
    if (source.url.startsWith('https://github.com/')) {
      window.open(source.url, '_blank');
      return;
    }
    
    // Otherwise, create a modal to show the full source code
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>${source.title}</title>
            <style>
              body { 
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; 
                margin: 20px; 
                background-color: #f8f9fa;
                line-height: 1.6;
              }
              .header {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .content {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              pre {
                background: #f6f8fa;
                padding: 16px;
                border-radius: 6px;
                overflow-x: auto;
                border: 1px solid #e1e4e8;
                font-size: 14px;
              }
              h1 { color: #24292e; margin: 0 0 10px 0; }
              .meta { color: #586069; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${source.title}</h1>
              <div class="meta">
                ${(source as any).language ? `Language: ${(source as any).language}` : ''}
                ${(source as any).relevanceScore ? ` | Relevance: ${((source as any).relevanceScore * 100).toFixed(1)}%` : ''}
              </div>
            </div>
            <div class="content">
              <pre><code>${source.description || 'No content available'}</code></pre>
            </div>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  // Determine text size based on width
  const isNarrow = width < 250;
  const isVeryNarrow = width < 180;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-2 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-1">
            {getFileIcon((source as any).fileType, (source as any).isTest, (source as any).isConfig)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`${isVeryNarrow ? 'text-xs' : isNarrow ? 'text-sm' : 'text-sm'} font-medium text-gray-900 line-clamp-2 break-all`}>
              {isVeryNarrow && source.title.length > 20 
                ? source.title.substring(0, 20) + '...'
                : isNarrow && source.title.length > 30
                ? source.title.substring(0, 30) + '...'
                : source.title}
            </h4>
            <div className={`flex items-center space-x-2 mt-1 ${isVeryNarrow ? 'flex-col space-x-0 space-y-1' : ''}`}>
              {!isVeryNarrow && getLanguageBadge((source as any).language)}
              {(source as any).relevanceScore && (
                <span className={`${isVeryNarrow ? 'text-xs' : 'text-xs'} text-gray-500`}>
                  {((source as any).relevanceScore * 100).toFixed(1)}% match
                </span>
              )}
            </div>
          </div>
        </div>
        
        {!isVeryNarrow && (
          <button
            onClick={() => handleSourceClick(source)}
            className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors p-1"
            title="View source"
          >
            <Eye size={16} />
          </button>
        )}
      </div>
      
      {source.description && !isVeryNarrow && (
        <div className="mb-3">
          <pre className={`${isNarrow ? 'text-xs' : 'text-xs'} text-gray-600 bg-gray-50 p-2 rounded border overflow-x-auto whitespace-pre-wrap font-mono`}>
            {source.description.length > (isNarrow ? 100 : 200) 
              ? source.description.substring(0, isNarrow ? 100 : 200) + '...' 
              : source.description}
          </pre>
        </div>
      )}
      
      <div className={`flex items-center ${isVeryNarrow ? 'flex-col space-y-2' : 'justify-between'}`}>
        <span className={`${isVeryNarrow ? 'text-xs' : 'text-xs'} text-gray-400 truncate ${isVeryNarrow ? 'w-full text-center' : ''}`}>
          {source.url.startsWith('https://github.com/') 
            ? source.url.replace('https://github.com/', '').split('/blob/')[0]
            : (source.url !== '#' ? source.url : 'Local file')
          }
        </span>
        <button
          onClick={() => handleSourceClick(source)}
          className={`${isVeryNarrow ? 'text-xs' : 'text-xs'} text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors`}
        >
          {isVeryNarrow ? 'View' : source.url.startsWith('https://github.com/') ? 'View on GitHub' : 'View full source'}
        </button>
      </div>
    </div>
  );
}