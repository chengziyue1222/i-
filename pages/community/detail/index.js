const postService = require('../../../services/post');

function getCurrentUserId() {
  var ui = wx.getStorageSync('userInfo') || {};
  return String(ui.openid || ui._openid || '');
}

function formatTime(time) {
  if (!time) return '刚刚';
  const now = Date.now();
  const diff = now - Number(time);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return Math.floor(diff / minute) + '分钟前';
  if (diff < day) return Math.floor(diff / hour) + '小时前';
  var date = new Date(Number(time));
  return (date.getMonth() + 1) + '月' + date.getDate() + '日';
}

Page({
  data: {
    id: '',
    post: null,
    comments: [],
    commentValue: '',
    submittingComment: false,
    loading: true
  },

  onLoad: function (options) {
    var rawId = options.id || options.postId || '';
    this.setData({ id: decodeURIComponent(rawId) });
    this.loadAll();
  },

  onShow: function () {
    if (this.data.id) this.loadAll();
  },

  loadAll: function () {
    var self = this;
    if (!this.data.id) return Promise.resolve();
    this.setData({ loading: true });
    return Promise.all([
      postService.getPostDetail(this.data.id),
      postService.getComments(this.data.id)
    ]).then(function (result) {
      var post = result[0];
      var comments = result[1] || [];
      self.setData({
        post: post,
        comments: comments.map(function (item) {
          return Object.assign({}, item, { timeText: formatTime(item.createdAt) });
        }),
        loading: false
      });
      if (post && post.title) wx.setNavigationBarTitle({ title: '帖子详情' });
    }).catch(function (error) {
      self.setData({ loading: false });
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    });
  },

  onLikeTap: function () {
    var self = this;
    var post = this.data.post;
    if (!post || !post.id) return;
    if (!getCurrentUserId()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    postService.likePost({ postId: post.id }).then(function (result) {
      self.setData({
        'post.liked': result.liked,
        'post.likeCount': result.likeCount
      });
    }).catch(function (error) {
      wx.showToast({ title: error.message || '点赞失败', icon: 'none' });
    });
  },

  onCommentInput: function (e) {
    this.setData({ commentValue: e.detail.value || '' });
  },

  onSubmitComment: function () {
    var self = this;
    var content = (this.data.commentValue || '').trim();
    if (!content || this.data.submittingComment || !this.data.post) return;
    if (!getCurrentUserId()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    this.setData({ submittingComment: true });
    postService.createComment({
      postId: this.data.post.id,
      content: content
    }).then(function () {
      self.setData({ commentValue: '', submittingComment: false });
      return self.loadAll();
    }).catch(function (error) {
      self.setData({ submittingComment: false });
      wx.showToast({ title: error.message || '评论失败', icon: 'none' });
    });
  }
});
