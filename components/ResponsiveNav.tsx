
import React, { useState, useEffect } from 'react';
import { ViewState, User } from '../types';
import {
  Library,
  MessageSquare,
  LogOut,
  CirclePlus,
  Settings,
  UserCircle,
  ShieldCheck,
  Bot,
  Bell,
  X,
  Menu
} from 'lucide-react';
import { Avatar } from './Avatar';
import { MobileOptimizedNav } from './MobileOptimizedNav';

interface ResponsiveNavProps {
  currentUser: User;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onLogout: () => void;
  unreadChatCount?: number;
  unreadNotificationCount?: number;
  onOpenNotificationCenter?: () => void;
}

interface NavItem {
  id: ViewState;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  adminOnly?: boolean;
}

export const ResponsiveNav: React.FC<ResponsiveNavProps> = ({
  currentUser,
  currentView,
  onChangeView,
  onLogout,
  unreadChatCount = 0,
  unreadNotificationCount = 0,
  onOpenNotificationCenter,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 监听窗口大小变化
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 817);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navItems: NavItem[] = [
    { id: 'LIBRARY', label: '日志库', icon: <Library size={20} /> },
    { id: 'AI_CHAT', label: 'AI 助手', icon: <Bot size={20} /> },
    { id: 'CHAT', label: '聊天室', icon: <MessageSquare size={20} />, badge: unreadChatCount },
    { id: 'PROFILE', label: '个人主页', icon: <UserCircle size={20} /> },
    { id: 'SETTINGS', label: '设置', icon: <Settings size={20} /> },
    ...(currentUser.role === 'admin' ? [{ id: 'ADMIN' as ViewState, label: '系统管理', icon: <ShieldCheck size={20} className="text-red-500" />, adminOnly: true }] : []),
  ];

  const handleNavClick = (view: ViewState) => {
    onChangeView(view);
    setIsMenuOpen(false);
  };

  // 阻止背景滚动
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // 判断当前导航项是否激活
  const isActive = (item: NavItem) => {
    if (item.id === 'LIBRARY') {
      return currentView === 'LIBRARY' || currentView === 'DETAILS' || currentView === 'CREATE' || currentView === 'EDIT';
    }
    return currentView === item.id;
  };

  // 移动端使用优化导航
  if (isMobile) {
    return (
      <MobileOptimizedNav
        currentUser={currentUser}
        currentView={currentView}
        onChangeView={onChangeView}
        unreadChatCount={unreadChatCount}
        unreadNotificationCount={unreadNotificationCount}
        onOpenNotificationCenter={onOpenNotificationCenter || (() => {})}
        onLogout={onLogout}
      />
    );
  }

  return (
    <>
      {/* 自定义CSS动画 */}
      <style>{`
        /* 汉堡按钮线条动画 */
        .hamburger-line {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          transform-origin: center;
        }

        .hamburger-active .hamburger-line-top {
          transform: translateY(7px) rotate(45deg);
        }

        .hamburger-active .hamburger-line-middle {
          opacity: 0;
          transform: scaleX(0);
        }

        .hamburger-active .hamburger-line-bottom {
          transform: translateY(-7px) rotate(-45deg);
        }

        /* 侧边栏滑入动画 */
        .sidebar-slide-in {
          transform: translateX(0);
        }

        .sidebar-slide-out {
          transform: translateX(-100%);
        }

        /* 菜单项staggered动画 */
        @keyframes staggeredFadeIn {
          0% {
            opacity: 0;
            transform: translateX(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .nav-item-staggered {
          opacity: 0;
          animation: staggeredFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        /* 液态玻璃效果 */
        .liquid-glass {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.85) 0%,
            rgba(255, 255, 255, 0.75) 50%,
            rgba(255, 255, 255, 0.85) 100%
          );
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-right: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.1);
        }

        .dark .liquid-glass {
          background: linear-gradient(
            135deg,
            rgba(30, 41, 59, 0.95) 0%,
            rgba(15, 23, 42, 0.98) 50%,
            rgba(30, 41, 59, 0.95) 100%
          );
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
        }

        /* 导航栏玻璃效果 */
        .nav-glass {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .dark .nav-glass {
          background: rgba(15, 23, 42, 0.9);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        /* 菜单项悬停效果 */
        .nav-item-hover {
          position: relative;
          overflow: hidden;
        }

        .nav-item-hover::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(0, 122, 255, 0.1),
            transparent
          );
          transition: left 0.5s ease;
        }

        .nav-item-hover:hover::before {
          left: 100%;
        }
      `}</style>

      {/* ==================== 大屏幕：左侧固定侧边栏 (≥1041px) ==================== */}
      <aside className="hidden min-[1041px]:flex w-64 h-screen flex-col fixed left-0 top-0 z-50 liquid-glass">
        {/* 用户信息 */}
        <div className="p-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div
              onClick={() => handleNavClick('PROFILE')}
              className="flex-1 flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
            >
              <Avatar
                avatar={currentUser.avatar}
                name={currentUser.username}
                size="md"
                className="ring-2 ring-white dark:ring-slate-700"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-white truncate">{currentUser.username}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentUser.role === 'admin' ? '管理员' : '普通用户'}
                </p>
              </div>
            </div>
            {/* 通知按钮 */}
            {onOpenNotificationCenter && (
              <button
                onClick={onOpenNotificationCenter}
                className="relative p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 transition-colors"
                title="消息中心"
              >
                <Bell size={20} />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                transition-all duration-200 nav-item-hover
                ${isActive(item)
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                }
              `}
            >
              <span className={isActive(item) ? 'text-white' : 'text-slate-500 dark:text-slate-400'}>
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* 底部操作 */}
        <div className="p-4 border-t border-black/5 dark:border-white/5 space-y-2">
          <button
            onClick={() => handleNavClick('CREATE')}
            className="
              w-full flex items-center justify-center gap-2 
              py-2.5 rounded-xl
              bg-primary-500 hover:bg-primary-600
              text-white font-semibold text-sm
              shadow-lg shadow-primary-500/25
              hover:shadow-xl hover:shadow-primary-500/30
              transition-all duration-200
            "
          >
            <CirclePlus size={18} />
            <span>新建日志</span>
          </button>
          <button
            onClick={onLogout}
            className="
              w-full flex items-center justify-center gap-2 
              py-2 rounded-xl
              text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10
              transition-colors text-sm font-medium
            "
          >
            <LogOut size={18} />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* ==================== 中等屏幕：顶部水平导航栏 (817px-1040px) ==================== */}
      <header className="hidden min-[817px]:max-[1040px]:flex h-16 w-full fixed top-0 left-0 z-50 nav-glass items-center px-4">
        {/* 水平导航 */}
        <nav className="flex-1 flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg
                transition-all duration-200
                ${isActive(item)
                  ? 'bg-primary-500 text-white' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                }
              `}
            >
              <span className={isActive(item) ? 'text-white' : 'text-slate-500 dark:text-slate-400'}>
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* 右侧操作 */}
        <div className="flex items-center gap-2 ml-4">
          {/* 通知按钮 */}
          {onOpenNotificationCenter && (
            <button
              onClick={onOpenNotificationCenter}
              className="relative p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 transition-colors"
              title="消息中心"
            >
              <Bell size={20} />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => handleNavClick('CREATE')}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg
              bg-primary-500 hover:bg-primary-600
              text-white font-semibold text-sm
              shadow-lg shadow-primary-500/25
              transition-all duration-200
            "
          >
            <CirclePlus size={16} />
            <span>新建</span>
          </button>
          <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1" />
          <button
            onClick={() => handleNavClick('PROFILE')}
            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Avatar
              avatar={currentUser.avatar}
              name={currentUser.username}
              size="sm"
              className="ring-2 ring-white dark:ring-slate-700"
            />
          </button>
        </div>
      </header>

      {/* ==================== 小屏幕：顶部精简导航栏 (<817px) ==================== */}
      <header className="flex min-[817px]:hidden h-14 w-full fixed top-0 left-0 z-50 nav-glass items-center justify-end px-4">
        {/* 汉堡按钮 */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`
            w-10 h-10 rounded-lg
            flex flex-col items-center justify-center gap-1.5
            transition-all duration-200
            ${isMenuOpen 
              ? 'bg-primary-500 text-white' 
              : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200'
            }
          `}
          aria-label={isMenuOpen ? '关闭菜单' : '打开菜单'}
          aria-expanded={isMenuOpen}
        >
          <span className={`
            hamburger-line hamburger-line-top w-5 h-0.5 rounded-full
            ${isMenuOpen ? 'bg-white' : 'bg-slate-700 dark:bg-slate-200'}
          `} />
          <span className={`
            hamburger-line hamburger-line-middle w-5 h-0.5 rounded-full
            ${isMenuOpen ? 'bg-white' : 'bg-slate-700 dark:bg-slate-200'}
          `} />
          <span className={`
            hamburger-line hamburger-line-bottom w-5 h-0.5 rounded-full
            ${isMenuOpen ? 'bg-white' : 'bg-slate-700 dark:bg-slate-200'}
          `} />
        </button>
      </header>

      {/* ==================== 移动端侧边栏 (<817px) ==================== */}
      {/* 遮罩层 */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 min-[817px]:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`
          fixed top-0 left-0 z-50 w-64 h-screen
          liquid-glass
          min-[817px]:hidden
          transition-transform duration-300 ease-out
          ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* 侧边栏关闭按钮 */}
        <div className="h-14 flex items-center justify-end px-4 border-b border-black/5 dark:border-white/5">
          <button
            onClick={() => setIsMenuOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
          >
            <X size={18} className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* 用户信息 */}
        <div className="p-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div
              onClick={() => handleNavClick('PROFILE')}
              className={`
                flex-1 flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
                ${isMenuOpen ? 'nav-item-staggered' : 'opacity-0'}
                hover:bg-black/5 dark:hover:bg-white/5
              `}
              style={{ animationDelay: '50ms' }}
            >
              <Avatar
                avatar={currentUser.avatar}
                name={currentUser.username}
                size="lg"
                className="ring-2 ring-white dark:ring-slate-700"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-white truncate">{currentUser.username}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentUser.role === 'admin' ? '管理员' : '普通用户'}
                </p>
              </div>
            </div>
            {/* 通知按钮 */}
            {onOpenNotificationCenter && (
              <button
                onClick={() => {
                  onOpenNotificationCenter();
                  setIsMenuOpen(false);
                }}
                className={`
                  relative p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 transition-all
                  ${isMenuOpen ? 'nav-item-staggered' : 'opacity-0'}
                `}
                style={{ animationDelay: '100ms' }}
                title="消息中心"
              >
                <Bell size={20} />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl
                transition-all duration-200 nav-item-hover
                ${isActive(item)
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                }
                ${isMenuOpen ? 'nav-item-staggered' : 'opacity-0'}
              `}
              style={{ animationDelay: `${(index + 2) * 100}ms` }}
            >
              <span className={isActive(item) ? 'text-white' : 'text-slate-500 dark:text-slate-400'}>
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* 底部操作 */}
        <div className="p-4 border-t border-black/5 dark:border-white/5 space-y-2">
          <button
            onClick={() => handleNavClick('CREATE')}
            className={`
              w-full flex items-center justify-center gap-2 
              py-3 rounded-xl
              bg-primary-500 hover:bg-primary-600
              text-white font-semibold text-sm
              shadow-lg shadow-primary-500/25
              transition-all duration-200
              ${isMenuOpen ? 'nav-item-staggered' : 'opacity-0'}
            `}
            style={{ animationDelay: `${(navItems.length + 2) * 100}ms` }}
          >
            <CirclePlus size={18} />
            <span>新建日志</span>
          </button>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              setTimeout(onLogout, 300);
            }}
            className={`
              w-full flex items-center justify-center gap-2 
              py-2.5 rounded-xl
              text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10
              transition-colors text-sm font-medium
              ${isMenuOpen ? 'nav-item-staggered' : 'opacity-0'}
            `}
            style={{ animationDelay: `${(navItems.length + 3) * 100}ms` }}
          >
            <LogOut size={18} />
            <span>退出登录</span>
          </button>
        </div>
      </aside>
    </>
  );
};
