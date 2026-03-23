const CHATS_KEY = 'buddy_chat_messages';

function readAllChats() {
  return wx.getStorageSync(CHATS_KEY) || {};
}

function saveAllChats(allChats) {
  wx.setStorageSync(CHATS_KEY, allChats || {});
}

Page({
  data: {
    groupId: '',
    groupName: '',
    partnerName: '',
    currentOpenId: '',
    messages: [],
    inputValue: ''
  },

  onLoad(options) {
    const groupId = options.groupId || '';
    const groupName = decodeURIComponent(options.groupName || '搭子会话');
    const partnerName = decodeURIComponent(options.partnerName || '队长');
    const app = getApp();
    const currentOpenId = (app && app.globalData && app.globalData.openid) || wx.getStorageSync('mockOpenId') || 'mock_user';

    this.setData({ groupId, groupName, partnerName, currentOpenId });
    wx.setNavigationBarTitle({ title: partnerName + ' · 聊一聊' });
    this.ensureSeedMessages();
    this.loadMessages();
  },

  ensureSeedMessages() {
    const { groupId, partnerName } = this.data;
    if (!groupId) return;

    const all = readAllChats();
    const list = all[groupId] || [];
    if (list.length > 0) return;

    all[groupId] = [
      {
        id: 'm_' + Date.now(),
        sender: 'other',
        senderName: partnerName,
        text: '你好呀，欢迎来聊行程安排～',
        time: '刚刚'
      }
    ];
    saveAllChats(all);
  },

  loadMessages() {
    const { groupId } = this.data;
    if (!groupId) return;
    const all = readAllChats();
    const messages = all[groupId] || [];
    this.setData({ messages });
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  onSend() {
    const text = (this.data.inputValue || '').trim();
    if (!text) return;

    const { groupId, currentOpenId } = this.data;
    const all = readAllChats();
    const list = all[groupId] || [];

    list.push({
      id: 'm_' + Date.now(),
      sender: 'me',
      senderId: currentOpenId,
      text,
      time: this.formatNow()
    });

    all[groupId] = list;
    saveAllChats(all);

    this.setData({ inputValue: '' });
    this.loadMessages();

    setTimeout(() => {
      this.mockReply();
    }, 700);
  },

  mockReply() {
    const { groupId, partnerName } = this.data;
    const replies = ['收到，我们定在地铁口集合可以吗？', '没问题，我这边时间合适！', '你喜欢拍照还是徒步为主？'];
    const text = replies[Math.floor(Math.random() * replies.length)];

    const all = readAllChats();
    const list = all[groupId] || [];
    list.push({
      id: 'm_' + Date.now() + '_r',
      sender: 'other',
      senderName: partnerName,
      text,
      time: this.formatNow()
    });
    all[groupId] = list;
    saveAllChats(all);
    this.loadMessages();
  },

  formatNow() {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }
});
