'use client';

import { useState, useEffect } from 'react';
import { Menu, X, Settings } from 'lucide-react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import SourcesSidebar from './SourcesSidebar';
import SettingsPanel from './SettingsPanel';
import { Chat, Message, Source } from '@/types/chat';
import { AppConfig, buildStreamUrl, generateGitHubUrl } from '@/config/app.config';

interface SearchSettings {
  k: number;
  searchType: 'hybrid' | 'semantic' | 'keyword';
  alpha: number;
}

export default function ChatInterface() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchSettings, setSearchSettings] = useState<SearchSettings>(AppConfig.search.default);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize with a default chat since we're not using auth
  useEffect(() => {
    const defaultChat: Chat = {
      id: 'default-chat',
      title: AppConfig.chat.defaultChat.title,
      userId: AppConfig.chat.defaultChat.userId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setCurrentChat(defaultChat);
    setChats([defaultChat]);
  }, []);


  const createNewChat = () => {
    // Prevent creating new chat if current chat is empty
    if (currentChat && currentChat.messages.length === 0) {
      return;
    }
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const chatId = `jarvis-${timestamp}-${randomId}`;
    const newChat: Chat = {
      id: chatId,
      title: AppConfig.chat.defaultNewChatTitle,
      userId: AppConfig.chat.defaultChat.userId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChat(newChat);
    setSources([]);
  };

  const selectChat = (chat: Chat) => {
    setCurrentChat(chat);
    // Get sources from the last assistant message if any
    const lastAssistantMessage = chat.messages
      .filter(m => m.role === 'assistant')
      .pop();
    setSources(lastAssistantMessage?.sources || []);
  };

  const deleteChat = (chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChat?.id === chatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      setCurrentChat(remainingChats[0] || null);
      setSources([]);
    }
  };

  const sendMessage = async (content: string) => {
    if (!currentChat) return;

    setIsLoading(true);
    setSources([]);

    try {
      // Add user message
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        content,
        role: 'user',
        timestamp: new Date(),
      };

      // Generate better title from user message if this is the first message
      let chatTitle = currentChat.title;
      if (currentChat.messages.length === 0) {
        // Generate title from first 4-6 words of the user message
        const words = content.trim().split(' ').slice(0, 5);
        const title = words.join(' ');
        chatTitle = title.length > 50 ? title.slice(0, 47) + '...' : title;
        chatTitle = chatTitle.charAt(0).toUpperCase() + chatTitle.slice(1);
      }

      // Update current chat with user message and new title
      const updatedChat = {
        ...currentChat,
        title: chatTitle,
        messages: [...currentChat.messages, userMessage],
        updatedAt: new Date(),
      };
      setCurrentChat(updatedChat);
      setChats(prev => prev.map(chat => 
        chat.id === currentChat.id ? updatedChat : chat
      ));

      // Start streaming response from backend
      await streamAIResponse(currentChat.id, content);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Stream AI response using Server-Sent Events
  const streamAIResponse = async (chatId: string, userMessage: string) => {
    try {
      const eventSource = new EventSource(
        buildStreamUrl(userMessage, searchSettings.k, searchSettings.alpha)
      );

      let assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        sources: [],
      };

      // Add initial assistant message with streaming indicator
      assistantMessage.content = ''; // Start with empty content to show loading
      setCurrentChat(prev => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          messages: [...prev.messages, assistantMessage],
          updatedAt: new Date(),
        };
        setChats(prevChats => prevChats.map(chat => 
          chat.id === prev.id ? updated : chat
        ));
        return updated;
      });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.sources) {
            const formattedSources: Source[] = data.sources.map((source: any, index: number) => ({
              id: `source-${index}`,
              title: source.repo_name && source.path 
                ? `${source.repo_name}/${source.path}`
                : source.path || 'Unknown File',
              url: generateGitHubUrl(source.repo_name, source.path),
              description: source.preview || 'No description available',
              language: source.language,
              fileType: source.file_type,
              relevanceScore: source.relevance_score,
            }));
            setSources(formattedSources);
            assistantMessage.sources = formattedSources;
          }

          if (data.chunk) {
            assistantMessage.content += data.chunk;
            
            // Update the assistant message in real-time
            setCurrentChat(prev => {
              if (!prev) return prev;
              const updatedMessages = prev.messages.map(msg => 
                msg.id === assistantMessage.id ? { ...assistantMessage } : msg
              );
              const updated = {
                ...prev,
                messages: updatedMessages,
                updatedAt: new Date(),
              };
              setChats(prevChats => prevChats.map(chat => 
                chat.id === prev.id ? updated : chat
              ));
              return updated;
            });
          }
        } catch (parseError) {
          console.error('Error parsing SSE data:', parseError);
        }
      };

      eventSource.addEventListener('sources', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.sources) {
            const formattedSources: Source[] = data.sources.map((source: any, index: number) => ({
              id: `source-${index}`,
              title: source.repo_name && source.path 
                ? `${source.repo_name}/${source.path}`
                : source.path || 'Unknown File',
              url: generateGitHubUrl(source.repo_name, source.path),
              description: source.preview || 'No description available',
              language: source.language,
              fileType: source.file_type,
              relevanceScore: source.relevance_score,
            }));
            setSources(formattedSources);
            assistantMessage.sources = formattedSources;
          }
        } catch (parseError) {
          console.error('Error parsing sources:', parseError);
        }
      });

      eventSource.addEventListener('answer_chunk', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.chunk) {
            assistantMessage.content += data.chunk;
            
            // Update the assistant message in real-time
            setCurrentChat(prev => {
              if (!prev) return prev;
              const updatedMessages = prev.messages.map(msg => 
                msg.id === assistantMessage.id ? { ...assistantMessage } : msg
              );
              const updated = {
                ...prev,
                messages: updatedMessages,
                updatedAt: new Date(),
              };
              setChats(prevChats => prevChats.map(chat => 
                chat.id === prev.id ? updated : chat
              ));
              return updated;
            });
          }
        } catch (parseError) {
          console.error('Error parsing answer chunk:', parseError);
        }
      });

      eventSource.addEventListener('status', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Status:', data.message);
        } catch (parseError) {
          console.error('Error parsing status:', parseError);
        }
      });

      eventSource.onerror = (error) => {
        console.error('EventSource failed:', error);
        eventSource.close();
        
        // Add fallback message if no content was received
        if (!assistantMessage.content) {
          assistantMessage.content = `${AppConfig.chat.errorMessages.connectionError} ${AppConfig.api.baseUrl}.`;
          
          setCurrentChat(prev => {
            if (!prev) return prev;
            const updatedMessages = prev.messages.map(msg => 
              msg.id === assistantMessage.id ? { ...assistantMessage } : msg
            );
            const updated = {
              ...prev,
              messages: updatedMessages,
              updatedAt: new Date(),
            };
            setChats(prevChats => prevChats.map(chat => 
              chat.id === prev.id ? updated : chat
            ));
            return updated;
          });
        }
      };

      eventSource.addEventListener('completed', () => {
        eventSource.close();
      });

    } catch (error) {
      console.error('Error setting up SSE:', error);
      
      // Fallback response
      const fallbackMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        content: `${AppConfig.chat.errorMessages.connectionError} ${AppConfig.api.baseUrl}.\n\nError: ${error instanceof Error ? error.message : AppConfig.chat.errorMessages.genericError}`,
        role: 'assistant',
        timestamp: new Date(),
      };

      setCurrentChat(prev => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          messages: [...prev.messages, fallbackMessage],
          updatedAt: new Date(),
        };
        setChats(prevChats => prevChats.map(chat => 
          chat.id === prev.id ? updated : chat
        ));
        return updated;
      });
    }
  };

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} overflow-hidden`}>
      {/* Mobile Header */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 py-3 flex items-center justify-between md:hidden`}>
        <button
          onClick={() => setSidebarOpen(true)}
          className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-800'}`}
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center space-x-2">
          <img src="/jarvis.png" alt="Jarvis" className="w-6 h-6" />
          <h1 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {currentChat?.title || 'Jarvis'}
          </h1>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-800'}`}
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex h-full">
        {/* Left Sidebar - Chat History (Desktop) */}
        <div className="w-64 flex-shrink-0">
          <Sidebar
            chats={chats}
            currentChat={currentChat}
            onSelectChat={selectChat}
            onNewChat={createNewChat}
            onDeleteChat={deleteChat}
            collapsed={false}
            onToggleCollapse={() => {}}
          />
        </div>

        {/* Main Content Area (Desktop) */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar 
            onSettingsClick={() => setShowSettings(true)} 
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          />
          
          {/* Sources Cards (Desktop) */}
          {sources.length > 0 && (
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-4`}>
              <div className="flex items-center mb-3">
                <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Sources ({sources.length})
                </h3>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {sources.map((source) => (
                  <SourceCard key={source.id} source={source} isCompact={true} />
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <ChatArea
              chat={currentChat}
              onSendMessage={sendMessage}
              isLoading={isLoading}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="flex-1 flex flex-col md:hidden overflow-hidden">
        {/* Sources Cards (Mobile) */}
        {sources.length > 0 && (
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-3`}>
            <div className="flex items-center mb-2">
              <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Sources ({sources.length})
              </h3>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sources.map((source) => (
                <SourceCard key={source.id} source={source} isCompact={true} />
              ))}
            </div>
          </div>
        )}

        {/* Chat Area (Mobile) */}
        <div className="flex-1 overflow-hidden">
          <ChatArea
            chat={currentChat}
            onSendMessage={sendMessage}
            isLoading={isLoading}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
          <div className={`absolute left-0 top-0 h-full w-80 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} shadow-xl`}>
            <div className={`${isDarkMode ? 'border-gray-700' : 'border-gray-200'} border-b p-4 flex items-center justify-between`}>
              <div className="flex items-center space-x-2">
                <img src="/jarvis.png" alt="Jarvis" className="w-6 h-6" />
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Jarvis</h2>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-800'}`}
              >
                <X size={20} />
              </button>
            </div>
            <Sidebar
              chats={chats}
              currentChat={currentChat}
              onSelectChat={(chat) => {
                selectChat(chat);
                setSidebarOpen(false);
              }}
              onNewChat={() => {
                createNewChat();
                setSidebarOpen(false);
              }}
              onDeleteChat={deleteChat}
              collapsed={false}
              onToggleCollapse={() => {}}
            />
          </div>
        </div>
      )}

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        settings={searchSettings}
        onSettingsChange={setSearchSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

// Compact Source Card Component for horizontal scrolling
function SourceCard({ source, isCompact = false }: { source: Source; isCompact?: boolean }) {
  const handleClick = () => {
    if (source.url.startsWith('https://github.com/')) {
      window.open(source.url, '_blank');
    } else {
      // Create modal for source content
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
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
        {language}
      </span>
    );
  };

  return (
    <div 
      onClick={handleClick}
      className="flex-shrink-0 cursor-pointer bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all min-w-0 w-48 md:w-56"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900 truncate pr-2" title={source.title}>
          {source.title.length > 25 ? source.title.substring(0, 25) + '...' : source.title}
        </h4>
        {(source as any).relevanceScore && (
          <span className="text-xs text-gray-500 flex-shrink-0">
            {((source as any).relevanceScore * 100).toFixed(0)}%
          </span>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        {getLanguageBadge((source as any).language)}
        <span className="text-xs text-blue-600 hover:text-blue-800 font-medium">
          View
        </span>
      </div>
      
      {source.description && (
        <p className="text-xs text-gray-600 mt-2 line-clamp-2" title={source.description}>
          {source.description.length > 60 ? source.description.substring(0, 60) + '...' : source.description}
        </p>
      )}
    </div>
  );
}
