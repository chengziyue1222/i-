var store = require('../../store/index');

Page({
  data: { group: null, applied: false },

  onLoad: function(options) {
    var groups = store.getGroups();
    var group = null;
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].id === options.id) { group = groups[i]; break; }
    }
    if (!group) { wx.showToast({ title: '数据加载失败', icon: 'none' }); return; }
    wx.setNavigationBarTitle({ title: group.destination });
    this.setData({ group: group, applied: store.hasApplied(options.id) });
  },

  onApply: function() {
    var group = this.data.group;
    var applied = this.data.applied;
    if (applied) { wx.showToast({ title: '已申请过啦', icon: 'none' }); return; }
    if (group.status !== 'recruiting') { wx.showToast({ title: '队伍已满员', icon: 'none' }); return; }
    wx.navigateTo({ url: '/pages/buddy-apply/index?id=' + group.id });
  },

  onShow: function() {
    if (this.data.group) {
      this.setData({ applied: store.hasApplied(this.data.group.id) });
    }
  },

  onShare: function() {
    wx.showToast({ title: '分享功能即将上线', icon: 'none' });
  }
});
