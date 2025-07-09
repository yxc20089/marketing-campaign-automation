import { TrendService } from './trendDiscovery.service';
import { ContentGenerationService } from './aiContent.service';
import { PublishingValidatorService } from './publishingValidator.service';
import { getDb } from '../lib/database';

export interface CampaignResult {
  trendsFound: number;
  processed: string | null;
  contentGenerated?: boolean;
}

export class CampaignRunner {
  private trendService: TrendService;
  private contentService: ContentGenerationService;
  private validator: PublishingValidatorService;
  constructor() {
    this.trendService = new TrendService();
    this.contentService = new ContentGenerationService();
    this.validator = new PublishingValidatorService();
  }

  async runCampaign(): Promise<CampaignResult> {
    try {
      // Initialize database
      const db = await getDb();
      
      // Validate publishing providers before proceeding
      await this.validator.validateBeforeCampaign();
      
      // Discover trends
      const trends = await this.trendService.getPendingTrends(5);
      
      if (trends.length === 0) {
        return {
          trendsFound: 0,
          processed: null
        };
      }

      // Process the first trend
      const selectedTrend = trends[0];
      
      // Generate content
      const content = await this.contentService.generateContent({
        topic: selectedTrend.title,
        topicId: selectedTrend.id,
        platforms: ['wechat', 'xhs']
      });
      
      // Save to database for approval workflow
      await (db as any).run(
        'INSERT INTO content (trend_title, content_text, status, created_at) VALUES (?, ?, ?, ?)',
        [selectedTrend.title, JSON.stringify(content), 'pending_approval', new Date().toISOString()]
      );

      return {
        trendsFound: trends.length,
        processed: selectedTrend.title,
        contentGenerated: true
      };
    } catch (error) {
      console.error('Campaign execution error:', error);
      throw error;
    }
  }
}