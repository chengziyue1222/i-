Page({
  data: {
    tripList: []
  },

  onLoad() {
    this.loadTrips();
  },

  onShow() {
    this.loadTrips();
  },

  loadTrips() {
    const list = wx.getStorageSync('tripLibrary') || [];
    this.setData({ tripList: list });
  },

  onTripTap(e) {
    const idx = e.currentTarget.dataset.index;
    const trip = this.data.tripList[idx];
    if (!trip || !trip.scheme) return;
    wx.setStorageSync('sortedAttractions', trip.sortedAttractions || []);
    wx.setStorageSync('routePathData', trip.pathData || null);
    const data = encodeURIComponent(JSON.stringify({
      scheme: trip.scheme,
      scenicId: trip.scenicId || ''
    }));
    wx.navigateTo({
      url: `/packageRoute/pages/route/route-map?data=${data}`
    });
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除行程',
      content: '确定要删除这条行程吗？',
      success: (res) => {
        if (res.confirm) {
          const list = (wx.getStorageSync('tripLibrary') || []).filter(t => t.id !== id);
          wx.setStorageSync('tripLibrary', list);
          this.setData({ tripList: list });
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  }
});
