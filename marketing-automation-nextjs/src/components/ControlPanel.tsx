'use client';

import React, { useState, useEffect } from 'react';
import { LogEntry } from './MainApp';

interface ControlPanelProps {
  onLog: (message: string, type: LogEntry['type']) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ onLog }) => {
  const [campaignInProgress, setCampaignInProgress] = useState(false);
  const [publishingProviders, setPublishingProviders] = useState<any[]>([]);
  const [hasValidProviders, setHasValidProviders] = useState(false);
  const [campaignMode, setCampaignMode] = useState<'auto' | 'custom'>('auto');
  const [customTopic, setCustomTopic] = useState('');

  // Check publishing providers on component mount and periodically
  useEffect(() => {
    checkPublishingProviders();
    
    // Poll for updates every 30 seconds (reduced frequency)
    const interval = setInterval(() => {
      checkPublishingProviders();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkPublishingProviders = async () => {
    try {
      const response = await fetch('/api/publish/providers');
      const data = await response.json();
      setPublishingProviders(data.availableProviders);
      setHasValidProviders(data.hasProviders);
    } catch (error) {
      console.error('Error checking publishing providers:', error);
    }
  };

  const startCampaign = async () => {
    if (campaignInProgress) return;

    // Validate custom topic if in custom mode
    if (campaignMode === 'custom' && !customTopic.trim()) {
      onLog('Please enter a custom topic', 'error');
      return;
    }

    setCampaignInProgress(true);
    onLog(`Starting new campaign (${campaignMode === 'custom' ? 'custom topic' : 'auto-discovery'})...`, 'info');

    try {
      // Run the campaign
      const response = await fetch('/api/campaigns/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: campaignMode,
          customTopic: campaignMode === 'custom' ? customTopic.trim() : undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        const { trendsFound, processed } = data;

        onLog(`Campaign started successfully`, 'success');
        onLog(`Found ${trendsFound} trends`, 'info');
        
        if (processed) {
          onLog(`Processing topic: "${processed}"`, 'info');
          onLog('Content generation in progress...', 'info');
          
          // Simulate content generation delay
          setTimeout(() => {
            onLog('Content generated successfully. Awaiting approval.', 'success');
          }, 2000);
        }
      } else {
        const error = await response.json();
        onLog(`Campaign failed: ${error.error?.message || 'Unknown error'}`, 'error');
      }
    } catch (error: any) {
      onLog(`Campaign failed: ${error.message}`, 'error');
    } finally {
      setCampaignInProgress(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-4">Control Panel</h2>
      
      {/* Publishing Providers Status */}
      {publishingProviders.length > 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-sm font-semibold text-green-800 mb-2">
            <i className="fa-solid fa-check-circle mr-2"></i>
            Active Publishing Providers
          </h3>
          <ul className="text-sm text-green-700 space-y-1">
            {publishingProviders.map((provider, index) => (
              <li key={index}>
                <i className="fa-solid fa-arrow-right mr-2"></i>
                {provider.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!hasValidProviders && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-sm font-semibold text-red-800 mb-2">
            <i className="fa-solid fa-exclamation-triangle mr-2"></i>
            No Publishing Providers Configured
          </h3>
          <p className="text-sm text-red-700">
            Please configure at least one publishing provider (WeChat, XHS, or Google Docs) before starting a campaign.
          </p>
        </div>
      )}

      {/* Campaign Mode Selection */}
      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Campaign Mode</h3>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="campaignMode"
              value="auto"
              checked={campaignMode === 'auto'}
              onChange={(e) => setCampaignMode(e.target.value as 'auto' | 'custom')}
              className="mr-2"
            />
            <span className="text-sm">Auto-discover trends from RSS feeds</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="campaignMode"
              value="custom"
              checked={campaignMode === 'custom'}
              onChange={(e) => setCampaignMode(e.target.value as 'auto' | 'custom')}
              className="mr-2"
            />
            <span className="text-sm">Use custom topic</span>
          </label>
        </div>
      </div>

      {/* Custom Topic Input */}
      {campaignMode === 'custom' && (
        <div className="mb-4">
          <label htmlFor="customTopic" className="block text-sm font-medium text-gray-700 mb-2">
            Custom Topic or Trend
          </label>
          <input
            type="text"
            id="customTopic"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="e.g., Artificial Intelligence, Climate Change, New iPhone..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      )}

      <button
        onClick={startCampaign}
        disabled={campaignInProgress || !hasValidProviders || (campaignMode === 'custom' && !customTopic.trim())}
        className="btn w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {campaignInProgress ? (
          <>
            <i className="fa-solid fa-spinner fa-spin h-5 w-5 mr-2"></i>
            Campaign in Progress...
          </>
        ) : (
          <>
            <i className="fa-solid fa-play h-5 w-5 mr-2"></i>
            Start New Campaign
          </>
        )}
      </button>
    </div>
  );
};

export default ControlPanel;