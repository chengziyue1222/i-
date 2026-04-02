var store = require('../../store/index');

var TABS = [
  { id: 'dm', label: '私信' },
  { id: 'notify', label: '通知' },
  { id: 'interact', label: '互动' }
];

var MOCK_SYSTEM_NOTIFY = [
  { id: 'sys1', icon: '🔔', title: '系统通知', desc: '欢迎使用 i旅图，探索你的旅行搭子！', time: '刚刚', unread: true },
  { id: 'sys2', icon: '📢', title: '活动提醒', desc: '你收藏的鼎湖山路线即将开放新名额', time: '1小时前', unread: false }
];

Page({
  data: {
    tabs: TABS,
    activeTab: 'dm',
    conversations: [],
    applications: [],
    systemNotify: MOCK_SYSTEM_NOTIFY,
    interactions: [],
    unreadSummary: { dm: 0, notify: 0, interact: 0, total: 0 }
  },

  onLoad: function () { this.reloadAll(); },
  onShow: function () { this.reloadAll(); },

  reloadAll: function () {
    this.setData({
      conversations: store.getConversations(),
      applications: store.getApplications(),
      interactions: store.getInteractions(),
      unreadSummary: store.getUnreadSummary()
    });
  },

  onTabTap: function (e) {
    var id = e.currentTarget.dataset.id;
    this.setData({ activeTab: id });
    if (id === 'notify') this.loadNotifyTab();
    if (id === 'interact') this.loadInteractTab();
  },

  loadNotifyTab: function () {
    this.setData({
      applications: store.getApplications(),
      unreadSummary: store.getUnreadSummary()
    });
  },

  loadInteractTab: function () {
    this.setData({
      interactions: store.getInteractions(),
      unreadSummary: store.getUnreadSummary()
    });
  },

  // ── 私信 ──
  onConvTap: function (e) {
    var conv = e.currentTarget.dataset.conv;
    store.markConversationRead(conv.groupId);
    this.reloadAll();
    wx.navigateTo({
      url: '/pages/chat/index?groupId=' + conv.groupId
        + '&groupName=' + encodeURIComponent(conv.groupName || '会话')
        + '&partnerName=' + encodeURIComponent(conv.partnerName || '对方')
    });
  },

  // ── 申请审核 ──
  onAccept: function (e) {
    var app = e.currentTarget.dataset.app;
    store.updateApplicationStatus(app.id, 'accepted');
    var conv = store.getOrCreateConversation({
      groupId: app.groupId,
      groupName: app.groupName,
      partnerName: app.fromUserName
    });
    this.reloadAll();
    wx.showToast({ title: '已同意', icon: 'success' });
    var self = this;
    setTimeout(function () {
      wx.navigateTo({
        url: '/pages/chat/index?groupId=' + conv.groupId
          + '&groupName=' + encodeURIComponent(conv.groupName)
          + '&partnerName=' + encodeURIComponent(conv.partnerName)
      });
    }, 800);
  },

  onReject: function (e) {
    var app = e.currentTarget.dataset.app;
    store.updateApplicationStatus(app.id, 'rejected');
    this.reloadAll();
    wx.showToast({ title: '已拒绝', icon: 'none' });
  },

  onApplicationTap: function (e) {
    var app = e.currentTarget.dataset.app || {};
    if (!app.id) return;
    store.markApplicationRead(app.id);
    this.reloadAll();
  },

  // ── 互动 ──
  onInteractTap: function (e) {
    var item = e.currentTarget.dataset.item || {};
    if (item.id) store.markInteractionRead(item.id);
    this.reloadAll();
    if ((item.type === 'like' || item.type === 'comment') && item.postId) {
      wx.navigateTo({ url: '/pages/post-comment/index?postId=' + item.postId });
    }
  }
});
