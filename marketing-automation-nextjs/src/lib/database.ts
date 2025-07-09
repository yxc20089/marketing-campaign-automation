import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const dbPath = process.env.DATABASE_PATH || './public/data/marketing.db';
const dbDir = path.dirname(dbPath);

let db: sqlite3.Database | null = null;

export async function initializeDatabase() {
  if (db) return db;

  try {
    // Ensure data directory exists
    await fs.mkdir(dbDir, { recursive: true });

    // Create database connection
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        throw err;
      }
      console.log('Connected to SQLite database');
    });

    // Promisify database methods
    (db as any).runAsync = promisify(db.run).bind(db);
    (db as any).getAsync = promisify(db.get).bind(db);
    (db as any).allAsync = promisify(db.all).bind(db);

    // Create tables
    await createTables();
    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

async function createTables() {
  if (!db) throw new Error('Database not initialized');

  const queries = [
    // Configuration table
    `CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Topics table
    `CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      source_url TEXT,
      discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending',
      processed_at DATETIME
    )`,

    // Content table
    `CREATE TABLE IF NOT EXISTS content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER,
      platform TEXT NOT NULL,
      title TEXT,
      body TEXT NOT NULL,
      image_url TEXT,
      hashtags TEXT,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      published_at DATETIME,
      FOREIGN KEY (topic_id) REFERENCES topics(id)
    )`,

    // Campaigns table
    `CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Campaign logs
    `CREATE TABLE IF NOT EXISTS campaign_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    )`
  ];

  for (const query of queries) {
    await (db as any).runAsync(query);
  }

  console.log('Database tables created successfully');
}

export async function getDb(): Promise<sqlite3.Database> {
  if (!db) {
    await initializeDatabase();
  }
  return db!;
}

// Extend sqlite3.Database type
declare module 'sqlite3' {
  interface Database {
    runAsync(sql: string, ...params: any[]): Promise<sqlite3.RunResult>;
    getAsync(sql: string, ...params: any[]): Promise<any>;
    allAsync(sql: string, ...params: any[]): Promise<any[]>;
  }
}