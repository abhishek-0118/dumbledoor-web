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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  // Check if user is at the bottom of the chat
  const checkIfUserAtBottom = () => {
    if (!messagesContainerRef.current) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const threshold = 150; // Increased threshold - more generous detection
    return scrollTop + clientHeight >= scrollHeight - threshold;
  };

  // Handle scroll events to track user position
  const handleScroll = () => {
    setIsUserAtBottom(checkIfUserAtBottom());
  };

  // Auto-scroll only when appropriate
  useEffect(() => {
    if (!chat?.messages) return;
    
    const currentMessageCount = chat.messages.length;
    const isNewMessage = currentMessageCount > lastMessageCount;
    const lastMessage = chat.messages[chat.messages.length - 1];
    const isStreamingAssistant = isLoading && lastMessage?.role === 'assistant';
    
    // More sophisticated streaming detection
    const isStreamingUpdate = isStreamingAssistant && !isNewMessage;
    
    // Only auto-scroll if:
    // 1. User is at the bottom AND (it's a new message OR streaming and user was already at bottom)
    // 2. It's the first message in the chat
    // Do NOT scroll for streaming updates when user has scrolled up
    const shouldScroll = (isUserAtBottom && (isNewMessage || isStreamingAssistant)) || currentMessageCount <= 1;
    
    if (shouldScroll) {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: isStreamingUpdate ? 'auto' : AppConfig.ui.chat.autoScrollBehavior 
      });
    }
    
    setLastMessageCount(currentMessageCount);
  }, [chat?.messages, isUserAtBottom, isLoading]);

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

  return (
    <div className={`flex flex-col ${isDarkMode ? 'bg-gray-800' : 'bg-white'} h-full min-w-0 relative`}>
      {/* Chat Header - Hidden on mobile, shown on desktop */}
      {chat && (
        <div className={`${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'} border-b px-4 md:px-6 py-3 md:py-4 flex-shrink-0 hidden md:block`}>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{chat.title}</h2>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {chat.messages.length} messages • Last updated {format(chat.updatedAt, AppConfig.ui.chat.messageTimestampFormat)}
          </p>
        </div>
      )}

      {/* Messages Area - Scrollable container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        <div className="w-full mx-auto p-3 md:p-6 space-y-4 md:space-y-6 pb-4">
          {!chat ? (
            // Welcome screen when no chat is selected
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center max-w-md">
                <div className="relative mb-6">
                  <div className={`w-20 h-20 mx-auto rounded-full ${isDarkMode ? 'bg-gradient-to-br from-blue-600 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-purple-500'} flex items-center justify-center shadow-lg`}>
                    <img src="/jarvis.png" alt="Jarvis" className="w-10 h-10" />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${isDarkMode ? 'bg-green-500' : 'bg-green-400'} rounded-full border-2 ${isDarkMode ? 'border-gray-800' : 'border-white'} flex items-center justify-center`}>
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
                <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-3`}>
                  Welcome to {AppConfig.chat.welcomeMessages.title}
                </h2>
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-6 text-lg`}>
                  {AppConfig.chat.welcomeMessages.subtitle}
                </p>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} space-y-2`}>
                  <p className="font-medium">Try asking:</p>
                  <div className="space-y-1">
                    {AppConfig.chat.welcomeMessages.suggestions.map((suggestion, index) => (
                      <p key={index} className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} hover:${isDarkMode ? 'text-white' : 'text-gray-800'} transition-colors cursor-pointer p-2 rounded-md ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                        "{suggestion}"
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : chat.messages.length === 0 ? (
            // Empty chat state
            <div className="text-center py-8 md:py-12">
              <div className="relative mb-6">
                <div className={`w-16 h-16 mx-auto rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
                  <img src="/jarvis.png" alt="Jarvis" className="w-8 h-8" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${isDarkMode ? 'bg-blue-500' : 'bg-blue-400'} rounded-full border-2 ${isDarkMode ? 'border-gray-800' : 'border-white'} flex items-center justify-center`}>
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-lg font-medium mb-4`}>
                {AppConfig.chat.emptyStateMessages.title}
              </p>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} space-y-2`}>
                <p className="font-medium">You can ask about:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-md mx-auto">
                  {AppConfig.chat.emptyStateMessages.suggestions.map((suggestion, index) => (
                    <div key={index} className={`text-xs md:text-sm p-2 rounded-md ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Chat messages
            chat.messages.map((msg, index) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                isDarkMode={isDarkMode} 
                isStreaming={isLoading && msg.role === 'assistant' && index === chat.messages.length - 1}
              />
            ))
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
                placeholder="Ask me anything about your codebase..."
                className={`w-full p-3 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-800 placeholder-gray-500'} rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 text-sm md:text-base`}
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

function MessageBubble({ message, isDarkMode = false, isStreaming = false }: { message: Message; isDarkMode?: boolean; isStreaming?: boolean }) {
  const isUser = message.role === 'user';
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  
  // Create a stable counter that doesn't reset on re-renders
  const codeBlockCounterRef = useRef<Record<string, number>>({});
  
  // Get or initialize counter for this message
  if (!codeBlockCounterRef.current[message.id]) {
    codeBlockCounterRef.current[message.id] = 0;
  }

  const copyToClipboard = async (text: string, blockId: string) => {
    try {
      console.log('Copying text:', text.substring(0, 50) + '...', 'blockId:', blockId);
      await navigator.clipboard.writeText(text);
      console.log('Copy successful, setting copied state for:', blockId);
      setCopiedStates(prev => ({ ...prev, [blockId]: true }));
      setTimeout(() => {
        console.log('Clearing copied state for:', blockId);
        setCopiedStates(prev => ({ ...prev, [blockId]: false }));
      }, AppConfig.ui.animation.copiedIndicatorTimeout);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Blinking cursor component with visibility delay
  const BlinkingCursor = ({ delay = 100 }: { delay?: number }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      
      return () => clearTimeout(timer);
    }, [delay]);

    if (!isVisible) return null;

    return (
      <span 
        className={`inline-block w-0.5 h-5 ml-1 ${isDarkMode ? 'bg-blue-400' : 'bg-blue-600'} rounded-sm animate-pulse`}
        style={{
          animation: 'blink 1.2s infinite'
        }}
      />
    );
  };

  // Helper function to detect if inline code is likely a function/variable reference
  const isFunctionReference = (codeText: string): boolean => {
    const text = codeText.trim();
    
    // Function name patterns (camelCase, snake_case, PascalCase)
    const functionPatterns = [
      /^[a-zA-Z_$][a-zA-Z0-9_$]*\(\)$/, // functionName()
      /^[a-zA-Z_$][a-zA-Z0-9_$.]*\.[a-zA-Z_$][a-zA-Z0-9_$]*\(\)$/, // object.method()
      /^[a-zA-Z_$][a-zA-Z0-9_$]*$/, // functionName or variableName
      /^[A-Z][a-zA-Z0-9_]*$/, // ClassName or CONSTANT
      /^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/, // camelCase
      /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/, // snake_case
      /^[a-zA-Z_$][a-zA-Z0-9_$.]*\.[a-zA-Z_$][a-zA-Z0-9_$]*$/, // object.property
      /^[a-zA-Z_$][a-zA-Z0-9_$]*::[a-zA-Z_$][a-zA-Z0-9_$]*$/, // namespace::function (C++)
      /^[a-z]+[A-Z][a-zA-Z0-9]*$/, // camelCase starting with lowercase
    ];
    
    // Check if it matches function/variable patterns
    const isFunction = functionPatterns.some(pattern => pattern.test(text));
    
    // Exclude if it looks like a code snippet (contains operators, keywords, etc.)
    const codeSnippetPatterns = [
      /[{}[\]();,]/g, // Contains brackets, braces, semicolons
      /\s*[=<>!+\-*/%&|^~]\s*/g, // Contains operators  
      /\s+(if|else|for|while|function|class|const|let|var|return|import|export|from|async|await|try|catch)\s+/gi, // Contains keywords
      /^\s*\/\/|^\s*\/\*|\*\/\s*$/, // Contains comments
      /\n|\r/, // Multi-line
      /^https?:\/\//, // URLs
      /\s{2,}/, // Multiple spaces
    ];
    
    const isCodeSnippet = codeSnippetPatterns.some(pattern => pattern.test(text));
    
    // Short single words or function calls are likely references
    const isShortReference = text.length <= 50 && !text.includes(' ') && !text.includes('\n');
    
    return isFunction && !isCodeSnippet && isShortReference;
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
              const currentCounter = codeBlockCounterRef.current[message.id]++;
              const blockId = `code-${message.id}-${currentCounter}`;
              const codeText = String(children).replace(/\n$/, ''); // Remove trailing newline
              const isCopied = copiedStates[blockId];
              
              return (
                <div className="my-3 max-w-full">
                  <div className="bg-gray-800 text-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-700 border-b border-gray-600">
                      <span className="text-sm font-medium text-gray-300">
                        {language || 'Code'}
                      </span>
                      <button
                        onClick={() => {
                          console.log('Button clicked for blockId:', blockId, 'isCopied:', isCopied);
                          copyToClipboard(codeText, blockId);
                        }}
                        className={`flex items-center space-x-2 transition-all duration-200 px-2 py-1 rounded text-xs font-medium ${
                          isCopied 
                            ? 'text-green-300 bg-green-800/30 border border-green-600/50' 
                            : 'text-gray-300 hover:text-white hover:bg-gray-600 border border-transparent'
                        }`}
                        title={isCopied ? "Copied!" : "Copy code"}
                      >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                        <span className={isCopied ? 'text-green-300' : ''}>
                          {isCopied ? 'Copied!' : 'Copy'}
                        </span>
                      </button>
                    </div>
                    <pre className="p-4 text-sm max-w-full code-wrap">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                </div>
              );
            }
            
            // Handle inline code - distinguish between function references and code snippets
            const codeText = String(children);
            const isFunction = isFunctionReference(codeText);
            
            if (isFunction) {
              // Function/variable reference - red and bold with better contrast
              return (
                <code 
                  className={`font-mono text-sm code-function-ref ${
                    isDarkMode 
                      ? 'text-red-300 bg-red-900/30 border border-red-700/50' 
                      : 'text-red-700 bg-red-100 border border-red-300/50'
                  } px-2 py-1 rounded shadow-sm`}
                  {...props}
                >
                  {children}
                </code>
              );
            } else {
              // Regular inline code snippet - improved styling
              return (
                <code 
                  className={`font-mono text-sm font-medium ${
                    isDarkMode 
                      ? 'text-blue-300 bg-blue-900/30 border border-blue-700/50' 
                      : 'text-blue-700 bg-blue-100 border border-blue-300/50'
                  } px-2 py-1 rounded shadow-sm`}
                  {...props}
                >
                  {children}
                </code>
              );
            }
          },
          pre({ children, ...props }) {
            // Return the pre element directly without wrapping in p
            return (
              <pre className="bg-gray-800 text-gray-200 p-4 rounded-lg text-sm my-3 max-w-full code-wrap" {...props}>
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
            return <ul className="list-disc list-inside mb-2 flex flex-wrap gap-x-4 gap-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-2 flex flex-wrap gap-x-4 gap-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="ml-2 inline-block">{children}</li>;
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
                  <div className={`w-2 h-2 ${isDarkMode ? 'bg-blue-400' : 'bg-blue-500'} rounded-full animate-bounce`}></div>
                  <div className={`w-2 h-2 ${isDarkMode ? 'bg-purple-400' : 'bg-purple-500'} rounded-full animate-bounce`} style={{ animationDelay: '0.1s' }}></div>
                  <div className={`w-2 h-2 ${isDarkMode ? 'bg-green-400' : 'bg-green-500'} rounded-full animate-bounce`} style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Jarvis is thinking...</span>
              </div>
            ) : (
              <div className="flex items-start">
                <div className="flex-1">
                  {formatContent(message.content)}
                </div>
                {!isUser && isStreaming && (
                  <BlinkingCursor delay={200} />
                )}
              </div>
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
