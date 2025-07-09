'use client';

import React, { useState } from 'react';
import ControlPanel from './ControlPanel';
import SystemConsole from './SystemConsole';

export interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
}

const MainApp: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      timestamp: new Date(),
      message: 'System Initialized. Waiting for command...',
      type: 'info'
    }
  ]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date(), message, type }]);
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-8">
        <ControlPanel onLog={addLog} />
        <SystemConsole logs={logs} />
      </div>

      <div className="lg:col-span-2 space-y-8">
        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-800">Content for Approval</h2>
          <div className="text-center py-12 px-6 bg-white rounded-xl shadow-lg border border-gray-200">
            <i className="fa-solid fa-file-alt h-12 w-12 mx-auto text-gray-300"></i>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Content Pending</h3>
            <p className="mt-1 text-sm text-gray-500">Start a campaign to generate content for review.</p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-800">Published Content</h2>
          <div className="text-center py-12 px-6 bg-white rounded-xl shadow-lg border border-gray-200">
            <i className="fa-solid fa-check-circle h-12 w-12 mx-auto text-gray-300"></i>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Content Published Yet</h3>
            <p className="mt-1 text-sm text-gray-500">Approve generated content to see it here.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MainApp;