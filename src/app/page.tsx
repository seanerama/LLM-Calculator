export default function Home() {
  return (
    <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* URL Input — full width */}
      <section className="mb-8">
        <h1 className="text-[2rem] font-bold leading-[1.2] text-text-primary mb-2">
          LLM VRAM Calculator
        </h1>
        <p className="text-text-secondary text-[0.9375rem] mb-6">
          Check if a model fits your GPU — paste a URL and enter your specs.
        </p>
        <div className="w-full">
          <input
            type="url"
            placeholder="Paste a Hugging Face or Ollama model URL..."
            className="w-full h-12 px-4 bg-bg-tertiary border border-border-default rounded-lg text-text-primary text-[0.9375rem] placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-3 focus:ring-border-focus/20 transition-colors"
            aria-label="Model URL"
            readOnly
          />
        </div>
      </section>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Input Column */}
        <aside className="w-full lg:w-[380px] lg:shrink-0 space-y-4">
          <div className="bg-bg-secondary border border-border-default rounded-xl p-6">
            <h2 className="text-[1.125rem] font-semibold text-text-primary mb-1">
              Hardware Profile
            </h2>
            <p className="text-text-muted text-[0.8125rem]">
              Configure your GPU and system specs
            </p>
          </div>
          <div className="bg-bg-secondary border border-border-default rounded-xl p-6">
            <h2 className="text-[1.125rem] font-semibold text-text-primary mb-1">
              Quantization
            </h2>
            <p className="text-text-muted text-[0.8125rem]">
              Select precision level
            </p>
          </div>
          <div className="bg-bg-secondary border border-border-default rounded-xl p-6">
            <h2 className="text-[1.125rem] font-semibold text-text-primary mb-1">
              Context Length
            </h2>
            <p className="text-text-muted text-[0.8125rem]">
              Choose context window size
            </p>
          </div>
        </aside>

        {/* Results Column */}
        <section className="flex-1 min-w-0 space-y-4">
          <div className="bg-bg-secondary border border-border-default rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px]">
            <p className="text-text-muted text-[0.9375rem]">
              Paste a model URL above to get started
            </p>
            <p className="text-text-muted text-[0.8125rem] mt-2">
              Supports Hugging Face and Ollama models
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
