
import React from 'react';
import { UserStatus } from '../hooks/usePresence';

interface PresenceIndicatorProps {
  status: UserStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  lastSeenText?: string;
  customStatus?: string;
  className?: string;
}

const statusConfig: Record<UserStatus, { color: string; label: string; pulse: boolean }> = {
  online: {
    color: 'bg-green-500',
    label: '在线',
    pulse: true,
  },
  away: {
    color: 'bg-yellow-500',
    label: '离开',
    pulse: false,
  },
  busy: {
    color: 'bg-red-500',
    label: '忙碌',
    pulse: false,
  },
  offline: {
    color: 'bg-slate-400',
    label: '离线',
    pulse: false,
  },
};

const sizeConfig = {
  sm: {
    dot: 'w-2 h-2',
    ring: 'ring-2',
    text: 'text-[10px]',
  },
  md: {
    dot: 'w-2.5 h-2.5',
    ring: 'ring-2',
    text: 'text-xs',
  },
  lg: {
    dot: 'w-3 h-3',
    ring: 'ring-[3px]',
    text: 'text-sm',
  },
};

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  status,
  size = 'md',
  showLabel = false,
  lastSeenText,
  customStatus,
  className = '',
}) => {
  const config = statusConfig[status];
  const sizeClasses = sizeConfig[size];

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Status Dot */}
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            config.pulse ? config.color : 'hidden'
          }`}
        />
        <span
          className={`relative inline-flex rounded-full ${sizeClasses.dot} ${config.color} ring-white dark:ring-slate-900 ${sizeClasses.ring}`}
        />
      </span>

      {/* Status Label */}
      {showLabel && (
        <span className={`${sizeClasses.text} text-slate-600 dark:text-slate-400`}>
          {customStatus || (status === 'offline' && lastSeenText ? lastSeenText : config.label)}
        </span>
      )}

      {/* Custom Status */}
      {customStatus && showLabel && status !== 'offline' && (
        <span className={`${sizeClasses.text} text-slate-500 dark:text-slate-500 truncate max-w-[120px]`}>
          - {customStatus}
        </span>
      )}
    </div>
  );
};

// 简化的在线状态点，用于头像等紧凑空间
export const PresenceDot: React.FC<{
  status: UserStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ status, size = 'md', className = '' }) => {
  const config = statusConfig[status];
  
  const sizeClasses = {
    sm: 'w-2 h-2 ring-[1.5px]',
    md: 'w-2.5 h-2.5 ring-2',
    lg: 'w-3.5 h-3.5 ring-[3px]',
  };

  return (
    <span
      className={`absolute bottom-0 right-0 rounded-full ${config.color} ${sizeClasses[size]} ring-white dark:ring-slate-800 ${className}`}
    >
      {config.pulse && (
        <span className={`absolute inset-0 rounded-full ${config.color} animate-ping opacity-75`} />
      )}
    </span>
  );
};

export default PresenceIndicator;
