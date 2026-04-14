const postService = require('../../services/post');

var TABS = [
  { id: '推荐', label: '推荐' },
  { id: '景点', label: '景点' },
  { id: '美食', label: '美食' },
  { id: '路线', label: '路线' }
];

function splitWaterfall(list) {
  var left = [];
  var right = [];
  var leftHeight = 0;
  var rightHeight = 0;

  (list || []).forEach(function (item, index) {
    var estimate = 380 + Math.min((item.title || '').length * 2, 70) + Math.min((item.desc || '').length, 50) + ((index % 3) * 18);
    if (leftHeight <= rightHeight) {
      left.push(item);
      leftHeight += estimate;
    } else {
      right.push(item);
      rightHeight += estimate;
    }
  });

  return { left: left, right: right };
}

Page({
  data: {
    tabs: TABS,
    activeTab: '推荐',
    keyword: '',
    posts: [],
    leftPosts: [],
    rightPosts: [],
    loading: true,
    refreshing: false
  },

  onLoad: function () {
    this._hasLoadedOnce = false;
    return this.loadPosts();
  },

  onShow: function () {
    if (!this._hasLoadedOnce) return;
    return this.loadPosts();
  },

  loadPosts: function () {
    var self = this;
    this.setData({ loading: true });
    return postService.getPostList({
      type: this.data.activeTab,
      keyword: this.data.keyword
    }).then(function (list) {
      var columns = splitWaterfall(list || []);
      self._hasLoadedOnce = true;
      self.setData({
        posts: list || [],
        leftPosts: columns.left,
        rightPosts: columns.right,
        loading: false,
        refreshing: false
      });
    }).catch(function (error) {
      self._hasLoadedOnce = true;
      self.setData({ loading: false, refreshing: false });
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    });
  },

  onSearchInput: function (e) {
    this.setData({ keyword: e.detail.value || '' });
  },

  onSearchConfirm: function () {
    this.loadPosts();
  },

  onSearchClear: function () {
    this.setData({ keyword: '' });
    this.loadPosts();
  },

  onTabTap: function (e) {
    var id = e.currentTarget.dataset.id;
    this.setData({ activeTab: id });
    this.loadPosts();
  },

  onPostTap: function (e) {
    var id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/community/detail/index?id=' + encodeURIComponent(id) });
  },

  onPublishTap: function () {
    wx.navigateTo({ url: '/pages/community/publish/index' });
  },

  onPullDownRefresh: function () {
    this.setData({ refreshing: true });
    this.loadPosts().finally(function () {
      wx.stopPullDownRefresh();
    });
  }
});
