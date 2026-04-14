const chatService = require('../../services/chat/index');
const teamApi = require('../../services/team');
const { formatConversationTime } = require('../../utils/chat');

function getCurrentUserId() {
  const ui = wx.getStorageSync('userInfo') || {};
  return String(ui.userId || ui._id || ui.openid || 'guest');
}

const TABS = [
  { id: 'dm', label: '私信' },
  { id: 'notify', label: '通知' },
  { id: 'interact', label: '互动' }
];

const MOCK_SYSTEM_NOTIFY = [
  { id: 'sys1', icon: '🔔', title: '系统通知', desc: '欢迎使用 i旅图，探索你的旅行搭子！', time: '刚刚', unread: true },
  { id: 'sys2', icon: '📢', title: '活动提醒', desc: '你收藏的鼎湖山路线即将开放新名额', time: '1小时前', unread: false }
];

function formatRelativeTime(ts) {
  if (!ts) return '刚刚';
  const diff = Date.now() - Number(ts);
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + '分钟前';
  if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + '小时前';
  return formatConversationTime(ts);
}

function decorateNotification(item) {
  const subType = item.subType || '';
  const icon = subType === 'approved' ? '✅' : (subType === 'rejected' ? '🕊️' : '🔔');
  const accentClass = subType === 'approved' ? 'notify-card-success' : (subType === 'rejected' ? 'notify-card-muted' : '');
  return Object.assign({}, item, {
    icon,
    accentClass,
    timeText: formatRelativeTime(item.createdAt),
    summaryText: item.title || '系统提醒',
    detailText: item.content || ''
  });
}

function decorateApplication(item, role) {
  const next = Object.assign({}, item, { createTimeStr: formatRelativeTime(item.createTime) });
  if (role === 'mine') {
    if (item.status === 'accepted') {
      next.statusBadge = '已通过';
      next.statusHint = '队长已同意你的申请，点击可直接进入聊天';
    } else if (item.status === 'rejected') {
      next.statusBadge = '未通过';
      next.statusHint = '本次申请未通过，建议更换时间或标签后再次尝试';
    } else {
      next.statusBadge = '审核中';
      next.statusHint = '队长还在查看你的申请，请耐心等待';
    }
  } else if (item.status === 'accepted') {
    next.statusBadge = '已同意';
    next.statusHint = '已为 Ta 建立聊天入口，可继续沟通行程';
  } else if (item.status === 'rejected') {
    next.statusBadge = '已拒绝';
    next.statusHint = '系统已通知申请人审核结果';
  } else {
    next.statusBadge = '待处理';
    next.statusHint = '可查看申请说明后决定是否通过';
  }
  return next;
}

Page({
  data: {
    tabs: TABS,
    activeTab: 'dm',
    chatList: [],
    notifications: [],
    applications: [],
    myApplications: [],
    systemNotify: MOCK_SYSTEM_NOTIFY,
    interactions: [],
    unreadSummary: { dm: 0, notify: 0, interact: 0, total: 0 }
  },

  onLoad() {
    this.currentUserId = getCurrentUserId();
    this._hasLoadedOnce = false;
    this.reloadAll().finally(() => {
      this._hasLoadedOnce = true;
    });
  },

  onShow() {
    this.currentUserId = getCurrentUserId();
    if (this._hasLoadedOnce) {
      this.reloadAll();
    }
    this.startPolling();
  },

  onHide() { this.stopPolling(); },
  onUnload() { this.stopPolling(); },

  async reloadAll(options) {
    const silent = !!(options && options.silent);
    try {
      const chatList = await chatService.fetchChatList(this.currentUserId);
      const notifications = (await chatService.fetchNotifications(this.currentUserId)).map(decorateNotification);
      const appResult = await teamApi.getApplications(this.currentUserId);
      const applications = (appResult.applications || []).map((item) => decorateApplication(item, 'reviewer'));
      const myApplications = (appResult.myApplications || []).map((item) => decorateApplication(item, 'mine'));
      const interactions = await teamApi.getInteractions();

      const formatted = (chatList || []).map((item) => Object.assign({}, item, {
        timeText: formatConversationTime(item.updatedAt),
        previewText: item.lastMessage
          ? (item.lastMessage.type === 'system' ? '[系统] ' + item.lastMessage.content : item.lastMessage.content)
          : '暂无消息'
      }));

      const notifyUnread =
        applications.filter((item) => item.unread).length +
        myApplications.filter((item) => item.applicantUnread).length +
        notifications.filter((item) => item.unread).length;

      this.setData({
        chatList: formatted,
        notifications,
        applications,
        myApplications,
        interactions,
        unreadSummary: {
          dm: formatted.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0),
          notify: notifyUnread,
          interact: interactions.filter((item) => item.unread).length,
          total: formatted.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0) + notifyUnread + interactions.filter((item) => item.unread).length
        }
      });
    } catch (error) {
      if (!silent) {
        wx.showToast({ title: error.message || '加载失败', icon: 'none' });
      }
    }
  },

  startPolling() {
    this.stopPolling();
    this._pollTimer = setInterval(() => {
      this._pollTick += 1;
      this.reloadAll({ silent: true });
    }, 15000);
  },

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  },

  onPullDownRefresh() {
    this.reloadAll().finally(() => wx.stopPullDownRefresh());
  },

  onTabTap(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeTab: id });
  },

  async onChatTap(e) {
    const item = e.currentTarget.dataset.item;
    if (!item || !item.chatId) return;
    await chatService.markChatRead(item.chatId, this.currentUserId);
    this.reloadAll();
    wx.navigateTo({
      url: '/pages/chat/index?chatId=' + encodeURIComponent(item.chatId)
        + '&targetUserId=' + encodeURIComponent(item.targetUser.userId)
        + '&targetName=' + encodeURIComponent(item.targetUser.nickName)
        + '&targetEmoji=' + encodeURIComponent(item.targetUser.emoji || '💬')
    });
  },

  async onAccept(e) {
    const app = e.currentTarget.dataset.app;
    try {
      await teamApi.reviewTeam({ applicationId: app.id, reviewerId: this.currentUserId, action: 'accepted' });
      await chatService.ensureDirectChat({
        currentUserId: this.currentUserId,
        targetUserId: app.fromUserId,
        bizId: app.groupId
      });
      await this.reloadAll();
      wx.showToast({ title: '已同意', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '操作失败', icon: 'none' });
    }
  },

  async onReject(e) {
    const app = e.currentTarget.dataset.app;
    try {
      await teamApi.reviewTeam({ applicationId: app.id, reviewerId: this.currentUserId, action: 'rejected' });
      await this.reloadAll();
      wx.showToast({ title: '已拒绝', icon: 'none' });
    } catch (error) {
      wx.showToast({ title: error.message || '操作失败', icon: 'none' });
    }
  },

  async onApplicationTap(e) {
    const app = e.currentTarget.dataset.app || {};
    if (!app.id) return;
    await teamApi.markApplicationRead({ id: app.id, role: 'reviewer' });
    this.reloadAll();
  },

  async onMyApplicationTap(e) {
    const app = e.currentTarget.dataset.app || {};
    if (!app.id) return;
    await teamApi.markApplicationRead({ id: app.id, role: 'applicant' });
    if (app.status === 'accepted') {
      const chat = await chatService.ensureDirectChat({
        currentUserId: this.currentUserId,
        targetUserId: app.targetUserId,
        bizId: app.groupId
      });
      if (chat) {
        wx.navigateTo({
          url: '/pages/chat/index?chatId=' + encodeURIComponent(chat.chatId)
            + '&targetUserId=' + encodeURIComponent(chat.targetUser.userId)
            + '&targetName=' + encodeURIComponent(chat.targetUser.nickName)
            + '&targetEmoji=' + encodeURIComponent(chat.targetUser.emoji || '💬')
        });
        return;
      }
    }
    this.reloadAll();
  },

  async onNotificationTap(e) {
    const item = e.currentTarget.dataset.item || {};
    if (!item.notificationId) return;
    await chatService.markNotificationRead(item.notificationId);
    this.reloadAll();
  },

  async onInteractTap(e) {
    const item = e.currentTarget.dataset.item || {};
    if (item.id) await teamApi.markInteractionRead(item.id);
    this.reloadAll();
    if ((item.type === 'like' || item.type === 'comment') && item.postId) {
      wx.navigateTo({ url: '/pages/post-comment/index?postId=' + item.postId });
    }
  }
});
