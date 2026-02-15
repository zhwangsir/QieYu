import React from 'react';
import { AIResource } from '../types';
import { Box, Cpu, FileJson, Layers, Settings } from 'lucide-react';

interface ResourceTagProps {
  resource: AIResource;
}

export const ResourceTag: React.FC<ResourceTagProps> = ({ resource }) => {
  const getIcon = () => {
    switch (resource.type) {
      case 'Checkpoint': return <Box size={14} />;
      case 'Lora': return <Cpu size={14} />;
      case 'Embedding': return <Layers size={14} />;
      case 'ControlNet': return <Settings size={14} />;
      default: return <FileJson size={14} />;
    }
  };

  const getColor = () => {
    switch (resource.type) {
      case 'Checkpoint': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Lora': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Embedding': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default: return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getColor()}`}>
      {getIcon()}
      <span className="truncate max-w-[150px]">{resource.name}</span>
      {resource.weight !== undefined && resource.type === 'Lora' && (
        <span className="opacity-75 border-l border-current pl-1.5 ml-0.5">
          {resource.weight}
        </span>
      )}
    </div>
  );
};