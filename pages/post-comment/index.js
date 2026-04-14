const postApi = require('../../services/post');

Page({
  data: {
    postId: '',
    postTitle: '',
    postAuthor: '',
    comments: [],
    inputValue: '',
    submitting: false
  },

  onLoad: function (options) {
    var postId = options.postId || '';
    var postTitle = decodeURIComponent(options.postTitle || '帖子');
    var postAuthor = decodeURIComponent(options.postAuthor || '');
    this.setData({ postId: postId, postTitle: postTitle, postAuthor: postAuthor });
    wx.setNavigationBarTitle({ title: '评论' });
    this.loadComments();
  },

  onShow: function () {
    this.loadComments();
  },

  async loadComments() {
    try {
      var list = await postApi.getComments(this.data.postId);
      this.setData({ comments: list || [] });
    } catch (error) {
      wx.showToast({ title: error.message || '评论加载失败', icon: 'none' });
    }
  },

  onInput: function (e) {
    this.setData({ inputValue: e.detail.value });
  },

  async onSend() {
    var text = (this.data.inputValue || '').trim();
    var ui = wx.getStorageSync('userInfo') || {};
    if (!text) { wx.showToast({ title: '请输入评论内容', icon: 'none' }); return; }
    if (!String(ui.openid || ui._openid || '')) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });

    try {
      await postApi.createComment({
        postId: this.data.postId,
        content: text
      });
      this.setData({ inputValue: '', submitting: false });
      this.loadComments();
      wx.showToast({ title: '评论成功', icon: 'success' });
    } catch (error) {
      this.setData({ submitting: false });
      wx.showToast({ title: error.message || '评论失败', icon: 'none' });
    }
  }
});
