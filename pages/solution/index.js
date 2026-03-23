var store = require('../../store/index');

var CHIPS = [
  {id:'all',label:'全部'},{id:'recruit',label:'招募中'},
  {id:'hiking',label:'🥾 徒步'},{id:'food',label:'🍜 美食'},
  {id:'photo',label:'📸 拍照'},{id:'citywalk',label:'🚶 citywalk'},
  {id:'couple',label:'💑 cpdd'}
];
var TABS = [{id:'buddy',label:'找搭子'},{id:'community',label:'社区'}];

var DEFAULT_SCENIC_IMAGE = 'https://main.qcloudimg.com/raw/f859ae9d38d34a5ddaa89ae108109cd4.png';
var SCENIC_IMAGE_MAP = {
  '七星岩风景区': 'https://qcloudimg.tencent-cloud.cn/raw/962c82d62bf201702204a74b4a20035c.png',
  '七星岩': 'https://qcloudimg.tencent-cloud.cn/raw/962c82d62bf201702204a74b4a20035c.png',
  '鼎湖山景区': 'https://main.qcloudimg.com/raw/f859ae9d38d34a5ddaa89ae108109cd4.png',
  '鼎湖山': 'https://main.qcloudimg.com/raw/f859ae9d38d34a5ddaa89ae108109cd4.png',
  '端州古城': 'https://main.qcloudimg.com/raw/a329db7230d1a9c79a0b10e096b236e8.png',
  '肇庆古城': 'https://main.qcloudimg.com/raw/a329db7230d1a9c79a0b10e096b236e8.png',
  '星湖风景区': 'https://qcloudimg.tencent-cloud.cn/raw/3ea5139beeae6c4e2e98d30ad1ed7ade.png',
  '星湖': 'https://qcloudimg.tencent-cloud.cn/raw/3ea5139beeae6c4e2e98d30ad1ed7ade.png',
  '龙母祖庙': 'https://main.qcloudimg.com/raw/28644f5655e9f2b5e470676d77903bcb.png',
  '端州美食街': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80'
};

function scenicImageByDestination(destination) {
  var key = (destination || '').trim();
  return SCENIC_IMAGE_MAP[key] || DEFAULT_SCENIC_IMAGE;
}

function stableCoverHeight(group) {
  var text = String(group.id || group.destination || 'group');
  var sum = 0;
  for (var i = 0; i < text.length; i++) sum += text.charCodeAt(i);
  return 214 + (sum % 86);
}

Page({
  data: {
    tabs: TABS, tab: 'buddy',
    chips: CHIPS, activeChip: 'all',
    keyword: '',
    groups: [], filtered: [], posts: [],
    leftGroups: [], rightGroups: [],
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

  decorateGroups: function(list) {
    return (list || []).map(function(group) {
      return Object.assign({}, group, {
        imageUrl: group.imageUrl || scenicImageByDestination(group.destination),
        coverHeight: group.coverHeight || stableCoverHeight(group)
      });
    });
  },

  splitToWaterfall: function(list) {
    var left = [];
    var right = [];
    var leftH = 0;
    var rightH = 0;

    (list || []).forEach(function(group) {
      var tags = (group.tags || []).length;
      var introLen = (group.intro || '').length;
      var estimate = (group.coverHeight || 240) + 150 + tags * 14 + Math.min(introLen, 36);
      if (leftH <= rightH) {
        left.push(group);
        leftH += estimate;
      } else {
        right.push(group);
        rightH += estimate;
      }
    });

    return { left: left, right: right };
  },

  applyFilter: function() {
    var data = this.data;
    var filteredRaw = store.filterGroups(data.groups, { chip: data.activeChip, keyword: data.keyword });
    var filtered = this.decorateGroups(filteredRaw);
    var columns = this.splitToWaterfall(filtered);
    this.setData({
      filtered: filtered,
      leftGroups: columns.left,
      rightGroups: columns.right
    });
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

  onChatTap: function(e) {
    var group = e.detail.group || {};
    if (!group.id) return;
    var groupName = encodeURIComponent(group.destination || '搭子会话');
    var partnerName = encodeURIComponent(group.nickname || '队长');
    wx.navigateTo({
      url: '/pages/chat/index?groupId=' + group.id + '&groupName=' + groupName + '&partnerName=' + partnerName
    });
  },

  onJoinTap: function(e) {
    var group = e.detail.group || {};
    if (!group.id) return;
    wx.navigateTo({ url: '/pages/buddy-apply/index?id=' + group.id });
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
        var ui = wx.getStorageSync('userInfo') || {};
        var destination = res.content.trim();
        var g = {
          id:'g_'+Date.now(),
          nickname: ui.nickName || '我',
          personality:'ENFP',
          destination: destination,
          startTime:'待定',
          current:1,
          max:4,
          status:'recruiting',
          tags:['轻松游'],
          intro:'欢迎加入，一起出发。',
          matchReasons:[],
          imageUrl: scenicImageByDestination(destination),
          coverHeight: 240,
          cover:{ color:'linear-gradient(135deg,#4facfe,#00f2fe)', emoji:'🌄' }
        };
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
