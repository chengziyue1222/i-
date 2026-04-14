const { createAiPlan } = require('../../services/ai');

Page({
  data: {
    destination: '',
    time: '',
    types: [],
    personality: '',
    matchScore: 0,
    reasons: [],
    matchedGroups: []
  },

  onLoad(options) {
    const { destination = '', time = '', types = '', personality = '' } = options;
    const typeList = types ? types.split(',') : [];
    this.setData({ destination, time, types: typeList, personality });
    this.runMatch(destination, typeList);
  },

  async runMatch(destination, types) {
    wx.showLoading({ title: '匹配中...' });
    try {
      const result = await createAiPlan({ destination, time: this.data.time, types });
      this.setData({
        matchedGroups: result.matchedGroups || [],
        matchScore: result.matchScore || 0,
        reasons: result.reasons || []
      });
    } catch (error) {
      wx.showToast({ title: error.message || '匹配失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onJoinGroup(e) {
    const group = e.currentTarget.dataset.group;
    if (!group || !group.groupId) return;
    wx.navigateTo({ url: '/pages/buddy-apply/index?id=' + group.groupId });
  },

  onBack() {
    wx.navigateBack();
  },

  onCreateOwn() {
    wx.navigateBack();
    setTimeout(function () {
      wx.showToast({ title: '点击右下角 + 发起组队', icon: 'none', duration: 3000 });
    }, 500);
  }
});
