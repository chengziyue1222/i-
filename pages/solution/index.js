var store = require('../../store/index');

var CHIPS = [
  {id:'all',label:'全部'},{id:'recruit',label:'招募中'},
  {id:'hiking',label:'徒步'},{id:'food',label:'美食'},
  {id:'photo',label:'拍照'}
];
var TABS = [{id:'buddy',label:'找搭子'},{id:'community',label:'社区'}];

var DEFAULT_SCENIC_IMAGE = '/images/scenic/qixingyan.jpg';
var SCENIC_IMAGE_MAP = {
  '七星岩风景区': '/images/scenic/qixingyan.jpg',
  '七星岩': '/images/scenic/qixingyan.jpg',
  '鼎湖山景区': '/images/scenic/dinghushan.jpg',
  '鼎湖山': '/images/scenic/dinghushan.jpg',
  '端州古城': '/images/scenic/duanzhou.jpg',
  '肇庆古城': '/images/scenic/duanzhou.jpg',
  '星湖风景区': '/images/scenic/xinghu.jpg',
  '星湖': '/images/scenic/xinghu.jpg',
  '龙母祖庙': '/images/scenic/longmu.jpg',
  '端州美食街': 'https://picsum.photos/seed/duanzhou-food/400/500',
  '西江苗寨': 'https://picsum.photos/seed/xijiang/400/500',
  '鸡笼顶': 'https://picsum.photos/seed/jilongding/400/500'
};

function scenicImageByDestination(destination) {
  var key = (destination || '').trim();
  return SCENIC_IMAGE_MAP[key] || DEFAULT_SCENIC_IMAGE;
}

function hasScenicMapping(destination) {
  var key = (destination || '').trim();
  return Object.prototype.hasOwnProperty.call(SCENIC_IMAGE_MAP, key);
}

function stableCoverHeight(group) {
  var text = String(group.id || group.destination || 'group');
  var sum = 0;
  for (var i = 0; i < text.length; i++) sum += text.charCodeAt(i);
  return 214 + (sum % 86);
}

function stableMatchPercent(group) {
  var text = String(group.id || group.destination || 'group');
  var sum = 0;
  for (var i = 0; i < text.length; i++) sum += text.charCodeAt(i);
  return 75 + (sum % 21); // 75 - 95
}

function parseStartTimestamp(startTime) {
  if (!startTime || startTime === '待定') return 0;
  var match = /^(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/.exec(startTime);
  if (!match) return 0;
  var now = new Date();
  var year = now.getFullYear();
  var month = parseInt(match[1], 10) - 1;
  var day = parseInt(match[2], 10);
  var hour = parseInt(match[3], 10);
  var minute = parseInt(match[4], 10);
  var target = new Date(year, month, day, hour, minute, 0, 0).getTime();
  if (target < now.getTime()) {
    target = new Date(year + 1, month, day, hour, minute, 0, 0).getTime();
  }
  return target;
}

function isLeavingSoon(startTime) {
  var ts = parseStartTimestamp(startTime);
  if (!ts) return false;
  var diff = ts - Date.now();
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
}

Page({
  data: {
    tabs: TABS, tab: 'buddy',
    chips: CHIPS, activeChip: 'all',
    keyword: '',
    groups: [], filtered: [], posts: [],
    leftGroups: [], rightGroups: [],
    showAiPanel: false,
    aiDest: '',
    refresherTriggered: false
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
      var mapped = scenicImageByDestination(group.destination);
      var shouldUseMapped = hasScenicMapping(group.destination);
      var current = Number(group.current || 0);
      var max = Number(group.max || 0);
      var remain = Math.max(max - current, 0);
      var startTime = group.startTime || '待定';
      return Object.assign({}, group, {
        imageUrl: shouldUseMapped ? mapped : (group.imageUrl || mapped),
        coverHeight: group.coverHeight || stableCoverHeight(group),
        matchPercent: group.matchPercent || stableMatchPercent(group),
        remainCount: remain,
        startTimeDisplay: startTime,
        isLeavingSoon: isLeavingSoon(startTime)
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
  },

  onPullDownRefresh: function() {
    this.reload();
    wx.stopPullDownRefresh();
  },

  onRefresherRefresh: function() {
    var self = this;
    this.setData({ refresherTriggered: true });
    this.reload();
    setTimeout(function() {
      self.setData({ refresherTriggered: false });
    }, 400);
  }
});
