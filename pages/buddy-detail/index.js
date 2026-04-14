const teamApi = require('../../services/team');

Page({
  data: { group: null, applied: false },

  async onLoad(options) {
    try {
      const result = await teamApi.getTeamList();
      const groups = result.groups || [];
      const group = groups.find((item) => String(item.id) === String(options.id));
      if (!group) {
        wx.showToast({ title: '数据加载失败', icon: 'none' });
        return;
      }
      wx.setNavigationBarTitle({ title: group.destination });
      this.setData({ group, applied: false });
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    }
  },

  onApply() {
    var group = this.data.group;
    var applied = this.data.applied;
    if (applied) { wx.showToast({ title: '已申请过啦', icon: 'none' }); return; }
    if (!group || group.status !== 'recruiting') { wx.showToast({ title: '队伍已满员', icon: 'none' }); return; }
    wx.navigateTo({ url: '/pages/buddy-apply/index?id=' + group.id });
  },

  onShare() {
    wx.showToast({ title: '分享功能即将上线', icon: 'none' });
  }
});
