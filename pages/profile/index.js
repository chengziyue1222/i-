Page({
  data: {
    userInfo: {
      avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6RIrAkxqNLemdadAQmcZ20fhOd0I5bh1HfCnvq2vGDKz9w/132',
      nickName: '旅行爱好者',
      manifesto: '用脚步丈量世界，用心感受每一处风景',
      tags: ['山水', '人文', '美食', '徒步']
    },
    stats: {
      checkinCount: 0,
      travelDays: 0
    }
  },

  onLoad() {
    this.loadUserData();
  },

  onShow() {
    this.loadStats();
  },

  loadUserData() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        'userInfo.avatarUrl': userInfo.avatarUrl || this.data.userInfo.avatarUrl,
        'userInfo.nickName': userInfo.nickName || this.data.userInfo.nickName,
        'userInfo.manifesto': userInfo.manifesto || this.data.userInfo.manifesto,
        'userInfo.tags': userInfo.tags || this.data.userInfo.tags
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

  onMyTrips() {
    wx.showToast({ title: '行程库开发中', icon: 'none' });
  },

  onSafetyCenter() {
    wx.showToast({ title: '安全中心开发中', icon: 'none' });
  },

  onSettings() {
    wx.showToast({ title: '设置开发中', icon: 'none' });
  },

  onCustomerService() {
    wx.navigateTo({ url: '/pages/aboutUs/index' });
  }
});
