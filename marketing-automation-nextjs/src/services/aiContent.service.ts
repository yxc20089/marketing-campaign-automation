import OpenAI from 'openai';
import axios from 'axios';
import { logger } from '../lib/utils/logger';
import { getDb } from '../lib/database';
import { AppError } from '../lib/utils/errors';
import { loadUserConfig } from '../lib/utils/config';

interface ContentGenerationOptions {
  topic: string;
  topicId?: number;
  platforms: ('wechat' | 'xhs' | 'googledocs')[];
  generateImage?: boolean;
}

interface GeneratedContent {
  platform: 'wechat' | 'xhs' | 'googledocs';
  title: string;
  body: string;
  hashtags?: string;
  imageUrl?: string;
  imagePrompt?: string;
}

export class ContentGenerationService {
  private openai: OpenAI | null = null;
  private userConfig: any = null;

  constructor() {
    this.initializeConfig();
  }

  private async initializeConfig() {
    this.userConfig = await loadUserConfig();
    console.log('Debug: AI service config loaded:', {
      aiProvider: this.userConfig?.aiProvider,
      hasOpenAiKey: !!this.userConfig?.openAiKey,
      hasGeminiKey: !!this.userConfig?.geminiApiKey,
      hasLmStudioUrl: !!this.userConfig?.lmStudioUrl
    });
    
    if (this.userConfig?.aiProvider === 'openai' && this.userConfig?.openAiKey) {
      this.openai = new OpenAI({
        apiKey: this.userConfig.openAiKey
      });
    }
  }

  // Research topic using AI with real-time search
  async researchTopic(topic: string): Promise<string> {
    await this.initializeConfig();
    
    // First, try to get real-time search results
    let searchResults = '';
    try {
      searchResults = await this.fetchSearchResults(topic);
    } catch (error) {
      logger.warn('Failed to fetch search results, using AI knowledge only:', error);
    }
    
    // Create prompt with search results or fallback to AI knowledge
    const prompt = searchResults
      ? `Based on the following recent search results about "${topic}", provide a comprehensive analysis including:
      - Current relevance and why it's trending
      - Key facts and latest developments
      - Main arguments or perspectives
      - Impact on society or industry
      
      Recent Search Results:
      ${searchResults}
      
      Provide a detailed summary incorporating these latest findings.`
      : `Provide a detailed overview of "${topic}" including:
      - Current relevance and why it's trending
      - Key facts and statistics
      - Main arguments or perspectives
      - Impact on society or industry
      Keep the response concise and informative. Note: Using AI knowledge only as search results unavailable.`;

    try {
      const aiProvider = this.userConfig?.aiProvider || 'openai';
      
      if (aiProvider === 'openai' && this.userConfig?.openAiKey) {
        // Re-initialize OpenAI if not already done
        if (!this.openai) {
          this.openai = new OpenAI({
            apiKey: this.userConfig.openAiKey
          });
        }
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4.1-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 800
        });
        return response.choices[0].message.content || '';
      } else if (aiProvider === 'gemini') {
        return await this.callGemini(prompt);
      } else if (aiProvider === 'lmstudio') {
        return await this.callLMStudio(prompt);
      } else {
        throw new AppError('AI provider not configured', 400);
      }
    } catch (error) {
      logger.error('Error researching topic:', error);
      throw new AppError('Failed to research topic', 500);
    }
  }

  // Fetch search results using SerpAPI
  private async fetchSearchResults(topic: string): Promise<string> {
    if (!this.userConfig?.serpApiKey) {
      throw new Error('SerpAPI key not configured');
    }

    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: topic,
          api_key: this.userConfig.serpApiKey,
          engine: 'google',
          num: 5, // Get top 5 results
          hl: 'en'
        }
      });

      const organicResults = response.data.organic_results || [];
      const newsResults = response.data.news_results || [];
      
      // Combine organic and news results
      const allResults = [...organicResults, ...newsResults];
      
      if (allResults.length === 0) {
        throw new Error('No search results found');
      }

      // Format search results
      const formattedResults = allResults.slice(0, 5).map((result, index) => {
        return `${index + 1}. ${result.title}
        ${result.snippet || result.summary || ''}
        Source: ${result.source || result.link}
        ${result.date ? `Date: ${result.date}` : ''}`;
      }).join('\n\n');

      logger.info(`Fetched ${allResults.length} search results for topic: ${topic}`);
      return formattedResults;
    } catch (error: any) {
      logger.error('Error fetching search results:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  // Generate content for multiple platforms
  async generateContent(options: ContentGenerationOptions): Promise<GeneratedContent[]> {
    const { topic, platforms } = options;
    
    // First, research the topic
    logger.info(`Researching topic: ${topic}`);
    const research = await this.researchTopic(topic);

    // Generate platform-specific content
    const prompt = this.buildContentPrompt(topic, research, platforms);
    
    try {
      await this.initializeConfig();
      let response: any;
      const aiProvider = this.userConfig?.aiProvider || 'openai';
      
      if (aiProvider === 'openai' && this.userConfig?.openAiKey) {
        // Re-initialize OpenAI if not already done
        if (!this.openai) {
          this.openai = new OpenAI({
            apiKey: this.userConfig.openAiKey
          });
        }
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4.1-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 1500,
          response_format: { type: 'json_object' }
        });
        response = JSON.parse(completion.choices[0].message.content || '{}');
      } else if (aiProvider === 'gemini') {
        const geminiResponse = await this.callGemini(prompt);
        response = JSON.parse(geminiResponse);
      } else if (aiProvider === 'lmstudio') {
        const lmStudioResponse = await this.callLMStudio(prompt);
        response = JSON.parse(lmStudioResponse);
      } else {
        throw new AppError('AI provider not configured', 400);
      }

      const contents: GeneratedContent[] = [];

      // Process each platform
      for (const platform of platforms) {
        if (response[`${platform}_post`]) {
          const post = response[`${platform}_post`];
          const content: GeneratedContent = {
            platform,
            title: post.title,
            body: post.body,
            hashtags: post.hashtags
          };

          // Generate image if requested
          if (options.generateImage && post.image_prompt) {
            content.imagePrompt = post.image_prompt;
            if (this.aiProvider === 'openai' && this.openai) {
              try {
                const imageResponse = await this.openai.images.generate({
                  prompt: post.image_prompt,
                  n: 1,
                  size: '1024x1024'
                });
                content.imageUrl = imageResponse.data?.[0]?.url;
              } catch (error) {
                logger.error('Error generating image:', error);
              }
            }
          }

          contents.push(content);

          // Save to database
          if (options.topicId) {
            await this.saveContentToDatabase(content, options.topicId);
          }
        }
      }

      return contents;
    } catch (error) {
      logger.error('Error generating content:', error);
      throw new AppError('Failed to generate content', 500);
    }
  }

  private buildContentPrompt(topic: string, research: string, platforms: string[]): string {
    const platformInstructions: Record<string, string> = {
      wechat: `For 'wechat_post': Create a professional and informative article for WeChat Official Account.
      - Title: Compelling and SEO-friendly (max 30 characters)
      - Body: 300-400 words, well-structured with clear sections
      - Tone: Professional, authoritative, and engaging
      - Include: Relevant emojis to enhance readability
      - End with: A thought-provoking question to encourage engagement
      - Add an 'image_prompt' field with a description for DALL-E 3`,
      
      xhs: `For 'xhs_post': Create a trendy and casual post for Xiao Hongshu.
      - Title: Eye-catching with emojis (max 20 characters)
      - Body: 150-200 words, conversational and relatable
      - Tone: Casual, trendy, enthusiastic
      - Format: Use line breaks, emojis, and numbered points
      - Hashtags: Include 5-7 relevant, trending hashtags
      - Add an 'image_prompt' field with a description for DALL-E 3`,
      
      googledocs: `For 'googledocs_post': Create a comprehensive document for Google Docs.
      - Title: Detailed and descriptive (max 60 characters)
      - Body: 500-800 words, comprehensive and well-researched
      - Tone: Professional, detailed, and informative
      - Structure: Include introduction, main sections, and conclusion
      - Format: Use proper headings, bullet points, and paragraphs
      - Include: Key insights, data points, and actionable takeaways
      - Add an 'image_prompt' field with a description for DALL-E 3`
    };

    const selectedInstructions = platforms
      .map(p => platformInstructions[p])
      .filter(Boolean)
      .join('\n\n');

    return `You are an expert social media marketer. Based on the following research about "${topic}", generate content for social media campaigns.

Research Summary:
${research}

Generate content in JSON format with the following structure:
${selectedInstructions}

The output must be a valid JSON object with keys: ${platforms.map(p => `'${p}_post'`).join(', ')}.
Each post object should have: title, body, hashtags (for xhs), and image_prompt fields.`;
  }

  // Call Google Gemini API
  private async callGemini(prompt: string): Promise<string> {
    if (!this.userConfig?.geminiApiKey) {
      throw new AppError('Gemini API key not configured', 400);
    }

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.userConfig.geminiApiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      logger.error('Error calling Gemini:', error);
      throw new AppError('Failed to generate content with Gemini', 500);
    }
  }

  // Call LM Studio API
  private async callLMStudio(prompt: string): Promise<string> {
    if (!this.userConfig?.lmStudioUrl) {
      throw new AppError('LM Studio URL not configured', 400);
    }

    try {
      const response = await axios.post(
        `${this.userConfig.lmStudioUrl}/v1/chat/completions`,
        {
          model: this.userConfig.lmStudioModel || 'local-model',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error('Error calling LM Studio:', error);
      throw new AppError('Failed to generate content with LM Studio', 500);
    }
  }

  private async callOllama(prompt: string): Promise<string> {
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama2';
    
    try {
      const response = await axios.post(`${ollamaBaseUrl}/api/generate`, {
        model: ollamaModel,
        prompt,
        stream: false
      });
      return response.data.response;
    } catch (error) {
      logger.error('Error calling Ollama:', error);
      throw new AppError('Failed to generate content with Ollama', 500);
    }
  }

  private async saveContentToDatabase(content: GeneratedContent, topicId: number): Promise<void> {
    const db = await getDb();
    
    try {
      await (db as any).run(
        `INSERT INTO content (topic_id, platform, title, body, hashtags, image_url, status)
         VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
        topicId,
        content.platform,
        content.title,
        content.body,
        content.hashtags || null,
        content.imageUrl || null
      );
      logger.info(`Saved ${content.platform} content for topic ${topicId}`);
    } catch (error) {
      logger.error('Error saving content to database:', error);
    }
  }

  // Get content by topic
  async getContentByTopic(topicId: number): Promise<any[]> {
    const db = await getDb();
    return await (db as any).all(
      'SELECT * FROM content WHERE topic_id = ? ORDER BY created_at DESC',
      topicId
    );
  }

  // Update content status
  async updateContentStatus(contentId: number, status: string): Promise<void> {
    const db = await getDb();
    const timestamp = status === 'approved' ? 'approved_at' : 
                     status === 'published' ? 'published_at' : null;
    
    let query = 'UPDATE content SET status = ?';
    const params: any[] = [status];
    
    if (timestamp) {
      query += `, ${timestamp} = CURRENT_TIMESTAMP`;
    }
    
    query += ' WHERE id = ?';
    params.push(contentId);
    
    await (db as any).run(query, ...params);
  }
}