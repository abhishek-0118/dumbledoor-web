/**
 * Authentication utilities for JWT token management and API requests
 */

import Cookies from 'js-cookie';

const TOKEN_KEY = 'jarvis_token';
const USER_KEY = 'jarvis_user';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  settings: {
    query_limit: number;
    queries_used: number;
    reset_date: string;
  };
  created_at: string;
  last_login?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

export class AuthService {
  private static instance: AuthService;
  
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Store authentication token
   */
  setToken(token: string): void {
    Cookies.set(TOKEN_KEY, token, { 
      expires: 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  }

  /**
   * Get stored authentication token
   */
  getToken(): string | null {
    return Cookies.get(TOKEN_KEY) || null;
  }

  /**
   * Remove authentication token
   */
  removeToken(): void {
    Cookies.remove(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /**
   * Store user information in localStorage
   */
  setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  /**
   * Get stored user information
   */
  getUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem(USER_KEY);
      }
    }
    return null;
  }

  /**
   * Check if token is valid (not expired)
   */
  isTokenValid(token: string): boolean {
    try {
      // Simple JWT validation without full decode
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp ? payload.exp > currentTime : false;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return token ? this.isTokenValid(token) : false;
  }

  /**
   * Get authorization headers for API requests
   */
  getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    if (token && this.isTokenValid(token)) {
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    }
    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make authenticated API request
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      this.removeToken();
      window.location.href = '/auth/signin';
    }

    return response;
  }

  /**
   * Fetch current user information from API
   */
  async fetchUserInfo(): Promise<User | null> {
    try {
      const response = await this.authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/auth/me`);
      
      if (response.ok) {
        const user = await response.json();
        this.setUser(user);
        return user;
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
    return null;
  }

  /**
   * Initiate Google OAuth login
   */
  async initiateGoogleLogin(): Promise<string> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/auth/google/login`);
      const data = await response.json();
      return data.auth_url;
    } catch (error) {
      console.error('Error initiating Google login:', error);
      throw new Error('Failed to initiate Google login');
    }
  }

  /**
   * Handle login with token
   */
  async login(token: string): Promise<User> {
    this.setToken(token);
    const user = await this.fetchUserInfo();
    if (!user) {
      this.removeToken();
      throw new Error('Failed to fetch user information');
    }
    return user;
  }

  /**
   * Handle logout
   */
  logout(): void {
    this.removeToken();
    window.location.href = '/auth/signin';
  }

  /**
   * Check URL for token parameter and handle OAuth redirect
   */
  handleOAuthRedirect(): string | null {
    if (typeof window === 'undefined') return null;
    
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      // Remove token from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, document.title, url.pathname);
      
      return token;
    }
    
    return null;
  }
}

export const authService = AuthService.getInstance();
