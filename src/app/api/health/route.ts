import { NextRequest, NextResponse } from 'next/server';
import { AppConfig } from '@/config/app.config';

export async function GET(request: NextRequest) {
  try {
    // Basic health check
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: AppConfig.app.version,
      environment: AppConfig.env.nodeEnv,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
      },
      services: {
        frontend: 'operational',
        backend: 'unknown' as string,
      },
    };

    // Optional: Check backend connectivity
    try {
      const backendHealthUrl = `${AppConfig.api.baseUrl}/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const backendResponse = await fetch(backendHealthUrl, {
        signal: controller.signal,
        method: 'GET',
      });
      
      clearTimeout(timeoutId);
      
      if (backendResponse.ok) {
        healthData.services.backend = 'operational';
      } else {
        healthData.services.backend = 'degraded';
      }
    } catch (error) {
      healthData.services.backend = 'unavailable';
    }

    return NextResponse.json(healthData, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      version: AppConfig.app.version,
    };

    return NextResponse.json(errorData, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
}
