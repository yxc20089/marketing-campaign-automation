import OpenAI from 'openai';
import axios from 'axios';
import { logger } from '../lib/utils/logger';
import { getDb } from '../lib/database';
import { AppError } from '../lib/utils/errors';

interface ContentGenerationOptions {
  topic: string;
  topicId?: number;
  platforms: ('wechat' | 'xhs')[];
  generateImage?: boolean;
}

interface GeneratedContent {
  platform: 'wechat' | 'xhs';
  title: string;
  body: string;
  hashtags?: string;
  imageUrl?: string;
  imagePrompt?: string;
}

export class ContentGenerationService {
  private openai: OpenAI | null = null;
  private aiProvider: string;
  private ollamaBaseUrl: string;
  private ollamaModel: string;

  constructor() {
    this.aiProvider = process.env.AI_PROVIDER || 'openai';
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'llama2';

    if (this.aiProvider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  // Research topic using AI
  async researchTopic(topic: string): Promise<string> {
    const prompt = `Provide a detailed overview of "${topic}" including:
    - Current relevance and why it's trending
    - Key facts and statistics
    - Main arguments or perspectives
    - Impact on society or industry
    Keep the response concise and informative.`;

    try {
      if (this.aiProvider === 'openai' && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 500
        });
        return response.choices[0].message.content || '';
      } else {
        // Use Ollama
        return await this.callOllama(prompt);
      }
    } catch (error) {
      logger.error('Error researching topic:', error);
      throw new AppError('Failed to research topic', 500);
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
      let response: any;
      
      if (this.aiProvider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 1500,
          response_format: { type: 'json_object' }
        });
        response = JSON.parse(completion.choices[0].message.content || '{}');
      } else {
        const ollamaResponse = await this.callOllama(prompt);
        response = JSON.parse(ollamaResponse);
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

  private async callOllama(prompt: string): Promise<string> {
    try {
      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: this.ollamaModel,
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