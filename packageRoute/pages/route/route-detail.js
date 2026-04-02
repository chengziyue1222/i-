// pages/route/route-detail.js
Page({
  data: {
    scheme: {},
    scenicId: '',
    routePoints: []
  },

  onLoad(options) {
    const raw = options && options.data ? options.data : encodeURIComponent('{}');
    const data = JSON.parse(decodeURIComponent(raw));
    this.setData({
      scheme: data.scheme || {},
      scenicId: data.scenicId || '',
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

  // 返回地图（从攻略详情进入地图路线页）
  onBackToMap() {
    const scheme = this.data.scheme || {};
    const routePoints = this.data.routePoints || [];
    const schemeStops = scheme.stops || routePoints || [];

    const params = encodeURIComponent(JSON.stringify({
      scheme: {
        ...scheme,
        stops: schemeStops
      },
      scenicId: this.data.scenicId || '',
      routePoints: routePoints,
      sortedAttractions: routePoints
    }));
    wx.navigateTo({
      url: `/packageRoute/pages/route/route-map?data=${params}`
    });
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
