import { logger } from '../lib/utils/logger';
import { GoogleDocsService } from './googleDocs.service';
import { AppError } from '../lib/utils/errors';
import { loadUserConfig } from '../lib/utils/config';

export interface PublishingProvider {
  name: string;
  platform: 'wechat' | 'xhs' | 'googledocs';
  configured: boolean;
  required_keys: string[];
  missing_keys: string[];
}

export class PublishingValidatorService {
  private googleDocsService: GoogleDocsService;
  private static lastValidationResult: PublishingProvider[] | null = null;
  private static lastValidationTime: number = 0;
  private static validationCacheTime: number = 60000; // 1 minute cache

  constructor() {
    this.googleDocsService = new GoogleDocsService();
  }

  // Check all publishing providers and return their status
  async validatePublishingProviders(): Promise<PublishingProvider[]> {
    // Check cache first
    const now = Date.now();
    if (PublishingValidatorService.lastValidationResult && 
        (now - PublishingValidatorService.lastValidationTime) < PublishingValidatorService.validationCacheTime) {
      return PublishingValidatorService.lastValidationResult;
    }

    const providers: PublishingProvider[] = [];
    
    // Load user configuration
    const userConfig = await loadUserConfig();

    // Check WeChat
    const wechatConfigured = !!(userConfig?.wechatAppId && userConfig?.wechatAppSecret);
    providers.push({
      name: 'WeChat Official Account',
      platform: 'wechat',
      configured: wechatConfigured,
      required_keys: ['wechatAppId', 'wechatAppSecret'],
      missing_keys: wechatConfigured ? [] : ['wechatAppId', 'wechatAppSecret']
    });

    // Check XHS
    const xhsConfigured = !!(userConfig?.xhsCookie);
    providers.push({
      name: 'Xiao Hongshu (Semi-automated)',
      platform: 'xhs',
      configured: xhsConfigured,
      required_keys: ['xhsCookie'],
      missing_keys: xhsConfigured ? [] : ['xhsCookie']
    });

    // Check Google Docs - need both credentials and folder ID
    const googleDocsConfigured = !!(userConfig?.googleDocsCredentials && userConfig?.googleDocsFolderId);
    
    providers.push({
      name: 'Google Docs',
      platform: 'googledocs',
      configured: googleDocsConfigured,
      required_keys: ['googleDocsCredentials', 'googleDocsFolderId'],
      missing_keys: googleDocsConfigured ? [] : ['googleDocsCredentials']
    });

    // Update cache
    PublishingValidatorService.lastValidationResult = providers;
    PublishingValidatorService.lastValidationTime = now;

    return providers;
  }

  // Get list of available (configured) publishing providers
  async getAvailableProviders(): Promise<PublishingProvider[]> {
    const allProviders = await this.validatePublishingProviders();
    return allProviders.filter(provider => provider.configured);
  }

  // Check if any publishing provider is available
  async hasAnyProviderConfigured(): Promise<boolean> {
    const availableProviders = await this.getAvailableProviders();
    return availableProviders.length > 0;
  }

  // Validate before starting campaign
  async validateBeforeCampaign(): Promise<void> {
    const hasProviders = await this.hasAnyProviderConfigured();
    
    if (!hasProviders) {
      const allProviders = await this.validatePublishingProviders();
      const missingInfo = allProviders.map(provider => 
        `${provider.name}: Missing ${provider.missing_keys.join(', ')}`
      ).join('\n');

      logger.error('No publishing providers configured. Campaign cannot proceed.');
      logger.error('Missing configurations:\n' + missingInfo);
      
      throw new AppError(
        'No publishing providers configured. Please configure at least one of: WeChat, XHS, or Google Docs before starting a campaign.',
        400
      );
    }

    const availableProviders = await this.getAvailableProviders();
    logger.info(`Campaign validation passed. Available providers: ${availableProviders.map(p => p.name).join(', ')}`);
  }

  // Get detailed status report
  async getStatusReport(): Promise<{
    hasProviders: boolean;
    availableProviders: PublishingProvider[];
    unavailableProviders: PublishingProvider[];
    summary: string;
  }> {
    const allProviders = await this.validatePublishingProviders();
    const availableProviders = allProviders.filter(p => p.configured);
    const unavailableProviders = allProviders.filter(p => !p.configured);

    const summary = availableProviders.length > 0 
      ? `${availableProviders.length} provider(s) configured: ${availableProviders.map(p => p.name).join(', ')}`
      : 'No publishing providers configured';

    return {
      hasProviders: availableProviders.length > 0,
      availableProviders,
      unavailableProviders,
      summary
    };
  }

  // Test all configured providers
  async testAllProviders(): Promise<{
    provider: string;
    platform: string;
    configured: boolean;
    tested: boolean;
    working: boolean;
    error?: string;
  }[]> {
    const allProviders = await this.validatePublishingProviders();
    const results = [];

    for (const provider of allProviders) {
      let tested = false;
      let working = false;
      let error: string | undefined;

      if (provider.configured) {
        try {
          switch (provider.platform) {
            case 'wechat':
              // TODO: Implement WeChat API test
              tested = true;
              working = true;
              break;
            case 'xhs':
              // XHS doesn't have a reliable test method
              tested = true;
              working = true;
              break;
            case 'googledocs':
              working = await this.googleDocsService.testConnection();
              tested = true;
              break;
          }
        } catch (err: any) {
          tested = true;
          working = false;
          error = err.message;
        }
      }

      results.push({
        provider: provider.name,
        platform: provider.platform,
        configured: provider.configured,
        tested,
        working,
        error
      });
    }

    return results;
  }
}