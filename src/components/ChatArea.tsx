'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Copy, Check } from 'lucide-react';
import { Chat, Message } from '@/types/chat';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import { AppConfig } from '@/config/app.config';

interface ChatAreaProps {
  chat: Chat | null;
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isDarkMode?: boolean;
}

export default function ChatArea({ chat, onSendMessage, isLoading, isDarkMode = false }: ChatAreaProps) {
  const [message, setMessage] = useState('');
  const [loadingText, setLoadingText] = useState('Analyzing the codebase');
  const [isTyping, setIsTyping] = useState(false);
  const [showTypingAnimation, setShowTypingAnimation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cycling loading messages
  useEffect(() => {
    if (!isLoading) {
      setIsTyping(false);
      setShowTypingAnimation(false);
      return;
    }
    
    const messages = AppConfig.chat.loadingMessages;
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setLoadingText(messages[currentIndex]);
    }, AppConfig.ui.animation.loadingMessageInterval);
    
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (chat?.messages && chat.messages.length > 0) {
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.content && isLoading) {
        setTimeout(() => {
          setShowTypingAnimation(true);
        }, AppConfig.ui.animation.loadingAnimationDelay);
        
        setTimeout(() => {
          setIsTyping(true);
          setLoadingText('AI is responding');
        }, AppConfig.ui.animation.typingIndicatorDelay);
      }
    }
  }, [chat?.messages, isLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: AppConfig.ui.chat.autoScrollBehavior });
  }, [chat?.messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!chat) {
    return (
      <div className={`flex-1 flex items-center justify-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="text-center">
          <img src="/jarvis.png" alt="Jarvis" className="w-16 h-16 mx-auto mb-4 opacity-60" />
          <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-2`}>
            {AppConfig.chat.welcomeMessages.title}
          </h2>
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
            {AppConfig.chat.welcomeMessages.subtitle}
          </p>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} space-y-1`}>
            <p>Try asking:</p>
            {AppConfig.chat.welcomeMessages.suggestions.map((suggestion, index) => (
              <p key={index}>• "{suggestion}"</p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col ${isDarkMode ? 'bg-gray-800' : 'bg-white'} h-full min-w-0 relative`}>
      {/* Chat Header - Hidden on mobile, shown on desktop */}
      <div className={`${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'} border-b px-4 md:px-6 py-3 md:py-4 flex-shrink-0 hidden md:block`}>
        <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{chat.title}</h2>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {chat.messages.length} messages • Last updated {format(chat.updatedAt, AppConfig.ui.chat.messageTimestampFormat)}
        </p>
      </div>

      {/* Messages Area - Scrollable container */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full mx-auto p-3 md:p-6 space-y-4 md:space-y-6 pb-4">
          {chat.messages.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <img src="/jarvis.png" alt="Jarvis" className="w-12 h-12 mx-auto mb-4 opacity-60" />
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm md:text-base`}>
                {AppConfig.chat.emptyStateMessages.title}
              </p>
              <div className={`mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} space-y-1`}>
                <p>You can ask about:</p>
                {AppConfig.chat.emptyStateMessages.suggestions.map((suggestion, index) => (
                  <p key={index} className="text-xs md:text-sm">• {suggestion}</p>
                ))}
              </div>
            </div>
          ) : (
            chat.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isDarkMode={isDarkMode} />
            ))
          )}

          {isLoading && (
            <div className={`flex flex-col items-center justify-center space-y-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} py-8 md:py-12`}>
              <div className="relative">
                {showTypingAnimation && isTyping ? (
                  <div className={`w-12 h-12 md:w-16 md:h-16 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full flex items-center justify-center`}>
                    <div className="flex space-x-1">
                      <div className={`w-1.5 h-1.5 md:w-2 md:h-2 ${isDarkMode ? 'bg-green-400' : 'bg-green-500'} rounded-full animate-bounce`}></div>
                      <div className={`w-1.5 h-1.5 md:w-2 md:h-2 ${isDarkMode ? 'bg-green-400' : 'bg-green-500'} rounded-full animate-bounce`} style={{ animationDelay: '0.1s' }}></div>
                      <div className={`w-1.5 h-1.5 md:w-2 md:h-2 ${isDarkMode ? 'bg-green-400' : 'bg-green-500'} rounded-full animate-bounce`} style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`w-12 h-12 md:w-16 md:h-16 border-4 ${isDarkMode ? 'border-gray-600 border-t-blue-400' : 'border-gray-200 border-t-blue-500'} rounded-full animate-spin`}></div>
                    <div className={`absolute inset-0 w-12 h-12 md:w-16 md:h-16 border-4 ${isDarkMode ? 'border-gray-700 border-r-purple-400' : 'border-gray-100 border-r-purple-500'} rounded-full animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                    <img src="/jarvis.png" alt="Jarvis" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 md:hidden" />
                    <img src="/jarvis.png" alt="Jarvis" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 hidden md:block" />
                  </>
                )}
              </div>
              
              <div className="text-center px-4">
                <div className={`text-lg md:text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-2 transition-all duration-500`}>
                  {loadingText}
                </div>
                <div className={`flex items-center justify-center space-x-1 text-xs md:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span>{showTypingAnimation && isTyping ? 'AI is typing' : 'Please wait while I process your request'}</span>
                  <div className="flex space-x-1 ml-2">
                    <div className={`w-1 h-1 md:w-1.5 md:h-1.5 ${isDarkMode ? (showTypingAnimation && isTyping ? 'bg-green-400' : 'bg-blue-400') : (showTypingAnimation && isTyping ? 'bg-green-500' : 'bg-blue-500')} rounded-full animate-bounce`}></div>
                    <div className={`w-1 h-1 md:w-1.5 md:h-1.5 ${isDarkMode ? (showTypingAnimation && isTyping ? 'bg-green-400' : 'bg-blue-400') : (showTypingAnimation && isTyping ? 'bg-green-500' : 'bg-blue-500')} rounded-full animate-bounce`} style={{ animationDelay: '0.1s' }}></div>
                    <div className={`w-1 h-1 md:w-1.5 md:h-1.5 ${isDarkMode ? (showTypingAnimation && isTyping ? 'bg-green-400' : 'bg-blue-400') : (showTypingAnimation && isTyping ? 'bg-green-500' : 'bg-blue-500')} rounded-full animate-bounce`} style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
              
              {!showTypingAnimation && !isTyping && (
                <div className="flex space-x-1 md:space-x-2">
                  <div className={`w-1.5 h-1.5 md:w-2 md:h-2 ${isDarkMode ? 'bg-blue-400' : 'bg-blue-500'} rounded-full animate-pulse`}></div>
                  <div className={`w-1.5 h-1.5 md:w-2 md:h-2 ${isDarkMode ? 'bg-purple-400' : 'bg-purple-500'} rounded-full animate-pulse`} style={{ animationDelay: '0.2s' }}></div>
                  <div className={`w-1.5 h-1.5 md:w-2 md:h-2 ${isDarkMode ? 'bg-green-400' : 'bg-green-500'} rounded-full animate-pulse`} style={{ animationDelay: '0.4s' }}></div>
                  <div className={`w-1.5 h-1.5 md:w-2 md:h-2 ${isDarkMode ? 'bg-yellow-400' : 'bg-yellow-500'} rounded-full animate-pulse`} style={{ animationDelay: '0.6s' }}></div>
                  <div className={`w-1.5 h-1.5 md:w-2 md:h-2 ${isDarkMode ? 'bg-red-400' : 'bg-red-500'} rounded-full animate-pulse`} style={{ animationDelay: '0.8s' }}></div>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input - Fixed at bottom with proper safe area */}
      <div className={`${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'} border-t flex-shrink-0 sticky bottom-0 safe-area-padding-bottom`}>
        <div className="w-full mx-auto p-3 md:p-4">
          <form onSubmit={handleSubmit} className="flex items-end space-x-2 md:space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your codebase..."
                className={`w-full p-3 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-800'} rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 text-sm md:text-base`}
                rows={1}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              className="bg-blue-600 text-white p-2.5 md:p-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send size={18} className="md:hidden" />
              <Send size={20} className="hidden md:block" />
            </button>
          </form>
          <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-center md:block hidden`}>
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, isDarkMode = false }: { message: Message; isDarkMode?: boolean }) {
  const isUser = message.role === 'user';
  const [copiedStates, setCopiedStates] = useState<Record<number, boolean>>({});

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [index]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [index]: false }));
      }, AppConfig.ui.animation.copiedIndicatorTimeout);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatContent = (content: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const inline = !(props as any).inline === false;
            
            if (!inline) {
              return (
                <div className="my-3 max-w-full">
                  <div className="bg-gray-800 text-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-700 border-b border-gray-600">
                      <span className="text-sm font-medium text-gray-300">
                        {language || 'Code'}
                      </span>
                      <button
                        onClick={() => copyToClipboard(String(children), Math.random())}
                        className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors p-1 rounded"
                        title="Copy code"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-sm max-w-full">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                </div>
              );
            }
            
            return (
              <code 
                className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children, ...props }) {
            // Return the pre element directly without wrapping in p
            return (
              <pre className="bg-gray-800 text-gray-200 p-4 rounded-lg overflow-x-auto text-sm my-3 max-w-full" {...props}>
                {children}
              </pre>
            );
          },
          p({ children, node, ...props }) {
            // Check if the paragraph contains block-level elements
            const hasBlockElements = node?.children?.some((child: any) => 
              child.type === 'element' && 
              ['div', 'pre', 'blockquote', 'ul', 'ol', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(child.tagName)
            );
            
            // If it contains block elements, render as div to avoid nesting issues
            if (hasBlockElements) {
              return <div className="mb-2 last:mb-0" {...props}>{children}</div>;
            }
            
            return <p className="mb-2 last:mb-0" {...props}>{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="ml-2">{children}</li>;
          },
          h1({ children }) {
            return <h1 className="text-lg font-bold mb-2">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-md font-bold mb-2">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-sm font-bold mb-2">{children}</h3>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-2 max-w-full">
                <table className="min-w-full border border-gray-300 text-sm">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold text-left">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-gray-300 px-2 py-1">
                {children}
              </td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-1 md:px-0`}>
      <div className={`flex w-full max-w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2 md:space-x-3`}>
        <div className={`flex-shrink-0 ${isUser ? 'ml-2 md:ml-3' : 'mr-2 md:mr-3'}`}>
          <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-blue-600' : 'bg-orange-500'
          }`}>
            {isUser ? (
              <>
                <User size={14} className="text-white md:hidden" />
                <User size={16} className="text-white hidden md:block" />
              </>
            ) : (
              <>
                <img src="/jarvis.png" alt="Jarvis" className="w-3.5 h-3.5 md:hidden" />
                <img src="/jarvis.png" alt="Jarvis" className="w-4 h-4 hidden md:block" />
              </>
            )}
          </div>
        </div>

        <div className={`rounded-lg px-3 py-2 md:px-4 md:py-3 ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : isDarkMode 
              ? 'bg-gray-700 text-gray-100'
              : 'bg-gray-100 text-gray-900'
        } max-w-none break-words min-w-0 flex-1`}>
          <div className={`text-sm md:text-base whitespace-pre-wrap ${
            isUser 
              ? 'text-white' 
              : isDarkMode 
                ? 'text-gray-100' 
                : 'text-gray-800'
          }`}>
            {!isUser && message.content === '' ? (
              // Show streaming animation for empty assistant messages
              <div className="flex items-center space-x-2 py-2">
                <div className={`flex space-x-1`}>
                  <div className={`w-2 h-2 ${isDarkMode ? 'bg-gray-400' : 'bg-gray-500'} rounded-full animate-bounce`}></div>
                  <div className={`w-2 h-2 ${isDarkMode ? 'bg-gray-400' : 'bg-gray-500'} rounded-full animate-bounce`} style={{ animationDelay: '0.1s' }}></div>
                  <div className={`w-2 h-2 ${isDarkMode ? 'bg-gray-400' : 'bg-gray-500'} rounded-full animate-bounce`} style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Jarvis is thinking...</span>
              </div>
            ) : (
              formatContent(message.content)
            )}
          </div>
          <p className={`text-xs mt-1 md:mt-2 ${
            isUser 
              ? 'text-blue-200' 
              : isDarkMode 
                ? 'text-gray-400' 
                : 'text-gray-500'
          }`}>
            {format(message.timestamp, AppConfig.ui.chat.messageTimestampFormat)}
          </p>
        </div>
      </div>
    </div>
  );
}
