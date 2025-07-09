import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const ENV_FILE_PATH = path.join(process.cwd(), '.env');

export async function POST(request: NextRequest) {
  try {
    const config = await request.json();
    
    // Create environment variables content
    const envContent = `
# Core APIs
SERPAPI_KEY=${config.serpApiKey || ''}
OPENAI_API_KEY=${config.openAiKey || ''}

# WeChat Configuration
WECHAT_APP_ID=${config.wechatAppId || ''}
WECHAT_APP_SECRET=${config.wechatAppSecret || ''}

# XHS Configuration
XHS_COOKIE=${config.xhsCookie || ''}

# Google Docs Configuration
GOOGLE_DOCS_CREDENTIALS_PATH=${config.googleDocsCredentials || ''}
GOOGLE_DOCS_FOLDER_ID=${config.googleDocsFolderId || ''}

# RSS Feeds (JSON format)
RSS_FEEDS=${JSON.stringify(config.rssFeeds || [])}

# Database
DATABASE_URL=./data/marketing.db

# JWT Secret
JWT_SECRET=${process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'}

# Server Configuration
PORT=3000
NODE_ENV=development
`.trim();

    // Write to .env file
    await fs.writeFile(ENV_FILE_PATH, envContent, 'utf8');

    return NextResponse.json({ 
      success: true, 
      message: 'Configuration saved successfully' 
    });
  } catch (error) {
    console.error('Error saving configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Read current configuration from environment
    const config = {
      serpApiKey: process.env.SERPAPI_KEY || '',
      openAiKey: process.env.OPENAI_API_KEY || '',
      wechatAppId: process.env.WECHAT_APP_ID || '',
      wechatAppSecret: process.env.WECHAT_APP_SECRET || '',
      xhsCookie: process.env.XHS_COOKIE || '',
      googleDocsCredentials: process.env.GOOGLE_DOCS_CREDENTIALS_PATH || '',
      googleDocsFolderId: process.env.GOOGLE_DOCS_FOLDER_ID || '',
      rssFeeds: JSON.parse(process.env.RSS_FEEDS || '[]')
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error loading configuration:', error);
    return NextResponse.json(
      { error: 'Failed to load configuration' },
      { status: 500 }
    );
  }
}