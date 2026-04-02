import os

content = r"""var mock = require('./mock');
var MOCK_GROUPS = mock.MOCK_GROUPS;
var MOCK_POSTS = mock.MOCK_POSTS;

var KEYS = { groups:'iTravelGroups', applies:'iTravelApplies', checkins:'checkedScenics', checkinCount:'checkinCount', travelDays:'travelDays' };

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
    hiking:  function(g){ return g.tags.some(function(t){ return ['\u5f92\u6b65','\u767b\u5c71','\u9732\u8425'].indexOf(t) > -1; }); },
    food:    function(g){ return g.tags.some(function(t){ return t.indexOf('\u7f8e\u98df') > -1; }); },
    photo:   function(g){ return g.tags.some(function(t){ return t.indexOf('\u62cd\u7167') > -1 || t.indexOf('\u6444\u5f71') > -1; }); },
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

// \u4f1a\u8bdd\u7ba1\u7406
var CONV_KEY = 'iTravelConversations';
var CONV_EMOJIS = ['\ud83e\uddd1', '\ud83d\udc69', '\ud83e\uddd4', '\ud83d\udc69\u200d\ud83e\uddb1', '\ud83e\uddd1\u200d\ud83e\uddb0', '\ud83e\uddd1\u200d\ud83e\uddb3', '\ud83d\udc68\u200d\ud83c\udf92', '\ud83d\udc69\u200d\ud83c\udf92'];

function _pickEmoji(name) {
  var sum = 0;
  for (var i = 0; i < (name || '').length; i++) sum += name.charCodeAt(i);
  return CONV_EMOJIS[sum % CONV_EMOJIS.length];
}

function getConversations() {
  return wx.getStorageSync(CONV_KEY) || [];
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
    groupName: opts.groupName || opts.partnerName || '\u4f1a\u8bdd',
    partnerName: opts.partnerName || '\u961f\u957f',
    emoji: _pickEmoji(opts.partnerName || ''),
    lastMsg: '\u70b9\u51fb\u5f00\u59cb\u804a\u5929',
    time: '\u521a\u521a',
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
      list[i].time = '\u521a\u521a';
      list[i].unread = 0;
      break;
    }
  }
  wx.setStorageSync(CONV_KEY, list);
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
  getConversations: getConversations,
  getOrCreateConversation: getOrCreateConversation,
  updateConvLastMsg: updateConvLastMsg
};
"""

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'store', 'index.js')
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('store/index.js written, length:', len(content))
