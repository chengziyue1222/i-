var mock = require('./mock');
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

module.exports = { getGroups, saveGroup, filterGroups, getApplies, submitApply, hasApplied, getPosts, getStats };
