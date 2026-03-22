var store = require('../../store/index');

var CHIPS = [
  {id:'all',label:'全部'},{id:'recruit',label:'招募中'},
  {id:'hiking',label:'🥾 徒步'},{id:'food',label:'🍜 美食'},
  {id:'photo',label:'📸 拍照'},{id:'citywalk',label:'🚶 citywalk'},
  {id:'couple',label:'💑 cpdd'}
];
var TABS = [{id:'buddy',label:'找搭子'},{id:'community',label:'社区'}];

Page({
  data: {
    tabs: TABS, tab: 'buddy',
    chips: CHIPS, activeChip: 'all',
    keyword: '',
    groups: [], filtered: [], posts: [],
    showAiPanel: false,
    aiDest: ''
  },

  onLoad: function() { this.reload(); },
  onShow: function() { this.reload(); },

  reload: function() {
    var groups = store.getGroups();
    var posts = store.getPosts();
    this.setData({ groups: groups, posts: posts });
    this.applyFilter();
  },

  applyFilter: function() {
    var data = this.data;
    var filtered = store.filterGroups(data.groups, { chip: data.activeChip, keyword: data.keyword });
    this.setData({ filtered: filtered });
  },

  onTabSwitch: function(e) { this.setData({ tab: e.detail.val }); },

  onSearchInput: function(e) {
    this.setData({ keyword: e.detail.value });
    this.applyFilter();
  },
  onSearchConfirm: function() { this.applyFilter(); },
  onSearchClear: function() { this.setData({ keyword: '' }); this.applyFilter(); },

  onChip: function(e) {
    this.setData({ activeChip: e.currentTarget.dataset.id });
    this.applyFilter();
  },

  onCardTap: function(e) {
    var group = e.detail.group;
    wx.navigateTo({ url: '/pages/buddy-detail/index?id=' + group.id });
  },

  onToggleAi: function() { this.setData({ showAiPanel: !this.data.showAiPanel }); },
  onAiDestInput: function(e) { this.setData({ aiDest: e.detail.value }); },
  onStartAiMatch: function() {
    if (!this.data.aiDest) { wx.showToast({ title: '请输入目的地', icon: 'none' }); return; }
    this.setData({ showAiPanel: false });
    wx.navigateTo({ url: '/pages/buddy-match/index?destination=' + encodeURIComponent(this.data.aiDest) });
  },

  onPublish: function() {
    var self = this;
    wx.showModal({
      title: '发起组队', editable: true, placeholderText: '目的地，如：七星岩',
      success: function(res) {
        if (!res.confirm || !res.content) return;
        var covers = [
          {color:'linear-gradient(135deg,#667eea,#764ba2)',emoji:'🏔️'},
          {color:'linear-gradient(135deg,#f093fb,#f5576c)',emoji:'🏯'},
          {color:'linear-gradient(135deg,#4facfe,#00f2fe)',emoji:'🌊'},
          {color:'linear-gradient(135deg,#43e97b,#38f9d7)',emoji:'🌿'}
        ];
        var cover = covers[Math.floor(Math.random() * covers.length)];
        var ui = wx.getStorageSync('userInfo') || {};
        var g = { id:'g_'+Date.now(), nickname: ui.nickName||'我', personality:'ENFP', destination: res.content, startTime:'待定', current:1, max:4, status:'recruiting', tags:[], intro:'欢迎加入！', matchReasons:[], cover: cover };
        var list = store.saveGroup(g);
        self.setData({ groups: list });
        self.applyFilter();
        wx.showToast({ title: '发布成功🎉', icon: 'success' });
      }
    });
  },

  onFindSameBuddy: function(e) {
    var dest = e.currentTarget.dataset.dest;
    this.setData({ tab: 'buddy', keyword: dest, activeChip: 'all' });
    this.applyFilter();
  }
});
