import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, invalidateSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (session) {
      // Invalidate the session in database
      await invalidateSession(session.sessionId);
    }

    // Clear cookie
    const cookieStore = cookies();
    cookieStore.delete('auth_token');

    // Redirect to home page
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still clear cookie even if error
    const cookieStore = cookies();
    cookieStore.delete('auth_token');
    
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
