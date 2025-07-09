'use client';

import React, { useState } from 'react';

interface ConfigSectionProps {
  onConfigSaved: () => void;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({ onConfigSaved }) => {
  const [config, setConfig] = useState({
    serpApiKey: '',
    openAiKey: '',
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

  const handleInputChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleRssFeedChange = (index: number, field: 'url' | 'name', value: string) => {
    const newFeeds = [...config.rssFeeds];
    newFeeds[index][field] = value;
    setConfig(prev => ({ ...prev, rssFeeds: newFeeds }));
  };

  const addRssFeed = () => {
    setConfig(prev => ({
      ...prev,
      rssFeeds: [...prev.rssFeeds, { url: '', name: '' }]
    }));
  };

  const removeRssFeed = (index: number) => {
    setConfig(prev => ({
      ...prev,
      rssFeeds: prev.rssFeeds.filter((_, i) => i !== index)
    }));
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

  return (
    <section className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <i className="fa-solid fa-cogs h-6 w-6 mr-3 text-blue-500"></i>
        Configuration
      </h2>
      
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
              <label htmlFor="openai-key" className="block text-sm font-medium text-gray-700">
                OpenAI API Key (for Content Generation)
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
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="google-docs-credentials" className="block text-sm font-medium text-gray-700">
                Google Docs Service Account Credentials (JSON file path)
              </label>
              <input
                type="text"
                id="google-docs-credentials"
                value={config.googleDocsCredentials}
                onChange={(e) => handleInputChange('googleDocsCredentials', e.target.value)}
                placeholder="Path to service account credentials.json file"
                className="form-input mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
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

      <div className="mt-8 text-right">
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