Page({
  data: {
    version: '1.0.0'
  },

  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存吗？部分数据将需要重新加载。',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.clearStorageSync();
            wx.showToast({ title: '清除成功', icon: 'success' });
          } catch (e) {
            wx.showToast({ title: '清除失败', icon: 'none' });
          }
        }
      }
    });
  },

  onAbout() {
    wx.navigateTo({ url: '/pages/aboutUs/index' });
  }
});
