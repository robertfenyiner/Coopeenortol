import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      },
      { status: 503 }
    );
  }
}
