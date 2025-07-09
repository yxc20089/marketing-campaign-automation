import { promises as fs } from 'fs';
import path from 'path';

const USER_CONFIG_PATH = path.join(process.cwd(), 'user-config.json');

export interface UserConfig {
  serpApiKey: string;
  openAiKey: string;
  wechatAppId: string;
  wechatAppSecret: string;
  xhsCookie: string;
  googleDocsCredentials: string;
  googleDocsFolderId: string;
  rssFeeds: Array<{ url: string; name: string }>;
  updatedAt?: string;
}

export async function loadUserConfig(): Promise<UserConfig | null> {
  try {
    const data = await fs.readFile(USER_CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

// Helper to get config with fallback to env vars for backward compatibility
export async function getConfig(key: keyof UserConfig): Promise<string | any> {
  const userConfig = await loadUserConfig();
  
  if (userConfig && userConfig[key]) {
    return userConfig[key];
  }
  
  // Fallback to environment variables
  const envMapping: Record<keyof UserConfig, string> = {
    serpApiKey: 'SERPAPI_KEY',
    openAiKey: 'OPENAI_API_KEY',
    wechatAppId: 'WECHAT_APP_ID',
    wechatAppSecret: 'WECHAT_APP_SECRET',
    xhsCookie: 'XHS_COOKIE',
    googleDocsCredentials: 'GOOGLE_DOCS_CREDENTIALS_PATH',
    googleDocsFolderId: 'GOOGLE_DOCS_FOLDER_ID',
    rssFeeds: 'RSS_FEEDS',
    updatedAt: ''
  };
  
  const envKey = envMapping[key];
  if (envKey && process.env[envKey]) {
    if (key === 'rssFeeds') {
      try {
        return JSON.parse(process.env[envKey]!);
      } catch {
        return [];
      }
    }
    return process.env[envKey];
  }
  
  return '';
}