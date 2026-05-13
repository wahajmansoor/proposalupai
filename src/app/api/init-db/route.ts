import { execSync } from 'child_process';
import { NextResponse } from 'next/server';

/**
 * EMERGENCY DATABASE INITIALIZATION ROUTE
 * Use this to run 'prisma db push' on environments where you don't have terminal access (like Hostinger).
 * 
 * Usage: Visit https://app.proposalupai.com/api/init-db?secret=YOUR_NEXTAUTH_SECRET
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // Basic security check using your existing secret
  if (!secret || secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Run the prisma db push command
    // We use a direct path to the binary because 'npx' is missing on Hostinger
    // We also specify the schema path explicitly
    const output = execSync(`node ./node_modules/prisma/build/index.js db push --schema ./prisma/schema.prisma --accept-data-loss`, { 
      encoding: 'utf8',
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully!',
      output: output 
    });
  } catch (error: any) {
    console.error('Database initialization failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stderr: error.stderr
    }, { status: 500 });
  }
}
