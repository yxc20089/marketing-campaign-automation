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

  // Check publishing providers on component mount
  useEffect(() => {
    checkPublishingProviders();
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

    setCampaignInProgress(true);
    onLog('Starting new campaign...', 'info');

    try {
      // Run the campaign
      const response = await fetch('/api/campaigns/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
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

      <button
        onClick={startCampaign}
        disabled={campaignInProgress || !hasValidProviders}
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