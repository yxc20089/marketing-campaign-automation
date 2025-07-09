import { NextResponse } from 'next/server';
import { getDb } from '@/lib/database';

export async function GET() {
  try {
    const db = await getDb();
    
    // Get pending content
    const pendingContent = await (db as any).allAsync(
      `SELECT * FROM content 
       WHERE status = 'pending_approval' 
       ORDER BY created_at DESC`
    );

    // Get approved content (ready to publish)
    const approvedContent = await (db as any).allAsync(
      `SELECT * FROM content 
       WHERE status = 'approved' 
       ORDER BY approved_at DESC, created_at DESC`
    );

    // Get published content (actually published to platforms)
    const publishedContent = await (db as any).allAsync(
      `SELECT * FROM content 
       WHERE status = 'published' 
       ORDER BY published_at DESC, created_at DESC`
    );

    return NextResponse.json({
      success: true,
      pending: pendingContent,
      approved: approvedContent,
      published: publishedContent
    });
  } catch (error: any) {
    console.error('Error fetching content:', error);
    
    return NextResponse.json(
      { 
        error: { 
          message: 'Failed to fetch content',
          details: error.message
        }
      },
      { status: 500 }
    );
  }
}