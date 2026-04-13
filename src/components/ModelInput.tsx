'use client';

import { useState, useCallback } from 'react';
import type { ModelConfig } from '@/lib/types';
import { fetchModel, parseModelURL } from '@/lib/modelFetcher';

interface ModelInputProps {
  onModelLoaded: (config: ModelConfig) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function ModelInput({ onModelLoaded, isLoading, setIsLoading }: ModelInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadedModel, setLoadedModel] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({
    name: '',
    totalParams: '',
    numLayers: '',
    numAttentionHeads: '',
    numKVHeads: '',
    hiddenSize: '',
    maxContext: '',
    isMoE: false,
  });

  const handleFetch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const parsed = parseModelURL(trimmed);
    if (!parsed) {
      setError('Invalid URL. Please enter a Hugging Face or Ollama model URL.');
      return;
    }

    setError(null);
    setIsLoading(true);
    setShowManual(false);

    try {
      // Check sessionStorage cache
      const cacheKey = `llm-calc:${trimmed}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const config = JSON.parse(cached) as ModelConfig;
        setLoadedModel(config.name);
        onModelLoaded(config);
        setIsLoading(false);
        return;
      }

      const config = await fetchModel(trimmed);
      sessionStorage.setItem(cacheKey, JSON.stringify(config));
      setLoadedModel(config.name);
      onModelLoaded(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch model metadata');
    } finally {
      setIsLoading(false);
    }
  }, [onModelLoaded, setIsLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFetch(url);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text');
    // Let the state update, then fetch
    setTimeout(() => handleFetch(pasted), 0);
  };

  const handleManualSubmit = () => {
    const params = parseFloat(manual.totalParams);
    const layers = parseInt(manual.numLayers);
    const heads = parseInt(manual.numAttentionHeads);
    const kvHeads = parseInt(manual.numKVHeads) || heads;
    const hidden = parseInt(manual.hiddenSize);
    const ctx = parseInt(manual.maxContext);

    if (!params || !layers || !heads || !hidden || !ctx) {
      setError('Please fill in all required fields (params, layers, heads, hidden size, max context).');
      return;
    }

    const config: ModelConfig = {
      name: manual.name || 'Custom Model',
      source: 'manual',
      totalParams: params,
      numLayers: layers,
      numAttentionHeads: heads,
      numKVHeads: kvHeads,
      hiddenSize: hidden,
      maxContext: ctx,
      dtype: 'unknown',
      architecture: 'Unknown',
      isMoE: manual.isMoE,
    };

    setError(null);
    setLoadedModel(config.name);
    onModelLoaded(config);
  };

  return (
    <section className="mb-8">
      <h1 className="text-[2rem] font-bold leading-[1.2] text-text-primary mb-2">
        LLM VRAM Calculator
      </h1>
      <p className="text-text-secondary text-[0.9375rem] mb-6">
        Check if a model fits your GPU — paste a URL and enter your specs.
      </p>

      <div className="w-full relative">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Paste a Hugging Face or Ollama model URL..."
          className={`w-full h-12 px-4 bg-bg-tertiary border rounded-lg text-text-primary text-[0.9375rem] placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-3 focus:ring-border-focus/20 transition-colors ${
            isLoading ? 'border-accent-primary animate-pulse' : 'border-border-default'
          }`}
          aria-label="Model URL"
        />

        {isLoading && (
          <p className="mt-2 text-text-muted text-[0.8125rem]">
            Fetching model metadata...
          </p>
        )}

        {error && (
          <div className="mt-2 flex items-center gap-2">
            <p className="text-status-error text-[0.8125rem]">{error}</p>
            <button
              onClick={() => { setShowManual(true); setError(null); }}
              className="text-accent-primary text-[0.8125rem] hover:text-accent-primary-hover underline"
            >
              Switch to Manual Entry
            </button>
          </div>
        )}

        {loadedModel && !error && !isLoading && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-accent-primary/15 border border-accent-primary/30 rounded-full">
            <span className="text-accent-primary text-[0.8125rem] font-medium">{loadedModel}</span>
            <button
              onClick={() => { setLoadedModel(null); setUrl(''); }}
              className="text-text-muted hover:text-text-primary text-xs"
              aria-label="Clear model"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {showManual && (
        <div className="mt-4 bg-bg-secondary border border-border-default rounded-xl p-6 space-y-4">
          <h3 className="text-[1.125rem] font-semibold text-text-primary">Manual Entry</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-text-secondary text-[0.8125rem] mb-1">Model Name</label>
              <input
                type="text"
                value={manual.name}
                onChange={(e) => setManual({ ...manual, name: e.target.value })}
                placeholder="e.g. My Custom Model"
                className="w-full h-10 px-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary text-[0.8125rem] placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-3 focus:ring-border-focus/20"
              />
            </div>
            <div>
              <label className="block text-text-secondary text-[0.8125rem] mb-1">Parameters (billions) *</label>
              <input
                type="number"
                value={manual.totalParams}
                onChange={(e) => setManual({ ...manual, totalParams: e.target.value })}
                placeholder="e.g. 8.03"
                className="w-full h-10 px-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary font-mono text-[0.8125rem] placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-3 focus:ring-border-focus/20"
              />
            </div>
            <div>
              <label className="block text-text-secondary text-[0.8125rem] mb-1">Layers *</label>
              <input
                type="number"
                value={manual.numLayers}
                onChange={(e) => setManual({ ...manual, numLayers: e.target.value })}
                placeholder="e.g. 32"
                className="w-full h-10 px-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary font-mono text-[0.8125rem] placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-3 focus:ring-border-focus/20"
              />
            </div>
            <div>
              <label className="block text-text-secondary text-[0.8125rem] mb-1">Attention Heads *</label>
              <input
                type="number"
                value={manual.numAttentionHeads}
                onChange={(e) => setManual({ ...manual, numAttentionHeads: e.target.value })}
                placeholder="e.g. 32"
                className="w-full h-10 px-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary font-mono text-[0.8125rem] placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-3 focus:ring-border-focus/20"
              />
            </div>
            <div>
              <label className="block text-text-secondary text-[0.8125rem] mb-1">KV Heads (GQA)</label>
              <input
                type="number"
                value={manual.numKVHeads}
                onChange={(e) => setManual({ ...manual, numKVHeads: e.target.value })}
                placeholder="e.g. 8 (defaults to attention heads)"
                className="w-full h-10 px-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary font-mono text-[0.8125rem] placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-3 focus:ring-border-focus/20"
              />
            </div>
            <div>
              <label className="block text-text-secondary text-[0.8125rem] mb-1">Hidden Size *</label>
              <input
                type="number"
                value={manual.hiddenSize}
                onChange={(e) => setManual({ ...manual, hiddenSize: e.target.value })}
                placeholder="e.g. 4096"
                className="w-full h-10 px-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary font-mono text-[0.8125rem] placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-3 focus:ring-border-focus/20"
              />
            </div>
            <div>
              <label className="block text-text-secondary text-[0.8125rem] mb-1">Max Context *</label>
              <input
                type="number"
                value={manual.maxContext}
                onChange={(e) => setManual({ ...manual, maxContext: e.target.value })}
                placeholder="e.g. 131072"
                className="w-full h-10 px-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary font-mono text-[0.8125rem] placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-3 focus:ring-border-focus/20"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="moe-toggle"
                checked={manual.isMoE}
                onChange={(e) => setManual({ ...manual, isMoE: e.target.checked })}
                className="w-4 h-4 rounded border-border-default bg-bg-tertiary accent-accent-primary"
              />
              <label htmlFor="moe-toggle" className="text-text-secondary text-[0.8125rem]">
                Mixture of Experts (MoE) model
              </label>
            </div>
          </div>
          {error && (
            <p className="text-status-error text-[0.8125rem]">{error}</p>
          )}
          <button
            onClick={handleManualSubmit}
            className="px-5 py-2 bg-accent-primary text-white rounded-lg text-[0.8125rem] font-medium hover:bg-accent-primary-hover transition-colors"
          >
            Calculate
          </button>
        </div>
      )}
    </section>
  );
}
