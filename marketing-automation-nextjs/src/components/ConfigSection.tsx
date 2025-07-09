'use client';

import React, { useState, useEffect } from 'react';

interface ConfigSectionProps {
  onConfigSaved: () => void;
}

const CONFIG_STORAGE_KEY = 'marketing-automation-config';

const ConfigSection: React.FC<ConfigSectionProps> = ({ onConfigSaved }) => {
  const [config, setConfig] = useState({
    serpApiKey: '',
    aiProvider: 'openai',
    openAiKey: '',
    geminiApiKey: '',
    lmStudioUrl: 'http://localhost:1234',
    lmStudioModel: 'llama-3.2-3b-instruct',
    wechatAppId: '',
    wechatAppSecret: '',
    xhsCookie: '',
    googleDocsCredentials: '',
    googleDocsFolderId: '',
    rssFeeds: [
      { url: 'https://techcrunch.com/feed/', name: 'TechCrunch' },
      { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge' }
    ]
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoSaved, setAutoSaved] = useState(false);

  // Load configuration from localStorage on component mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // First try to load from localStorage
        const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          setConfig(parsed);
        } else {
          // If not in localStorage, try to load from server
          const response = await fetch('/api/config');
          if (response.ok) {
            const serverConfig = await response.json();
            if (serverConfig.serpApiKey || serverConfig.openAiKey) {
              setConfig(serverConfig);
              // Save to localStorage for next time
              localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(serverConfig));
            }
          }
        }
      } catch (error) {
        console.error('Error loading configuration:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    // Save to localStorage as user types
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    
    // Show auto-saved indicator
    setAutoSaved(true);
    setTimeout(() => setAutoSaved(false), 2000);
  };

  const handleRssFeedChange = (index: number, field: 'url' | 'name', value: string) => {
    const newFeeds = [...config.rssFeeds];
    newFeeds[index][field] = value;
    const newConfig = { ...config, rssFeeds: newFeeds };
    setConfig(newConfig);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
  };

  const addRssFeed = () => {
    const newConfig = {
      ...config,
      rssFeeds: [...config.rssFeeds, { url: '', name: '' }]
    };
    setConfig(newConfig);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
  };

  const removeRssFeed = (index: number) => {
    const newConfig = {
      ...config,
      rssFeeds: config.rssFeeds.filter((_, i) => i !== index)
    };
    setConfig(newConfig);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        // Configuration saved to server successfully
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
        onConfigSaved();
      } else {
        alert('Failed to save configuration. Please check your inputs.');
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
      alert('Failed to save configuration. Please check your inputs.');
    } finally {
      setSaving(false);
    }
  };

  const clearConfiguration = () => {
    if (confirm('Are you sure you want to clear all configuration? This cannot be undone.')) {
      const emptyConfig = {
        serpApiKey: '',
        aiProvider: 'openai',
        openAiKey: '',
        geminiApiKey: '',
        lmStudioUrl: 'http://localhost:1234',
        lmStudioModel: 'llama-3.2-3b-instruct',
        wechatAppId: '',
        wechatAppSecret: '',
        xhsCookie: '',
        googleDocsCredentials: '',
        googleDocsFolderId: '',
        rssFeeds: [
          { url: 'https://techcrunch.com/feed/', name: 'TechCrunch' },
          { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge' }
        ]
      };
      setConfig(emptyConfig);
      localStorage.removeItem(CONFIG_STORAGE_KEY);
    }
  };

  if (loading) {
    return (
      <section className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <div className="text-center py-8">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
          <p className="mt-4 text-gray-600">Loading configuration...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center">
          <i className="fa-solid fa-cogs h-6 w-6 mr-3 text-blue-500"></i>
          Configuration
        </h2>
        {autoSaved && (
          <div className="text-sm text-green-600 flex items-center animate-pulse">
            <i className="fa-solid fa-check-circle mr-2"></i>
            Auto-saved locally
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">Core APIs & Services</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="serpapi-key" className="block text-sm font-medium text-gray-700">
                SerpAPI Key (for Google Trends)
              </label>
              <input
                type="password"
                id="serpapi-key"
                value={config.serpApiKey}
                onChange={(e) => handleInputChange('serpApiKey', e.target.value)}
                placeholder="Enter your SerpAPI key"
                className="form-input mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="ai-provider" className="block text-sm font-medium text-gray-700">
                AI Provider for Content Generation
              </label>
              <select
                id="ai-provider"
                value={config.aiProvider}
                onChange={(e) => handleInputChange('aiProvider', e.target.value)}
                className="form-select mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="openai">OpenAI (GPT-4/GPT-3.5)</option>
                <option value="gemini">Google Gemini</option>
                <option value="lmstudio">LM Studio (Local)</option>
              </select>
            </div>
            
            {config.aiProvider === 'openai' && (
              <div>
                <label htmlFor="openai-key" className="block text-sm font-medium text-gray-700">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  id="openai-key"
                  value={config.openAiKey}
                  onChange={(e) => handleInputChange('openAiKey', e.target.value)}
                  placeholder="Enter your OpenAI API key"
                  className="form-input mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            )}
            
            {config.aiProvider === 'gemini' && (
              <div>
                <label htmlFor="gemini-key" className="block text-sm font-medium text-gray-700">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  id="gemini-key"
                  value={config.geminiApiKey}
                  onChange={(e) => handleInputChange('geminiApiKey', e.target.value)}
                  placeholder="Enter your Google Gemini API key"
                  className="form-input mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Google AI Studio</a>
                </p>
              </div>
            )}
            
            {config.aiProvider === 'lmstudio' && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="lmstudio-url" className="block text-sm font-medium text-gray-700">
                    LM Studio Server URL
                  </label>
                  <input
                    type="url"
                    id="lmstudio-url"
                    value={config.lmStudioUrl}
                    onChange={(e) => handleInputChange('lmStudioUrl', e.target.value)}
                    placeholder="http://localhost:1234"
                    className="form-input mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="lmstudio-model" className="block text-sm font-medium text-gray-700">
                    Model Name
                  </label>
                  <input
                    type="text"
                    id="lmstudio-model"
                    value={config.lmStudioModel}
                    onChange={(e) => handleInputChange('lmStudioModel', e.target.value)}
                    placeholder="llama-3.2-3b-instruct"
                    className="form-input mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                  <p className="text-sm text-blue-700">
                    <span className="font-bold">LM Studio Setup:</span> Download and run LM Studio, start the local server, and ensure it's running on the specified URL.
                  </p>
                </div>
              </div>
            )}
          </div>

          <h3 className="text-lg font-semibold mt-8 mb-4 border-b pb-2">Trend Sources</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RSS Feeds
            </label>
            {config.rssFeeds.map((feed, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={feed.name}
                  onChange={(e) => handleRssFeedChange(index, 'name', e.target.value)}
                  placeholder="Feed name"
                  className="form-input flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <input
                  type="url"
                  value={feed.url}
                  onChange={(e) => handleRssFeedChange(index, 'url', e.target.value)}
                  placeholder="Feed URL"
                  className="form-input flex-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <button
                  onClick={() => removeRssFeed(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
            ))}
            <button
              onClick={addRssFeed}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <i className="fa-solid fa-plus mr-1"></i> Add RSS Feed
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">Publishing Channels</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="wechat-appid" className="block text-sm font-medium text-gray-700">
                WeChat AppID
              </label>
              <input
                type="text"
                id="wechat-appid"
                value={config.wechatAppId}
                onChange={(e) => handleInputChange('wechatAppId', e.target.value)}
                placeholder="Enter WeChat Service Account AppID"
                className="form-input mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="wechat-secret" className="block text-sm font-medium text-gray-700">
                WeChat AppSecret
              </label>
              <input
                type="password"
                id="wechat-secret"
                value={config.wechatAppSecret}
                onChange={(e) => handleInputChange('wechatAppSecret', e.target.value)}
                placeholder="Enter WeChat AppSecret"
                className="form-input mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <i className="fa-solid fa-triangle-exclamation h-5 w-5 text-yellow-400"></i>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <span className="font-bold">Xiao Hongshu (XHS) Advisory:</span> 
                    This system uses a semi-automated approach. Content will be prepared for you to manually post.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="xhs-cookie" className="block text-sm font-medium text-gray-700">
                Xiao Hongshu Cookie (Optional)
              </label>
              <input
                type="password"
                id="xhs-cookie"
                value={config.xhsCookie}
                onChange={(e) => handleInputChange('xhsCookie', e.target.value)}
                placeholder="Enter XHS cookie for advanced features"
                className="form-input mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <i className="fa-solid fa-info-circle h-5 w-5 text-blue-400"></i>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <span className="font-bold">Google Docs Integration:</span> 
                    Automatically save all generated content to Google Docs for backup and collaboration.
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Supports: API Keys (easiest), Service Account JSON, or file paths
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="google-docs-credentials" className="block text-sm font-medium text-gray-700">
                Google Cloud Credentials
              </label>
              <textarea
                id="google-docs-credentials"
                value={config.googleDocsCredentials}
                onChange={(e) => handleInputChange('googleDocsCredentials', e.target.value)}
                placeholder="API Key (AIza...) or Service Account JSON or file path"
                rows={2}
                className="form-input mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono text-xs"
              />
              <p className="mt-1 text-xs text-gray-500">
                <span className="font-semibold">Easiest:</span> Google Cloud API Key (AIza...)
                <br />
                <span className="font-semibold">Advanced:</span> Service Account JSON or file path
              </p>
            </div>

            <div>
              <label htmlFor="google-docs-folder" className="block text-sm font-medium text-gray-700">
                Google Drive Folder ID (Optional)
              </label>
              <input
                type="text"
                id="google-docs-folder"
                value={config.googleDocsFolderId}
                onChange={(e) => handleInputChange('googleDocsFolderId', e.target.value)}
                placeholder="Google Drive folder ID to save documents"
                className="form-input mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={clearConfiguration}
          className="btn inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          <i className="fa-solid fa-trash mr-2"></i>
          Clear Configuration
        </button>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {saving ? (
            <>
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
              Saving...
            </>
          ) : (
            <>
              Save Configuration & Start
            </>
          )}
        </button>
      </div>
    </section>
  );
};

export default ConfigSection;