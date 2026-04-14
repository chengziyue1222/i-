const teamApi = require('../../services/team');

Page({
  data: { group: null, message: '', submitted: false, charCount: 0 },

  async onLoad(options) {
    try {
      const result = await teamApi.getTeamList();
      const groups = result.groups || [];
      const group = groups.find((item) => String(item.id) === String(options.id));
      if (!group) {
        wx.navigateBack();
        return;
      }
      this.setData({ group });
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
      wx.navigateBack();
    }
  },

  onInput(e) {
    this.setData({ message: e.detail.value, charCount: e.detail.value.length });
  },

  async onSubmit() {
    var data = this.data;
    if (data.submitted) return;
    if (!data.message.trim()) { wx.showToast({ title: '请填写自我介绍', icon: 'none' }); return; }

    var ui = wx.getStorageSync('userInfo') || {};
    var profile = {
      userId: String(ui.userId || ui._id || ui.openid || 'guest'),
      nickName: ui.nickName || '旅行爱好者',
      emoji: ui.emoji || '🙋'
    };

    try {
      await teamApi.applyTeam({
        groupId: data.group.id,
        fromUserId: profile.userId,
        fromUserName: profile.nickName,
        fromUserEmoji: profile.emoji,
        message: data.message
      });
      this.setData({ submitted: true });
      wx.showToast({ title: '申请已提交！', icon: 'success' });
      setTimeout(function() { wx.navigateBack(); }, 1200);
    } catch (error) {
      wx.showToast({ title: error.message || '提交失败', icon: 'none' });
    }
  }
});
