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
import { useAuth } from './AuthProvider';
import { apiService, ChatSummary, ChatData } from '@/lib/api';

interface SearchSettings {
  k: number;
  searchType: 'hybrid' | 'semantic' | 'keyword';
  alpha: number;
}

export default function ChatInterface() {
  const { user, refreshUser } = useAuth();
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchSettings, setSearchSettings] = useState<SearchSettings>(AppConfig.search.default);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load user's chats from backend
  useEffect(() => {
    const loadChats = async () => {
      if (!user) return;
      
      setIsLoadingChats(true);
      try {
        const summaries = await apiService.getUserChats();
        setChatSummaries(summaries);
        
        // Convert summaries to Chat objects for sidebar display
        const chatList: Chat[] = summaries.map(summary => ({
          id: summary.id,
          title: summary.title,
          userId: user.id,
          messages: [],
          createdAt: new Date(summary.created_at),
          updatedAt: new Date(summary.updated_at),
        }));
        
        setChats(chatList);
        
        // Auto-select first chat if available
        if (chatList.length > 0 && !currentChat) {
          await selectChat(chatList[0]);
        }
      } catch (error) {
        console.error('Error loading chats:', error);
      } finally {
        setIsLoadingChats(false);
      }
    };

    loadChats();
  }, [user]);


  const createNewChat = async () => {
    if (!user) return;
    
    // Prevent creating new chat if current chat is empty
    if (currentChat && currentChat.messages.length === 0) {
      return;
    }
    
    try {
      const newChatData = await apiService.createChat(AppConfig.chat.defaultNewChatTitle);
      
      if (newChatData) {
        const newChat: Chat = {
          id: newChatData.id,
          title: newChatData.title,
          userId: user.id,
          messages: [],
          createdAt: new Date(newChatData.created_at),
          updatedAt: new Date(newChatData.updated_at),
        };
        
        setChats(prev => [newChat, ...prev]);
        setCurrentChat(newChat);
        setSources([]);
        
        // Update chat summaries
        const newSummary: ChatSummary = {
          id: newChatData.id,
          title: newChatData.title,
          created_at: newChatData.created_at,
          updated_at: newChatData.updated_at,
          message_count: 0,
        };
        setChatSummaries(prev => [newSummary, ...prev]);
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const selectChat = async (chat: Chat) => {
    try {
      // Load full chat data with messages from backend
      const chatData = await apiService.getChat(chat.id);
      
      if (chatData) {
        // Convert backend messages to frontend format
        const messages: Message[] = chatData.messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: new Date(msg.timestamp),
          sources: msg.metadata?.sources || [],
        }));
        
        const fullChat: Chat = {
          ...chat,
          messages,
        };
        
        setCurrentChat(fullChat);
        
        // Update the chat in the list with messages
        setChats(prev => prev.map(c => 
          c.id === chat.id ? fullChat : c
        ));
        
        // Get sources from the last assistant message if any
        const lastAssistantMessage = messages
          .filter(m => m.role === 'assistant')
          .pop();
        setSources(lastAssistantMessage?.sources || []);
      } else {
        // Fallback to basic chat if loading fails
        setCurrentChat(chat);
        setSources([]);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
      setCurrentChat(chat);
      setSources([]);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      const success = await apiService.deleteChat(chatId);
      
      if (success) {
        setChats(prev => prev.filter(chat => chat.id !== chatId));
        setChatSummaries(prev => prev.filter(summary => summary.id !== chatId));
        
        if (currentChat?.id === chatId) {
          const remainingChats = chats.filter(chat => chat.id !== chatId);
          if (remainingChats.length > 0) {
            await selectChat(remainingChats[0]);
          } else {
            setCurrentChat(null);
            setSources([]);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!currentChat || !user) return;

    setIsLoading(true);
    setSources([]);

    try {
      // Generate better title from user message if this is the first message
      let chatTitle = currentChat.title;
      let shouldUpdateTitle = false;
      
      if (currentChat.messages.length === 0) {
        const words = content.trim().split(' ').slice(0, 5);
        const title = words.join(' ');
        chatTitle = title.length > 50 ? title.slice(0, 47) + '...' : title;
        chatTitle = chatTitle.charAt(0).toUpperCase() + chatTitle.slice(1);
        shouldUpdateTitle = true;
      }

      // Create the user message locally first to avoid duplication
      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        content,
        role: 'user',
        timestamp: new Date(),
        sources: [],
      };

      // Add the user message to the chat immediately
      const chatWithUserMessage = {
        ...currentChat,
        messages: [...currentChat.messages, userMessage],
        updatedAt: new Date(),
      };
      
      setCurrentChat(chatWithUserMessage);
      setChats(prev => prev.map(chat => 
        chat.id === currentChat.id ? chatWithUserMessage : chat
      ));

      // Send user message to backend (but don't use the returned messages to avoid duplication)
      const updatedChatData = await apiService.addMessage(currentChat.id, {
        role: 'user',
        content,
      });

      if (updatedChatData) {
        // Only update the title and timestamps, not the messages (to avoid duplication)
        const updatedChat = {
          ...chatWithUserMessage, // Keep our local messages
          title: updatedChatData.title,
          updatedAt: new Date(updatedChatData.updated_at),
        };
        
        setCurrentChat(updatedChat);
        setChats(prev => prev.map(chat => 
          chat.id === currentChat.id ? updatedChat : chat
        ));

        // Update title if needed
        if (shouldUpdateTitle && chatTitle !== updatedChatData.title) {
          await apiService.updateChatTitle(currentChat.id, chatTitle);
          const finalUpdatedChat = { ...updatedChat, title: chatTitle };
          setCurrentChat(finalUpdatedChat);
          setChats(prev => prev.map(chat => 
            chat.id === currentChat.id ? finalUpdatedChat : chat
          ));
          setChatSummaries(prev => prev.map(summary =>
            summary.id === currentChat.id ? { ...summary, title: chatTitle } : summary
          ));
        }

        // Start streaming response from backend (this will increment query count)
        await streamAIResponse(currentChat.id, content);
        
        // Refresh user data to update query count after completion
        await refreshUser();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Stream AI response using Server-Sent Events with proper authentication
  const streamAIResponse = async (chatId: string, userMessage: string) => {
    let assistantMessage: Message = {
      id: `msg-${Date.now()}-assistant`,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      sources: [],
    };

    // Add initial assistant message with streaming indicator
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

    const streamUrl = apiService.getAuthenticatedStreamUrl(
      userMessage, 
      searchSettings.k, 
      searchSettings.alpha
    );

    try {
      // Try modern fetch-based streaming first
      const stream = await apiService.createAuthenticatedStream(streamUrl);
      if (!stream) {
        throw new Error('Failed to create authenticated stream - no stream returned');
      }
      await handleFetchBasedStream(stream, assistantMessage);
    } catch (fetchError) {
      console.warn('Fetch-based streaming failed, falling back to EventSource:', fetchError);
      
      try {
        // Fallback to EventSource with query parameter
        const eventSource = apiService.createAuthenticatedEventSource(streamUrl);
        if (!eventSource) {
          throw new Error('Failed to create EventSource');
        }
        await handleEventSourceStream(eventSource, assistantMessage);
      } catch (eventSourceError) {
        console.error('Both streaming methods failed:', eventSourceError);
        
        // Show error message to user
        assistantMessage.content = `${AppConfig.chat.errorMessages.connectionError} ${AppConfig.api.baseUrl}.\n\nError: ${eventSourceError instanceof Error ? eventSourceError.message : AppConfig.chat.errorMessages.genericError}`;
        updateAssistantMessage(assistantMessage);
      }
    }
  };

  // Handle fetch-based streaming
  const handleFetchBasedStream = async (stream: ReadableStream<Uint8Array>, assistantMessage: Message) => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            // Parse SSE format: "event: eventname\ndata: {...}"
            if (line.startsWith('event:')) {
              continue; // Skip event type lines
            }
            
            if (line.startsWith('data:')) {
              const jsonData = line.substring(5).trim();
              if (jsonData === '') continue;
              
              const data = JSON.parse(jsonData);
              await handleStreamData(data, assistantMessage);

              // Handle completion
              if (data.status === 'completed') {
                await saveCompletedMessage(assistantMessage);
                break;
              }
            }
          } catch (parseError) {
            console.error('Error parsing SSE data:', parseError, 'Line:', line);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  // Handle EventSource streaming (fallback)
  const handleEventSourceStream = async (eventSource: EventSource, assistantMessage: Message): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        eventSource.close();
      };

      eventSource.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          await handleStreamData(data, assistantMessage);
          
          if (data.status === 'completed') {
            await saveCompletedMessage(assistantMessage);
            cleanup();
            resolve();
          }
        } catch (parseError) {
          console.error('Error parsing EventSource data:', parseError);
        }
      };

      eventSource.addEventListener('sources', async (event) => {
        try {
          const data = JSON.parse(event.data);
          await handleStreamData(data, assistantMessage);
        } catch (parseError) {
          console.error('Error parsing sources:', parseError);
        }
      });

      eventSource.addEventListener('answer_chunk', async (event) => {
        try {
          const data = JSON.parse(event.data);
          await handleStreamData(data, assistantMessage);
        } catch (parseError) {
          console.error('Error parsing answer chunk:', parseError);
        }
      });

      eventSource.addEventListener('completed', async () => {
        await saveCompletedMessage(assistantMessage);
        cleanup();
        resolve();
      });

      eventSource.onerror = (error) => {
        console.error('EventSource failed:', error);
        cleanup();
        reject(new Error('EventSource connection failed'));
      };

      // Timeout after 30 seconds
      setTimeout(() => {
        cleanup();
        reject(new Error('Stream timeout'));
      }, 30000);
    });
  };

  // Common function to handle stream data
  const handleStreamData = async (data: any, assistantMessage: Message) => {
    // Handle sources
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

    // Handle answer chunks (real-time token streaming)
    if (data.chunk !== undefined) {
      // Add the chunk content (could be a single token or multiple characters)
      assistantMessage.content += data.chunk;
      updateAssistantMessage(assistantMessage);
      
      // Handle completion
      if (data.is_final) {
        await saveCompletedMessage(assistantMessage);
      }
    }
  };

  // Update assistant message in UI
  const updateAssistantMessage = (assistantMessage: Message) => {
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
  };

  // Save completed message to backend
  const saveCompletedMessage = async (assistantMessage: Message) => {
    if (assistantMessage.content && currentChat) {
      try {
        await apiService.addMessage(currentChat.id, {
          role: 'assistant',
          content: assistantMessage.content,
          metadata: {
            sources: assistantMessage.sources,
          },
        });
        
        // Refresh user data to reflect the query count update
        await refreshUser();
      } catch (error) {
        console.error('Error saving assistant message:', error);
      }
    }
  };

  return (
    <div className={`flex flex-col h-full min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} overflow-hidden`}>
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
      <div className="hidden md:flex h-full max-h-screen overflow-hidden">
        {/* Left Sidebar - Chat History (Desktop) */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 border-r border-gray-200 dark:border-gray-700 transition-all duration-300`}>
          <Sidebar
            chats={chats}
            currentChat={currentChat}
            onSelectChat={selectChat}
            onNewChat={createNewChat}
            onDeleteChat={deleteChat}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Main Content Area (Desktop) */}
        <div className="flex-1 flex flex-col min-w-0 h-full max-h-screen overflow-hidden">
          <Navbar 
            onSettingsClick={() => setShowSettings(true)} 
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          />
          
          {/* Sources Cards (Desktop) */}
          {sources.length > 0 && (
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-4 flex-shrink-0 max-h-48 overflow-y-auto`}>
              <div className="flex items-center mb-3">
                <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Sources ({sources.length})
                </h3>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {sources.map((source) => (
                  <SourceCard key={source.id} source={source} isCompact={true} isDarkMode={isDarkMode} />
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden">
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
      <div className="flex-1 flex flex-col md:hidden overflow-hidden h-full">
        {/* Sources Cards (Mobile) */}
        {sources.length > 0 && (
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-3 flex-shrink-0 max-h-36 overflow-y-auto`}>
            <div className="flex items-center mb-2">
              <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Sources ({sources.length})
              </h3>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sources.map((source) => (
                <SourceCard key={source.id} source={source} isCompact={true} isDarkMode={isDarkMode} />
              ))}
            </div>
          </div>
        )}

        {/* Chat Area (Mobile) */}
        <div className="flex-1 min-h-0 overflow-hidden">
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
function SourceCard({ source, isCompact = false, isDarkMode = false }: { source: Source; isCompact?: boolean; isDarkMode?: boolean }) {
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

  const getLanguageBadge = (language?: string, isDark = false) => {
    if (!language) return null;
    
    const lightColors: Record<string, string> = {
      python: 'bg-blue-100 text-blue-800',
      javascript: 'bg-yellow-100 text-yellow-800',
      typescript: 'bg-blue-100 text-blue-800',
      go: 'bg-cyan-100 text-cyan-800',
      java: 'bg-red-100 text-red-800',
      rust: 'bg-orange-100 text-orange-800',
      cpp: 'bg-purple-100 text-purple-800',
      c: 'bg-gray-100 text-gray-800',
    };

    const darkColors: Record<string, string> = {
      python: 'bg-blue-800 text-blue-200',
      javascript: 'bg-yellow-800 text-yellow-200',
      typescript: 'bg-blue-800 text-blue-200',
      go: 'bg-cyan-800 text-cyan-200',
      java: 'bg-red-800 text-red-200',
      rust: 'bg-orange-800 text-orange-200',
      cpp: 'bg-purple-800 text-purple-200',
      c: 'bg-gray-600 text-gray-200',
    };

    const colors = isDark ? darkColors : lightColors;
    const colorClass = colors[language.toLowerCase()] || (isDark ? 'bg-gray-600 text-gray-200' : 'bg-gray-100 text-gray-800');

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
        {language}
      </span>
    );
  };

  return (
    <div 
      onClick={handleClick}
      className={`flex-shrink-0 cursor-pointer ${isDarkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'} border rounded-lg p-3 hover:shadow-md transition-all min-w-0 w-48 md:w-56`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate pr-2`} title={source.title}>
          {source.title.length > 25 ? source.title.substring(0, 25) + '...' : source.title}
        </h4>
        {(source as any).relevanceScore && (
          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0`}>
            {((source as any).relevanceScore * 100).toFixed(0)}%
          </span>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        {getLanguageBadge((source as any).language, isDarkMode)}
        <span className={`text-xs ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} font-medium`}>
          View
        </span>
      </div>
      
      {source.description && (
        <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mt-2 line-clamp-2`} title={source.description}>
          {source.description.length > 60 ? source.description.substring(0, 60) + '...' : source.description}
        </p>
      )}
    </div>
  );
}
