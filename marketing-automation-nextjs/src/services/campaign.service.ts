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

  async runCampaign(mode: 'auto' | 'custom' = 'auto', customTopic?: string): Promise<CampaignResult> {
    try {
      // Initialize database
      const db = await getDb();
      
      // Validate publishing providers before proceeding
      await this.validator.validateBeforeCampaign();
      
      let selectedTrend: any;
      let trendsFound = 0;
      
      if (mode === 'custom' && customTopic) {
        // Use custom topic
        selectedTrend = {
          id: Date.now(), // Temporary ID
          title: customTopic,
          source: 'Custom Topic',
          status: 'pending'
        };
        trendsFound = 1;
        console.log('Debug: Using custom topic:', customTopic);
      } else {
        // Auto-discover trends
        const { rssFeeds } = await this.trendService.getUserConfig();
        if (rssFeeds && rssFeeds.length > 0) {
          await this.trendService.aggregateTrends({
            rssFeeds,
            googleTrends: true
          });
        }
        
        // Get pending trends from database
        const trends = await this.trendService.getPendingTrends(5);
        trendsFound = trends.length;
        
        console.log('Debug: Found trends:', trends.length);
        if (trends.length > 0) {
          console.log('Debug: First trend:', JSON.stringify(trends[0], null, 2));
        }
        
        if (trends.length === 0) {
          return {
            trendsFound: 0,
            processed: null
          };
        }

        selectedTrend = trends[0];
      }
      
      // Validate the selected trend
      if (!selectedTrend || !selectedTrend.title) {
        console.error('Debug: Selected trend validation failed:', selectedTrend);
        throw new Error('Selected trend is invalid or missing title');
      }
      
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
        trendsFound: trendsFound,
        processed: selectedTrend.title,
        contentGenerated: true
      };
    } catch (error) {
      console.error('Campaign execution error:', error);
      throw error;
    }
  }
}