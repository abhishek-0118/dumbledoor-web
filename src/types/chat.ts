export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  sources?: Source[];
}

export interface Source {
  id: string;
  title: string;
  url: string;
  description?: string;
  language?: string;
  fileType?: string;
  relevanceScore?: number;
  isTest?: boolean;
  isConfig?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  userId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}
