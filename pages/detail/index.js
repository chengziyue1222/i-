import { fetchSceneDetail } from '../../services/scene/index';
import { getScenicDemoById } from '../../config/scenic-demo';

const DEFAULT_COVER = 'https://main.qcloudimg.com/raw/f859ae9d38d34a5ddaa89ae108109cd4.png';

Page({
  data: {
    article: null,
    mode: 'article',
    scenic: null
  },

  async onLoad(options) {
    const { id, title, type, mode = 'article', scenicId, scenicData } = options;

    if (mode === 'scenic') {
      wx.setNavigationBarTitle({ title: '景区详情' });
      let scenic = null;

      if (scenicData) {
        try {
          scenic = JSON.parse(decodeURIComponent(scenicData));
        } catch (e) {
          scenic = null;
        }
      }

      if (!scenic && scenicId) {
        scenic = getScenicDemoById(scenicId);
      }

      if (scenic) {
        this.setData({
          mode: 'scenic',
          scenic: {
            ...scenic,
            images: Array.isArray(scenic.images) && scenic.images.length ? scenic.images : [scenic.cover || DEFAULT_COVER],
            cover: scenic.cover || DEFAULT_COVER
          }
        });
      }
      return;
    }

    wx.setNavigationBarTitle({ title: title || '详情' });
    await this.getArticle(id, type);
  },

  async getArticle(id, type) {
    try {
      wx.showLoading({ title: '加载中' });
      const article = await fetchSceneDetail(id, type);
      this.setData({ article, mode: 'article' });
    } catch (error) {
      console.error('[detail] getArticle error:', error);
    } finally {
      wx.hideLoading();
    }
  }
});
