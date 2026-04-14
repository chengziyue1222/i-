const chatService = require('../../services/chat/index');
const { buildGroupedMessages } = require('../../utils/chat');

Page({
  data: {
    chatId: '',
    targetUserId: '',
    targetName: '',
    targetEmoji: '💬',
    inputValue: '',
    messageGroups: [],
    rawMessages: [],
    scrollAnchor: 'bottom-anchor'
  },

  async onLoad(options) {
    this.currentUserId = String((wx.getStorageSync('userInfo') || {}).userId || (wx.getStorageSync('userInfo') || {}).openid || 'guest');
    this.setData({
      chatId: decodeURIComponent(options.chatId || ''),
      targetUserId: decodeURIComponent(options.targetUserId || ''),
      targetName: decodeURIComponent(options.targetName || '聊天对象'),
      targetEmoji: decodeURIComponent(options.targetEmoji || '💬')
    });

    wx.setNavigationBarTitle({ title: this.data.targetName });
    if (this.data.chatId) {
      await chatService.markChatRead(this.data.chatId, this.currentUserId);
    }
    await this.loadMessages();
  },

  onShow() {
    if (this.data.chatId) chatService.markChatRead(this.data.chatId, this.currentUserId);
    this.startRealtime();
  },

  onHide() { this.stopRealtime(); },
  onUnload() { this.stopRealtime(); },

  async loadMessages() {
    if (!this.data.chatId) return;
    const list = await chatService.fetchMessageList(this.data.chatId);
    const messageGroups = buildGroupedMessages(list, this.currentUserId);
    this.setData({ rawMessages: list, messageGroups });
    wx.nextTick(() => this.scrollToBottom());
  },

  startRealtime() {
    this.stopRealtime();
    this._pollTimer = setInterval(() => this.loadMessages(), 5000);
  },

  stopRealtime() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  },

  scrollToBottom() {
    this.setData({ scrollAnchor: 'bottom-anchor' });
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  async onSend() {
    const text = (this.data.inputValue || '').trim();
    if (!text) return;
    if (!this.data.targetUserId) {
      wx.showToast({ title: '聊天对象不存在', icon: 'none' });
      return;
    }

    await chatService.sendTextMessage({
      chatId: this.data.chatId,
      senderId: this.currentUserId,
      receiverId: this.data.targetUserId,
      content: text
    });

    this.setData({ inputValue: '' });
    await chatService.markChatRead(this.data.chatId, this.currentUserId);
    await this.loadMessages();
  },

  onQuickReply(e) {
    const text = e.currentTarget.dataset.text || '';
    this.setData({ inputValue: text });
    wx.nextTick(() => this.onSend());
  }
});
