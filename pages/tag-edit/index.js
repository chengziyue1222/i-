const { updateUserProfile } = require('../../services/user');

Page({
  data: {
    tags: [],
    editTagInput: '',
    saving: false,
    presetTags: ['穷游', '特种兵旅游', 'cpdd', '山水', '人文', '美食', '徒步', '登山', '拍照', '自驾', '亲子', '露营', '古镇', '周末游', '说走就走']
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const tags = Array.isArray(userInfo.tags) ? userInfo.tags : [];
    this.setData({ tags });
  },

  onTagInput(e) {
    this.setData({ editTagInput: e.detail.value });
  },

  onAddTag() {
    const tag = (this.data.editTagInput || '').trim();
    if (!tag) {
      wx.showToast({ title: '请输入标签', icon: 'none' });
      return;
    }
    const tags = [...this.data.tags];
    if (tags.includes(tag)) {
      wx.showToast({ title: '标签已存在', icon: 'none' });
      return;
    }
    if (tags.length >= 8) {
      wx.showToast({ title: '最多添加8个标签', icon: 'none' });
      return;
    }
    tags.push(tag);
    this.saveAndSet(tags);
    this.setData({ editTagInput: '' });
  },

  onSelectPreset(e) {
    const tag = e.currentTarget.dataset.tag;
    if (!tag) return;
    const tags = [...this.data.tags];
    if (tags.includes(tag) || tags.length >= 8) {
      wx.showToast({ title: tags.includes(tag) ? '标签已存在' : '最多添加8个标签', icon: 'none' });
      return;
    }
    tags.push(tag);
    this.saveAndSet(tags);
  },

  onRemoveTag(e) {
    const idx = e.currentTarget.dataset.index;
    const tags = [...this.data.tags];
    tags.splice(idx, 1);
    this.saveAndSet(tags);
  },

  saveAndSet(tags) {
    this.setData({ tags });
  },

  async onConfirm() {
    if (this.data.saving) return;

    const userInfo = wx.getStorageSync('userInfo') || {};
    if (!userInfo.openid && !userInfo._openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    try {
      this.setData({ saving: true });
      const res = await updateUserProfile({ tags: this.data.tags });
      const nextUserInfo = {
        ...userInfo,
        ...(res && res.userInfo ? res.userInfo : {}),
        tags: this.data.tags
      };
      wx.setStorageSync('userInfo', nextUserInfo);
      wx.showToast({ title: '标签已同步', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 300);
    } catch (error) {
      wx.showToast({ title: error.message || '标签同步失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
