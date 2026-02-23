
import React, { useState, useRef, useEffect } from 'react';
import { User, LogEntry } from '../types';
import { Button } from './Button';
import { Avatar } from './Avatar';
import { Check, Edit2, Upload, X, Heart, Grid, Layout, ArrowLeft, Loader2, UserPlus, UserMinus, MessageCircle, Clock, ImageOff, ImagePlus } from 'lucide-react';
import * as dbService from '../services/dbService';

interface ProfileViewProps {
  user: User;
  currentUser: User;
  onUpdateUser: (updates: Partial<User>) => Promise<void>;
  onLogout: () => void;
  onViewEntry: (id: string) => void;
  onBack?: () => void;
  onUnlike?: (id: string) => Promise<void>;
  likedEntries?: LogEntry[];
  onRefreshLikes?: () => Promise<void>;
}

const AVATAR_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 
  'bg-rose-500', 'bg-slate-500'
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  user, currentUser, onUpdateUser, onLogout, onViewEntry, onBack, onUnlike, likedEntries: propLikedEntries, onRefreshLikes
}) => {
  const isOwnProfile = user.id === currentUser.id;
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar);
  const [coverImage, setCoverImage] = useState(user.coverImage || '');
  
  // Friend State
  const [isFriend, setIsFriend] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  // Data State
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [localLikedEntries, setLocalLikedEntries] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'created' | 'likes'>(isOwnProfile ? 'likes' : 'created');

  // 使用传入的 likedEntries 或本地状态
  const likedEntries = propLikedEntries || localLikedEntries;

  // Cropper State
  const [showCropper, setShowCropper] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [cropperType, setCropperType] = useState<'avatar' | 'cover'>('avatar');

  const refreshStatus = async () => {
     if (isOwnProfile) return;
     const friends = await dbService.getFriendsList(currentUser.id);
     setIsFriend(friends.some(f => f.id === user.id));
     
     // Check for pending requests (simplified check for demo)
     // Ideally we'd need an API to check status specifically between two users
     // For now, if we send a request, we'll optimistically update UI
  };

  // 获取用户数据
  const fetchData = async () => {
    const created = await dbService.getEntriesByUser(user.id);
    setEntries(created);

    // 如果没有传入 likedEntries，则本地获取
    if (!propLikedEntries && isOwnProfile) {
      const likes = await dbService.getLikedEntries();
      setLocalLikedEntries(likes);
    }
  };

  useEffect(() => {
    setUsername(user.username);
    setBio(user.bio || '');
    setAvatar(user.avatar);
    setCoverImage(user.coverImage || '');
    refreshStatus();
    fetchData();
  }, [user, currentUser.id]);

  // 处理取消点赞
  const handleUnlike = async (id: string) => {
    if (onUnlike) {
      await onUnlike(id);
    }
    // 本地更新：从列表中移除
    setLocalLikedEntries(prev => prev.filter(e => e.id !== id));
    // 调用刷新回调
    if (onRefreshLikes) {
      await onRefreshLikes();
    }
  };

  const handleSaveProfile = async () => {
    if (!isOwnProfile) return;
    if (!username.trim()) return alert("用户名不能为空");
    setIsSaving(true);
    try {
      let avatarUrl = avatar;
      let coverUrl = coverImage;

      // 如果 avatar 是 base64 数据（新上传的图片），先上传到服务器
      if (avatar && avatar.startsWith('data:')) {
        const uploadResult = await dbService.uploadFile(avatar, 'avatars', `avatar-${user.id}-${Date.now()}`);
        avatarUrl = uploadResult.url;
      }

      // 如果 coverImage 是 base64 数据（新上传的图片），先上传到服务器
      if (coverImage && coverImage.startsWith('data:')) {
        const uploadResult = await dbService.uploadFile(coverImage, 'backgrounds', `cover-${user.id}-${Date.now()}`);
        coverUrl = uploadResult.url;
      }

      await onUpdateUser({ username, avatar: avatarUrl, bio, coverImage: coverUrl });
      setIsEditing(false);
    } catch (e: any) {
      alert("保存失败: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFriend = async () => {
      try {
          await dbService.sendFriendRequest(currentUser.id, user.id);
          setHasPendingRequest(true);
          alert("好友申请已发送！等待对方通过。");
      } catch (e: any) {
          alert(e.message);
      }
  };

  const handleRemoveFriend = async () => {
      if(confirm(`确定要删除好友 ${user.username} 吗?`)) {
          await dbService.removeFriend(currentUser.id, user.id);
          refreshStatus();
      }
  };

  // 压缩图片
  const compressImage = (file: File, maxWidth: number = 400, maxHeight: number = 400, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // 计算缩放比例
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建 canvas 上下文'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // 转换为 Base64，使用 JPEG 格式和压缩质量
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover' = 'avatar') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      try {
        setCropperType(type);
        // 头像压缩到 400x400，背景图压缩到 1200x400，质量 0.8
        const maxWidth = type === 'avatar' ? 400 : 1200;
        const maxHeight = type === 'avatar' ? 400 : 400;
        const compressedImage = await compressImage(file, maxWidth, maxHeight, 0.8);
        setRawImage(compressedImage);
        setShowCropper(true);
      } catch (error: any) {
        alert('图片处理失败: ' + error.message);
      }
    }
  };

  const handleCropComplete = (croppedBase64: string) => {
    if (cropperType === 'avatar') {
      setAvatar(croppedBase64);
    } else {
      setCoverImage(croppedBase64);
    }
    setShowCropper(false);
    setRawImage(null);
  };

  const displayEntries = activeTab === 'created' ? entries : likedEntries;

  return (
    <div className="h-full flex flex-col bg-[#f5f5f7] dark:bg-[#0d1117] overflow-y-auto custom-scrollbar animate-fade-in relative transition-colors">
      
      {/* Cover Image Section - Full Display */}
      <div className="relative">
        {/* Background Image - 完整显示 */}
        <div className="h-80 md:h-[420px] relative overflow-hidden group">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{
              backgroundImage: coverImage
                ? `url(${coverImage})`
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          />

          {/* Subtle Grid Overlay - 极淡的网格不影响背景 */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

          {/* Edit Cover Button - 右上角小按钮 */}
          {isEditing && isOwnProfile && (
            <label className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-xl cursor-pointer transition-all z-20 flex items-center gap-2 text-white shadow-lg border border-white/20">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'cover')}
              />
              <ImagePlus size={18} />
              <span className="text-sm font-medium">更换背景</span>
            </label>
          )}

          {/* Back Button - 毛玻璃效果 */}
          {!isOwnProfile && onBack && (
            <button
              onClick={onBack}
              className="absolute top-6 left-6 p-2.5 bg-white/20 dark:bg-black/30 hover:bg-white/30 dark:hover:bg-black/50 rounded-full text-slate-800 dark:text-white transition-all z-20 shadow-lg backdrop-blur-md border border-white/20"
            >
              <ArrowLeft size={20} />
            </button>
          )}
        </div>

        {/* Smooth Gradient to Page Background */}
        <div className="relative h-32 -mt-32 pointer-events-none">
          {/* Gradient from image to page background */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f5f5f7]/60 to-[#f5f5f7] dark:via-[#0d1117]/60 dark:to-[#0d1117]" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto w-full px-4 md:px-8 pb-20 -mt-20 md:-mt-24 relative z-10">
        
        {/* Profile Card with Advanced Tech Glass Effect */}
        <div className="relative mb-8 group">
          {/* Multi-layer Glass Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-[#161b22]/90 dark:via-[#1c212e]/80 dark:to-[#161b22]/70 backdrop-blur-2xl rounded-[24px]" />

          {/* Animated Gradient Border */}
          <div className="absolute inset-0 rounded-[24px] p-[1px] bg-gradient-to-r from-primary-500/20 via-purple-500/20 to-primary-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Glass Shine Effect - Multi-layer */}
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white/30 to-transparent rounded-t-[24px] pointer-events-none" />
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

          {/* Tech Corner Accents */}
          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary-500/30 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary-500/30 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary-500/30 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary-500/30 rounded-br-lg" />

          {/* Subtle Inner Glow */}
          <div className="absolute inset-0 rounded-[24px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]" />

          {/* Content */}
          <div className="relative rounded-[24px] p-6 overflow-hidden">
           <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
              
              {/* Avatar */}
              <div className="relative group shrink-0 mx-auto md:mx-0">
                 <div className="rounded-[24px] p-1.5 bg-white dark:bg-[#161b22] ring-1 ring-black/5 dark:ring-white/10 shadow-2xl">
                    <Avatar avatar={avatar} name={username} size="2xl" className="w-32 h-32 md:w-36 md:h-36 text-4xl rounded-[20px]" />
                 </div>
                 {isEditing && isOwnProfile && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-[20px] cursor-pointer opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                       <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'avatar')} />
                       <Upload className="text-white drop-shadow-md" size={24} />
                       <span className="text-xs text-white absolute bottom-8 font-bold drop-shadow-md">更换头像</span>
                    </label>
                 )}
              </div>

              {/* Info */}
              <div className="flex-1 w-full text-center md:text-left space-y-3 md:pb-2">
                 {isEditing && isOwnProfile ? (
                    <div className="space-y-4 animate-fade-in max-w-md">
                       <div>
                         <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1 block">用户名</label>
                         <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-lg font-bold text-slate-900 dark:text-white focus:border-primary-500 outline-none transition-all" disabled={isSaving}/>
                       </div>
                       <div>
                         <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1 block">个人简介</label>
                         <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-700 dark:text-slate-300 focus:border-primary-500 outline-none resize-none transition-all" placeholder="写一句话介绍自己..." disabled={isSaving}/>
                       </div>
                       <div className="flex gap-2 justify-center md:justify-start">
                          {AVATAR_COLORS.slice(0, 6).map(c => (
                            <button key={c} onClick={() => setAvatar(c)} className={`w-8 h-8 rounded-full ${c} ring-2 ${avatar === c ? 'ring-slate-900 dark:ring-white scale-110' : 'ring-transparent'} transition-all`} disabled={isSaving}/>
                          ))}
                       </div>
                    </div>
                 ) : (
                    <div className="animate-fade-in">
                       <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">{username}</h1>
                       <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-2xl mx-auto md:mx-0 leading-relaxed font-medium">
                         {bio || (isOwnProfile ? "这个人很懒，什么都没有写..." : "暂无简介")}
                       </p>
                       <div className="flex items-center justify-center md:justify-start gap-4 mt-4 text-xs font-bold text-slate-400 dark:text-slate-500 font-mono tracking-wide">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-md">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Heart size={12}/> {likedEntries.length} Likes</span>
                          <span className="flex items-center gap-1"><Grid size={12}/> {entries.length} Posts</span>
                       </div>
                    </div>
                 )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 shrink-0 mx-auto md:mx-0">
                 {isOwnProfile ? (
                    isEditing ? (
                      <>
                        <Button variant="ghost" disabled={isSaving} onClick={() => { setIsEditing(false); setUsername(user.username); setBio(user.bio || ''); setAvatar(user.avatar); }}>取消</Button>
                        <Button onClick={handleSaveProfile} disabled={isSaving} icon={isSaving ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}>保存</Button>
                      </>
                    ) : (
                      <Button variant="secondary" onClick={() => setIsEditing(true)} icon={<Edit2 size={16}/>}>编辑资料</Button>
                    )
                 ) : (
                    <>
                       {isFriend ? (
                          <>
                             <Button variant="primary" icon={<MessageCircle size={16}/>} onClick={() => alert("请前往聊天室 -> 好友列表 进行聊天")}>发消息</Button>
                             <Button variant="danger" icon={<UserMinus size={16}/>} onClick={handleRemoveFriend}>删除好友</Button>
                          </>
                       ) : (
                          hasPendingRequest ? (
                             <Button variant="secondary" disabled icon={<Clock size={16}/>}>等待通过</Button>
                          ) : (
                             <Button variant="primary" icon={<UserPlus size={16}/>} onClick={handleAddFriend}>添加好友</Button>
                          )
                       )}
                    </>
                 )}
              </div>
           </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="space-y-6">
           <div className="flex items-center gap-8 border-b border-slate-200 dark:border-white/10 px-2">
              <button onClick={() => setActiveTab('created')} className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === 'created' ? 'text-primary-600 dark:text-primary-400 border-primary-500' : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-200'}`}>
                 <Grid size={16} /> {isOwnProfile ? '我的发布' : 'Ta 的发布'} ({entries.length})
              </button>
              <button onClick={() => setActiveTab('likes')} className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === 'likes' ? 'text-primary-600 dark:text-primary-400 border-primary-500' : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-200'}`}>
                 <Heart size={16} fill={activeTab === 'likes' ? "currentColor" : "none"} /> {isOwnProfile ? '我的收藏' : 'Ta 的收藏'} ({likedEntries.length})
              </button>
           </div>

           <div className="animate-slide-up">
              {displayEntries.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                   {displayEntries.map(entry => (
                      <div key={entry.id} className="group bg-white dark:bg-[#161b22] border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden hover:border-primary-500/30 dark:hover:border-primary-500/30 transition-all hover:shadow-xl hover:-translate-y-1 relative shadow-sm">
                         <div onClick={() => onViewEntry(entry.id)} className="cursor-pointer">
                            <div className="aspect-square bg-slate-100 dark:bg-black/50 relative overflow-hidden">
                               {entry.imageUrl && entry.imageUrl.trim() !== '' ? (<img src={entry.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={entry.title} />) : (<div className="w-full h-full flex items-center justify-center text-slate-400"><ImageOff size={32} /></div>)}
                               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                            <div className="p-4">
                               <h3 className="font-bold text-slate-800 dark:text-white truncate text-sm mb-1.5">{entry.title}</h3>
                               <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                  <Avatar avatar={entry.authorAvatar || ''} name={entry.authorName || '?'} size="xs" />
                                  <span className="truncate">{entry.authorName}</span>
                               </div>
                            </div>
                         </div>
                         {/* 在收藏页面显示取消点赞按钮 */}
                          {activeTab === 'likes' && isOwnProfile && (
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleUnlike(entry.id);
                               }}
                               className="absolute top-2 right-2 p-2 rounded-full bg-pink-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-pink-600"
                               title="取消收藏"
                             >
                               <Heart size={16} fill="currentColor" />
                             </button>
                          )}
                      </div>
                   ))}
                </div>
              ) : (
                <div className="text-center py-24 text-slate-400 dark:text-slate-600">
                   <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-300 dark:border-white/10">
                      {activeTab === 'likes' ? <Heart size={32} className="opacity-50" /> : <Grid size={32} className="opacity-50" />}
                   </div>
                   <p className="text-sm font-medium">这里空空如也</p>
                </div>
              )}
           </div>
        </div>

      </div>

      {/* Cropper Modal */}
      {showCropper && rawImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#161b22] rounded-2xl w-full max-w-lg flex flex-col shadow-2xl animate-scale-in overflow-hidden">
             <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {cropperType === 'avatar' ? '调整头像' : '调整背景图'}
                </h3>
                <button onClick={() => setShowCropper(false)}><X size={20} className="text-slate-400"/></button>
             </div>
             <div className="p-4 flex justify-center bg-slate-100 dark:bg-black/50">
                <img
                  src={rawImage}
                  className={`max-w-full object-contain ${cropperType === 'avatar' ? 'max-h-[300px]' : 'max-h-[200px] w-full'}`}
                />
             </div>
             <div className="p-4 flex gap-2">
                <Button className="w-full" onClick={() => handleCropComplete(rawImage)}>
                  确认使用
                </Button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
