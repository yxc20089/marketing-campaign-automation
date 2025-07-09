# Quick Start Guide

## Fixed Issues

1. **CSS Parsing Error**: Reordered `@import` statements in `globals.css`
2. **Internal Server Error**: Fixed missing `RSS_FEEDS` environment variable
3. **Database Path**: Corrected database path configuration

## To Run the Application

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Or use the startup script**:
   ```bash
   npm run start:marketing
   ```

3. **Access the application**:
   - Open http://localhost:3000 in your browser
   - Configure your API keys if not already set
   - Start running marketing campaigns!

## Configuration Approach

The application uses a clean separation of configuration:

1. **System Configuration** (`.env.local`):
   - Database path
   - JWT secret
   - Rate limiting settings
   - Copy `.env.local.minimal` to `.env.local` for a fresh start

2. **User Configuration** (via Web UI):
   - API keys (OpenAI, SerpAPI, etc.)
   - Service credentials (WeChat, Google Docs, etc.)
   - RSS feeds
   - **Auto-saved to browser localStorage** as you type
   - Persisted to server in `user-config.json` when you click Save
   - Configuration automatically reloads on page refresh
   - Clear button to reset all configuration

## Google Docs Configuration

There are two ways to configure Google Docs:

1. **Service Account Credentials (Recommended)**:
   - Create a service account in Google Cloud Console
   - Download the JSON credentials file
   - Either paste the entire JSON into the UI or provide the file path

2. **API Key (Limited)**:
   - Simple to set up but has limitations
   - Can only read public documents
   - Cannot create or modify documents

For full functionality, use service account credentials.

## Troubleshooting

If you encounter any issues:
1. Check that all dependencies are installed: `npm install`
2. Ensure the data directory exists: `mkdir -p data`
3. Check the console for any error messages
4. Verify your API keys are valid

The application is now ready to use!