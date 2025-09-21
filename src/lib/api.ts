/**
 * API utilities for backend communication
 */

import { authService } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jarvis-api.orangehealth.dev';

export interface ChatSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ChatData {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface CreateChatRequest {
  title: string;
  first_message?: string;
}

export interface AddMessageRequest {
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

export class ApiService {
  private static instance: ApiService;
  
  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /**
   * Get user's chat summaries for sidebar
   */
  async getUserChats(limit: number = 50): Promise<ChatSummary[]> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_BASE_URL}/chats?limit=${limit}`
      );
      
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to fetch chats:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      return [];
    }
  }

  /**
   * Get full chat data with messages
   */
  async getChat(chatId: string): Promise<ChatData | null> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_BASE_URL}/chats/${chatId}`
      );
      
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to fetch chat:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
      return null;
    }
  }

  /**
   * Create a new chat
   */
  async createChat(title: string, firstMessage?: string): Promise<ChatData | null> {
    try {
      const requestData: CreateChatRequest = {
        title,
        first_message: firstMessage,
      };

      const response = await authService.authenticatedFetch(
        `${API_BASE_URL}/chats`,
        {
          method: 'POST',
          body: JSON.stringify(requestData),
        }
      );
      
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to create chat:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
    }
  }

  /**
   * Add a message to an existing chat
   */
  async addMessage(chatId: string, message: AddMessageRequest): Promise<ChatData | null> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_BASE_URL}/chats/${chatId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(message),
        }
      );
      
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to add message:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error adding message:', error);
      return null;
    }
  }

  /**
   * Delete a chat
   */
  async deleteChat(chatId: string): Promise<boolean> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_BASE_URL}/chats/${chatId}`,
        {
          method: 'DELETE',
        }
      );
      
      return response.ok;
    } catch (error) {
      console.error('Error deleting chat:', error);
      return false;
    }
  }

  /**
   * Update chat title
   */
  async updateChatTitle(chatId: string, title: string): Promise<ChatData | null> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_BASE_URL}/chats/${chatId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ title }),
        }
      );
      
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to update chat title:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error updating chat title:', error);
      return null;
    }
  }

  /**
   * Get authenticated stream URL for AI responses
   */
  getAuthenticatedStreamUrl(query: string, k: number = 20, alpha: number = 0.3): string {
    const params = new URLSearchParams({
      q: query,
      k: String(k),
      alpha: String(alpha),
      detailed_response: 'true',
    });
    
    return `${API_BASE_URL}/ask/stream?${params.toString()}`;
  }

  /**
   * Create authenticated fetch-based streaming for Server-Sent Events
   * Since EventSource doesn't support custom headers, we'll use fetch with streaming
   */
  async createAuthenticatedStream(url: string): Promise<ReadableStream<Uint8Array> | null> {
    const token = authService.getToken();
    
    if (!token || !authService.isTokenValid(token)) {
      console.error('No valid authentication token available');
      return null;
    }

    try {
      console.log('Creating authenticated stream with URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        // Ensure credentials are included for CORS
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      return response.body;
    } catch (error) {
      console.error('Error creating authenticated stream:', error);
      throw error; // Re-throw so caller can handle fallback
    }
  }

  /**
   * Legacy EventSource method (fallback)
   */
  createAuthenticatedEventSource(url: string): EventSource | null {
    const token = authService.getToken();
    
    if (!token || !authService.isTokenValid(token)) {
      console.error('No valid authentication token available');
      return null;
    }

    // Unfortunately, EventSource doesn't support custom headers
    // We need to pass the token as a query parameter
    const separator = url.includes('?') ? '&' : '?';
    const urlWithToken = `${url}${separator}token=${encodeURIComponent(token)}`;
    
    console.log('Creating authenticated EventSource with URL:', urlWithToken.replace(/token=[^&]+/, 'token=***'));
    
    return new EventSource(urlWithToken);
  }
}

export const apiService = ApiService.getInstance();
