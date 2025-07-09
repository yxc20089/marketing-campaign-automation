import { Router } from 'express';
import { AIContentService } from '../services/aiContent.service';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validateRequest';
import Joi from 'joi';

const router = Router();
const aiService = new AIContentService();

// Validation schemas
const generateContentSchema = Joi.object({
  topic: Joi.string().required(),
  topicId: Joi.number().optional(),
  platforms: Joi.array().items(Joi.string().valid('wechat', 'xhs')).required(),
  generateImage: Joi.boolean().optional()
});

// Generate content
router.post('/generate',
  validateRequest(generateContentSchema, 'body'),
  asyncHandler(async (req, res) => {
    const content = await aiService.generateContent(req.body);
    res.json({
      success: true,
      content
    });
  })
);

// Get content by topic
router.get('/topic/:topicId',
  asyncHandler(async (req, res) => {
    const content = await aiService.getContentByTopic(parseInt(req.params.topicId));
    res.json({
      success: true,
      content
    });
  })
);

// Update content status
router.patch('/:id/status',
  validateRequest(Joi.object({
    status: Joi.string().valid('draft', 'approved', 'published', 'rejected').required()
  }), 'body'),
  asyncHandler(async (req, res) => {
    await aiService.updateContentStatus(
      parseInt(req.params.id),
      req.body.status
    );
    res.json({
      success: true,
      message: 'Content status updated'
    });
  })
);

// Research topic
router.post('/research',
  validateRequest(Joi.object({
    topic: Joi.string().required()
  }), 'body'),
  asyncHandler(async (req, res) => {
    const research = await aiService.researchTopic(req.body.topic);
    res.json({
      success: true,
      research
    });
  })
);

export default router;