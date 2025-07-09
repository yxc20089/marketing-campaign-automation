'use client';

import React, { useState } from 'react';
import ControlPanel from './ControlPanel';
import SystemConsole from './SystemConsole';
import ContentApproval from './ContentApproval';

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
        <ContentApproval onLog={addLog} />
      </div>
    </section>
  );
};

export default MainApp;