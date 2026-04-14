var mock = require('./mock');
var MOCK_GROUPS = mock.MOCK_GROUPS;
var MOCK_POSTS = mock.MOCK_POSTS;

var KEYS = { groups:'iTravelGroups', applies:'iTravelApplies', checkins:'checkedScenics', checkinCount:'checkinCount', travelDays:'travelDays' };
var METRICS_KEY = 'iTravelMetrics';

function getCurrentUserId() {
  var ui = wx.getStorageSync('userInfo') || {};
  return String(ui.userId || ui._id || ui.openid || 'me');
}

function getMetricsData() {
  var data = wx.getStorageSync(METRICS_KEY);
  if (!data || typeof data !== 'object') {
    data = { events: [], counters: {} };
  }
  if (!Array.isArray(data.events)) data.events = [];
  if (!data.counters || typeof data.counters !== 'object') data.counters = {};
  return data;
}

function saveMetricsData(data) {
  wx.setStorageSync(METRICS_KEY, data || { events: [], counters: {} });
}

function track(eventName, payload) {
  if (!eventName) return null;
  var data = getMetricsData();
  var event = {
    id: 'm_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    eventName: String(eventName),
    payload: payload || {},
    ts: Date.now()
  };
  data.events.unshift(event);
  data.events = data.events.slice(0, 300);
  var key = String(eventName);
  data.counters[key] = Number(data.counters[key] || 0) + 1;
  saveMetricsData(data);
  return event;
}

function getMetricsSummary() {
  var data = getMetricsData();
  var counters = data.counters || {};
  return {
    totalEvents: data.events.length,
    counters: counters,
    generateCount: Number(counters.generate_route_success || 0),
    applyCount: Number(counters.post_apply_submit || 0),
    chatCount: Number(counters.post_chat_tap || 0),
    commentCount: Number(counters.post_comment_tap || 0),
    publishOpenCount: Number(counters.publish_open || 0),
    publishSubmitCount: Number(counters.publish_submit_success || 0),
    latestEvents: (data.events || []).slice(0, 20)
  };
}

function getGroups() {
  return wx.getStorageSync(KEYS.groups) || MOCK_GROUPS;
}
function saveGroup(group) {
  var list = getGroups();
  list.unshift(group);
  wx.setStorageSync(KEYS.groups, list);
  return list;
}
function filterGroups(groups, opts) {
  var chip = (opts && opts.chip) || 'all';
  var keyword = (opts && opts.keyword) || '';
  var list = groups.slice();
  if (keyword) {
    list = list.filter(function(g) {
      return g.destination.indexOf(keyword) > -1 || g.nickname.indexOf(keyword) > -1 || g.tags.some(function(t){ return t.indexOf(keyword) > -1; });
    });
  }
  var chipMap = {
    recruit: function(g){ return g.status === 'recruiting'; },
    hiking:  function(g){ return g.tags.some(function(t){ return ['徒步','登山','露营'].indexOf(t) > -1; }); },
    food:    function(g){ return g.tags.some(function(t){ return t.indexOf('美食') > -1; }); },
    photo:   function(g){ return g.tags.some(function(t){ return t.indexOf('拍照') > -1 || t.indexOf('摄影') > -1; }); },
    citywalk:function(g){ return g.tags.some(function(t){ return t.toLowerCase().indexOf('citywalk') > -1; }); },
    couple:  function(g){ return g.tags.some(function(t){ return t.indexOf('cpdd') > -1; }); }
  };
  if (chip !== 'all' && chipMap[chip]) list = list.filter(chipMap[chip]);
  return list;
}
function getApplies() {
  return wx.getStorageSync(KEYS.applies) || [];
}
function submitApply(opts) {
  var record = { groupId: opts.groupId, destination: opts.destination, message: opts.message, status: 'pending', createTime: Date.now() };
  var list = getApplies();
  list.unshift(record);
  wx.setStorageSync(KEYS.applies, list.slice(0, 50));
  return record;
}
function hasApplied(groupId) {
  return getApplies().some(function(a){ return a.groupId === groupId; });
}
function getPosts() { return MOCK_POSTS; }
function getStats() {
  return { checkinCount: wx.getStorageSync(KEYS.checkinCount) || 0, travelDays: wx.getStorageSync(KEYS.travelDays) || 0 };
}

// 会话管理
var CONV_KEY = 'iTravelConversations';
var CONV_EMOJIS = ['🧑', '👩', '🧔', '👩‍🦱', '🧑‍🦰', '🧑‍🦳', '👨‍🎒', '👩‍🎒'];

function _pickEmoji(name) {
  var sum = 0;
  for (var i = 0; i < (name || '').length; i++) sum += name.charCodeAt(i);
  return CONV_EMOJIS[sum % CONV_EMOJIS.length];
}

function getConversations() {
  return wx.getStorageSync(CONV_KEY) || [];
}

function markConversationRead(groupId) {
  var gid = String(groupId || '');
  var list = getConversations();
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].groupId || '') === gid) {
      list[i].unread = 0;
      break;
    }
  }
  wx.setStorageSync(CONV_KEY, list);
}

function getOrCreateConversation(opts) {
  var list = getConversations();
  for (var i = 0; i < list.length; i++) {
    if (list[i].groupId === opts.groupId) {
      var found = list.splice(i, 1)[0];
      list.unshift(found);
      wx.setStorageSync(CONV_KEY, list);
      return found;
    }
  }
  var conv = {
    groupId: opts.groupId,
    groupName: opts.groupName || opts.partnerName || '会话',
    partnerName: opts.partnerName || '队长',
    emoji: _pickEmoji(opts.partnerName || ''),
    lastMsg: '点击开始聊天',
    time: '刚刚',
    unread: 1
  };
  list.unshift(conv);
  wx.setStorageSync(CONV_KEY, list.slice(0, 100));
  return conv;
}

function updateConvLastMsg(groupId, text) {
  var list = getConversations();
  for (var i = 0; i < list.length; i++) {
    if (list[i].groupId === groupId) {
      list[i].lastMsg = text;
      list[i].time = '刚刚';
      list[i].unread = 0;
      break;
    }
  }
  wx.setStorageSync(CONV_KEY, list);
}

// ── 入队申请审核 ─────────────────────────────────────────────────
var APP_KEY = 'iTravelApplications';
var MOCK_APPLICATIONS = [
  { id: 'app_001', groupId: 'g001', groupName: '七星岩徒步', groupDest: '七星岩',
    fromUserId: 'u_demo1', fromUserName: '摄影爱好者', fromUserEmoji: '📷',
    message: '我很喜欢摄影，希望能一起去打卡日出！', status: 'pending',
    unread: true, applicantUnread: false, createTime: Date.now() - 5 * 60 * 1000 },
  { id: 'app_002', groupId: 'g002', groupName: '鼎湖山登山', groupDest: '鼎湖山',
    fromUserId: 'u_demo2', fromUserName: '穷游达人', fromUserEmoji: '🎒',
    message: '有徒步经验，轻装上阵，求带！', status: 'pending',
    unread: true, applicantUnread: false, createTime: Date.now() - 30 * 60 * 1000 }
];

function normalizeApplication(item) {
  var currentUserId = getCurrentUserId();
  var next = Object.assign({}, item);
  if (typeof next.unread === 'undefined') next.unread = next.status === 'pending';
  if (typeof next.applicantUnread === 'undefined') next.applicantUnread = false;
  next.isMine = String(next.fromUserId || '') === currentUserId;
  next.statusText = next.status === 'accepted'
    ? '已通过'
    : (next.status === 'rejected' ? '已拒绝' : '待审核');
  return next;
}

function getApplications() {
  var stored = wx.getStorageSync(APP_KEY);
  if (!stored || stored.length === 0) {
    wx.setStorageSync(APP_KEY, MOCK_APPLICATIONS);
    stored = MOCK_APPLICATIONS.slice();
  }
  return stored.map(normalizeApplication);
}

function saveApplications(list) {
  wx.setStorageSync(APP_KEY, (list || []).slice(0, 200));
}

function getMyApplications() {
  var currentUserId = getCurrentUserId();
  return getApplications().filter(function(item) {
    return String(item.fromUserId || '') === currentUserId;
  });
}

function hasAppliedApplication(groupId, userId) {
  var gid = String(groupId || '');
  var uid = String(userId || getCurrentUserId());
  if (!gid) return false;
  var list = getApplications();
  return list.some(function(item) {
    return String(item.groupId || '') === gid && String(item.fromUserId || '') === uid;
  });
}

function submitApplication(opts) {
  var ui = wx.getStorageSync('userInfo') || {};
  var fromUserId = String(opts.fromUserId || ui.userId || ui._id || ui.openid || 'me');
  if (hasAppliedApplication(opts.groupId, fromUserId)) {
    return { duplicated: true };
  }
  var record = {
    id: 'app_' + Date.now(),
    groupId: opts.groupId,
    groupName: opts.groupName || opts.destination || '搭子行程',
    groupDest: opts.destination || '',
    fromUserId: fromUserId,
    fromUserName: opts.fromUserName || ui.nickName || '我',
    fromUserEmoji: opts.fromUserEmoji || '🙋',
    targetUserId: String(opts.targetUserId || ''),
    targetUserName: opts.targetUserName || '队长',
    targetUserEmoji: opts.targetUserEmoji || '🧭',
    message: opts.message || '',
    status: 'pending',
    unread: true,
    applicantUnread: false,
    createTime: Date.now()
  };
  var list = getApplications().map(function(item) { return Object.assign({}, item); });
  list.unshift(record);
  saveApplications(list);
  return normalizeApplication(record);
}

function updateApplicationStatus(id, status) {
  var list = getApplications().map(function(item) { return Object.assign({}, item); });
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      list[i].status = status;
      list[i].unread = false;
      list[i].applicantUnread = true;
      break;
    }
  }
  saveApplications(list);
}

function markApplicationRead(id, role) {
  var list = getApplications().map(function(item) { return Object.assign({}, item); });
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].id) === String(id)) {
      if (role === 'applicant') list[i].applicantUnread = false;
      else list[i].unread = false;
      break;
    }
  }
  saveApplications(list);
}

// ── 评论系统 ──────────────────────────────────────────────────────
var CMT_KEY = 'iTravelComments';
var MOCK_COMMENTS = [
  { id: 'c001', postId: 'p001', userId: 'u_c1', userName: '旅行小王', userEmoji: '🌟',
    content: '路线安排得太棒了，收藏了！', time: '10分钟前', ts: Date.now() - 600000 },
  { id: 'c002', postId: 'p001', userId: 'u_c2', userName: '徒步er', userEmoji: '🥾',
    content: '求具体路线图分享！', time: '30分钟前', ts: Date.now() - 1800000 },
  { id: 'c003', postId: 'p002', userId: 'u_c3', userName: '摄影爱好者', userEmoji: '📷',
    content: '凌晨去确实人少，拍出来效果绝了', time: '1小时前', ts: Date.now() - 3600000 }
];

function getComments(postId) {
  var all = wx.getStorageSync(CMT_KEY) || null;
  if (!all) {
    all = {};
    MOCK_COMMENTS.forEach(function(c) {
      if (!all[c.postId]) all[c.postId] = [];
      all[c.postId].push(c);
    });
    wx.setStorageSync(CMT_KEY, all);
  }
  return (all[postId] || []).slice();
}

function addComment(postId, opts) {
  var all = wx.getStorageSync(CMT_KEY) || {};
  if (!all[postId]) all[postId] = [];
  var now = new Date();
  var c = {
    id: 'c_' + Date.now(),
    postId: postId,
    userId: opts.userId || 'me',
    userName: opts.userName || '我',
    userEmoji: opts.userEmoji || '🙋',
    content: opts.content,
    time: now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0'),
    ts: Date.now()
  };
  all[postId].unshift(c);
  wx.setStorageSync(CMT_KEY, all);
  return c;
}

// ── 互动通知 ──────────────────────────────────────────────────────
var INTERACT_KEY = 'iTravelInteractions';
var MOCK_INTERACTIONS = [
  { id: 'int_1', type: 'like', userEmoji: '👍', userName: '特种兵小王',
    desc: '赞了你的帖子《一次玩够肇庆五大景点》', postId: 'p001', time: '5分钟前', unread: true },
  { id: 'int_2', type: 'comment', userEmoji: '💬', userName: '摄影爱好者',
    desc: '评论了你：「拍得真棒！下次带我一起」', postId: 'p002', time: '30分钟前', unread: true },
  { id: 'int_3', type: 'follow', userEmoji: '👥', userName: '旅行的意义',
    desc: '关注了你', postId: '', time: '昨天', unread: false }
];

function getInteractions() {
  var stored = wx.getStorageSync(INTERACT_KEY);
  if (!stored || stored.length === 0) {
    wx.setStorageSync(INTERACT_KEY, MOCK_INTERACTIONS);
    return MOCK_INTERACTIONS.slice();
  }
  return stored;
}

function markInteractionRead(id) {
  var list = getInteractions();
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].id) === String(id)) {
      list[i].unread = false;
      break;
    }
  }
  wx.setStorageSync(INTERACT_KEY, list);
}

function getUnreadSummary() {
  var convUnread = 0;
  var conv = getConversations();
  for (var i = 0; i < conv.length; i++) convUnread += Number(conv[i].unread || 0);

  var appUnread = 0;
  var apps = getApplications();
  for (var j = 0; j < apps.length; j++) {
    if (apps[j].unread) appUnread += 1;
    if (apps[j].applicantUnread) appUnread += 1;
  }

  var interactUnread = 0;
  var interacts = getInteractions();
  for (var k = 0; k < interacts.length; k++) if (interacts[k].unread) interactUnread += 1;

  return {
    dm: convUnread,
    notify: appUnread,
    interact: interactUnread,
    total: convUnread + appUnread + interactUnread
  };
}

function addInteraction(opts) {
  var list = getInteractions();
  var item = {
    id: 'int_' + Date.now(),
    type: opts.type || 'comment',
    userEmoji: opts.userEmoji || '💬',
    userName: opts.userName || '有人',
    desc: opts.desc || '',
    postId: opts.postId || '',
    time: '刚刚',
    unread: true
  };
  list.unshift(item);
  wx.setStorageSync(INTERACT_KEY, list.slice(0, 100));
  return item;
}

module.exports = {
  getGroups: getGroups,
  saveGroup: saveGroup,
  filterGroups: filterGroups,
  getApplies: getApplies,
  submitApply: submitApply,
  hasApplied: hasApplied,
  getPosts: getPosts,
  getStats: getStats,
  track: track,
  getMetricsSummary: getMetricsSummary,
  getConversations: getConversations,
  markConversationRead: markConversationRead,
  getOrCreateConversation: getOrCreateConversation,
  updateConvLastMsg: updateConvLastMsg,
  getApplications: getApplications,
  getMyApplications: getMyApplications,
  submitApplication: submitApplication,
  hasAppliedApplication: hasAppliedApplication,
  updateApplicationStatus: updateApplicationStatus,
  markApplicationRead: markApplicationRead,
  getComments: getComments,
  addComment: addComment,
  getInteractions: getInteractions,
  markInteractionRead: markInteractionRead,
  getUnreadSummary: getUnreadSummary,
  addInteraction: addInteraction,
  getCurrentUserId: getCurrentUserId
};
