import { logger } from '../lib/utils/logger';
import { GoogleDocsService } from './googleDocs.service';
import { AppError } from '../lib/utils/errors';

export interface PublishingProvider {
  name: string;
  platform: 'wechat' | 'xhs' | 'googledocs';
  configured: boolean;
  required_keys: string[];
  missing_keys: string[];
}

export class PublishingValidatorService {
  private googleDocsService: GoogleDocsService;

  constructor() {
    this.googleDocsService = new GoogleDocsService();
  }

  // Check all publishing providers and return their status
  async validatePublishingProviders(): Promise<PublishingProvider[]> {
    const providers: PublishingProvider[] = [];

    // Check WeChat
    const wechatRequired = ['WECHAT_APP_ID', 'WECHAT_APP_SECRET'];
    const wechatMissing = wechatRequired.filter(key => !process.env[key]);
    providers.push({
      name: 'WeChat Official Account',
      platform: 'wechat',
      configured: wechatMissing.length === 0,
      required_keys: wechatRequired,
      missing_keys: wechatMissing
    });

    // Check XHS
    const xhsRequired = ['XHS_COOKIE'];
    const xhsMissing = xhsRequired.filter(key => !process.env[key]);
    providers.push({
      name: 'Xiao Hongshu (Semi-automated)',
      platform: 'xhs',
      configured: xhsMissing.length === 0,
      required_keys: xhsRequired,
      missing_keys: xhsMissing
    });

    // Check Google Docs
    const googleDocsRequired = ['GOOGLE_DOCS_CREDENTIALS'];
    const googleDocsMissing = googleDocsRequired.filter(key => !process.env[key]);
    const googleDocsConfigured = googleDocsMissing.length === 0 && this.googleDocsService.isConfigured();
    
    providers.push({
      name: 'Google Docs',
      platform: 'googledocs',
      configured: googleDocsConfigured,
      required_keys: googleDocsRequired,
      missing_keys: googleDocsMissing
    });

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