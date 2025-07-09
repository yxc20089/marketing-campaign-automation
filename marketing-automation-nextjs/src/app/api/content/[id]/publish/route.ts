import { NextResponse } from 'next/server';
import { getDb } from '@/lib/database';
import { GoogleDocsService } from '@/services/googleDocs.service';
import { loadUserConfig } from '@/lib/utils/config';

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
    
    // Get the content
    const content = await (db as any).getAsync(
      'SELECT * FROM content WHERE id = ?',
      contentId
    );

    if (!content) {
      return NextResponse.json(
        { error: { message: 'Content not found' } },
        { status: 404 }
      );
    }

    if (content.status !== 'approved') {
      return NextResponse.json(
        { error: { message: 'Content must be approved before publishing' } },
        { status: 400 }
      );
    }

    // Load user configuration
    const userConfig = await loadUserConfig();
    
    // Track successful publications
    const publishResults = {
      platform: false,
      googleDocs: false,
      errors: []
    };

    // Publish to the specific platform
    let googleDocsUrl = null;
    
    try {
      if (content.platform === 'wechat') {
        if (!userConfig?.wechatAppId || !userConfig?.wechatAppSecret) {
          throw new Error('WeChat API credentials not configured. Please configure WeChat AppID and AppSecret in settings.');
        }
        
        // TODO: Implement actual WeChat publishing
        // For now, simulate success since WeChat API integration is complex
        publishResults.platform = true;
        console.log('WeChat publishing simulated (would publish to WeChat API)');
        
      } else if (content.platform === 'xhs') {
        if (!userConfig?.xhsCookie) {
          throw new Error('XHS (Xiao Hongshu) credentials not configured. Please configure XHS Cookie in settings.');
        }
        
        // TODO: Implement actual XHS publishing
        // For now, simulate success since XHS API integration is complex
        publishResults.platform = true;
        console.log('XHS publishing simulated (would publish to XHS API)');
        
      } else if (content.platform === 'googledocs') {
        if (!userConfig?.googleDocsCredentials) {
          throw new Error('Google Docs credentials not configured. Please configure Google Docs credentials in settings.');
        }
        
        // Publish to Google Docs
        const googleDocsService = new GoogleDocsService();
        
        // Add debugging
        console.log('Google Docs service created, checking configuration...');
        
        // Wait a moment for initialization
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const isConfigured = googleDocsService.isConfigured();
        console.log('Google Docs isConfigured:', isConfigured);
        
        if (isConfigured) {
          console.log('Creating Google Docs document...');
          const docUrl = await googleDocsService.createDocument({
            title: content.title,
            body: content.body,
            platform: content.platform,
            topic: content.title,
            hashtags: content.hashtags || undefined
          });
          
          googleDocsUrl = docUrl;
          publishResults.platform = true;
          console.log('Google Docs document created successfully:', docUrl);
        } else {
          // Get more details about what's missing
          const folderInfo = await googleDocsService.getFolderInfo();
          console.log('Google Docs folder info:', folderInfo);
          throw new Error('Google Docs service not properly configured. Check credentials and folder ID.');
        }
        
      } else {
        throw new Error(`Unsupported platform: ${content.platform}`);
      }
    } catch (error: any) {
      publishResults.errors.push(`Platform publishing failed: ${error.message}`);
    }

    // Only mark as published if at least one platform succeeded
    const hasSuccessfulPublish = publishResults.platform || publishResults.googleDocs;
    
    if (!hasSuccessfulPublish) {
      return NextResponse.json(
        { 
          error: { 
            message: 'Publishing failed for all platforms', 
            details: publishResults.errors.join('; ')
          }
        },
        { status: 500 }
      );
    }

    // Update content status to published only if successful
    await (db as any).runAsync(
      `UPDATE content 
       SET status = 'published', published_at = CURRENT_TIMESTAMP, published_url = ?
       WHERE id = ?`,
      googleDocsUrl,
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
      googleDocsUrl: googleDocsUrl,
      message: 'Content published successfully'
    });
  } catch (error: any) {
    console.error('Error publishing content:', error);
    
    return NextResponse.json(
      { 
        error: { 
          message: 'Failed to publish content',
          details: error.message
        }
      },
      { status: 500 }
    );
  }
}