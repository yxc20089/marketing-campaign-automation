import { google } from 'googleapis';
import { logger } from '../lib/utils/logger';
import { AppError } from '../lib/utils/errors';
import { loadUserConfig } from '../lib/utils/config';
import fs from 'fs';

interface GoogleDocsContent {
  title: string;
  body: string;
  platform: string;
  topic: string;
  hashtags?: string;
}

export class GoogleDocsService {
  private docs: any;
  private drive: any;
  private folderId: string = '';
  private initialized: boolean = false;
  private lastConfigCheck: number = 0;
  private configCheckInterval: number = 30000; // 30 seconds

  constructor() {
    this.initializeGoogleAPI();
  }

  private async initializeGoogleAPI() {
    // Skip if recently initialized
    const now = Date.now();
    if (this.initialized && (now - this.lastConfigCheck) < this.configCheckInterval) {
      return;
    }
    
    const userConfig = await loadUserConfig();
    this.folderId = userConfig?.googleDocsFolderId || '';
    const credentialsInput = userConfig?.googleDocsCredentials;
    
    if (!credentialsInput) {
      if (!this.initialized) {
        logger.warn('Google Docs credentials not configured');
      }
      return;
    }

    try {
      let auth;
      
      // Check the format of credentials
      if (credentialsInput.startsWith('{')) {
        // It's JSON service account credentials
        const credentials = JSON.parse(credentialsInput);
        auth = new google.auth.GoogleAuth({
          credentials,
          scopes: [
            'https://www.googleapis.com/auth/documents',
            'https://www.googleapis.com/auth/drive'
          ]
        });
      } else if (credentialsInput.startsWith('/') || credentialsInput.includes('.json')) {
        // It's a file path to service account credentials
        if (!fs.existsSync(credentialsInput)) {
          logger.warn(`Google Docs credentials file not found at: ${credentialsInput}`);
          return;
        }
        const credentials = JSON.parse(fs.readFileSync(credentialsInput, 'utf8'));
        auth = new google.auth.GoogleAuth({
          credentials,
          scopes: [
            'https://www.googleapis.com/auth/documents',
            'https://www.googleapis.com/auth/drive'
          ]
        });
      } else if (credentialsInput.startsWith('AIza')) {
        // It's a Google Cloud API Key
        auth = credentialsInput; // Use API key directly
        logger.info('Using Google Cloud API Key for authentication');
      } else {
        logger.warn('Google Docs credentials format not recognized. Expected JSON, file path, or API key.');
        return;
      }

      // Initialize API clients
      this.docs = google.docs({ version: 'v1', auth });
      this.drive = google.drive({ version: 'v3', auth });
      
      if (!this.initialized) {
        logger.info('Google Docs API initialized successfully');
      }
      
      this.initialized = true;
      this.lastConfigCheck = Date.now();
    } catch (error) {
      logger.error('Failed to initialize Google Docs API:', error);
      this.initialized = false;
    }
  }

  // Check if Google Docs is properly configured
  isConfigured(): boolean {
    return !!(this.docs && this.drive && this.folderId);
  }

  // Create a new Google Doc with the content
  async createDocument(content: GoogleDocsContent): Promise<string> {
    if (!this.isConfigured()) {
      throw new AppError('Google Docs not configured', 400);
    }

    try {
      // Create the document title
      const timestamp = new Date().toISOString().split('T')[0];
      const documentTitle = `${content.platform.toUpperCase()} - ${content.title} (${timestamp})`;

      // Check if we're using an API key (which has limitations)
      const userConfig = await loadUserConfig();
      const isApiKey = userConfig?.googleDocsCredentials?.startsWith('AIza');
      
      if (isApiKey) {
        // API keys have limitations - provide alternative approach
        const fallbackContent = this.createFallbackContent(content);
        logger.warn('API key authentication has limitations. Consider using service account for full functionality.');
        return fallbackContent;
      }

      // Create a new document with full authentication
      const doc = await this.docs.documents.create({
        requestBody: {
          title: documentTitle
        }
      });

      const documentId = doc.data.documentId;
      logger.info(`Created Google Doc: ${documentTitle} (ID: ${documentId})`);

      // Add content to the document
      await this.populateDocument(documentId, content);

      // Move document to specified folder if configured
      if (this.folderId) {
        await this.moveToFolder(documentId, this.folderId);
      }

      // Return the document URL
      return `https://docs.google.com/document/d/${documentId}/edit`;
    } catch (error) {
      logger.error('Error creating Google Doc:', error);
      throw new AppError('Failed to create Google Doc', 500);
    }
  }

  // Populate document with structured content
  private async populateDocument(documentId: string, content: GoogleDocsContent) {
    const requests = [];

    // Add title
    requests.push({
      insertText: {
        location: { index: 1 },
        text: `${content.title}\n\n`
      }
    });

    // Add metadata
    requests.push({
      insertText: {
        location: { index: 1 },
        text: `Platform: ${content.platform.toUpperCase()}\n`
      }
    });

    requests.push({
      insertText: {
        location: { index: 1 },
        text: `Topic: ${content.topic}\n`
      }
    });

    requests.push({
      insertText: {
        location: { index: 1 },
        text: `Generated: ${new Date().toISOString()}\n\n`
      }
    });

    // Add separator
    requests.push({
      insertText: {
        location: { index: 1 },
        text: '--- CONTENT ---\n\n'
      }
    });

    // Add main content
    requests.push({
      insertText: {
        location: { index: 1 },
        text: content.body + '\n\n'
      }
    });

    // Add hashtags if present
    if (content.hashtags) {
      requests.push({
        insertText: {
          location: { index: 1 },
          text: `Hashtags: ${content.hashtags}\n\n`
        }
      });
    }

    // Format the title as heading
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: 1,
          endIndex: content.title.length + 1
        },
        paragraphStyle: {
          namedStyleType: 'HEADING_1'
        },
        fields: 'namedStyleType'
      }
    });

    // Execute all requests
    await this.docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: requests.reverse() // Reverse to maintain order when inserting at index 1
      }
    });
  }

  // Move document to a specific folder
  private async moveToFolder(documentId: string, folderId: string) {
    try {
      // Get the document's current parents
      const file = await this.drive.files.get({
        fileId: documentId,
        fields: 'parents'
      });

      const previousParents = file.data.parents?.join(',') || '';

      // Move the file to the new folder
      await this.drive.files.update({
        fileId: documentId,
        addParents: folderId,
        removeParents: previousParents
      });

      logger.info(`Moved document ${documentId} to folder ${folderId}`);
    } catch (error) {
      logger.error('Error moving document to folder:', error);
      // Don't throw error here as document creation was successful
    }
  }

  // Test the Google Docs connection
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      // Try to create a test document
      const testDoc = await this.docs.documents.create({
        requestBody: {
          title: 'Marketing Automation Test Document'
        }
      });

      // Delete the test document
      await this.drive.files.delete({
        fileId: testDoc.data.documentId
      });

      logger.info('Google Docs connection test successful');
      return true;
    } catch (error) {
      logger.error('Google Docs connection test failed:', error);
      return false;
    }
  }

  // Get folder information
  async getFolderInfo(): Promise<any> {
    if (!this.folderId || !this.drive) {
      return null;
    }

    try {
      const folder = await this.drive.files.get({
        fileId: this.folderId,
        fields: 'id, name, webViewLink'
      });

      return folder.data;
    } catch (error) {
      logger.error('Error getting folder info:', error);
      return null;
    }
  }

  // Fallback method for API key users
  private createFallbackContent(content: GoogleDocsContent): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const documentTitle = `${content.platform.toUpperCase()} - ${content.title} (${timestamp})`;
    
    // Create a formatted text version that users can copy-paste
    const formattedContent = `
=== ${documentTitle} ===

Generated on: ${new Date().toLocaleString()}
Platform: ${content.platform.toUpperCase()}
Title: ${content.title}

${content.hashtags ? `Hashtags: ${content.hashtags}` : ''}

Content:
${content.body}

---
Generated by Marketing Automation System
    `.trim();
    
    // Log the content for user to copy
    logger.info('Generated content (copy this to create your Google Doc manually):');
    logger.info(formattedContent);
    
    return `Content generated. With API key authentication, please manually create a Google Doc with this content:\n\n${formattedContent}`;
  }
}