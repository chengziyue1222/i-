// pages/route/scenic-list.js
import { fetchScenicSpotData } from '../../services/scene/index';

Page({
  data: {
    scenicList: [],
    filteredScenicList: [],
    searchKeyword: ''
  },

  onLoad() {
    this.loadScenicList();
  },

  // 加载景区列表
  async loadScenicList() {
    wx.showLoading({ title: '加载中...' });
    try {
      const list = await fetchScenicSpotData();
      this.setData({
        scenicList: list,
        filteredScenicList: list
      });
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value;
    const filtered = this.data.scenicList.filter(item =>
      item.scenicName.includes(keyword)
    );
    this.setData({
      searchKeyword: keyword,
      filteredScenicList: filtered
    });
  },

  // 点击景区卡片
  onScenicTap(e) {
    const scenic = e.currentTarget.dataset.scenic;
    wx.navigateTo({
      url: `/pages/route/scenic-detail?scenicId=${scenic.scenicId}`
    });
  },

  onPullDownRefresh() {
    this.loadScenicList().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
