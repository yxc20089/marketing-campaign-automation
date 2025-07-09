'use client';

import { useState } from 'react';
import ConfigSection from '@/components/ConfigSection';
import MainApp from '@/components/MainApp';

export default function Home() {
  const [isConfigured, setIsConfigured] = useState(false);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
          Automated Marketing Engine
        </h1>
        <p className="mt-3 text-lg text-gray-500">
          An intelligent content generation and publishing system
        </p>
      </header>

      {!isConfigured ? (
        <ConfigSection onConfigSaved={() => setIsConfigured(true)} />
      ) : (
        <MainApp />
      )}
    </div>
  );
}