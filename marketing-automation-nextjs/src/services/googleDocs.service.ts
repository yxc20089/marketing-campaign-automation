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
  private configCheckInterval: number = 300000; // 5 minutes

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
        logger.warn('API key authentication has limitations for document creation. Consider using service account for full functionality.');
        throw new AppError('API key authentication cannot create documents. Please use service account credentials for Google Docs publishing.', 400);
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
        logger.info(`Moving document ${documentId} to folder ${this.folderId}`);
        await this.moveToFolder(documentId, this.folderId);
      } else {
        logger.info(`No folder ID configured, document ${documentId} will remain in root folder`);
      }

      // Make the document publicly viewable so user can access it
      await this.makeDocumentPublic(documentId);
      
      // Debug: Check document permissions
      await this.debugDocumentPermissions(documentId);

      // Return the document URL
      return `https://docs.google.com/document/d/${documentId}/edit`;
    } catch (error) {
      logger.error('Error creating Google Doc:', error);
      throw new AppError('Failed to create Google Doc', 500);
    }
  }

  // Populate document with structured content
  private async populateDocument(documentId: string, content: GoogleDocsContent) {
    // Build the full content first
    const fullContent = [];
    
    // Add title
    fullContent.push(content.title);
    fullContent.push('');
    
    // Add metadata
    fullContent.push(`Platform: ${content.platform.toUpperCase()}`);
    fullContent.push(`Topic: ${content.topic}`);
    fullContent.push(`Generated: ${new Date().toISOString()}`);
    fullContent.push('');
    
    // Add separator
    fullContent.push('--- CONTENT ---');
    fullContent.push('');
    
    // Add main content
    fullContent.push(content.body);
    fullContent.push('');
    
    // Add hashtags if present
    if (content.hashtags) {
      fullContent.push(`Hashtags: ${content.hashtags}`);
      fullContent.push('');
    }
    
    const fullText = fullContent.join('\n');
    
    // Insert all content at once
    await this.docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: fullText
            }
          },
          {
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
          }
        ]
      }
    });
  }

  // Make document publicly accessible and share with user
  private async makeDocumentPublic(documentId: string) {
    try {
      // Method 1: Make it publicly accessible with link
      await this.drive.permissions.create({
        fileId: documentId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });
      logger.info(`Document ${documentId} made publicly accessible`);
      
      // Method 2: Also try to share with a specific email if available
      const userConfig = await loadUserConfig();
      if (userConfig?.userEmail) {
        try {
          await this.drive.permissions.create({
            fileId: documentId,
            requestBody: {
              role: 'writer',
              type: 'user',
              emailAddress: userConfig.userEmail
            }
          });
          logger.info(`Document ${documentId} shared with user email: ${userConfig.userEmail}`);
        } catch (emailError) {
          logger.warn('Could not share with user email:', emailError);
        }
      }
      
      // Method 3: Try to make it publicly editable (more permissive)
      try {
        await this.drive.permissions.create({
          fileId: documentId,
          requestBody: {
            role: 'writer',
            type: 'anyone'
          }
        });
        logger.info(`Document ${documentId} made publicly editable`);
      } catch (editError) {
        logger.warn('Could not make document publicly editable:', editError);
      }
      
    } catch (error) {
      logger.error('Error setting document permissions:', error);
      // Don't throw error as document creation was successful
    }
  }

  // Debug document permissions
  private async debugDocumentPermissions(documentId: string) {
    try {
      const permissions = await this.drive.permissions.list({
        fileId: documentId,
        fields: 'permissions(id,type,role,emailAddress)'
      });
      
      logger.info(`Document ${documentId} permissions:`, JSON.stringify(permissions.data.permissions, null, 2));
      
      // Also get file info
      const fileInfo = await this.drive.files.get({
        fileId: documentId,
        fields: 'id,name,webViewLink,webContentLink,permissions'
      });
      
      logger.info(`Document ${documentId} info:`, JSON.stringify(fileInfo.data, null, 2));
    } catch (error) {
      logger.error('Error debugging document permissions:', error);
    }
  }

  // Move document to a specific folder
  private async moveToFolder(documentId: string, folderId: string) {
    try {
      // First, verify that the folder exists and is accessible
      try {
        await this.drive.files.get({
          fileId: folderId,
          fields: 'id, name'
        });
        logger.info(`Target folder ${folderId} exists and is accessible`);
      } catch (folderError) {
        logger.error(`Target folder ${folderId} is not accessible:`, folderError);
        throw new Error(`Cannot access folder ${folderId}. Please check folder ID and permissions.`);
      }

      // Get the document's current parents
      const file = await this.drive.files.get({
        fileId: documentId,
        fields: 'parents'
      });

      const previousParents = file.data.parents?.join(',') || '';
      logger.info(`Document ${documentId} current parents: ${previousParents}`);

      // Move the file to the new folder
      await this.drive.files.update({
        fileId: documentId,
        addParents: folderId,
        removeParents: previousParents
      });

      logger.info(`Successfully moved document ${documentId} to folder ${folderId}`);
      
      // Verify the move was successful
      const updatedFile = await this.drive.files.get({
        fileId: documentId,
        fields: 'parents'
      });
      logger.info(`Document ${documentId} new parents: ${updatedFile.data.parents?.join(',')}`);
      
    } catch (error) {
      logger.error('Error moving document to folder:', error);
      // Don't throw error here as document creation was successful, but log the issue
      logger.warn(`Document ${documentId} created successfully but could not be moved to folder ${folderId}`);
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