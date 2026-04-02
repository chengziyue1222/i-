const CHATS_KEY = 'buddy_chat_messages';
const store = require('../../store/index');

var QUICK_REPLIES = ['好的👍', '在哪集合？', '几点出发？', '我也感兴趣！', '稍后回复你'];

var PARTNER_EMOJIS = ['🧑‍🦰', '👩', '🧔', '👩‍🦱', '🧑'];

function readAllChats() {
  return wx.getStorageSync(CHATS_KEY) || {};
}

function saveAllChats(allChats) {
  wx.setStorageSync(CHATS_KEY, allChats || {});
}

function pickPartnerEmoji(name) {
  var sum = 0;
  for (var i = 0; i < (name || '').length; i++) sum += name.charCodeAt(i);
  return PARTNER_EMOJIS[sum % PARTNER_EMOJIS.length];
}

Page({
  data: {
    groupId: '',
    groupName: '',
    partnerName: '',
    partnerEmoji: '🧭',
    currentOpenId: '',
    messages: [],
    inputValue: '',
    isTyping: false,
    quickReplies: QUICK_REPLIES
  },

  onLoad: function(options) {
    var groupId = options.groupId || '';
    var groupName = decodeURIComponent(options.groupName || '搭子会话');
    var partnerName = decodeURIComponent(options.partnerName || '队长');
    var partnerEmoji = pickPartnerEmoji(partnerName);
    var app = getApp();
    var currentOpenId = (app && app.globalData && app.globalData.openid)
      || wx.getStorageSync('mockOpenId') || 'mock_user';

    this.setData({ groupId: groupId, groupName: groupName, partnerName: partnerName, partnerEmoji: partnerEmoji, currentOpenId: currentOpenId });
    wx.setNavigationBarTitle({ title: partnerName + ' · 聊一聊' });
    this.ensureSeedMessages();
    this.loadMessages();
  },

  onBack: function() {
    wx.navigateBack();
  },

  ensureSeedMessages: function() {
    var groupId = this.data.groupId;
    var partnerName = this.data.partnerName;
    if (!groupId) return;

    var all = readAllChats();
    var list = all[groupId] || [];
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

  loadMessages: function() {
    var groupId = this.data.groupId;
    if (!groupId) return;
    var all = readAllChats();
    var messages = all[groupId] || [];
    this.setData({ messages: messages });
  },

  onInput: function(e) {
    this.setData({ inputValue: e.detail.value });
  },

  onQuickReply: function(e) {
    var text = e.currentTarget.dataset.text || '';
    this.setData({ inputValue: text });
    // 直接发送快捷回复
    this._doSend(text);
  },

  onSend: function() {
    var text = (this.data.inputValue || '').trim();
    if (!text) return;
    this._doSend(text);
  },

  _doSend: function(text) {
    var groupId = this.data.groupId;
    var currentOpenId = this.data.currentOpenId;
    var all = readAllChats();
    var list = all[groupId] || [];

    list.push({
      id: 'm_' + Date.now(),
      sender: 'me',
      senderId: currentOpenId,
      text: text,
      time: this.formatNow()
    });

    all[groupId] = list;
    saveAllChats(all);

    // 同步更新会话列表 lastMsg
    var store = require('../../store/index');
    store.updateConvLastMsg(groupId, text);

    this.setData({ inputValue: '' });
    this.loadMessages();

    // 显示「正在输入」动画
    var self = this;
    this.setData({ isTyping: true });
    setTimeout(function() {
      self.mockReply();
    }, 1200);
  },

  mockReply: function() {
    var groupId = this.data.groupId;
    var partnerName = this.data.partnerName;
    var replies = [
      '收到，我们定在地铁口集合可以吗？',
      '没问题，我这边时间合适！',
      '你喜欢拍照还是徒步为主？',
      '期待和你一起出发🎒',
      '好的，我看一下行程再回复你～'
    ];
    var text = replies[Math.floor(Math.random() * replies.length)];

    var all = readAllChats();
    var list = all[groupId] || [];
    list.push({
      id: 'm_' + Date.now() + '_r',
      sender: 'other',
      senderName: partnerName,
      text: text,
      time: this.formatNow()
    });
    all[groupId] = list;
    saveAllChats(all);

    this.setData({ isTyping: false });
    this.loadMessages();
  },

  formatNow: function() {
    var d = new Date();
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }
});
