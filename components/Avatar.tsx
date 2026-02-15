import React from 'react';

interface AvatarProps {
  avatar: string; // class name (bg-*) or url
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ avatar, name, size = 'md', className = '' }) => {
  // 支持 data:URL、http/https URL、blob:URL、以及后端上传路径
  const isImage = avatar?.startsWith('data:') || avatar?.startsWith('http') || avatar?.startsWith('blob:') || avatar?.includes('/uploads/');
  
  const sizeClasses = {
    xs: 'w-4 h-4 text-[8px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-24 h-24 text-3xl',
  };

  const safeName = name || '?';

  return (
    <div 
      className={`
        rounded-full flex items-center justify-center font-bold text-white shrink-0 overflow-hidden relative border border-slate-700/50
        ${sizeClasses[size]} 
        ${!isImage ? (avatar || 'bg-slate-700') : 'bg-slate-800'} 
        ${className}
      `}
    >
      {isImage ? (
        <img src={avatar} alt={safeName} className="w-full h-full object-cover" />
      ) : (
        <span>{safeName.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
};