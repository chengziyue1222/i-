Page({
  onLoad() {
    wx.showToast({
      title: '旧页面已停用',
      icon: 'none',
      duration: 2000
    });

    wx.redirectTo({
      url: '/pages/community/index'
    });
  }
});
