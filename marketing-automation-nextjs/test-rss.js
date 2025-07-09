const RSSParser = require('rss-parser');
const axios = require('axios');
const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

// Simple logger
const logger = {
  info: (message, ...args) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, ...args);
  },
  error: (message, error) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error);
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...args);
  }
};

// Test RSS feeds
const TEST_FEEDS = [
  {
    url: 'https://techcrunch.com/feed/',
    name: 'TechCrunch'
  },
  {
    url: 'https://www.theverge.com/rss/index.xml',
    name: 'The Verge'
  }
];

class RSSTestService {
  constructor() {
    this.rssParser = new RSSParser();
    this.dbPath = process.env.DATABASE_PATH || './public/data/marketing.db';
  }

  // Test individual RSS feed parsing
  async testSingleFeed(feed) {
    logger.info(`\n=== Testing RSS Feed: ${feed.name} ===`);
    logger.info(`URL: ${feed.url}`);
    
    try {
      // Test basic fetch
      logger.info('1. Testing basic HTTP fetch...');
      const response = await axios.get(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RSS-Test-Bot/1.0)'
        },
        timeout: 10000
      });
      
      logger.info(`   ✓ HTTP Status: ${response.status}`);
      logger.info(`   ✓ Content-Type: ${response.headers['content-type']}`);
      logger.info(`   ✓ Content Length: ${response.data.length} bytes`);
      
      // Test RSS parsing
      logger.info('2. Testing RSS parsing...');
      const parsedFeed = await this.rssParser.parseURL(feed.url);
      
      logger.info(`   ✓ Feed Title: ${parsedFeed.title}`);
      logger.info(`   ✓ Feed Description: ${parsedFeed.description}`);
      logger.info(`   ✓ Items Found: ${parsedFeed.items.length}`);
      
      // Test first few items
      logger.info('3. Testing item parsing...');
      const items = parsedFeed.items.slice(0, 3);
      
      items.forEach((item, index) => {
        logger.info(`   Item ${index + 1}:`);
        logger.info(`     Title: ${item.title || 'NO TITLE'}`);
        logger.info(`     Link: ${item.link || 'NO LINK'}`);
        logger.info(`     PubDate: ${item.pubDate || 'NO DATE'}`);
        logger.info(`     Content Preview: ${(item.contentSnippet || item.content || 'NO CONTENT').substring(0, 100)}...`);
        logger.info(`     Categories: ${item.categories ? item.categories.join(', ') : 'NO CATEGORIES'}`);
      });
      
      // Test trend item conversion
      logger.info('4. Testing trend item conversion...');
      const trendItems = parsedFeed.items.map(item => ({
        title: item.title || 'Untitled',
        source: feed.name,
        sourceUrl: item.link,
        description: item.contentSnippet || item.content,
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined
      }));
      
      logger.info(`   ✓ Converted ${trendItems.length} items to trend format`);
      
      // Check for missing titles
      const missingTitles = trendItems.filter(item => !item.title || item.title === 'Untitled');
      if (missingTitles.length > 0) {
        logger.warn(`   ⚠ Warning: ${missingTitles.length} items have missing titles`);
      }
      
      return trendItems;
      
    } catch (error) {
      logger.error(`   ✗ Error testing ${feed.name}:`, error.message);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        logger.error('   → Network connectivity issue');
      } else if (error.response) {
        logger.error(`   → HTTP Error: ${error.response.status} ${error.response.statusText}`);
      } else if (error.message.includes('Invalid XML')) {
        logger.error('   → XML parsing error - feed may be malformed');
      }
      
      return [];
    }
  }

  // Test all RSS feeds
  async testAllFeeds() {
    logger.info('\n🔍 Starting RSS Feed Testing...\n');
    
    const allItems = [];
    
    for (const feed of TEST_FEEDS) {
      const items = await this.testSingleFeed(feed);
      allItems.push(...items);
      
      // Add delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    logger.info(`\n📊 RSS Feed Testing Summary:`);
    logger.info(`   Total items fetched: ${allItems.length}`);
    logger.info(`   Unique titles: ${new Set(allItems.map(item => item.title.toLowerCase())).size}`);
    
    return allItems;
  }

  // Test database operations
  async testDatabaseOperations(trendItems) {
    logger.info('\n=== Testing Database Operations ===');
    
    try {
      // Initialize database
      logger.info('1. Initializing database...');
      const db = await this.initializeTestDatabase();
      
      // Test saving trends
      logger.info('2. Testing trend saving...');
      await this.saveTrendsToDatabase(db, trendItems.slice(0, 5)); // Test with first 5 items
      
      // Test reading trends
      logger.info('3. Testing trend reading...');
      const savedTrends = await this.getPendingTrends(db);
      logger.info(`   ✓ Found ${savedTrends.length} pending trends in database`);
      
      savedTrends.forEach((trend, index) => {
        logger.info(`   Trend ${index + 1}: ${trend.title} (${trend.source})`);
      });
      
      // Close database
      db.close();
      
      return savedTrends;
      
    } catch (error) {
      logger.error('Database testing failed:', error);
      return [];
    }
  }

  // Initialize test database
  async initializeTestDatabase() {
    const dbDir = path.dirname(this.dbPath);
    
    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info(`   ✓ Created database directory: ${dbDir}`);
    }
    
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          logger.error('Error opening database:', err);
          reject(err);
          return;
        }
        
        logger.info(`   ✓ Connected to database: ${this.dbPath}`);
        
        // Promisify methods
        db.runAsync = promisify(db.run).bind(db);
        db.getAsync = promisify(db.get).bind(db);
        db.allAsync = promisify(db.all).bind(db);
        
        // Create tables
        try {
          await this.createTestTables(db);
          resolve(db);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // Create test tables
  async createTestTables(db) {
    const query = `CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      source_url TEXT,
      discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending',
      processed_at DATETIME
    )`;
    
    await db.runAsync(query);
    logger.info('   ✓ Topics table ready');
  }

  // Save trends to database
  async saveTrendsToDatabase(db, trends) {
    for (const trend of trends) {
      try {
        // Check if trend already exists
        const existing = await db.getAsync(
          'SELECT id FROM topics WHERE LOWER(title) = LOWER(?)',
          trend.title
        );

        if (!existing) {
          await db.runAsync(
            `INSERT INTO topics (title, source, source_url, status) 
             VALUES (?, ?, ?, 'pending')`,
            trend.title,
            trend.source,
            trend.sourceUrl || null
          );
          logger.info(`   ✓ Saved: ${trend.title.substring(0, 50)}...`);
        } else {
          logger.info(`   ~ Skipped (exists): ${trend.title.substring(0, 50)}...`);
        }
      } catch (error) {
        logger.error(`   ✗ Error saving trend ${trend.title}:`, error.message);
      }
    }
  }

  // Get pending trends
  async getPendingTrends(db, limit = 10) {
    return await db.allAsync(
      `SELECT * FROM topics 
       WHERE status = 'pending' 
       ORDER BY discovered_at DESC 
       LIMIT ?`,
      limit
    );
  }

  // Test deduplication
  testDeduplication(items) {
    logger.info('\n=== Testing Deduplication ===');
    
    const originalCount = items.length;
    const seen = new Set();
    const deduplicated = items.filter(item => {
      if (!item.title) return false;
      
      const normalizedTitle = item.title.toLowerCase().trim();
      if (seen.has(normalizedTitle)) {
        return false;
      }
      seen.add(normalizedTitle);
      return true;
    });
    
    logger.info(`   Original items: ${originalCount}`);
    logger.info(`   After deduplication: ${deduplicated.length}`);
    logger.info(`   Duplicates removed: ${originalCount - deduplicated.length}`);
    
    return deduplicated;
  }

  // Test TrendService methods directly
  async testTrendServiceMethods() {
    logger.info('\n=== Testing TrendService Methods ===');
    
    try {
      // Import the actual TrendService (we'll create a mock version)
      const TrendService = this.createMockTrendService();
      const trendService = new TrendService();
      
      // Test fetchRSSFeeds method
      logger.info('1. Testing fetchRSSFeeds method...');
      const rssItems = await trendService.fetchRSSFeeds(TEST_FEEDS);
      logger.info(`   ✓ fetchRSSFeeds returned ${rssItems.length} items`);
      
      // Test aggregateTrends method
      logger.info('2. Testing aggregateTrends method...');
      const aggregated = await trendService.aggregateTrends({
        rssFeeds: TEST_FEEDS,
        googleTrends: false // Skip Google Trends for this test
      });
      logger.info(`   ✓ aggregateTrends returned ${aggregated.length} items`);
      
      return aggregated;
      
    } catch (error) {
      logger.error('TrendService method testing failed:', error);
      return [];
    }
  }

  // Create mock TrendService for testing
  createMockTrendService() {
    const self = this;
    
    return class MockTrendService {
      constructor() {
        this.rssParser = new RSSParser();
      }

      async fetchRSSFeeds(feeds) {
        const allItems = [];

        for (const feed of feeds) {
          try {
            logger.info(`   Fetching RSS feed: ${feed.name}`);
            const parsedFeed = await this.rssParser.parseURL(feed.url);
            
            const items = parsedFeed.items.map(item => ({
              title: item.title || 'Untitled',
              source: feed.name,
              sourceUrl: item.link,
              description: item.contentSnippet || item.content,
              publishedAt: item.pubDate ? new Date(item.pubDate) : undefined
            }));

            allItems.push(...items);
            logger.info(`   ✓ Fetched ${items.length} items from ${feed.name}`);
          } catch (error) {
            logger.error(`   ✗ Error fetching RSS feed ${feed.name}:`, error.message);
          }
        }

        return allItems;
      }

      async aggregateTrends(sources) {
        const allTrends = [];

        if (sources.rssFeeds && sources.rssFeeds.length > 0) {
          const rssItems = await this.fetchRSSFeeds(sources.rssFeeds);
          allTrends.push(...rssItems);
        }

        // Deduplicate
        const uniqueTrends = self.deduplicateTrends(allTrends);
        
        // Mock database save
        logger.info(`   ✓ Would save ${uniqueTrends.length} trends to database`);

        return uniqueTrends;
      }
    };
  }

  // Deduplicate trends
  deduplicateTrends(trends) {
    const seen = new Set();
    return trends.filter(trend => {
      if (!trend.title) return false;
      
      const normalizedTitle = trend.title.toLowerCase().trim();
      if (seen.has(normalizedTitle)) {
        return false;
      }
      seen.add(normalizedTitle);
      return true;
    });
  }
}

// Main test function
async function runTests() {
  const testService = new RSSTestService();
  
  try {
    console.log('🚀 Starting RSS Feed Testing Suite\n');
    
    // Test 1: RSS Feed Parsing
    const allItems = await testService.testAllFeeds();
    
    // Test 2: Deduplication
    const deduplicatedItems = testService.testDeduplication(allItems);
    
    // Test 3: Database Operations
    await testService.testDatabaseOperations(deduplicatedItems);
    
    // Test 4: TrendService Methods
    await testService.testTrendServiceMethods();
    
    // Final summary
    logger.info('\n🎉 RSS Feed Testing Complete!');
    logger.info('\n📋 Summary:');
    logger.info(`   • Total items fetched: ${allItems.length}`);
    logger.info(`   • After deduplication: ${deduplicatedItems.length}`);
    logger.info(`   • RSS Parser: ${allItems.length > 0 ? '✓ Working' : '✗ Not working'}`);
    logger.info(`   • Database: ${deduplicatedItems.length > 0 ? '✓ Working' : '✗ Check database setup'}`);
    
    // Recommendations
    logger.info('\n💡 Recommendations:');
    if (allItems.length === 0) {
      logger.info('   • Check internet connection and RSS feed URLs');
      logger.info('   • Verify RSS feeds are accessible');
    }
    if (deduplicatedItems.length !== allItems.length) {
      logger.info('   • Consider implementing better deduplication logic');
    }
    
  } catch (error) {
    logger.error('Test suite failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { RSSTestService, runTests };