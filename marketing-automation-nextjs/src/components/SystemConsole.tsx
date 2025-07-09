'use client';

import React, { useEffect, useRef } from 'react';
import { LogEntry } from './MainApp';

interface SystemConsoleProps {
  logs: LogEntry[];
}

const SystemConsole: React.FC<SystemConsoleProps> = ({ logs }) => {
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogStyle = (type: LogEntry['type']): string => {
    switch (type) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50';
      case 'success':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getLogIcon = (type: LogEntry['type']): string => {
    switch (type) {
      case 'error':
        return 'fa-solid fa-circle-exclamation';
      case 'warn':
        return 'fa-solid fa-triangle-exclamation';
      case 'success':
        return 'fa-solid fa-circle-check';
      default:
        return 'fa-solid fa-circle-info';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <i className="fa-solid fa-terminal mr-2 text-gray-600"></i>
          System Console
        </h3>
      </div>
      
      <div 
        ref={consoleRef}
        className="h-80 overflow-y-auto p-4 space-y-2 font-mono text-sm"
      >
        {logs.map((log, index) => (
          <div key={index} className={`p-2 rounded-md ${getLogStyle(log.type)}`}>
            <div className="flex items-start space-x-2">
              <i className={`${getLogIcon(log.type)} mt-0.5 flex-shrink-0`}></i>
              <div className="flex-1">
                <div className="console-line">{log.message}</div>
                <div className="text-xs opacity-75 mt-1">
                  {log.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {logs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <i className="fa-solid fa-terminal text-2xl mb-2"></i>
            <p>No logs yet. System is ready.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemConsole;