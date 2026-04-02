var store = require('../../store/index');

Page({
  data: { group: null, message: '', submitted: false, charCount: 0 },

  onLoad: function(options) {
    var groups = store.getGroups();
    var group = null;
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].id === options.id) { group = groups[i]; break; }
    }
    if (!group) { wx.navigateBack(); return; }
    if (store.hasApplied(options.id)) {
      wx.showModal({
        title: '提示', content: '你已申请过这个组队', showCancel: false,
        success: function() { wx.navigateBack(); }
      });
      return;
    }
    this.setData({ group: group });
  },

  onInput: function(e) {
    this.setData({ message: e.detail.value, charCount: e.detail.value.length });
  },

  onSubmit: function() {
    var data = this.data;
    if (data.submitted) return;
    if (!data.message.trim()) { wx.showToast({ title: '请填写自我介绍', icon: 'none' }); return; }
    store.submitApply({ groupId: data.group.id, destination: data.group.destination, message: data.message });
    store.submitApplication({
      groupId: data.group.id,
      groupName: data.group.destination,
      destination: data.group.destination,
      fromUserId: 'me',
      fromUserName: (wx.getStorageSync('userInfo') || {}).nickName || '我',
      fromUserEmoji: '🙋',
      message: data.message
    });
    this.setData({ submitted: true });
    wx.showToast({ title: '申请已提交！', icon: 'success' });
    setTimeout(function() { wx.navigateBack(); }, 1500);
  }
});
