import { Router } from 'express';
import { getDb } from '../utils/database';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validateRequest';
import { TrendDiscoveryService } from '../services/trendDiscovery.service';
import { AIContentService } from '../services/aiContent.service';
import { PublishingValidatorService } from '../services/publishingValidator.service';
import Joi from 'joi';
import { logger } from '../utils/logger';

const router = Router();
const trendService = new TrendDiscoveryService();
const aiService = new AIContentService();
const publishingValidator = new PublishingValidatorService();

// Create campaign
router.post('/create',
  validateRequest(Joi.object({
    name: Joi.string().required()
  }), 'body'),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const result = await db.runAsync(
      'INSERT INTO campaigns (name, status) VALUES (?, ?)',
      req.body.name,
      'active'
    );

    res.json({
      success: true,
      campaignId: result.lastID
    });
  })
);

// Get campaigns
router.get('/',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const campaigns = await db.allAsync(
      'SELECT * FROM campaigns ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      campaigns
    });
  })
);

// Run campaign workflow
router.post('/:id/run',
  asyncHandler(async (req, res) => {
    const campaignId = parseInt(req.params.id);
    const db = getDb();

    // Validate publishing providers before starting campaign
    try {
      await publishingValidator.validateBeforeCampaign();
    } catch (error: any) {
      await db.runAsync(
        'INSERT INTO campaign_logs (campaign_id, action, details, status) VALUES (?, ?, ?, ?)',
        campaignId,
        'campaign_validation_failed',
        error.message,
        'error'
      );
      throw error;
    }

    // Log campaign start
    await db.runAsync(
      'INSERT INTO campaign_logs (campaign_id, action, status) VALUES (?, ?, ?)',
      campaignId,
      'campaign_started',
      'success'
    );

    // Log available providers
    const availableProviders = await publishingValidator.getAvailableProviders();
    await db.runAsync(
      'INSERT INTO campaign_logs (campaign_id, action, details, status) VALUES (?, ?, ?, ?)',
      campaignId,
      'providers_validated',
      `Available providers: ${availableProviders.map(p => p.name).join(', ')}`,
      'success'
    );

    // Get RSS feeds from config
    const feedsConfig = await db.getAsync('SELECT value FROM config WHERE key = ?', 'rssFeeds');
    const rssFeeds = feedsConfig ? JSON.parse(feedsConfig.value) : [];

    // Fetch trends
    logger.info(`Running campaign ${campaignId}: Fetching trends`);
    const trends = await trendService.aggregateTrends({
      rssFeeds,
      googleTrends: true
    });

    await db.runAsync(
      'INSERT INTO campaign_logs (campaign_id, action, details, status) VALUES (?, ?, ?, ?)',
      campaignId,
      'trends_discovered',
      `Found ${trends.length} trends`,
      'success'
    );

    // Process first pending trend
    const pendingTrends = await trendService.getPendingTrends(1);
    if (pendingTrends.length > 0) {
      const trend = pendingTrends[0];
      logger.info(`Processing trend: ${trend.title}`);

      // Generate content
      const content = await aiService.generateContent({
        topic: trend.title,
        topicId: trend.id,
        platforms: ['wechat', 'xhs'],
        generateImage: true
      });

      await db.runAsync(
        'INSERT INTO campaign_logs (campaign_id, action, details, status) VALUES (?, ?, ?, ?)',
        campaignId,
        'content_generated',
        `Generated content for ${content.length} platforms`,
        'success'
      );

      // Mark trend as processed
      await trendService.markTrendProcessed(trend.id);
    }

    res.json({
      success: true,
      message: 'Campaign workflow initiated',
      trendsFound: trends.length,
      processed: pendingTrends.length > 0 ? pendingTrends[0].title : null
    });
  })
);

// Get campaign logs
router.get('/:id/logs',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const logs = await db.allAsync(
      'SELECT * FROM campaign_logs WHERE campaign_id = ? ORDER BY created_at DESC',
      req.params.id
    );

    res.json({
      success: true,
      logs
    });
  })
);

export default router;