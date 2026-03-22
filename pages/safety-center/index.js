Page({
  data: {
    contactName: '',
    contactPhone: ''
  },

  onLoad() {
    const saved = wx.getStorageSync('emergencyContact') || {};
    this.setData({
      contactName: saved.name || '',
      contactPhone: saved.phone || ''
    });
  },

  onNameInput(e) {
    this.setData({ contactName: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ contactPhone: e.detail.value });
  },

  onSaveContact() {
    const { contactName, contactPhone } = this.data;
    const name = (contactName || '').trim();
    const phone = (contactPhone || '').trim();
    if (!name || !phone) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    wx.setStorageSync('emergencyContact', { name, phone });
    wx.showToast({ title: '保存成功', icon: 'success' });
  },

  onShareLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        wx.openLocation({
          latitude: res.latitude,
          longitude: res.longitude,
          scale: 18
        });
      },
      fail: () => {
        wx.showToast({ title: '获取位置失败，请检查权限', icon: 'none' });
      }
    });
  }
});
