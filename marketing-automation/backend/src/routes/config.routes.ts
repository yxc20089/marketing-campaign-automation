import { Router } from 'express';
import { getDb } from '../utils/database';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validateRequest';
import Joi from 'joi';

const router = Router();

// Configuration schema
const configSchema = Joi.object({
  serpApiKey: Joi.string().optional(),
  openAiKey: Joi.string().optional(),
  wechatAppId: Joi.string().optional(),
  wechatAppSecret: Joi.string().optional(),
  xhsCookie: Joi.string().optional(),
  googleDocsCredentials: Joi.string().optional(),
  googleDocsFolderId: Joi.string().optional(),
  rssFeeds: Joi.array().items(
    Joi.object({
      url: Joi.string().uri().required(),
      name: Joi.string().required()
    })
  ).optional()
});

// Get configuration
router.get('/',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const configs = await db.allAsync('SELECT key, value FROM config');
    
    const configMap: Record<string, any> = {};
    configs.forEach((config: any) => {
      if (config.key === 'rssFeeds') {
        configMap[config.key] = JSON.parse(config.value || '[]');
      } else {
        configMap[config.key] = config.value;
      }
    });

    // Mask sensitive values
    const maskedConfig = {
      ...configMap,
      serpApiKey: configMap.serpApiKey ? '***' + configMap.serpApiKey.slice(-4) : null,
      openAiKey: configMap.openAiKey ? '***' + configMap.openAiKey.slice(-4) : null,
      wechatAppSecret: configMap.wechatAppSecret ? '***' + configMap.wechatAppSecret.slice(-4) : null,
      xhsCookie: configMap.xhsCookie ? '***' + configMap.xhsCookie.slice(-10) : null,
      googleDocsCredentials: configMap.googleDocsCredentials ? '***credentials.json' : null,
    };

    res.json({
      success: true,
      config: maskedConfig
    });
  })
);

// Update configuration
router.post('/',
  validateRequest(configSchema, 'body'),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const updates = req.body;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const serializedValue = key === 'rssFeeds' ? JSON.stringify(value) : value;
        
        await db.runAsync(
          `INSERT INTO config (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
          key,
          serializedValue,
          serializedValue
        );

        // Update environment variables for runtime
        if (key === 'serpApiKey') process.env.SERPAPI_KEY = value as string;
        if (key === 'openAiKey') process.env.OPENAI_API_KEY = value as string;
        if (key === 'wechatAppId') process.env.WECHAT_APP_ID = value as string;
        if (key === 'wechatAppSecret') process.env.WECHAT_APP_SECRET = value as string;
        if (key === 'xhsCookie') process.env.XHS_COOKIE = value as string;
        if (key === 'googleDocsCredentials') process.env.GOOGLE_DOCS_CREDENTIALS = value as string;
        if (key === 'googleDocsFolderId') process.env.GOOGLE_DOCS_FOLDER_ID = value as string;
      }
    }

    res.json({
      success: true,
      message: 'Configuration updated successfully'
    });
  })
);

// Test configuration
router.post('/test',
  validateRequest(Joi.object({
    service: Joi.string().valid('serpapi', 'openai', 'wechat', 'googledocs').required()
  }), 'body'),
  asyncHandler(async (req, res) => {
    const { service } = req.body;
    
    // Simple connectivity tests
    let result = { success: false, message: 'Service test not implemented' };

    if (service === 'serpapi' && process.env.SERPAPI_KEY) {
      result = { success: true, message: 'SerpAPI key configured' };
    } else if (service === 'openai' && process.env.OPENAI_API_KEY) {
      result = { success: true, message: 'OpenAI key configured' };
    } else if (service === 'wechat' && process.env.WECHAT_APP_ID) {
      result = { success: true, message: 'WeChat credentials configured' };
    } else if (service === 'googledocs' && process.env.GOOGLE_DOCS_CREDENTIALS) {
      result = { success: true, message: 'Google Docs credentials configured' };
    }

    res.json(result);
  })
);

export default router;