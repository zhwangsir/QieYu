import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface PromptBoxProps {
  label: string;
  text: string;
  type?: 'positive' | 'negative';
}

export const PromptBox: React.FC<PromptBoxProps> = ({ label, text, type = 'positive' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const borderColor = type === 'positive' ? 'border-green-900/50' : 'border-red-900/50';
  const labelColor = type === 'positive' ? 'text-green-400' : 'text-red-400';
  const bgColor = type === 'positive' ? 'bg-green-950/10' : 'bg-red-950/10';

  if (!text) return null;

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-4 relative group transition-colors hover:bg-opacity-20`}>
      <div className="flex justify-between items-center mb-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded bg-slate-800/50 text-slate-400 hover:text-white transition-all opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 active:scale-95"
          title="复制提示词"
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      </div>
      <p className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-words leading-relaxed selection:bg-primary-500/30">
        {text}
      </p>
    </div>
  );
};