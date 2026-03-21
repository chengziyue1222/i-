import { fetchSceneDetail } from '../../../services/scene/index';

Page({
  data: {
    article: {}
  },

  onLoad(options) {
    const { id, type } = options;
    this.loadDetail(id, type);
  },

  async loadDetail(id, type) {
    wx.showLoading({ title: '加载中...' });
    try {
      const article = await fetchSceneDetail(id, type);
      this.setData({ article });
      wx.setNavigationBarTitle({ title: article?.title || article?.sub_title || '详情' });
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
});
