import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validateRequest';
import { AppError } from '../middleware/errorHandler';
import { GoogleDocsService } from '../services/googleDocs.service';
import { PublishingValidatorService } from '../services/publishingValidator.service';
import Joi from 'joi';
import { logger } from '../utils/logger';

const router = Router();
const googleDocsService = new GoogleDocsService();
const publishingValidator = new PublishingValidatorService();

// Validation schema
const publishSchema = Joi.object({
  contentId: Joi.number().required(),
  platform: Joi.string().valid('wechat', 'xhs', 'googledocs').required(),
  content: Joi.object({
    title: Joi.string().required(),
    body: Joi.string().required(),
    topic: Joi.string().optional(),
    imageUrl: Joi.string().optional(),
    hashtags: Joi.string().optional()
  }).required()
});

// Get publishing providers status
router.get('/providers',
  asyncHandler(async (req, res) => {
    const statusReport = await publishingValidator.getStatusReport();
    res.json({
      success: true,
      ...statusReport
    });
  })
);

// Test all publishing providers
router.get('/providers/test',
  asyncHandler(async (req, res) => {
    const testResults = await publishingValidator.testAllProviders();
    res.json({
      success: true,
      providers: testResults
    });
  })
);

// Publish to WeChat
router.post('/wechat',
  validateRequest(publishSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { content } = req.body;

    // Check if WeChat credentials are configured
    if (!process.env.WECHAT_APP_ID || !process.env.WECHAT_APP_SECRET) {
      throw new AppError('WeChat credentials not configured', 400);
    }

    logger.info('Publishing to WeChat:', content.title);

    // TODO: Implement actual WeChat API integration
    // This would involve:
    // 1. Getting access token
    // 2. Uploading media if image exists
    // 3. Creating draft
    // 4. Publishing draft

    res.json({
      success: true,
      message: 'WeChat publishing placeholder - actual integration required',
      platform: 'wechat',
      mockUrl: 'https://mp.weixin.qq.com/mock-article'
    });
  })
);

// Prepare content for XHS (semi-automated approach)
router.post('/xhs/prepare',
  validateRequest(publishSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { content } = req.body;

    // Check if XHS cookie is configured
    if (!process.env.XHS_COOKIE) {
      throw new AppError('XHS cookie not configured', 400);
    }

    logger.info('Preparing XHS content for manual posting');

    // Format content for easy copying
    const formattedContent = {
      title: content.title,
      body: content.body,
      hashtags: content.hashtags || '',
      fullText: `${content.title}\n\n${content.body}\n\n${content.hashtags || ''}`,
      imageUrl: content.imageUrl,
      instructions: [
        '1. Copy the formatted text below',
        '2. Open Xiao Hongshu app on your phone',
        '3. Create a new post',
        '4. Paste the content',
        '5. Upload the image if provided',
        '6. Publish manually'
      ]
    };

    res.json({
      success: true,
      platform: 'xhs',
      content: formattedContent,
      semiAutomated: true
    });
  })
);

// Publish to Google Docs
router.post('/googledocs',
  validateRequest(publishSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { content } = req.body;

    // Check if Google Docs is configured
    if (!googleDocsService.isConfigured()) {
      throw new AppError('Google Docs not configured', 400);
    }

    logger.info('Publishing to Google Docs:', content.title);

    try {
      const documentUrl = await googleDocsService.createDocument({
        title: content.title,
        body: content.body,
        topic: content.topic || 'Unknown Topic',
        platform: 'Marketing Content',
        hashtags: content.hashtags
      });

      res.json({
        success: true,
        platform: 'googledocs',
        documentUrl,
        message: 'Content successfully saved to Google Docs'
      });
    } catch (error: any) {
      logger.error('Google Docs publishing failed:', error);
      throw new AppError(`Google Docs publishing failed: ${error.message}`, 500);
    }
  })
);

// Auto-publish to all configured providers
router.post('/auto',
  validateRequest(Joi.object({
    contentId: Joi.number().required(),
    content: Joi.object({
      title: Joi.string().required(),
      body: Joi.string().required(),
      topic: Joi.string().optional(),
      imageUrl: Joi.string().optional(),
      hashtags: Joi.string().optional()
    }).required()
  }), 'body'),
  asyncHandler(async (req, res) => {
    const { content } = req.body;

    // Validate that at least one provider is configured
    await publishingValidator.validateBeforeCampaign();

    const availableProviders = await publishingValidator.getAvailableProviders();
    const results = [];

    // Publish to all available providers
    for (const provider of availableProviders) {
      try {
        let result = null;

        switch (provider.platform) {
          case 'wechat':
            // TODO: Implement WeChat publishing
            result = {
              platform: 'wechat',
              success: true,
              message: 'WeChat publishing placeholder',
              url: 'https://mp.weixin.qq.com/mock-article'
            };
            break;

          case 'xhs':
            // For XHS, we prepare the content for manual posting
            result = {
              platform: 'xhs',
              success: true,
              message: 'XHS content prepared for manual posting',
              semiAutomated: true
            };
            break;

          case 'googledocs':
            const documentUrl = await googleDocsService.createDocument({
              title: content.title,
              body: content.body,
              topic: content.topic || 'Unknown Topic',
              platform: 'Marketing Content',
              hashtags: content.hashtags
            });
            result = {
              platform: 'googledocs',
              success: true,
              message: 'Content saved to Google Docs',
              url: documentUrl
            };
            break;
        }

        if (result) {
          results.push(result);
          logger.info(`Successfully published to ${provider.name}`);
        }
      } catch (error: any) {
        logger.error(`Failed to publish to ${provider.name}:`, error);
        results.push({
          platform: provider.platform,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Published to ${results.filter(r => r.success).length} out of ${availableProviders.length} providers`,
      results
    });
  })
);

// Get publishing status
router.get('/status/:contentId',
  asyncHandler(async (req, res) => {
    const availableProviders = await publishingValidator.getAvailableProviders();
    const status: any = {};

    availableProviders.forEach(provider => {
      status[provider.platform] = 'ready_to_publish';
    });

    res.json({
      success: true,
      contentId: req.params.contentId,
      status
    });
  })
);

export default router;