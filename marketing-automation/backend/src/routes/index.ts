import { Router } from 'express';
import configRoutes from './config.routes';
import trendRoutes from './trends.routes';
import contentRoutes from './content.routes';
import campaignRoutes from './campaigns.routes';
import publishRoutes from './publish.routes';

const router = Router();

// Mount route modules
router.use('/config', configRoutes);
router.use('/trends', trendRoutes);
router.use('/content', contentRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/publish', publishRoutes);

export default router;