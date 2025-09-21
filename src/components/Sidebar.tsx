'use client';

import { useState } from 'react';
import { Plus, MessageSquare, Trash2, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { Chat } from '@/types/chat';
import { format } from 'date-fns';

interface SidebarProps {
  chats: Chat[];
  currentChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  chats,
  currentChat,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null);

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col transition-all duration-300">
      {/* Header with toggle */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!collapsed && <h2 className="text-lg font-semibold">Chats</h2>}
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={onNewChat}
          onContextMenu={(e) => {
            e.preventDefault();
            onNewChat();
          }}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-center space-x-2'} bg-gray-700 hover:bg-gray-600 rounded-lg py-3 px-4 transition-colors`}
          title={collapsed ? "New Chat (Left or Right click)" : "New Chat (Left or Right click)"}
        >
          <Plus size={18} />
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`relative group mb-1 rounded-lg ${
                currentChat?.id === chat.id
                  ? 'bg-gray-700'
                  : 'hover:bg-gray-700'
              }`}
            >
              <button
                onClick={() => onSelectChat(chat)}
                className={`w-full text-left p-3 rounded-lg flex items-start ${collapsed ? 'justify-center' : 'space-x-3'}`}
                title={collapsed ? chat.title : undefined}
              >
                <MessageSquare size={16} className="mt-0.5 flex-shrink-0" />
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">
                      {chat.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(chat.updatedAt, 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </button>

              {/* Delete Menu - only show when not collapsed */}
              {!collapsed && (
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteMenu(showDeleteMenu === chat.id ? null : chat.id);
                    }}
                    className="p-1 hover:bg-gray-600 rounded"
                  >
                    <MoreVertical size={14} />
                  </button>

                  {showDeleteMenu === chat.id && (
                    <div className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                          setShowDeleteMenu(null);
                        }}
                        className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-700 text-red-400"
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {chats.length === 0 && !collapsed && (
            <div className="text-center text-gray-400 py-8">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">No chats yet</p>
              <p className="text-xs mt-1">Start a new conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-center space-x-2">
            <img src="/jarvis.png" alt="Jarvis" className="w-4 h-4" />
            <p className="text-xs text-gray-400">
              Jarvis v1.0
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
