
import React, { useState, useEffect, useCallback } from 'react';
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
  X
} from 'lucide-react';
import { Avatar } from './Avatar';

interface MobileSidebarProps {
  currentUser: User;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onLogout: () => void;
  unreadChatCount?: number;
  onEnterChat?: (friendId?: string) => void;
}

interface NavItem {
  id: ViewState;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  adminOnly?: boolean;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  currentUser,
  currentView,
  onChangeView,
  onLogout,
  unreadChatCount = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showItems, setShowItems] = useState(false);

  const navItems: NavItem[] = [
    { id: 'LIBRARY', label: '日志库', icon: <Library size={22} /> },
    { id: 'AI_CHAT', label: 'AI 助手', icon: <Bot size={22} /> },
    { id: 'CHAT', label: '聊天室', icon: <MessageSquare size={22} />, badge: unreadChatCount },
    { id: 'PROFILE', label: '个人主页', icon: <UserCircle size={22} /> },
    { id: 'SETTINGS', label: '设置', icon: <Settings size={22} /> },
    ...(currentUser.role === 'admin' ? [{ id: 'ADMIN' as ViewState, label: '系统管理', icon: <ShieldCheck size={22} className="text-red-500" />, adminOnly: true }] : []),
  ];

  const openMenu = useCallback(() => {
    setIsOpen(true);
    setIsAnimating(true);
    // 延迟显示菜单项，实现staggered效果
    setTimeout(() => setShowItems(true), 200);
  }, []);

  const closeMenu = useCallback(() => {
    setShowItems(false);
    setIsAnimating(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsAnimating(false);
    }, 400);
  }, []);

  const toggleMenu = useCallback(() => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [isOpen, openMenu, closeMenu]);

  const handleNavClick = (view: ViewState) => {
    onChangeView(view);
    closeMenu();
  };

  const handleCreateClick = () => {
    onChangeView('CREATE');
    closeMenu();
  };

  // 处理遮罩层点击
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeMenu();
    }
  };

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* 自定义CSS动画 */}
      <style>{`
        /* 弹性掉落动画 - Bounce/Ease Out Elastic */
        @keyframes dropBounce {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          60% {
            transform: translateY(8%);
            opacity: 1;
          }
          75% {
            transform: translateY(-4%);
          }
          90% {
            transform: translateY(2%);
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* 向上收回动画 */
        @keyframes slideUpClose {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          40% {
            transform: translateY(5%);
            opacity: 1;
          }
          100% {
            transform: translateY(-100%);
            opacity: 0;
          }
        }

        /* 遮罩层淡入 */
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* 遮罩层淡出 */
        @keyframes fadeOutOverlay {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        /* 菜单项依次显现 - Staggered动画 */
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

        /* 汉堡按钮线条动画 */
        .hamburger-line {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          transform-origin: center;
        }

        .hamburger-active .hamburger-line-top {
          transform: translateY(8px) rotate(45deg);
        }

        .hamburger-active .hamburger-line-middle {
          opacity: 0;
          transform: scaleX(0);
        }

        .hamburger-active .hamburger-line-bottom {
          transform: translateY(-8px) rotate(-45deg);
        }

        /* 侧边栏动画类 */
        .sidebar-drop-in {
          animation: dropBounce 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .sidebar-slide-up {
          animation: slideUpClose 0.4s cubic-bezier(0.4, 0, 1, 1) forwards;
        }

        /* 遮罩层动画类 */
        .overlay-fade-in {
          animation: fadeInOverlay 0.3s ease-out forwards;
        }

        .overlay-fade-out {
          animation: fadeOutOverlay 0.3s ease-in forwards;
        }

        /* 菜单项staggered动画 */
        .nav-item-staggered {
          opacity: 0;
          animation: staggeredFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        /* 液态玻璃效果 */
        .liquid-glass {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.15) 0%,
            rgba(255, 255, 255, 0.05) 50%,
            rgba(255, 255, 255, 0.1) 100%
          );
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 
            0 8px 32px 0 rgba(0, 0, 0, 0.37),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .dark .liquid-glass {
          background: linear-gradient(
            135deg,
            rgba(30, 41, 59, 0.7) 0%,
            rgba(15, 23, 42, 0.8) 50%,
            rgba(30, 41, 59, 0.7) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.08);
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
            rgba(255, 255, 255, 0.1),
            transparent
          );
          transition: left 0.5s ease;
        }

        .nav-item-hover:hover::before {
          left: 100%;
        }

        /* 创建按钮脉冲动画 */
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(0, 122, 255, 0.4);
          }
          50% {
            box-shadow: 0 0 30px rgba(0, 122, 255, 0.6);
          }
        }

        .create-btn-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>

      {/* 汉堡按钮 */}
      <button
        onClick={toggleMenu}
        className={`
          fixed top-4 right-4 z-[60] 
          w-12 h-12 
          rounded-xl 
          liquid-glass
          flex flex-col items-center justify-center gap-1.5
          transition-transform duration-200 active:scale-95
          ${isOpen ? 'hamburger-active' : ''}
        `}
        aria-label={isOpen ? '关闭菜单' : '打开菜单'}
        aria-expanded={isOpen}
      >
        <span className="hamburger-line hamburger-line-top w-6 h-0.5 bg-slate-800 dark:bg-white rounded-full" />
        <span className="hamburger-line hamburger-line-middle w-6 h-0.5 bg-slate-800 dark:bg-white rounded-full" />
        <span className="hamburger-line hamburger-line-bottom w-6 h-0.5 bg-slate-800 dark:bg-white rounded-full" />
      </button>

      {/* 遮罩层 */}
      {isOpen && (
        <div
          onClick={handleOverlayClick}
          className={`
            fixed inset-0 z-[55] 
            bg-black/60 backdrop-blur-sm
            ${isAnimating && !showItems ? 'overlay-fade-out' : 'overlay-fade-in'}
          `}
        />
      )}

      {/* 侧边栏菜单 */}
      {isOpen && (
        <div
          className={`
            fixed top-0 left-0 right-0 z-[56]
            min-h-[70vh] max-h-[90vh]
            rounded-b-3xl
            liquid-glass
            ${isAnimating && !showItems ? 'sidebar-slide-up' : 'sidebar-drop-in'}
          `}
        >
          {/* 顶部装饰条 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/30 rounded-full mt-2" />

          {/* 内容区域 */}
          <div className="pt-12 pb-8 px-6 h-full flex flex-col">
            {/* 用户信息头部 */}
            <div 
              className={`
                flex items-center gap-4 mb-8
                ${showItems ? 'nav-item-staggered' : 'opacity-0'}
              `}
              style={{ animationDelay: '0ms' }}
            >
              <div 
                onClick={() => handleNavClick('PROFILE')}
                className="relative cursor-pointer group"
              >
                <Avatar
                  avatar={currentUser.avatar}
                  name={currentUser.username}
                  size="xl"
                  className="ring-4 ring-white/20 shadow-2xl group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white/20 rounded-full" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {currentUser.username}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {currentUser.role === 'admin' ? '管理员' : '普通用户'}
                </p>
              </div>
              <button
                onClick={closeMenu}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={20} className="text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            {/* 导航菜单项 */}
            <nav className="flex-1 space-y-2">
              {navItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    w-full flex items-center gap-4 px-4 py-4 rounded-2xl
                    transition-all duration-300
                    nav-item-hover
                    ${currentView === item.id || (item.id === 'LIBRARY' && ['DETAILS', 'CREATE', 'EDIT'].includes(currentView))
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                      : 'text-slate-700 dark:text-slate-200 hover:bg-white/10 dark:hover:bg-white/5'
                    }
                    ${showItems ? 'nav-item-staggered' : 'opacity-0'}
                  `}
                  style={{ animationDelay: `${(index + 1) * 100}ms` }}
                >
                  <span className={`
                    ${currentView === item.id ? 'text-white' : item.adminOnly ? '' : 'text-slate-500 dark:text-slate-400'}
                  `}>
                    {item.icon}
                  </span>
                  <span className="text-base font-medium flex-1 text-left">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="min-w-[22px] h-[22px] px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                  {currentView === item.id && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </button>
              ))}
            </nav>

            {/* 底部操作区 */}
            <div 
              className={`
                mt-6 pt-6 border-t border-white/10
                ${showItems ? 'nav-item-staggered' : 'opacity-0'}
              `}
              style={{ animationDelay: `${(navItems.length + 1) * 100}ms` }}
            >
              {/* 新建日志按钮 */}
              <button
                onClick={handleCreateClick}
                className="
                  w-full flex items-center justify-center gap-3 
                  py-4 rounded-2xl mb-4
                  bg-gradient-to-r from-primary-500 to-primary-600
                  text-white font-semibold
                  shadow-xl shadow-primary-500/30
                  create-btn-glow
                  hover:scale-[1.02] active:scale-95
                  transition-all duration-300
                "
              >
                <CirclePlus size={22} />
                <span>新建日志</span>
              </button>

              {/* 退出登录 */}
              <button
                onClick={() => {
                  closeMenu();
                  setTimeout(onLogout, 400);
                }}
                className="
                  w-full flex items-center justify-center gap-3 
                  py-3 rounded-xl
                  text-red-500 hover:bg-red-500/10
                  transition-all duration-300
                  font-medium
                "
              >
                <LogOut size={20} />
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
