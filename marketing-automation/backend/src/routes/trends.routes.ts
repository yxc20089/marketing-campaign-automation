import { Router } from 'express';
import { TrendDiscoveryService } from '../services/trendDiscovery.service';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validateRequest';
import Joi from 'joi';

const router = Router();
const trendService = new TrendDiscoveryService();

// Validation schemas
const fetchTrendsSchema = Joi.object({
  rssFeeds: Joi.array().items(
    Joi.object({
      url: Joi.string().uri().required(),
      name: Joi.string().required()
    })
  ),
  googleTrends: Joi.boolean()
});

// Fetch and aggregate trends
router.post('/fetch', 
  validateRequest(fetchTrendsSchema, 'body'),
  asyncHandler(async (req, res) => {
    const trends = await trendService.aggregateTrends(req.body);
    res.json({
      success: true,
      count: trends.length,
      trends
    });
  })
);

// Get pending trends
router.get('/pending',
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const trends = await trendService.getPendingTrends(limit);
    res.json({
      success: true,
      trends
    });
  })
);

// Mark trend as processed
router.patch('/:id/process',
  asyncHandler(async (req, res) => {
    await trendService.markTrendProcessed(parseInt(req.params.id));
    res.json({
      success: true,
      message: 'Trend marked as processed'
    });
  })
);

// Test RSS feed
router.post('/test-rss',
  validateRequest(Joi.object({
    url: Joi.string().uri().required()
  }), 'body'),
  asyncHandler(async (req, res) => {
    const trends = await trendService.fetchRSSFeeds([
      { url: req.body.url, name: 'Test Feed' }
    ]);
    res.json({
      success: true,
      count: trends.length,
      trends: trends.slice(0, 5) // Return first 5 items
    });
  })
);

// Test Google Trends
router.get('/test-google',
  asyncHandler(async (req, res) => {
    const trends = await trendService.fetchGoogleTrends();
    res.json({
      success: true,
      count: trends.length,
      trends: trends.slice(0, 10) // Return first 10 trends
    });
  })
);

export default router;