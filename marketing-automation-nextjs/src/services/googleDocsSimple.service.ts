import { google } from 'googleapis';
import { logger } from '../lib/utils/logger';
import { AppError } from '../lib/utils/errors';
import { loadUserConfig } from '../lib/utils/config';

interface GoogleDocsContent {
  title: string;
  body: string;
  platform: string;
  hashtags?: string;
}

export class GoogleDocsSimpleService {
  private docs: any;
  private apiKey: string = '';
  private folderId: string = '';
  private initialized: boolean = false;

  constructor() {
    this.initializeGoogleAPI();
  }

  private async initializeGoogleAPI() {
    const userConfig = await loadUserConfig();
    this.folderId = userConfig?.googleDocsFolderId || '';
    this.apiKey = userConfig?.googleDocsCredentials || '';
    
    if (!this.apiKey) {
      logger.warn('Google Docs API key not configured');
      return;
    }

    try {
      // Initialize with API key (limited functionality)
      this.docs = google.docs({ 
        version: 'v1', 
        auth: this.apiKey 
      });
      
      this.initialized = true;
      logger.info('Google Docs API initialized with API key');
    } catch (error) {
      logger.error('Failed to initialize Google Docs API:', error);
    }
  }

  // Check if Google Docs is properly configured
  isConfigured(): boolean {
    return this.initialized && !!this.apiKey;
  }

  // Note: API key authentication has limitations
  // You won't be able to create documents, only read public ones
  // For full functionality, use service account credentials
  async getDocumentInfo(documentId: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new AppError('Google Docs not configured', 400);
    }

    try {
      const response = await this.docs.documents.get({
        documentId,
        key: this.apiKey
      });
      
      return response.data;
    } catch (error: any) {
      logger.error('Error getting document:', error);
      throw new AppError(`Failed to get document: ${error.message}`, 500);
    }
  }

  // Placeholder for future OAuth2 implementation
  async createDocumentWithOAuth(content: GoogleDocsContent): Promise<string> {
    throw new AppError(
      'Creating documents requires OAuth2 authentication or service account credentials. ' +
      'API key authentication only supports reading public documents.',
      501
    );
  }
}