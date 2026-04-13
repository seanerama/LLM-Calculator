'use client';

import type { Framework } from '@/lib/types';
import { FRAMEWORK_TABLE } from '@/lib/vramCalc';

interface FrameworkSelectorProps {
  selected: Framework;
  onSelect: (framework: Framework) => void;
}

const FRAMEWORKS: Framework[] = ['ollama', 'vllm', 'llama.cpp', 'lm-studio', 'text-gen-webui'];

export function FrameworkSelector({ selected, onSelect }: FrameworkSelectorProps) {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-6">
      <h2 className="text-[1.125rem] font-semibold text-text-primary mb-1">Framework</h2>
      <p className="text-text-muted text-[0.8125rem] mb-3">Select your inference engine</p>
      <div className="flex flex-wrap gap-0 border border-border-default rounded-lg overflow-hidden">
        {FRAMEWORKS.map((fw) => {
          const info = FRAMEWORK_TABLE[fw];
          const isActive = selected === fw;
          return (
            <button
              key={fw}
              onClick={() => onSelect(fw)}
              className={`flex-1 min-w-[80px] px-3 py-2 text-[0.8125rem] font-medium transition-colors border-r border-border-default last:border-r-0 ${
                isActive
                  ? 'bg-accent-primary text-white'
                  : 'bg-transparent text-text-secondary hover:bg-bg-tertiary'
              }`}
              aria-pressed={isActive}
            >
              <span className="block">{info.name}</span>
              <span className={`block text-[0.75rem] ${isActive ? 'text-white/70' : 'text-text-muted'}`}>
                {info.formatPreference.split(' / ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
