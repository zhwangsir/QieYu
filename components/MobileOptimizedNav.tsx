
import React, { useState, useEffect } from 'react';
import { 
  Home, MessageCircle, User, Settings, Bell, Menu, X, 
  Search, Plus, ChevronLeft, MoreHorizontal 
} from 'lucide-react';
import { User as UserType } from '../types';
import { Avatar } from './Avatar';
import { PresenceIndicator } from './PresenceIndicator';
import { usePresence } from '../hooks/usePresence';

interface MobileOptimizedNavProps {
  currentUser: UserType;
  currentView: string;
  onChangeView: (view: string) => void;
  unreadChatCount: number;
  unreadNotificationCount: number;
  onOpenNotificationCenter: () => void;
  onLogout: () => void;
}

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  view: string;
  badge?: number;
};

export const MobileOptimizedNav: React.FC<MobileOptimizedNavProps> = ({
  currentUser,
  currentView,
  onChangeView,
  unreadChatCount,
  unreadNotificationCount,
  onOpenNotificationCenter,
  onLogout,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const { myPresence, updateMyPresence } = usePresence(currentUser.id);

  // 监听滚动
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems: NavItem[] = [
    { id: 'home', label: '首页', icon: Home, view: 'LIBRARY' },
    { id: 'chat', label: '聊天', icon: MessageCircle, view: 'CHAT', badge: unreadChatCount },
    { id: 'notifications', label: '通知', icon: Bell, view: 'NOTIFICATIONS', badge: unreadNotificationCount },
    { id: 'profile', label: '我的', icon: User, view: 'PROFILE' },
  ];

  const handleNavClick = (view: string) => {
    if (view === 'NOTIFICATIONS') {
      onOpenNotificationCenter();
    } else {
      onChangeView(view);
    }
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* 顶部导航栏 */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg shadow-lg' 
            : 'bg-transparent'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4">
          {/* 左侧：菜单按钮或返回按钮 */}
          <div className="flex items-center gap-2">
            {currentView !== 'LIBRARY' ? (
              <button
                onClick={() => onChangeView('LIBRARY')}
                className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
            ) : (
              <button
                onClick={() => setIsMenuOpen(true)}
                className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <Menu size={24} />
              </button>
            )}
            
            {/* 页面标题 */}
            <h1 className="font-semibold text-lg text-slate-800 dark:text-white">
              {currentView === 'LIBRARY' && '首页'}
              {currentView === 'CHAT' && '聊天'}
              {currentView === 'PROFILE' && '个人中心'}
              {currentView === 'SETTINGS' && '设置'}
            </h1>
          </div>

          {/* 右侧操作按钮 */}
          <div className="flex items-center gap-1">
            {/* 搜索按钮 */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <Search size={20} />
            </button>

            {/* 通知按钮 */}
            <button
              onClick={onOpenNotificationCenter}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative"
            >
              <Bell size={20} />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {/* 快速操作 */}
            {currentView === 'LIBRARY' && (
              <button
                onClick={() => onChangeView('CREATE')}
                className="ml-1 p-2 bg-primary-500 text-white rounded-full shadow-lg shadow-primary-500/30 hover:bg-primary-600 transition-colors"
              >
                <Plus size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 搜索弹窗 */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="absolute top-0 left-0 right-0 bg-white dark:bg-slate-900 p-4 animate-slide-down">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
              </div>
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="px-4 py-2.5 text-slate-600 dark:text-slate-300 font-medium"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 侧边菜单 */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[70] animate-fade-in">
          {/* 遮罩层 */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* 菜单内容 */}
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 shadow-2xl animate-slide-right">
            {/* 用户信息 */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <Avatar avatar={currentUser.avatar} name={currentUser.username} size="lg" />
                  <PresenceIndicator 
                    status={myPresence.status} 
                    size="sm"
                    className="absolute -bottom-1 -right-1"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-slate-800 dark:text-white truncate">
                    {currentUser.username}
                  </h2>
                  <p className="text-sm text-slate-500 truncate">{currentUser.email}</p>
                </div>
              </div>
              
              {/* 在线状态切换 */}
              <div className="flex gap-2">
                {(['online', 'away', 'busy', 'offline'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateMyPresence(status)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                      myPresence.status === status
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {status === 'online' && '在线'}
                    {status === 'away' && '离开'}
                    {status === 'busy' && '忙碌'}
                    {status === 'offline' && '隐身'}
                  </button>
                ))}
              </div>
            </div>

            {/* 导航菜单 */}
            <nav className="p-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.view)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    currentView === item.view
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium flex-1 text-left">{item.label}</span>
                  {item.badge ? (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </button>
              ))}

              <div className="my-2 border-t border-slate-200 dark:border-slate-800" />

              {/* 设置和退出 */}
              <button
                onClick={() => handleNavClick('SETTINGS')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  currentView === 'SETTINGS'
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Settings size={20} />
                <span className="font-medium flex-1 text-left">设置</span>
              </button>

              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X size={20} />
                <span className="font-medium flex-1 text-left">退出登录</span>
              </button>
            </nav>
          </aside>
        </div>
      )}

      {/* 底部导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 safe-area-pb">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.view)}
              className="relative flex flex-col items-center justify-center flex-1 h-full"
            >
              <div className={`p-1.5 rounded-xl transition-colors ${
                currentView === item.view
                  ? 'text-primary-500'
                  : 'text-slate-400 dark:text-slate-500'
              }`}>
                <item.icon size={22} />
              </div>
              <span className={`text-[10px] mt-0.5 font-medium ${
                currentView === item.view
                  ? 'text-primary-500'
                  : 'text-slate-400 dark:text-slate-500'
              }`}>
                {item.label}
              </span>
              
              {/* 未读标记 */}
              {item.badge ? (
                <span className="absolute top-1 right-1/4 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : null}

              {/* 激活指示器 */}
              {currentView === item.view && (
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* 安全区域占位 */}
      <div className="h-16" />

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-right {
          from { opacity: 0; transform: translateX(-100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
        
        .animate-slide-right {
          animation: slide-right 0.3s ease-out;
        }
        
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </>
  );
};

export default MobileOptimizedNav;
