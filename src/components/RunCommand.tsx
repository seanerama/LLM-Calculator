'use client';

import { useState } from 'react';

interface RunCommandProps {
  command: string;
  modelName: string;
  framework: string;
}

export function RunCommand({ command, modelName, framework }: RunCommandProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = command;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-6">
      <h3 className="text-[1.125rem] font-semibold text-text-primary mb-4">Run Command</h3>
      <div
        className="relative bg-[#0d1117] border border-border-default rounded-lg p-4"
        aria-label={`Run command for ${modelName} with ${framework}`}
      >
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 px-3 py-1 text-[0.75rem] font-medium rounded-md bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          aria-live="polite"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <pre className="font-mono text-[0.8125rem] text-[#e6edf3] whitespace-pre-wrap break-all pr-16">
          <code>{command}</code>
        </pre>
      </div>
    </div>
  );
}
