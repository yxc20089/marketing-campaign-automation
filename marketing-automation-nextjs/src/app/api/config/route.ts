import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const USER_CONFIG_PATH = path.join(process.cwd(), 'user-config.json');

export async function POST(request: NextRequest) {
  try {
    const config = await request.json();
    
    // Save user configuration to JSON file
    const userConfig = {
      serpApiKey: config.serpApiKey || '',
      openAiKey: config.openAiKey || '',
      wechatAppId: config.wechatAppId || '',
      wechatAppSecret: config.wechatAppSecret || '',
      xhsCookie: config.xhsCookie || '',
      googleDocsCredentials: config.googleDocsCredentials || '',
      googleDocsFolderId: config.googleDocsFolderId || '',
      rssFeeds: config.rssFeeds || [
        { url: 'https://techcrunch.com/feed/', name: 'TechCrunch' },
        { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge' }
      ],
      updatedAt: new Date().toISOString()
    };

    // Write to user-config.json file
    await fs.writeFile(USER_CONFIG_PATH, JSON.stringify(userConfig, null, 2), 'utf8');

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
    // Try to read user configuration from file first
    try {
      const userConfigData = await fs.readFile(USER_CONFIG_PATH, 'utf8');
      const userConfig = JSON.parse(userConfigData);
      return NextResponse.json(userConfig);
    } catch (fileError) {
      // File doesn't exist, return default configuration
      const defaultConfig = {
        serpApiKey: '',
        openAiKey: '',
        wechatAppId: '',
        wechatAppSecret: '',
        xhsCookie: '',
        googleDocsCredentials: '',
        googleDocsFolderId: '',
        rssFeeds: [
          { url: 'https://techcrunch.com/feed/', name: 'TechCrunch' },
          { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge' }
        ]
      };
      
      return NextResponse.json(defaultConfig);
    }
  } catch (error) {
    console.error('Error loading configuration:', error);
    return NextResponse.json(
      { error: 'Failed to load configuration' },
      { status: 500 }
    );
  }
}