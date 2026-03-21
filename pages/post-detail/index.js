import { fetchPostDetail } from '../../services/post/index';

Page({
  data: {
    post: null,
    postId: '',
    loaded: false
  },

  onLoad(options) {
    const postId = options.postId || '';
    if (!postId) {
      wx.showToast({ title: '帖子不存在', icon: 'none' });
      return;
    }
    this.setData({ postId });
    this.loadPostDetail();
  },

  async loadPostDetail() {
    wx.showLoading({ title: '加载中' });
    try {
      const post = await fetchPostDetail(this.data.postId);
      this.setData({ post, loaded: true });
      if (!post) {
        wx.showToast({ title: '帖子不存在', icon: 'none' });
      }
    } catch (e) {
      this.setData({ loaded: true });
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onApplyJoin() {
    wx.showToast({
      title: '已发送申请，等待对方确认',
      icon: 'success'
    });
  }
});
