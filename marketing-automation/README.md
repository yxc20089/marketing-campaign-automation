# Marketing Automation System

A production-ready automated marketing campaign manager that discovers trends, generates AI-powered content, and manages publishing to WeChat and Xiao Hongshu platforms.

## Features

- **Trend Discovery**: Automated RSS feed monitoring and Google Trends integration
- **AI Content Generation**: OpenAI and Ollama support for content creation
- **Multi-Platform Publishing**: WeChat Official Account API, semi-automated XHS workflow, and Google Docs integration
- **Human Approval System**: Review and approve content before publishing
- **Real-time Monitoring**: System console with live campaign tracking
- **Provider Validation**: Automatic validation of publishing providers before campaign execution
- **Local Deployment**: Runs entirely on your local machine

## Architecture

This system implements the architectural blueprint from the reference document:

### Backend (Node.js/Express)
- **Trend Discovery Module**: RSS feeds + SerpAPI for Google Trends
- **AI Content Factory**: OpenAI/Ollama integration with multi-platform generation
- **Publishing Pipeline**: WeChat API integration + semi-automated XHS workflow + Google Docs integration
- **Provider Validation**: Automatic validation of publishing providers before campaign execution
- **SQLite Database**: Local persistence for campaigns, content, and configurations

### Frontend (React/TypeScript)
- **Configuration Interface**: API key management and feed configuration
- **Campaign Control**: Start/stop campaigns with real-time monitoring
- **Content Approval**: Human-in-the-loop approval system
- **Publishing Dashboard**: Track published content and manage XHS workflow

## Quick Start

### Prerequisites
- Node.js 18+
- npm
- API keys for SerpAPI and OpenAI (optional: local Ollama setup)

### Installation

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd marketing-automation
   npm run install:all
   ```

2. **Configure Environment**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your API keys
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

   This starts both backend (port 3001) and frontend (port 3000).

### Configuration

1. **Open the application** at `http://localhost:3000`

2. **Configure API Keys**:
   - SerpAPI key for Google Trends
   - OpenAI API key for content generation
   - WeChat AppID and AppSecret (for publishing)
   - Google Docs service account credentials (for Google Docs publishing)

3. **Set up RSS Feeds**:
   - Add relevant industry news feeds
   - TechCrunch and The Verge are pre-configured

4. **Save Configuration** to proceed to the main application

## Usage

### Running a Campaign

1. **Start Campaign**: Click "Start New Campaign" in the control panel
2. **Monitor Progress**: Watch the system console for real-time updates
3. **Review Content**: Generated content appears in the approval section
4. **Approve/Reject**: Review and approve content for publishing
5. **Publish**: 
   - WeChat: Automatically published via API
   - XHS: Copy prepared content manually to the app
   - Google Docs: Automatically saved as structured documents

### Content Generation

The system automatically:
- Discovers trending topics from RSS feeds and Google Trends
- Researches topics using AI
- Generates platform-specific content:
  - **WeChat**: Professional 300-word articles
  - **XHS**: Casual 150-word posts with hashtags
- Creates accompanying images (if DALL-E 3 is configured)

### Publishing Workflow

#### WeChat
- Requires verified WeChat Service Account
- Automatic API-based publishing
- Uploads images and creates rich media posts

#### Xiao Hongshu (XHS)
- Semi-automated approach (recommended for safety)
- System prepares formatted content
- Manual copy-paste to XHS mobile app
- Includes hashtags and posting instructions

#### Google Docs
- Fully automated document creation
- Structured content with metadata
- Automatic organization into specified folders
- Real-time collaboration capabilities

## API Documentation

### Configuration
- `GET /api/config` - Get current configuration
- `POST /api/config` - Update configuration
- `POST /api/config/test` - Test service connections

### Trends
- `POST /api/trends/fetch` - Fetch trends from sources
- `GET /api/trends/pending` - Get pending trends
- `POST /api/trends/test-rss` - Test RSS feed
- `GET /api/trends/test-google` - Test Google Trends

### Content
- `POST /api/content/generate` - Generate content for topics
- `GET /api/content/topic/:id` - Get content by topic
- `PATCH /api/content/:id/status` - Update content status
- `POST /api/content/research` - Research a topic

### Campaigns
- `POST /api/campaigns/create` - Create new campaign
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns/:id/run` - Run campaign
- `GET /api/campaigns/:id/logs` - Get campaign logs

### Publishing
- `POST /api/publish/wechat` - Publish to WeChat
- `POST /api/publish/xhs/prepare` - Prepare XHS content
- `POST /api/publish/googledocs` - Publish to Google Docs
- `POST /api/publish/auto` - Auto-publish to all configured providers
- `GET /api/publish/providers` - Get publishing providers status
- `GET /api/publish/providers/test` - Test all publishing providers
- `GET /api/publish/status/:id` - Get publishing status

## Cost Optimization

Following the reference architecture's cost optimization strategies:

### Fixed Costs (Monthly)
- **Server**: $0 (local) or $5-10 (VPS)
- **WeChat Verification**: ~$8.25 (annual fee)

### Variable Costs
- **SerpAPI**: $0-20 (depends on frequency)
- **OpenAI API**: $5-50 (use gpt-4o-mini for cost efficiency)
- **Ollama**: $0 (local AI alternative)

### Cost-Saving Tips
1. Use local Ollama for content generation
2. Minimize Google Trends API calls
3. Use cheaper OpenAI models (gpt-4o-mini)
4. Implement hybrid AI strategy (local + cloud)

## Security

- API keys stored securely in environment variables
- SQLite database with proper access controls
- Rate limiting on all API endpoints
- Input validation and sanitization
- CORS protection

## Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```bash
docker-compose up
```

## Troubleshooting

### Common Issues

1. **API Keys Not Working**
   - Verify keys in configuration
   - Check API quotas and billing
   - Test individual services

2. **No Trends Found**
   - Check RSS feed URLs
   - Verify SerpAPI key and quota
   - Test Google Trends endpoint

3. **Content Generation Fails**
   - Verify OpenAI API key
   - Check model availability
   - Try switching to Ollama

4. **WeChat Publishing Issues**
   - Ensure Service Account is verified
   - Check AppID and AppSecret
   - Verify API permissions

### Debug Mode
Set `NODE_ENV=development` for detailed logging.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting guide
2. Review the API documentation
3. Create an issue in the repository