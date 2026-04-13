'use client';

import { useState, useRef, useEffect } from 'react';
import type { HardwareProfile as HardwareProfileType, Framework } from '@/lib/types';
import { searchGPUs, getAllGPUs } from '@/lib/gpuDatabase';

interface HardwareProfileProps {
  hardware: HardwareProfileType;
  onHardwareChange: (hardware: HardwareProfileType) => void;
}

export function HardwareProfile({ hardware, onHardwareChange }: HardwareProfileProps) {
  const [gpuQuery, setGpuQuery] = useState(hardware.gpuModel);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredGPUs = gpuQuery ? searchGPUs(gpuQuery) : getAllGPUs();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const update = (partial: Partial<HardwareProfileType>) => {
    onHardwareChange({ ...hardware, ...partial });
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-6 space-y-4">
      <div>
        <h2 className="text-[1.125rem] font-semibold text-text-primary">Hardware Profile</h2>
        <p className="text-text-muted text-[0.8125rem]">Configure your GPU and system specs</p>
      </div>

      {/* Apple Silicon Toggle */}
      <div className="flex items-center gap-2">
        <button
          role="switch"
          aria-checked={hardware.isAppleSilicon}
          onClick={() => update({ isAppleSilicon: !hardware.isAppleSilicon })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            hardware.isAppleSilicon ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border-default'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              hardware.isAppleSilicon ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <label className="text-text-secondary text-[0.8125rem]">Apple Silicon (Unified Memory)</label>
      </div>

      {hardware.isAppleSilicon ? (
        /* Apple Silicon: Unified Memory */
        <div>
          <label className="block text-text-secondary text-[0.8125rem] mb-1">Unified Memory (GB)</label>
          <input
            type="number"
            value={hardware.unifiedMemory ?? hardware.vram}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              update({ unifiedMemory: val, vram: val });
            }}
            min={0}
            className="w-full h-10 px-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary font-mono text-[0.8125rem] focus:outline-none focus:border-border-focus focus:ring-3 focus:ring-border-focus/20"
          />
        </div>
      ) : (
        <>
          {/* GPU Selector */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-text-secondary text-[0.8125rem] mb-1">GPU Model</label>
            <input
              type="text"
              value={gpuQuery}
              onChange={(e) => {
                setGpuQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search GPUs..."
              className="w-full h-10 px-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary text-[0.8125rem] placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-3 focus:ring-border-focus/20"
              aria-label="GPU Model"
            />
            {showDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-bg-elevated border border-border-default rounded-lg max-h-[280px] overflow-y-auto">
                {filteredGPUs.slice(0, 20).map((gpu) => (
                  <button
                    key={gpu.name}
                    onClick={() => {
                      setGpuQuery(gpu.name);
                      setShowDropdown(false);
                      update({
                        gpuModel: gpu.name,
                        vram: gpu.vram,
                        isAppleSilicon: gpu.vendor === 'apple',
                        ...(gpu.vendor === 'apple' ? { unifiedMemory: gpu.vram } : {}),
                      });
                    }}
                    className="w-full flex justify-between items-center px-3 py-2 hover:bg-bg-tertiary text-left transition-colors"
                  >
                    <span className="text-text-primary text-[0.8125rem]">{gpu.name}</span>
                    <span className="text-text-muted font-mono text-[0.8125rem]">{gpu.vram} GB</span>
                  </button>
                ))}
                {filteredGPUs.length === 0 && (
                  <p className="px-3 py-2 text-text-muted text-[0.8125rem]">No GPUs found</p>
                )}
              </div>
            )}
          </div>

          {/* VRAM Override */}
          <div>
            <label className="block text-text-secondary text-[0.8125rem] mb-1">VRAM (GB)</label>
            <input
              type="number"
              value={hardware.vram}
              onChange={(e) => update({ vram: parseFloat(e.target.value) || 0 })}
              min={0}
              className="w-full h-10 px-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary font-mono text-[0.8125rem] focus:outline-none focus:border-border-focus focus:ring-3 focus:ring-border-focus/20"
            />
          </div>

          {/* Number of GPUs */}
          <div>
            <label className="block text-text-secondary text-[0.8125rem] mb-1">Number of GPUs</label>
            <input
              type="number"
              value={hardware.gpuCount}
              onChange={(e) => update({ gpuCount: Math.max(1, Math.min(8, parseInt(e.target.value) || 1)) })}
              min={1}
              max={8}
              className="w-full h-10 px-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary font-mono text-[0.8125rem] focus:outline-none focus:border-border-focus focus:ring-3 focus:ring-border-focus/20"
            />
          </div>
        </>
      )}

      {/* System RAM */}
      {!hardware.isAppleSilicon && (
        <div>
          <label className="block text-text-secondary text-[0.8125rem] mb-1">System RAM (GB)</label>
          <input
            type="number"
            value={hardware.systemRAM}
            onChange={(e) => update({ systemRAM: parseFloat(e.target.value) || 0 })}
            min={0}
            className="w-full h-10 px-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary font-mono text-[0.8125rem] focus:outline-none focus:border-border-focus focus:ring-3 focus:ring-border-focus/20"
          />
        </div>
      )}

      {/* Memory Speed */}
      <div>
        <label className="block text-text-secondary text-[0.8125rem] mb-1">Memory Speed (optional)</label>
        <select
          value={hardware.memorySpeed ?? ''}
          onChange={(e) => update({ memorySpeed: (e.target.value || undefined) as HardwareProfileType['memorySpeed'] })}
          className="w-full h-10 px-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary text-[0.8125rem] focus:outline-none focus:border-border-focus focus:ring-3 focus:ring-border-focus/20"
        >
          <option value="">Not specified</option>
          <option value="DDR4">DDR4</option>
          <option value="DDR5">DDR5</option>
          <option value="LPDDR5">LPDDR5</option>
        </select>
      </div>
    </div>
  );
}
