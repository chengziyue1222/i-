// pages/route/route-detail.js
Page({
  data: {
    scheme: {},
    scenicId: '',
    routePoints: []
  },

  onLoad(options) {
    const data = JSON.parse(decodeURIComponent(options.data));
    this.setData({
      scheme: data.scheme,
      scenicId: data.scenicId,
      routePoints: data.routePoints || []
    });
  },

  // 分享
  onShare() {
    wx.showShareMenu({
      withShareTicket: true
    });
    wx.showToast({
      title: '请点击右上角分享',
      icon: 'none'
    });
  },

  // 返回地图
  onBackToMap() {
    wx.navigateBack();
  },

  // 分享给好友
  onShareAppMessage() {
    return {
      title: `推荐你一条${this.data.scheme.name}`,
      path: '/pages/route/scenic-list',
      imageUrl: '/images/share-cover.jpg'
    };
  }
});
