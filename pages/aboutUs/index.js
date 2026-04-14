const { fetchIndexData } = require('../../services/index/index');

Page({
  data: {
    aboutUs: {}
  },

  async onLoad() {
    await this.getAboutUs();
  },

  async getAboutUs() {
    try {
      wx.showLoading({
        title: '加载中'
      });
      const res = await fetchIndexData();
      const aboutUs = (res && res[0]) ? res[0] : {};
      this.setData({ aboutUs: aboutUs });
    } catch (error) {
      wx.showToast({
        title: (error && error.message) || '页面请求失败，请刷新页面',
        icon: 'none',
        duration: 2000
      });
    } finally {
      wx.hideLoading();
    }
  },

  onPhone() {
    wx.makePhoneCall({
      phoneNumber: '1340000'
    });
  },

  onGoMap() {
    wx.getLocation({
      type: 'gcj02',
      success(res) {
        const latitude = res.latitude;
        const longitude = res.longitude;
        wx.openLocation({
          latitude,
          longitude,
          scale: 18
        });
      }
    });
  }
});
