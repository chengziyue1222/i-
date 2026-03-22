const MOCK_COMMENTS = [
  { id:'c1', nickname:'山水之间', avatar:'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6RIrAkxqNLemdadAQmcZ20fhOd0I5bh1HfCnvq2vGDKz9w/132', text:'太棒了！这条路线我也想走，请问大概花了多少钱？', time:'2小时前', likes:12, liked:false, replies:[{id:'r1',nickname:'特种兵小王',text:'人均200-300，门票加交通'}] },
  { id:'c2', nickname:'旅途小记', avatar:'https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTLL3cuCJJSicqhLWKCRNyOicicFQF7sAjTYGDmMgvJibFRicVl2VzRoO9e3ick5ZCJDTsZJRHIxmqKHhMFw/132', text:'七星岩早上人少，光线好，拍出来的照片很漂亮✨', time:'4小时前', likes:8, liked:false, replies:[] },
  { id:'c3', nickname:'cpdd找搭子', avatar:'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6RIrAkxqNLemdadAQmcZ20fhOd0I5bh1HfCnvq2vGDKz9w/132', text:'有没有下周末想一起去的！我一个人太孤独了😭', time:'1天前', likes:24, liked:false, replies:[] }
];
const DEFAULT_AVATAR = 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6RIrAkxqNLemdadAQmcZ20fhOd0I5bh1HfCnvq2vGDKz9w/132';

Page({
  data: {
    post:{}, isFollowed:false, isLiked:false, likeCount:0,
    comments:MOCK_COMMENTS, inputText:'', inputFocus:false, replyTo:'',
    myAvatar: DEFAULT_AVATAR
  },

  onLoad(options) {
    try {
      const post = JSON.parse(decodeURIComponent(options.post || '{}'));
      const followedList = wx.getStorageSync('followedUsers') || [];
      const likedPosts = wx.getStorageSync('likedPosts') || [];
      const fullPost = {
        ...post,
        content: post.content || '这次旅行真的太爽了，早上6点出发，一天玩遍所有景点！沿途风景绝美，强烈推荐大家试试这条路线 🌟',
        tags: post.tags || ['肇庆','特种兵','打卡','周末游'],
        author: { ...post.author, followers: '1.2k' }
      };
      this.setData({
        post: fullPost,
        isFollowed: followedList.includes(post.author && post.author.name),
        isLiked: likedPosts.includes(post.postId),
        likeCount: post.likes || 0
      });
    } catch(e) { wx.showToast({title:'加载失败',icon:'none'}); }
    const ui = wx.getStorageSync('userInfo') || {};
    if (ui.avatarUrl) this.setData({ myAvatar: ui.avatarUrl });
    this.loadComments();
  },

  loadComments() {
    const saved = wx.getStorageSync('post_comments_' + (this.data.post.postId || '')) || [];
    if (saved.length) this.setData({ comments: [...MOCK_COMMENTS, ...saved] });
  },

  onToggleFollow() {
    const { isFollowed, post } = this.data;
    const newVal = !isFollowed;
    const name = post.author && post.author.name;
    const list = wx.getStorageSync('followedUsers') || [];
    if (newVal) { if (!list.includes(name)) list.push(name); }
    else { const i = list.indexOf(name); if (i>-1) list.splice(i,1); }
    wx.setStorageSync('followedUsers', list);
    this.setData({ isFollowed: newVal });
    wx.showToast({ title: newVal ? `已关注 ${name}` : '已取消关注', icon: newVal ? 'success' : 'none' });
  },

  onToggleLike() {
    const { isLiked, likeCount, post } = this.data;
    const newLiked = !isLiked;
    const list = wx.getStorageSync('likedPosts') || [];
    if (newLiked) { if (!list.includes(post.postId)) list.push(post.postId); }
    else { const i = list.indexOf(post.postId); if (i>-1) list.splice(i,1); }
    wx.setStorageSync('likedPosts', list);
    this.setData({ isLiked: newLiked, likeCount: newLiked ? likeCount+1 : likeCount-1 });
  },

  onFocusComment() { this.setData({ inputFocus:true, replyTo:'' }); },

  onReply(e) { this.setData({ inputFocus:true, replyTo: e.currentTarget.dataset.item.nickname }); },

  onLikeComment(e) {
    const id = e.currentTarget.dataset.id;
    const comments = this.data.comments.map(c =>
      c.id===id ? {...c, liked:!c.liked, likes: c.liked ? c.likes-1 : c.likes+1} : c
    );
    this.setData({ comments });
  },

  onCommentInput(e) { this.setData({ inputText: e.detail.value }); },

  onSendComment() {
    const { inputText, replyTo } = this.data;
    if (!inputText.trim()) return;
    const ui = wx.getStorageSync('userInfo') || {};
    const c = {
      id: 'c_'+Date.now(),
      nickname: ui.nickName || '旅行爱好者',
      avatar: ui.avatarUrl || DEFAULT_AVATAR,
      text: replyTo ? `回复 @${replyTo}：${inputText}` : inputText,
      time:'刚刚', likes:0, liked:false, replies:[]
    };
    const comments = [c, ...this.data.comments];
    this.setData({ comments, inputText:'', inputFocus:false, replyTo:'' });
    const saved = wx.getStorageSync('post_comments_'+(this.data.post.postId||'')) || [];
    saved.unshift(c);
    wx.setStorageSync('post_comments_'+(this.data.post.postId||''), saved.slice(0,100));
  },

  onShare() { wx.showShareMenu({ withShareTicket:true }); },

  onFindBuddy() {
    wx.navigateBack();
    setTimeout(() => wx.showToast({title:'切换到找搭子Tab搜索',icon:'none',duration:2500}), 400);
  },

  onShareAppMessage() {
    return { title: this.data.post.title || '分享帖子', path: '/pages/solution/index' };
  }
});
