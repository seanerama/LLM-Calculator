'use client';

import { useState, useMemo } from 'react';
import type { ModelConfig, HardwareProfile as HardwareProfileType, QuantType, Framework } from '@/lib/types';
import {
  calcWeightVRAM,
  calcKVCache,
  calcFrameworkOverhead,
  calcTotalVRAM,
  getVerdict,
  calcLayerOffload,
  getRecommendedQuant,
  getQuantComparison,
  getContextScaling,
  generateRunCommand,
} from '@/lib/vramCalc';
import { ModelInput } from '@/components/ModelInput';
import { HardwareProfile } from '@/components/HardwareProfile';
import { FrameworkSelector } from '@/components/FrameworkSelector';
import { QuantSelector } from '@/components/QuantSelector';
import { ContextSelector } from '@/components/ContextSelector';
import { ResultCard } from '@/components/ResultCard';
import { VramBreakdown } from '@/components/VramBreakdown';
import { ArchitecturePanel } from '@/components/ArchitecturePanel';
import { QuantComparisonTable } from '@/components/QuantComparisonTable';
import { ContextScalingChart } from '@/components/ContextScalingChart';
import { GpuOffloadPanel } from '@/components/GpuOffloadPanel';
import { RunCommand } from '@/components/RunCommand';

const DEFAULT_HARDWARE: HardwareProfileType = {
  gpuModel: '',
  vram: 8,
  gpuCount: 1,
  systemRAM: 16,
  isAppleSilicon: false,
  framework: 'ollama',
};

export default function Home() {
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [hardware, setHardware] = useState<HardwareProfileType>(DEFAULT_HARDWARE);
  const [selectedQuant, setSelectedQuant] = useState<QuantType>('Q4_K_M');
  const [contextLength, setContextLength] = useState<number>(4096);
  const [isLoading, setIsLoading] = useState(false);

  const availableVRAM = hardware.isAppleSilicon
    ? (hardware.unifiedMemory ?? hardware.vram)
    : hardware.vram * hardware.gpuCount;

  const calcs = useMemo(() => {
    if (!modelConfig) return null;

    const weightVRAM = calcWeightVRAM(modelConfig.totalParams, selectedQuant);
    const kvCacheVRAM = calcKVCache(modelConfig, contextLength);
    const frameworkOverhead = calcFrameworkOverhead(hardware.framework);
    const totalVRAM = calcTotalVRAM(weightVRAM, kvCacheVRAM, frameworkOverhead);
    const percentUsed = (totalVRAM / availableVRAM) * 100;
    const verdict = getVerdict(totalVRAM, weightVRAM, availableVRAM);

    const breakdown = {
      weightVRAM,
      kvCacheVRAM,
      frameworkOverhead,
      totalVRAM,
      availableVRAM,
      percentUsed,
      verdict,
    };

    const offload = calcLayerOffload(totalVRAM, availableVRAM, modelConfig.numLayers);
    const recommended = getRecommendedQuant(
      modelConfig.totalParams, availableVRAM, modelConfig, contextLength, hardware.framework,
    );
    const quantComparison = getQuantComparison(
      modelConfig.totalParams, availableVRAM, modelConfig, contextLength, hardware.framework,
    );
    const contextPoints = getContextScaling(modelConfig, selectedQuant, hardware.framework);
    const runCommand = generateRunCommand(
      modelConfig.name, hardware.framework, selectedQuant, contextLength,
    );

    return { breakdown, offload, recommended, quantComparison, contextPoints, runCommand };
  }, [modelConfig, selectedQuant, contextLength, hardware.framework, availableVRAM]);

  const handleFrameworkChange = (fw: Framework) => {
    setHardware((prev) => ({ ...prev, framework: fw }));
  };

  return (
    <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* URL Input — full width */}
      <ModelInput
        onModelLoaded={setModelConfig}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Input Column */}
        <aside className="w-full lg:w-[380px] lg:shrink-0 space-y-4">
          <HardwareProfile hardware={hardware} onHardwareChange={setHardware} />
          <FrameworkSelector selected={hardware.framework} onSelect={handleFrameworkChange} />
          <QuantSelector
            selected={selectedQuant}
            onSelect={setSelectedQuant}
            recommended={calcs?.recommended}
          />
          <ContextSelector
            selected={contextLength}
            onSelect={setContextLength}
            maxContext={modelConfig?.maxContext ?? 131072}
          />
        </aside>

        {/* Results Column */}
        <section className="flex-1 min-w-0 space-y-4">
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-bg-secondary border border-border-default rounded-xl p-6 animate-pulse"
                >
                  <div className="h-6 bg-bg-tertiary rounded w-1/3 mb-3" />
                  <div className="h-4 bg-bg-tertiary rounded w-2/3 mb-2" />
                  <div className="h-4 bg-bg-tertiary rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {!modelConfig && !isLoading && (
            <div className="bg-bg-secondary border border-border-default rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px]">
              <svg
                className="w-16 h-16 text-text-muted/30 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
              <p className="text-text-muted text-[0.9375rem]">
                Paste a model URL above to get started
              </p>
              <p className="text-text-muted text-[0.8125rem] mt-2">
                Supports Hugging Face and Ollama models
              </p>
            </div>
          )}

          {modelConfig && calcs && !isLoading && (
            <>
              <ResultCard breakdown={calcs.breakdown} />

              {hardware.gpuCount > 1 && (
                <p className="text-text-secondary text-[0.8125rem] px-1">
                  Total VRAM across {hardware.gpuCount} GPUs: {availableVRAM} GB
                </p>
              )}

              <VramBreakdown breakdown={calcs.breakdown} />

              {calcs.breakdown.verdict === 'offload' && (
                <GpuOffloadPanel offload={calcs.offload} />
              )}

              <ArchitecturePanel model={modelConfig} />
              <QuantComparisonTable
                comparisons={calcs.quantComparison}
                availableVRAM={availableVRAM}
              />
              <ContextScalingChart
                points={calcs.contextPoints}
                availableVRAM={availableVRAM}
              />
              <RunCommand
                command={calcs.runCommand}
                modelName={modelConfig.name}
                framework={hardware.framework}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
