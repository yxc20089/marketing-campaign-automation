import { NextResponse } from 'next/server';
import { getDb } from '@/lib/database';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const contentId = parseInt(params.id);
    
    if (isNaN(contentId)) {
      return NextResponse.json(
        { error: { message: 'Invalid content ID' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    // Update content status to approved
    await (db as any).runAsync(
      `UPDATE content 
       SET status = 'approved', approved_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      contentId
    );

    // Get the updated content
    const updatedContent = await (db as any).getAsync(
      'SELECT * FROM content WHERE id = ?',
      contentId
    );

    return NextResponse.json({
      success: true,
      content: updatedContent,
      message: 'Content approved successfully'
    });
  } catch (error: any) {
    console.error('Error approving content:', error);
    
    return NextResponse.json(
      { 
        error: { 
          message: 'Failed to approve content',
          details: error.message
        }
      },
      { status: 500 }
    );
  }
}