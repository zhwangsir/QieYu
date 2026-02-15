
import React, { useState } from 'react';
import { Button } from './Button';
import { User } from '../types';
import * as dbService from '../services/dbService';
import { Zap, LogIn, UserPlus, Loader2 } from 'lucide-react';

interface AuthViewProps {
  onLogin: (user: User) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const user = await dbService.loginUser(username, password);
        if (user) {
          onLogin(user);
        } else {
          setError('用户名或密码错误');
        }
      } else {
        if (!username || !password) {
          setError('请填写完整信息');
          setLoading(false);
          return;
        }
        const user = await dbService.registerUser(username, password);
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || '操作失败，请检查网络或联系管理员');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary-600/20 blur-[130px] rounded-full animate-pulse" style={{animationDuration: '8s'}} />
         <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/20 blur-[130px] rounded-full animate-pulse" style={{animationDuration: '10s'}} />
         <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-purple-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative z-10 animate-scale-in ring-1 ring-white/5">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl mb-5 shadow-lg shadow-primary-500/30 transform rotate-3 hover:rotate-6 transition-transform">
            <Zap size={40} className="text-white drop-shadow-md" />
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2 tracking-tight">QieYu</h1>
          <p className="text-slate-400 text-sm">记录你的 AI 创意之旅，与社区分享灵感</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all placeholder-slate-600"
              placeholder="Your username"
              disabled={loading}
            />
          </div>
          <div className="space-y-1">
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">密码</label>
             <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
              placeholder="Your password"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              {error}
            </div>
          )}

          <Button 
            className="w-full py-3.5 text-base rounded-xl font-bold shadow-lg shadow-primary-900/40 mt-4" 
            icon={loading ? <Loader2 size={18} className="animate-spin"/> : (isLogin ? <LogIn size={18}/> : <UserPlus size={18}/>)}
            disabled={loading}
          >
            {loading ? '处理中...' : (isLogin ? '进入工作台' : '注册并登录')}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto group"
            disabled={loading}
          >
            {isLogin ? '还没有账号？' : '已有账号？'}
            <span className="text-primary-400 font-medium group-hover:underline">{isLogin ? '立即注册' : '直接登录'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
