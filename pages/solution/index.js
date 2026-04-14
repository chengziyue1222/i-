const teamApi = require('../../services/team');
const chatApi = require('../../services/chat');
const { logError } = require('../../utils/error');

var CHIPS = [
  { id: 'all', label: '全部' },
  { id: 'recruit', label: '招募中' },
  { id: 'hiking', label: '徒步' },
  { id: 'food', label: '美食' },
  { id: 'photo', label: '拍照' }
];

var DEFAULT_SCENIC_IMAGE = '/images/scenic/qixingyan.jpg';
var SCENIC_IMAGE_MAP = {
  '七星岩风景区': '/images/scenic/qixingyan.jpg',
  '七星岩': '/images/scenic/qixingyan.jpg',
  '鼎湖山景区': '/images/scenic/dinghushan.jpg',
  '鼎湖山': '/images/scenic/dinghushan.jpg',
  '端州古城': '/images/scenic/duanzhou.jpg',
  '肇庆古城': '/images/scenic/duanzhou.jpg',
  '星湖风景区': '/images/scenic/xinghu.jpg',
  '星湖': '/images/scenic/xinghu.jpg',
  '龙母祖庙': '/images/scenic/longmu.jpg',
  '端州美食街': 'https://picsum.photos/seed/duanzhou-food/400/500',
  '西江苗寨': 'https://picsum.photos/seed/xijiang/400/500',
  '鸡笼顶': 'https://picsum.photos/seed/jilongding/400/500'
};

function scenicImageByDestination(destination) {
  var key = (destination || '').trim();
  return SCENIC_IMAGE_MAP[key] || DEFAULT_SCENIC_IMAGE;
}

function hasScenicMapping(destination) {
  return Object.prototype.hasOwnProperty.call(
    SCENIC_IMAGE_MAP,
    (destination || '').trim()
  );
}

function stableCoverHeight(group) {
  var text = String(group.id || group.destination || 'group');
  var sum = 0;
  for (var i = 0; i < text.length; i++) sum += text.charCodeAt(i);
  return 214 + (sum % 86);
}

function stableMatchPercent(group) {
  var text = String(group.id || group.destination || 'group');
  var sum = 0;
  for (var i = 0; i < text.length; i++) sum += text.charCodeAt(i);
  return 75 + (sum % 21);
}

function parseStartTimestamp(startTime) {
  if (!startTime || startTime === '待定') return 0;

  var match = /^(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/.exec(startTime);
  if (!match) return 0;

  var now = new Date();
  var target = new Date(
    now.getFullYear(),
    parseInt(match[1], 10) - 1,
    parseInt(match[2], 10),
    parseInt(match[3], 10),
    parseInt(match[4], 10),
    0,
    0
  ).getTime();

  if (target < now.getTime()) {
    target = new Date(
      now.getFullYear() + 1,
      parseInt(match[1], 10) - 1,
      parseInt(match[2], 10),
      parseInt(match[3], 10),
      parseInt(match[4], 10),
      0,
      0
    ).getTime();
  }

  return target;
}

function isLeavingSoon(startTime) {
  var ts = parseStartTimestamp(startTime);
  return !!ts && ts - Date.now() > 0 && ts - Date.now() <= 24 * 60 * 60 * 1000;
}

function findChatByTargetUser(list, targetUserId) {
  var arr = list || [];
  for (var i = 0; i < arr.length; i++) {
    var item = arr[i];
    if (item.targetUser && String(item.targetUser.userId) === String(targetUserId)) {
      return item;
    }
  }
  return null;
}

Page({
  options: {
    styleIsolation: 'shared'
  },
  data: {
    chips: CHIPS,
    activeChip: 'all',
    keyword: '',
    groups: [],
    filtered: [],
    leftGroups: [],
    rightGroups: [],
    showAiPanel: false,
    aiDest: '',
    refresherTriggered: false,
    showPublishForm: false,
    publishForm: {
      destination: '',
      publishDate: '',
      publishTime: '',
      max: '',
      tagsText: '',
      intro: ''
    }
  },

  onLoad: function () {
    this._hasLoadedOnce = false;
    return this.reload();
  },

  onShow: function () {
    if (!this._hasLoadedOnce) return;
    return this.reload();
  },

  onGoCommunity: function () {
    wx.navigateTo({ url: '/pages/community/index' });
  },

  getCurrentUser: function () {
    var ui = wx.getStorageSync('userInfo') || {};
    return {
      userId: String(ui.userId || ui._id || ui.openid || 'guest'),
      nickName: ui.nickName || '旅行爱好者'
    };
  },

  reload: function () {
    var self = this;
    return teamApi.getTeamList()
      .then(function (result) {
        self._hasLoadedOnce = true;
        self.setData({ groups: result.groups || [] });
        self.applyFilter();
      })
      .catch(function (error) {
        self._hasLoadedOnce = true;
        wx.showToast({ title: logError('搭子大厅-加载队伍失败', error), icon: 'none' });
      });
  },

  decorateGroups: function (list) {
    return (list || []).map(function (group) {
      var mapped = scenicImageByDestination(group.destination);
      var current = Number(group.current || 0);
      var max = Number(group.max || 0);
      var startTime = group.startTime || '待定';

      return Object.assign({}, group, {
        imageUrl: hasScenicMapping(group.destination) ? mapped : (group.imageUrl || mapped),
        coverHeight: group.coverHeight || stableCoverHeight(group),
        matchPercent: group.matchPercent || stableMatchPercent(group),
        remainCount: Math.max(max - current, 0),
        startTimeDisplay: startTime,
        isLeavingSoon: isLeavingSoon(startTime)
      });
    });
  },

  splitToWaterfall: function (list) {
    var left = [];
    var right = [];
    var leftH = 0;
    var rightH = 0;

    (list || []).forEach(function (group) {
      var estimate = (group.coverHeight || 240)
        + 150
        + (group.tags || []).length * 14
        + Math.min((group.intro || '').length, 36);

      if (leftH <= rightH) {
        left.push(group);
        leftH += estimate;
      } else {
        right.push(group);
        rightH += estimate;
      }
    });

    return { left: left, right: right };
  },

  applyFilter: function () {
    var data = this.data;
    var filteredRaw = (data.groups || []).filter(function (group) {
      if (data.activeChip === 'recruit' && group.status !== 'recruiting') return false;

      if (
        data.activeChip === 'hiking'
        && !(group.tags || []).some(function (t) {
          return ['徒步', '登山', '露营'].indexOf(t) > -1;
        })
      ) {
        return false;
      }

      if (
        data.activeChip === 'food'
        && !(group.tags || []).some(function (t) {
          return t.indexOf('美食') > -1;
        })
      ) {
        return false;
      }

      if (
        data.activeChip === 'photo'
        && !(group.tags || []).some(function (t) {
          return t.indexOf('拍照') > -1 || t.indexOf('摄影') > -1;
        })
      ) {
        return false;
      }

      if (data.keyword) {
        var matched = String(group.destination || '').indexOf(data.keyword) > -1
          || String(group.nickname || '').indexOf(data.keyword) > -1
          || (group.tags || []).some(function (tag) {
            return String(tag).indexOf(data.keyword) > -1;
          });

        if (!matched) return false;
      }

      return true;
    });

    var filtered = this.decorateGroups(filteredRaw);
    var columns = this.splitToWaterfall(filtered);
    this.setData({
      filtered: filtered,
      leftGroups: columns.left,
      rightGroups: columns.right
    });
  },

  onSearchInput: function (e) {
    this.setData({ keyword: e.detail.value });
    this.applyFilter();
  },

  onSearchConfirm: function () {
    this.applyFilter();
  },

  onSearchClear: function () {
    this.setData({ keyword: '' });
    this.applyFilter();
  },

  onChip: function (e) {
    this.setData({ activeChip: e.currentTarget.dataset.id });
    this.applyFilter();
  },

  onCardTap: function (e) {
    wx.navigateTo({ url: '/pages/buddy-detail/index?id=' + e.detail.group.id });
  },

  onJoinTap: function (e) {
    if (e.detail.group && e.detail.group.id) {
      wx.navigateTo({ url: '/pages/buddy-apply/index?id=' + e.detail.group.id });
    }
  },

  onToggleAi: function () {
    this.setData({ showAiPanel: !this.data.showAiPanel });
  },

  onAiDestInput: function (e) {
    this.setData({ aiDest: e.detail.value });
  },

  onStartAiMatch: function () {
    if (!this.data.aiDest) {
      wx.showToast({ title: '请输入目的地', icon: 'none' });
      return;
    }

    this.setData({ showAiPanel: false });
    wx.navigateTo({
      url: '/pages/buddy-match/index?destination=' + encodeURIComponent(this.data.aiDest)
    });
  },

  noop: function () {
    return null;
  },

  onChatTap: function (e) {
    var group = e.detail.group || {};
    if (!group.id) return;

    var me = this.getCurrentUser();
    if (!me.userId || me.userId === 'guest') {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    var targetUserId = String(group.creatorId || ('group_owner_' + group.id));

    chatApi.getChatList(me.userId)
      .then(function (list) {
        var chat = findChatByTargetUser(list, targetUserId);
        if (chat) return chat;

        return chatApi.sendMessage({
          senderId: me.userId,
          receiverId: targetUserId,
          content: '你好，我想先了解一下你的行程安排～'
        }).then(function () {
          return chatApi.getChatList(me.userId).then(function (nextList) {
            return findChatByTargetUser(nextList, targetUserId);
          });
        });
      })
      .then(function (chat) {
        if (!chat) return;

        wx.navigateTo({
          url: '/pages/chat/index?chatId=' + encodeURIComponent(chat.chatId)
            + '&targetUserId=' + encodeURIComponent(chat.targetUser.userId)
            + '&targetName=' + encodeURIComponent(chat.targetUser.nickName)
            + '&targetEmoji=' + encodeURIComponent(chat.targetUser.emoji || '💬')
        });
      })
      .catch(function (error) {
        wx.showToast({ title: logError('搭子大厅-进入聊天失败', error), icon: 'none' });
      });
  },

  onPublish: function () {
    this.setData({
      showPublishForm: true,
      publishForm: {
        destination: '',
        publishDate: '',
        publishTime: '',
        max: '',
        tagsText: '',
        intro: ''
      }
    });
  },

  onClosePublishForm: function () {
    this.setData({ showPublishForm: false });
  },

  onPublishFieldInput: function (e) {
    var form = this.data.publishForm || {};
    form[e.currentTarget.dataset.field] = e.detail.value || '';
    this.setData({ publishForm: form });
  },

  onSubmitPublish: function () {
    var self = this;
    var form = this.data.publishForm || {};
    var destination = (form.destination || '').trim();

    if (!destination) {
      wx.showToast({ title: '请填写目的地', icon: 'none' });
      return;
    }

    var startTime = '待定';
    if (form.publishDate && form.publishTime) {
      startTime = (form.publishDate || '').slice(5) + ' ' + form.publishTime;
    } else if (form.publishDate || form.publishTime) {
      wx.showToast({ title: '请同时选择日期和时间', icon: 'none' });
      return;
    }

    var max = parseInt(form.max || '4', 10);
    if (!max || max < 2 || max > 20) {
      wx.showToast({ title: '人数需在2-20之间', icon: 'none' });
      return;
    }

    var tags = (form.tagsText || '轻松游')
      .split(/[，,\s]+/)
      .filter(function (t) { return !!t; })
      .slice(0, 4);

    if (!tags.length) tags = ['轻松游'];

    var me = this.getCurrentUser();
    if (!me.userId || me.userId === 'guest') {
      wx.showToast({ title: '请先登录后再发布', icon: 'none' });
      return;
    }

    teamApi.createTeam({
      creatorId: me.userId,
      nickname: me.nickName,
      destination: destination,
      startTime: startTime,
      max: max,
      tags: tags,
      intro: (form.intro || '').trim() || '欢迎加入，一起出发。',
      cover: {
        color: 'linear-gradient(135deg,#4facfe,#00f2fe)',
        emoji: '🌄'
      },
      imageUrl: scenicImageByDestination(destination)
    }).then(function () {
      self.setData({ showPublishForm: false });
      return self.reload();
    }).then(function () {
      wx.showToast({ title: '发布成功🎉', icon: 'success' });
    }).catch(function (error) {
      wx.showToast({ title: logError('搭子大厅-发布组队失败', error, { form: form }), icon: 'none' });
    });
  },

  onPullDownRefresh: function () {
    this.reload().finally(function () {
      wx.stopPullDownRefresh();
    });
  },

  onRefresherRefresh: function () {
    var self = this;
    this.setData({ refresherTriggered: true });
    this.reload().finally(function () {
      setTimeout(function () {
        self.setData({ refresherTriggered: false });
      }, 400);
    });
  }
});




