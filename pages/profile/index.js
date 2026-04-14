const { login, updateUserProfile } = require('../../services/user');
const postService = require('../../services/post');
const { logError } = require('../../utils/error');

function getCurrentUserId() {
  const ui = wx.getStorageSync('userInfo') || {};
  return String(ui.openid || ui._openid || '');
}

function buildBgCloudPath() {
  const userId = getCurrentUserId() || 'guest';
  return `profile-bg/${userId}/${Date.now()}.jpg`;
}

function buildActionLabels(post) {
  const visibilityLabel = post.visibility === 'private' ? '设为公开' : '设为仅自己可见';
  return [visibilityLabel, '删除帖子'];
}

function getTagStyle(tag) {
  const colorMap = {
    '穷游': 'background: #ffe066; color: #d9480f;',
    '特种兵旅游': 'background: #ff8787; color: #c92a2a;',
    'cpdd': 'background: #fcc2d7; color: #c2255c;',
    '山水': 'background: #a5d8ff; color: #0c63e4;',
    '人文': 'background: #d0bfff; color: #5f3dc4;',
    '美食': 'background: #ffe066; color: #d9480f;',
    '徒步': 'background: #b2f2bb; color: #2b8a2a;',
    '登山': 'background: #d4a574; color: #5c2e1a;',
    '拍照': 'background: #99e9f2; color: #0b7285;'
  };
  return colorMap[tag] || 'background: #eef4ff; color: #245cc2;';
}

function buildStyledTags(tags) {
  return (Array.isArray(tags) ? tags : []).map((tag) => ({
    text: tag,
    style: getTagStyle(tag)
  }));
}

Page({
  data: {
    isLoggedIn: false,
    userInfo: {
      avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6RIrAkxqNLemdadAQmcZ20fhOd0I5bh1HfCnvq2vGDKz9w/132',
      nickName: '旅行爱好者',
      manifesto: '用脚步丈量世界，用心感受每一处风景',
      tags: ['山水', '人文', '美食', '徒步'],
      bgImage: ''
    },
    styledTags: [],
    stats: {
      checkinCount: 0,
      travelDays: 0
    },
    myPosts: [],
    likedPosts: [],
    showNicknameEdit: false,
    editNickname: ''
  },

  onLoad() {
    this._profileSyncedOnce = false;
    this._profileContentPromise = null;
    this.checkLogin();
    this.loadUserData();
  },

  onShow() {
    if (!this._profileSyncedOnce) {
      this._profileSyncedOnce = true;
      this.syncStoredProfile();
    } else {
      this.loadUserData();
    }
    this.loadStats();
    this.reloadProfileContent();
  },

  checkLogin() {
    const isLoggedIn = !!getCurrentUserId();
    this.setData({ isLoggedIn });
  },

  async onWechatLogin() {
    try {
      const profile = await wx.getUserProfile({ desc: '用于完善个人资料' });
      const data = await login({
        nickName: profile.userInfo.nickName,
        avatarUrl: profile.userInfo.avatarUrl
      });
      const nextUserInfo = {
        ...(data.userInfo || {}),
        nickName: profile.userInfo.nickName || (data.userInfo || {}).nickName || '微信用户',
        avatarUrl: profile.userInfo.avatarUrl || (data.userInfo || {}).avatarUrl || ''
      };
      wx.setStorageSync('profile_logged_in', true);
      wx.setStorageSync('userInfo', nextUserInfo);
      this.setData({ isLoggedIn: true });
      wx.showToast({ title: '登录成功', icon: 'success' });
      this.checkLogin();
      this.loadUserData();
      this.reloadProfileContent();
    } catch (error) {
      const message = logError('我的-微信登录失败', error);
      wx.showToast({ title: message, icon: 'none' });
    }
  },

  loadUserData() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) return;

    const nextUserInfo = {
      ...this.data.userInfo,
      ...userInfo,
      avatarUrl: userInfo.avatarUrl || this.data.userInfo.avatarUrl,
      nickName: userInfo.nickName || this.data.userInfo.nickName,
      manifesto: userInfo.manifesto || this.data.userInfo.manifesto,
      tags: Array.isArray(userInfo.tags) ? userInfo.tags : this.data.userInfo.tags,
      bgImage: userInfo.bgImage || this.data.userInfo.bgImage,
      openid: userInfo.openid || userInfo._openid || this.data.userInfo.openid || '',
      userId: userInfo.userId || userInfo._id || userInfo.openid || userInfo._openid || this.data.userInfo.userId || ''
    };

    this.setData({
      userInfo: nextUserInfo,
      styledTags: buildStyledTags(nextUserInfo.tags)
    });
  },

  async syncStoredProfile() {
    this.loadUserData();
    if (!getCurrentUserId()) return;
    try {
      await this.syncUserProfile({});
    } catch (error) {
      logError('我的-静默同步用户资料失败', error);
      // 页面先展示本地缓存，云同步失败时不打断展示
    }
  },

  async syncUserProfile(partial) {
    const nextUserInfo = {
      ...this.data.userInfo,
      ...partial
    };

    const payload = {
      nickName: nextUserInfo.nickName,
      avatarUrl: nextUserInfo.avatarUrl,
      manifesto: nextUserInfo.manifesto,
      tags: nextUserInfo.tags,
      bgImage: nextUserInfo.bgImage
    };

    const res = await updateUserProfile(payload);
    const savedUserInfo = res.userInfo || nextUserInfo;
    const mergedUserInfo = {
      ...this.data.userInfo,
      ...savedUserInfo,
      openid: savedUserInfo.openid || nextUserInfo.openid || getCurrentUserId()
    };

    wx.setStorageSync('userInfo', mergedUserInfo);
    this.setData({
      isLoggedIn: true,
      userInfo: mergedUserInfo,
      styledTags: buildStyledTags(mergedUserInfo.tags || [])
    });
  },

  async loadMyPosts() {
    if (!getCurrentUserId()) {
      this.setData({ myPosts: [] });
      return;
    }
    try {
      const myPosts = await postService.getMyPosts();
      this.setData({ myPosts: myPosts || [] });
    } catch (error) {
      logError('我的-加载我的帖子失败', error);
      this.setData({ myPosts: [] });
    }
  },

  async loadMyLikes() {
    if (!getCurrentUserId()) {
      this.setData({ likedPosts: [] });
      return;
    }
    try {
      const likedPosts = await postService.getMyLikes();
      this.setData({ likedPosts: likedPosts || [] });
    } catch (error) {
      logError('我的-加载我的点赞失败', error);
      this.setData({ likedPosts: [] });
    }
  },

  reloadProfileContent() {
    if (!getCurrentUserId()) {
      this._profileContentPromise = null;
      this.setData({ myPosts: [], likedPosts: [] });
      return Promise.resolve();
    }

    if (this._profileContentPromise) {
      return this._profileContentPromise;
    }

    const request = Promise.all([
      this.loadMyPosts(),
      this.loadMyLikes()
    ]).finally(() => {
      this._profileContentPromise = null;
    });

    this._profileContentPromise = request;
    return request;
  },

  loadStats() {
    const checkinCount = wx.getStorageSync('checkinCount') || 0;
    const travelDays = wx.getStorageSync('travelDays') || 0;
    this.setData({ 'stats.checkinCount': checkinCount, 'stats.travelDays': travelDays });
  },

  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (!avatarUrl) return;

    try {
      await this.syncUserProfile({ avatarUrl });
      wx.showToast({ title: '头像已更新', icon: 'success' });
    } catch (error) {
      const message = logError('我的-更新头像失败', error);
      wx.showToast({ title: message, icon: 'none' });
    }
  },

  async onUploadBgImage() {
    if (!this.data.isLoggedIn) return;

    try {
      const chooseRes = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      });
      const file = (chooseRes.tempFiles || [])[0];
      if (!file || !file.tempFilePath) return;

      wx.showLoading({ title: '上传中...', mask: true });
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: buildBgCloudPath(),
        filePath: file.tempFilePath
      });
      await this.syncUserProfile({ bgImage: uploadRes.fileID || '' });
      wx.hideLoading();
      wx.showToast({ title: '背景图已更新', icon: 'success' });
    } catch (error) {
      wx.hideLoading();
      const message = logError('我的-上传背景图失败', error);
      wx.showToast({ title: message, icon: 'none' });
    }
  },

  onNicknameTap() {
    if (!this.data.isLoggedIn) return;
    this.setData({ showNicknameEdit: true, editNickname: this.data.userInfo.nickName });
  },

  onNicknameInput(e) {
    this.setData({ editNickname: e.detail.value });
  },

  async onNicknameConfirm() {
    const nickName = (this.data.editNickname || '').trim() || '旅行爱好者';
    try {
      await this.syncUserProfile({ nickName });
      this.setData({ showNicknameEdit: false });
    } catch (error) {
      const message = logError('我的-更新昵称失败', error);
      wx.showToast({ title: message, icon: 'none' });
    }
  },

  onNicknameCancel() {
    this.setData({ showNicknameEdit: false });
  },

  onTagsTap() {
    if (!this.data.isLoggedIn) return;
    wx.navigateTo({ url: '/pages/tag-edit/index' });
  },

  onLikePostTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/community/detail/index?id=' + encodeURIComponent(id) });
  },

  onMyPostTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/community/detail/index?id=' + encodeURIComponent(id) });
  },

  onMyPostMore(e) {
    const post = e.currentTarget.dataset.post || {};
    if (!post.id) return;
    const itemList = buildActionLabels(post);
    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (res.tapIndex === 0) {
          this.togglePostVisibility(post);
        } else if (res.tapIndex === 1) {
          this.confirmDeletePost(post);
        }
      }
    });
  },

  togglePostVisibility(post) {
    const nextVisibility = post.visibility === 'private' ? 'public' : 'private';
    postService.updatePostVisibility({
      postId: post.id,
      visibility: nextVisibility
    }).then(() => {
      wx.showToast({ title: nextVisibility === 'private' ? '已设为私密' : '已设为公开', icon: 'success' });
      this.loadMyPosts();
      this.loadMyLikes();
    }).catch((error) => {
      const message = logError('我的-切换帖子可见性失败', error, { postId: post.id });
      wx.showToast({ title: message, icon: 'none' });
    });
  },

  confirmDeletePost(post) {
    wx.showModal({
      title: '删除帖子',
      content: '删除后无法恢复，确定删除这篇帖子吗？',
      confirmColor: '#e03131',
      success: (res) => {
        if (!res.confirm) return;
        postService.deletePost({ postId: post.id }).then(() => {
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.loadMyPosts();
          this.loadMyLikes();
        }).catch((error) => {
          const message = logError('我的-删除帖子失败', error, { postId: post.id });
          wx.showToast({ title: message, icon: 'none' });
        });
      }
    });
  },

  onMyTrips() { wx.navigateTo({ url: '/pages/trip-library/index' }); },
  onSafetyCenter() { wx.navigateTo({ url: '/pages/safety-center/index' }); },
  onSettings() { wx.navigateTo({ url: '/pages/settings/index' }); },
  onCustomerService() { wx.navigateTo({ url: '/pages/aboutUs/index' }); }
});
