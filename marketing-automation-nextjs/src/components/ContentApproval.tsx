'use client';

import React, { useState, useEffect } from 'react';
import { LogEntry } from './MainApp';

interface ContentApprovalProps {
  onLog: (message: string, type: LogEntry['type']) => void;
}

interface ContentItem {
  id: number;
  topic_id: number | null;
  platform: string;
  title: string;
  body: string;
  hashtags: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
  published_at: string | null;
}

const ContentApproval: React.FC<ContentApprovalProps> = ({ onLog }) => {
  const [pendingContent, setPendingContent] = useState<ContentItem[]>([]);
  const [approvedContent, setApprovedContent] = useState<ContentItem[]>([]);
  const [publishedContent, setPublishedContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch content from API
  const fetchContent = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch('/api/content');
      if (response.ok) {
        const data = await response.json();
        setPendingContent(data.pending || []);
        setApprovedContent(data.approved || []);
        setPublishedContent(data.published || []);
      } else {
        onLog('Failed to fetch content', 'error');
      }
    } catch (error) {
      onLog('Error fetching content', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load content on component mount
  useEffect(() => {
    fetchContent();
  }, []);

  // Handle content approval
  const handleApprove = async (contentId: number, platform: string) => {
    try {
      const response = await fetch(`/api/content/${contentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        onLog(`${platform.toUpperCase()} content approved`, 'success');
        fetchContent(true); // Refresh content
      } else {
        onLog(`Failed to approve ${platform} content`, 'error');
      }
    } catch (error) {
      onLog(`Error approving ${platform} content`, 'error');
    }
  };

  // Handle content rejection
  const handleReject = async (contentId: number, platform: string) => {
    try {
      const response = await fetch(`/api/content/${contentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        onLog(`${platform.toUpperCase()} content rejected`, 'warn');
        fetchContent(true); // Refresh content
      } else {
        onLog(`Failed to reject ${platform} content`, 'error');
      }
    } catch (error) {
      onLog(`Error rejecting ${platform} content`, 'error');
    }
  };

  // Handle content publishing
  const handlePublish = async (contentId: number, platform: string, title: string) => {
    try {
      const response = await fetch(`/api/content/${contentId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.googleDocsUrl) {
          onLog(`${platform.toUpperCase()} content published to Google Docs: ${data.googleDocsUrl}`, 'success');
        } else {
          onLog(`${platform.toUpperCase()} content published successfully`, 'success');
        }
        fetchContent(true); // Refresh content
      } else {
        const errorData = await response.json();
        onLog(`Failed to publish ${platform} content: ${errorData.error?.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      onLog(`Error publishing ${platform} content`, 'error');
    }
  };

  // Format platform display name
  const formatPlatform = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'wechat': return 'WeChat';
      case 'xhs': return 'XHS';
      case 'googledocs': return 'Google Docs';
      default: return platform.toUpperCase();
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
          <div className="text-center">
            <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
            <p className="mt-4 text-gray-600">Loading content...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pending Content Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Content for Approval</h2>
          <button
            onClick={() => fetchContent(true)}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <i className={`fa-solid fa-refresh mr-2 ${refreshing ? 'fa-spin' : ''}`}></i>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {pendingContent.length === 0 ? (
          <div className="text-center py-12 px-6 bg-white rounded-xl shadow-lg border border-gray-200">
            <i className="fa-solid fa-file-alt h-12 w-12 mx-auto text-gray-300"></i>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Content Pending</h3>
            <p className="mt-1 text-sm text-gray-500">Start a campaign to generate content for review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingContent.map((content) => (
              <div key={content.id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {formatPlatform(content.platform)}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {formatDate(content.created_at)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{content.title}</h3>
                    <div className="text-sm text-gray-700 mb-3 max-h-32 overflow-y-auto">
                      {content.body}
                    </div>
                    {content.hashtags && (
                      <div className="text-sm text-blue-600 mb-3">
                        <i className="fa-solid fa-hashtag mr-1"></i>
                        {content.hashtags}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleApprove(content.id, content.platform)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <i className="fa-solid fa-check mr-1"></i>
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(content.id, content.platform)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <i className="fa-solid fa-times mr-1"></i>
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Content Section */}
      <div>
        <h2 className="text-xl font-bold mb-4 text-gray-800">Approved Content (Ready to Publish)</h2>
        {approvedContent.length === 0 ? (
          <div className="text-center py-12 px-6 bg-white rounded-xl shadow-lg border border-gray-200">
            <i className="fa-solid fa-thumbs-up h-12 w-12 mx-auto text-gray-300"></i>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Content Approved Yet</h3>
            <p className="mt-1 text-sm text-gray-500">Approve pending content to see it here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvedContent.map((content) => (
              <div key={content.id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {formatPlatform(content.platform)}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        Approved: {formatDate(content.approved_at || '')}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{content.title}</h3>
                    <div className="text-sm text-gray-700 mb-3 max-h-32 overflow-y-auto">
                      {content.body}
                    </div>
                    {content.hashtags && (
                      <div className="text-sm text-blue-600">
                        <i className="fa-solid fa-hashtag mr-1"></i>
                        {content.hashtags}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => handlePublish(content.id, content.platform, content.title)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <i className="fa-solid fa-paper-plane mr-1"></i>
                      Publish
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Published Content Section */}
      <div>
        <h2 className="text-xl font-bold mb-4 text-gray-800">Published Content</h2>
        {publishedContent.length === 0 ? (
          <div className="text-center py-12 px-6 bg-white rounded-xl shadow-lg border border-gray-200">
            <i className="fa-solid fa-check-circle h-12 w-12 mx-auto text-gray-300"></i>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Content Published Yet</h3>
            <p className="mt-1 text-sm text-gray-500">Publish approved content to see it here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {publishedContent.map((content) => (
              <div key={content.id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {formatPlatform(content.platform)}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        Published: {formatDate(content.published_at || '')}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{content.title}</h3>
                    <div className="text-sm text-gray-700 mb-3 max-h-32 overflow-y-auto">
                      {content.body}
                    </div>
                    {content.hashtags && (
                      <div className="text-sm text-blue-600">
                        <i className="fa-solid fa-hashtag mr-1"></i>
                        {content.hashtags}
                      </div>
                    )}
                    {content.published_url && (
                      <div className="mt-2">
                        <a
                          href={content.published_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <i className="fa-solid fa-external-link-alt mr-2"></i>
                          View Published Document
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <i className="fa-solid fa-check mr-1"></i>
                      Published
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentApproval;