'use client';

import { useState, useEffect } from 'react';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchSettings, setSearchSettings] = useState<SearchSettings>(AppConfig.search.default);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(AppConfig.ui.sidebar.rightDefaultWidth);

  // Calculate sidebar constraints based on window size
  const getWindowWidth = () => typeof window !== 'undefined' ? window.innerWidth : 1200;
  const minRightSidebarWidth = Math.max(AppConfig.ui.sidebar.rightMinWidth, getWindowWidth() * AppConfig.ui.sidebar.rightMinWidthPercent / 100);
  const maxRightSidebarWidth = Math.min(600, getWindowWidth() * AppConfig.ui.sidebar.rightMaxWidthPercent / 100);

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

  // Handle window resize to update sidebar constraints
  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const newMinWidth = Math.max(AppConfig.ui.sidebar.rightMinWidth, windowWidth * AppConfig.ui.sidebar.rightMinWidthPercent / 100);
      const newMaxWidth = Math.min(600, windowWidth * AppConfig.ui.sidebar.rightMaxWidthPercent / 100);
      
      // Clamp current width to new constraints
      setRightSidebarWidth(prev => 
        Math.min(Math.max(prev, newMinWidth), newMaxWidth)
      );
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const createNewChat = () => {
    // Prevent creating new chat if current chat is empty
    if (currentChat && currentChat.messages.length === 0) {
      return;
    }
    
    const chatId = `chat-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
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

      // Update current chat with user message
      const updatedChat = {
        ...currentChat,
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

      // Add initial empty assistant message
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
        
        // Update chat title if it's the first exchange
        if (currentChat && currentChat.messages.length <= 2) {
          // Generate a more descriptive title from the user message
          const words = userMessage.split(' ').slice(0, AppConfig.ui.chat.maxTitleWords).join(' ');
          const title = words.length > AppConfig.ui.chat.chatTitleMaxLength ? words.slice(0, AppConfig.ui.chat.chatTitleMaxLength) + '...' : words;
          const finalTitle = title.charAt(0).toUpperCase() + title.slice(1);
          
          setCurrentChat(prev => {
            if (!prev) return prev;
            const updated = { ...prev, title: finalTitle || 'Untitled Conversation' };
            setChats(prevChats => prevChats.map(chat => 
              chat.id === prev.id ? updated : chat
            ));
            return updated;
          });
        }
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
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} overflow-hidden`}>
      {/* Left Sidebar - Chat History */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 transition-all duration-300`}>
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar 
          onSettingsClick={() => setShowSettings(true)} 
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        />
        <div className="flex-1 overflow-hidden">
          <ChatArea
            chat={currentChat}
            onSendMessage={sendMessage}
            isLoading={isLoading}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      {/* Right Sidebar - Sources */}
      <div 
        style={{ width: `${rightSidebarWidth}px` }} 
        className="flex-shrink-0 border-l border-gray-200"
      >
        <SourcesSidebar 
          sources={sources} 
          width={rightSidebarWidth}
          onWidthChange={setRightSidebarWidth}
          minWidth={minRightSidebarWidth}
          maxWidth={maxRightSidebarWidth}
        />
      </div>

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
