import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM VRAM Calculator — Check GPU Compatibility",
  description:
    "Calculate VRAM requirements for any LLM. Paste a Hugging Face or Ollama model URL, enter your GPU specs, and instantly see if it fits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
