# Marketing Automation System (Next.js Version)

A comprehensive marketing automation tool that discovers trends, generates AI-powered content, and publishes to multiple platforms including WeChat, Xiao Hongshu (XHS), and Google Docs.

## Features

- **Trend Discovery**: Automatically discovers trending topics from RSS feeds and Google Trends
- **AI Content Generation**: Creates marketing content using OpenAI or Ollama
- **Multi-Platform Publishing**: Supports WeChat, XHS, and Google Docs
- **Human Approval Workflow**: Content requires manual approval before publishing
- **Provider Validation**: Ensures at least one publishing provider is configured
- **Real-time Dashboard**: Monitor campaign progress and system logs

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- API keys for the services you want to use:
  - OpenAI API key (for content generation)
  - SerpAPI key (for Google Trends)
  - WeChat App credentials (optional)
  - XHS cookie (optional)
  - Google Docs service account (optional)

### Installation

1. **Clone and install dependencies**:
```bash
cd marketing-automation-nextjs
npm install
```

2. **Start the application**:
```bash
npm run start:marketing
```

3. **Configure your API keys**:
   - Open http://localhost:3000 in your browser
   - Fill in your API keys and configuration
   - Save configuration to start using the system

## Configuration

### Core APIs
- **SerpAPI Key**: Required for Google Trends discovery
- **OpenAI API Key**: Required for content generation

### Publishing Providers
At least one of the following must be configured:

- **WeChat**: App ID and App Secret
- **XHS**: Cookie for semi-automated posting
- **Google Docs**: Service account credentials and folder ID

### RSS Feeds
Configure RSS feeds for trend discovery. Default feeds include:
- TechCrunch
- The Verge

## Usage

1. **Configure the system** with your API keys
2. **Start a campaign** from the control panel
3. **Review generated content** in the approval section
4. **Approve or reject** content before publishing
5. **Monitor progress** through the system console

## API Endpoints

- `POST /api/config` - Save configuration
- `GET /api/config` - Get current configuration
- `POST /api/campaigns/run` - Start a new campaign
- `GET /api/publish/providers` - Check publishing providers

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── globals.css    # Global styles
│   └── page.tsx       # Main page
├── components/
│   ├── ConfigSection.tsx    # Configuration UI
│   ├── ControlPanel.tsx     # Campaign controls
│   ├── MainApp.tsx          # Main application layout
│   └── SystemConsole.tsx    # System logs display
└── services/
    ├── campaign.service.ts          # Campaign orchestration
    ├── contentGeneration.service.ts # AI content generation
    ├── database.service.ts          # Database operations
    ├── googleDocs.service.ts        # Google Docs integration
    ├── publishingValidator.service.ts # Provider validation
    ├── trend.service.ts             # Trend discovery
    ├── wechat.service.ts            # WeChat integration
    └── xhs.service.ts               # XHS integration
```

## Configuration

The system uses two types of configuration:

### System Configuration (.env.local)
Essential system settings that should be configured before running:

```env
# Database
DATABASE_PATH=./data/marketing.db

# Security
JWT_SECRET=your-secret-key-change-this-in-production

# Rate Limiting  
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### User Configuration (via UI)
API keys and service credentials are entered through the web interface and saved securely:

```env
# Core APIs
SERPAPI_KEY=your_serpapi_key
OPENAI_API_KEY=your_openai_key

# WeChat Configuration
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_secret

# XHS Configuration
XHS_COOKIE=your_xhs_cookie

# Google Docs Configuration
GOOGLE_DOCS_CREDENTIALS_PATH=/path/to/credentials.json
GOOGLE_DOCS_FOLDER_ID=your_folder_id

# Database
DATABASE_URL=./data/marketing.db
```

## Security

- API keys are stored securely in environment variables
- Passwords are handled with appropriate input types
- No sensitive data is logged or exposed in the UI

## Support

For issues or questions, please check:
1. Ensure all required API keys are configured
2. Check the system console for error messages
3. Verify your internet connection for API calls

## Architecture

This Next.js version consolidates the frontend and backend into a single application, making it easier to deploy and manage. The system follows a modular architecture with separate services for each major function.

## What's New

This Next.js version consolidates the previously separate Express backend and React frontend into a single, unified application. Key improvements include:

- **Unified Codebase**: Single application for easier development and deployment
- **Improved Performance**: Optimized build process and static generation
- **Better Developer Experience**: Hot reloading for both frontend and backend changes
- **Simplified Architecture**: Reduced complexity with integrated API routes

All functionality from the original Express+React version is preserved and enhanced in this unified Next.js application.
