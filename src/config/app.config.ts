export const AppConfig = {
  app: {
    name: 'Jarvis',
    version: '1.0.0',
    description: 'AI-powered code assistant for analyzing and understanding codebases',
  },

  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://jarvis.orangehealth.dev',    //'http://13.234.30.39:8001',     //
    endpoints: {
      askStream: '/ask/stream',
      health: '/health',
      docs: '/docs',
    },
    timeout: 5000, // 5 seconds
  },

  // UI Configuration
  ui: {
    sidebar: {
      leftDefaultWidth: 256,
      leftCollapsedWidth: 64,
      rightDefaultWidth: 384,
      rightMinWidth: 120,
      rightMaxWidthPercent: 40,
      rightMinWidthPercent: 10,
      sourceCardMaxTitleLength: 30,
      sourceCardMaxDescriptionLength: 200,
      sourceCardNarrowMaxTitleLength: 20,
      sourceCardNarrowMaxDescriptionLength: 100,
      sourceCardNarrowBreakpoint: 250,
      sourceCardVeryNarrowBreakpoint: 180,
    },
    
    chat: {
      maxMessageLength: 4000,
      typingIndicatorTimeout: 2000,
      autoScrollBehavior: 'smooth' as ScrollBehavior,
      messageTimestampFormat: 'h:mm a',
      chatTitleMaxLength: 50,
      maxTitleWords: 6,
    },

    animation: {
      loadingMessageInterval: 1500,
      copiedIndicatorTimeout: 2000,
      typingDotDelay: 100,
      sidebarTransitionDuration: 300,
      loadingAnimationDelay: 800,
      typingIndicatorDelay: 1000,
    },

    colors: {
      primary: 'blue',
      success: 'green',
      warning: 'yellow',
      danger: 'red',
      info: 'purple',
    },
  },

  chat: {
    loadingMessages: [
      'Analyzing the codebase',
      'Searching through files',
      'Processing your query',
      'Finding relevant code',
      'Generating insights',
      'Reviewing code patterns',
      'Exploring dependencies',
      'Understanding context',
    ],
    
    welcomeMessages: {
      title: 'Welcome to Jarvis',
      subtitle: 'Ask questions about your codebase and get AI-powered insights',
      suggestions: [
        'How does the authentication work?',
        'Show me the API endpoints',
        'Explain the database schema',
      ],
    },

    emptyStateMessages: {
      title: 'Start asking questions about your codebase!',
      suggestions: [
        'Code functionality and structure',
        'Implementation details',
        'Best practices and patterns',
        'Debugging and troubleshooting',
      ],
    },

    errorMessages: {
      connectionError: "I apologize, but I'm having trouble connecting to the backend service. Please ensure the backend server is running.",
      genericError: 'Something went wrong. Please try again.',
      noResponse: 'No response received from the server.',
    },

    defaultChat: {
      title: 'New Chat',
      userId: 'guest',
    },

    defaultNewChatTitle: 'New Conversation',
  },

  search: {
    default: {
      k: 10,
      searchType: 'hybrid' as 'hybrid' | 'semantic' | 'keyword',
      alpha: 0.3,
      detailedResponse: true,
    },
    
    limits: {
      minK: 5,
      maxK: 30,
      minAlpha: 0,
      maxAlpha: 1,
      alphaStep: 0.1,
    },

    types: [
      {
        value: 'hybrid',
        label: 'Hybrid Search',
        description: 'Combines semantic and keyword search for best results',
      },
      {
        value: 'semantic',
        label: 'Semantic Search',
        description: 'Uses AI to understand meaning and context',
      },
      {
        value: 'keyword',
        label: 'Keyword Search',
        description: 'Traditional text-based search',
      },
    ],
  },

  github: {
    baseUrl: 'https://github.com',
    defaultOrganization: 'Orange-Health',
    defaultBranch: 'main',
  },

  user: {
    defaultName: 'Guest User',
    defaultAvatar: null,
  },

  development: {
    enableDebugLogs: process.env.NODE_ENV === 'development',
    mockDelay: 1000, // For testing loading states
  },

  env: {
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },
} as const;

export type AppConfigType = typeof AppConfig;
export type SearchType = typeof AppConfig.search.default.searchType;
export type ColorType = typeof AppConfig.ui.colors[keyof typeof AppConfig.ui.colors];

export const getApiUrl = (endpoint: keyof typeof AppConfig.api.endpoints): string => {
  return `${AppConfig.api.baseUrl}${AppConfig.api.endpoints[endpoint]}`;
};

export const buildStreamUrl = (query: string, k?: number, alpha?: number): string => {
  const params = new URLSearchParams({
    q: query,
    k: String(k || AppConfig.search.default.k),
    alpha: String(alpha || AppConfig.search.default.alpha),
    detailed_response: String(AppConfig.search.default.detailedResponse),
  });
  
  return `${getApiUrl('askStream')}?${params.toString()}`;
};

export const generateGitHubUrl = (repoName?: string, path?: string): string => {
  if (!repoName || !path) return '#';
  
  if (repoName.includes('/')) {
    return `${AppConfig.github.baseUrl}/${repoName}/blob/${AppConfig.github.defaultBranch}/${path}`;
  }
  
  return `${AppConfig.github.baseUrl}/${AppConfig.github.defaultOrganization}/${repoName}/blob/${AppConfig.github.defaultBranch}/${path}`;
};

export default AppConfig;
