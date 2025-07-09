import RSSParser from 'rss-parser';
import axios from 'axios';
import { logger } from '../lib/utils/logger';
import { getDb } from '../lib/database';
import { AppError } from '../lib/utils/errors';

interface RSSFeed {
  url: string;
  name: string;
}

interface TrendItem {
  title: string;
  source: string;
  sourceUrl?: string;
  description?: string;
  publishedAt?: Date;
}

export class TrendService {
  private rssParser: RSSParser;
  private serpApiKey: string;

  constructor() {
    this.rssParser = new RSSParser();
    this.serpApiKey = process.env.SERPAPI_KEY || '';
  }

  // Fetch trends from RSS feeds
  async fetchRSSFeeds(feeds: RSSFeed[]): Promise<TrendItem[]> {
    const allItems: TrendItem[] = [];

    for (const feed of feeds) {
      try {
        logger.info(`Fetching RSS feed: ${feed.name}`);
        const parsedFeed = await this.rssParser.parseURL(feed.url);
        
        const items = parsedFeed.items.map(item => ({
          title: item.title || 'Untitled',
          source: feed.name,
          sourceUrl: item.link,
          description: item.contentSnippet || item.content,
          publishedAt: item.pubDate ? new Date(item.pubDate) : undefined
        }));

        allItems.push(...items);
        logger.info(`Fetched ${items.length} items from ${feed.name}`);
      } catch (error) {
        logger.error(`Error fetching RSS feed ${feed.name}:`, error);
      }
    }

    return allItems;
  }

  // Fetch Google Trends via SerpAPI
  async fetchGoogleTrends(geo: string = 'US'): Promise<TrendItem[]> {
    if (!this.serpApiKey) {
      throw new AppError('SerpAPI key not configured', 400);
    }

    try {
      logger.info('Fetching Google Trends via SerpAPI');
      
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          engine: 'google_trends',
          q: 'trending',
          geo,
          api_key: this.serpApiKey,
          data_type: 'TIMESERIES'
        }
      });

      const trends = response.data.trending_searches?.daily || [];
      const items: TrendItem[] = [];

      for (const day of trends) {
        for (const trend of day.trending_searches || []) {
          items.push({
            title: trend.query?.query || trend.title?.query || 'Unknown trend',
            source: 'Google Trends',
            sourceUrl: `https://trends.google.com/trends/explore?q=${encodeURIComponent(trend.query?.query || '')}`,
            description: trend.articles?.[0]?.title
          });
        }
      }

      logger.info(`Fetched ${items.length} trends from Google`);
      return items;
    } catch (error) {
      logger.error('Error fetching Google Trends:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new AppError('Invalid SerpAPI key', 401);
      }
      throw new AppError('Failed to fetch Google Trends', 500);
    }
  }

  // Aggregate and deduplicate trends
  async aggregateTrends(sources: {
    rssFeeds?: RSSFeed[];
    googleTrends?: boolean;
  }): Promise<TrendItem[]> {
    const allTrends: TrendItem[] = [];

    // Fetch from RSS feeds
    if (sources.rssFeeds && sources.rssFeeds.length > 0) {
      const rssItems = await this.fetchRSSFeeds(sources.rssFeeds);
      allTrends.push(...rssItems);
    }

    // Fetch from Google Trends
    if (sources.googleTrends) {
      try {
        const googleItems = await this.fetchGoogleTrends();
        allTrends.push(...googleItems);
      } catch (error) {
        logger.error('Google Trends fetch failed, continuing with other sources');
      }
    }

    // Deduplicate by title (case-insensitive)
    const uniqueTrends = this.deduplicateTrends(allTrends);
    
    // Save to database
    await this.saveTrendsToDatabase(uniqueTrends);

    return uniqueTrends;
  }

  private deduplicateTrends(trends: TrendItem[]): TrendItem[] {
    const seen = new Set<string>();
    return trends.filter(trend => {
      const normalizedTitle = trend.title.toLowerCase().trim();
      if (seen.has(normalizedTitle)) {
        return false;
      }
      seen.add(normalizedTitle);
      return true;
    });
  }

  private async saveTrendsToDatabase(trends: TrendItem[]): Promise<void> {
    const db = await getDb();
    
    for (const trend of trends) {
      try {
        // Check if trend already exists
        const existing = await (db as any).get(
          'SELECT id FROM topics WHERE LOWER(title) = LOWER(?)',
          trend.title
        );

        if (!existing) {
          await (db as any).run(
            `INSERT INTO topics (title, source, source_url, status) 
             VALUES (?, ?, ?, 'pending')`,
            trend.title,
            trend.source,
            trend.sourceUrl || null
          );
          logger.info(`Saved new trend: ${trend.title}`);
        }
      } catch (error) {
        logger.error(`Error saving trend ${trend.title}:`, error);
      }
    }
  }

  // Get pending trends from database
  async getPendingTrends(limit: number = 10): Promise<any[]> {
    const db = await getDb();
    const trends = await (db as any).all(
      `SELECT * FROM topics 
       WHERE status = 'pending' 
       ORDER BY discovered_at DESC 
       LIMIT ?`,
      limit
    );
    return trends;
  }

  // Mark trend as processed
  async markTrendProcessed(topicId: number): Promise<void> {
    const db = await getDb();
    await (db as any).run(
      `UPDATE topics 
       SET status = 'processed', processed_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      topicId
    );
  }
}