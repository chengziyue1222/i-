var store = require('../../store/index');

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

  loadComments: function () {
    var list = store.getComments(this.data.postId);
    this.setData({ comments: list });
  },

  onInput: function (e) {
    this.setData({ inputValue: e.detail.value });
  },

  onSend: function () {
    var text = (this.data.inputValue || '').trim();
    if (!text) { wx.showToast({ title: '请输入评论内容', icon: 'none' }); return; }
    if (this.data.submitting) return;
    this.setData({ submitting: true });

    var ui = wx.getStorageSync('userInfo') || {};
    var myName = ui.nickName || '我';

    store.addComment(this.data.postId, {
      userId: 'me',
      userName: myName,
      userEmoji: '🙋',
      content: text
    });

    // 触发互动通知（给帖主）
    if (this.data.postAuthor && this.data.postAuthor !== myName) {
      store.addInteraction({
        type: 'comment',
        userEmoji: '💬',
        userName: myName,
        desc: myName + ' 评论了你：「' + text + '」',
        postId: this.data.postId
      });
    }

    this.setData({ inputValue: '', submitting: false });
    this.loadComments();
    wx.showToast({ title: '评论成功', icon: 'success' });
  }
});
