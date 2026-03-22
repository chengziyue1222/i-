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
    stats: {
      checkinCount: 0,
      travelDays: 0
    },
    showNicknameEdit: false,
    editNickname: ''
  },

  // 标签颜色映射

  onLoad() {
    this.checkLogin();
    this.loadUserData();
  },

  onShow() {
    this.loadUserData();
    this.loadStats();
  },

  checkLogin() {
    const isLoggedIn = !!wx.getStorageSync('profile_logged_in');
    this.setData({ isLoggedIn });
  },

  onWechatLogin() {
    wx.login({
      success: (res) => {
        if (res.code) {
          wx.setStorageSync('profile_logged_in', true);
          wx.setStorageSync('wxLoginCode', res.code);
          this.setData({ isLoggedIn: true });
          wx.showToast({ title: '登录成功', icon: 'success' });
          this.loadUserData();
        } else {
          wx.showToast({ title: '登录失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '登录失败，请重试', icon: 'none' });
      }
    });
  },

  loadUserData() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        'userInfo.avatarUrl': userInfo.avatarUrl || this.data.userInfo.avatarUrl,
        'userInfo.nickName': userInfo.nickName || this.data.userInfo.nickName,
        'userInfo.manifesto': userInfo.manifesto || this.data.userInfo.manifesto,
        'userInfo.tags': Array.isArray(userInfo.tags) ? userInfo.tags : this.data.userInfo.tags,
        'userInfo.bgImage': userInfo.bgImage || this.data.userInfo.bgImage
      });
    }
  },

  loadStats() {
    const checkinCount = wx.getStorageSync('checkinCount') || 0;
    const travelDays = wx.getStorageSync('travelDays') || 0;
    this.setData({
      'stats.checkinCount': checkinCount,
      'stats.travelDays': travelDays
    });
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (avatarUrl) {
      const userInfo = { ...this.data.userInfo, avatarUrl };
      this.setData({ userInfo });
      wx.setStorageSync('userInfo', userInfo);
    }
  },

  onUploadBgImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        // 在实际应用中，这里应该上传到服务器或云存储
        // 这里简单地保存本地路径
        const userInfo = { ...this.data.userInfo, bgImage: tempFilePath };
        this.setData({ userInfo });
        wx.setStorageSync('userInfo', userInfo);
        wx.showToast({ title: '背景图已更新', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  },

  getTagStyle(tag) {
    const colorMap = {
      '穷游': 'background: #ffe066; color: #d9480f;',
      '特种兵旅游': 'background: #ff8787; color: #c92a2a;',
      'cpdd': 'background: #fcc2d7; color: #c2255c;',
      '山水': 'background: #a5d8ff; color: #0c63e4;',
      '人文': 'background: #d0bfff; color: #5f3dc4;',
      '美食': 'background: #ffe066; color: #d9480f;',
      '徒步': 'background: #b2f2bb; color: #2b8a3e;',
      '登山': 'background: #d4a574; color: #5c2e1a;',
      '拍照': 'background: #99e9f2; color: #0b7285;',
      '自驾': 'background: #ffd43b; color: #b8860b;',
      '亲子': 'background: #fcc2d7; color: #c2255c;',
      '露营': 'background: #b2f2bb; color: #2b8a3e;',
      '古镇': 'background: #d0bfff; color: #5f3dc4;',
      '周末游': 'background: #a5d8ff; color: #0c63e4;',
      '说走就走': 'background: #ff8787; color: #c92a2a;'
    };
    return colorMap[tag] || 'background: #a5d8ff; color: #0c63e4;';
  },

  onNicknameTap() {
    if (!this.data.isLoggedIn) return;
    this.setData({
      showNicknameEdit: true,
      editNickname: this.data.userInfo.nickName
    });
  },

  onNicknameInput(e) {
    this.setData({ editNickname: e.detail.value });
  },

  onNicknameConfirm() {
    const nickName = (this.data.editNickname || '').trim() || '旅行爱好者';
    const userInfo = { ...this.data.userInfo, nickName };
    this.setData({ userInfo, showNicknameEdit: false });
    wx.setStorageSync('userInfo', userInfo);
  },

  onNicknameCancel() {
    this.setData({ showNicknameEdit: false });
  },

  onTagsTap() {
    if (!this.data.isLoggedIn) return;
    wx.navigateTo({ url: '/pages/tag-edit/index' });
  },

  onMyTrips() {
    wx.navigateTo({ url: '/pages/trip-library/index' });
  },

  onSafetyCenter() {
    wx.navigateTo({ url: '/pages/safety-center/index' });
  },

  onSettings() {
    wx.navigateTo({ url: '/pages/settings/index' });
  },

  onCustomerService() {
    wx.navigateTo({ url: '/pages/aboutUs/index' });
  }
});
