'use client';

import ChatInterface from '@/components/ChatInterface';
import { AppConfig } from '@/config/app.config';

export default function Home() {
  return (
    <div className="min-h-screen">
      <ChatInterface />
    </div>
  );
}
