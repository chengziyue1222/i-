function getDb() {
  if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.database) {
    throw new Error('云开发未初始化');
  }
  return wx.cloud.database();
}

function getCommand() {
  return getDb().command;
}

function getCurrentUserId() {
  var ui = wx.getStorageSync('userInfo') || {};
  return String(ui.userId || ui._id || ui.openid || ui._openid || 'guest');
}

function normalizeUser(userId, profile) {
  return {
    userId: String(userId || 'guest'),
    nickName: profile.nickName || '旅行爱好者',
    avatarUrl: profile.avatarUrl || '',
    emoji: profile.emoji || '💬'
  };
}

function getUserProfileMap(userIds) {
  var ids = (userIds || []).filter(Boolean).map(function (id) { return String(id); });
  if (!ids.length) return Promise.resolve({});
  return getDb().collection('users').where({ openid: getCommand().in(ids) }).get().then(function (res) {
    var map = {};
    (res.data || []).forEach(function (item) {
      map[String(item.openid)] = {
        nickName: item.nickName || '旅行爱好者',
        avatarUrl: item.avatarUrl || '',
        emoji: item.emoji || '💬'
      };
    });
    return map;
  });
}

function buildChatDocId(a, b) {
  var ids = [String(a || 'guest'), String(b || 'guest')].sort();
  return ids[0] + '__' + ids[1];
}

function ensureChat(userA, userB, bizId) {
  var chatId = buildChatDocId(userA, userB);
  var db = getDb();
  var chatData = {
    participantIds: [String(userA), String(userB)],
    bizId: String(bizId || ''),
    lastMessage: null,
    updatedAt: Date.now(),
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  };

  return db.collection('chat').doc(chatId).get().then(function (res) {
    if (res.data) {
      var existed = res.data;
      if (!existed.bizId && bizId) {
        return db.collection('chat').doc(chatId).update({
          data: {
            bizId: String(bizId),
            updateTime: db.serverDate()
          }
        }).then(function () {
          existed.bizId = String(bizId);
          return existed;
        });
      }
      return existed;
    }

    return db.collection('chat').doc(chatId).set({ data: chatData }).then(function () {
      return db.collection('chat').doc(chatId).get().then(function (next) { return next.data; });
    });
  }).catch(function () {
    return db.collection('chat').doc(chatId).set({ data: chatData }).then(function () {
      return db.collection('chat').doc(chatId).get().then(function (next) { return next.data; });
    });
  });
}

function getChatList(userId) {
  var currentUserId = String(userId || getCurrentUserId());
  return getDb().collection('chat').where({ participantIds: currentUserId }).orderBy('updatedAt', 'desc').get().then(function (res) {
    var list = res.data || [];
    if (!list.length) return [];

    var otherIds = list.map(function (item) {
      var ids = item.participantIds || [];
      return ids.find(function (id) { return String(id) !== String(currentUserId); }) || currentUserId;
    });

    return Promise.all([
      getUserProfileMap(otherIds),
      getDb().collection('chat_message').where({
        chatId: getCommand().in(list.map(function (item) { return item._id; })),
        receiverId: currentUserId,
        unread: true
      }).get()
    ]).then(function (result) {
      var userMap = result[0] || {};
      var unreadList = result[1].data || [];
      var unreadMap = {};
      unreadList.forEach(function (item) {
        unreadMap[item.chatId] = Number(unreadMap[item.chatId] || 0) + 1;
      });

      return list.map(function (item) {
        var ids = item.participantIds || [];
        var targetUserId = ids.find(function (id) { return String(id) !== String(currentUserId); }) || currentUserId;
        var profile = normalizeUser(targetUserId, userMap[String(targetUserId)] || {});
        var targetUsers = {};
        targetUsers[currentUserId] = profile;
        return {
          chatId: item._id,
          bizId: item.bizId || '',
          updatedAt: item.updatedAt || 0,
          targetUser: profile,
          targetUsers: targetUsers,
          unreadCount: Number(unreadMap[item._id] || 0),
          lastMessage: item.lastMessage || null
        };
      });
    });
  });
}

function getMessageList(chatId) {
  if (!chatId) return Promise.resolve([]);
  return getDb().collection('chat_message').where({ chatId: String(chatId) }).orderBy('createdAt', 'asc').get().then(function (res) {
    return (res.data || []).map(function (item) {
      return {
        messageId: item._id,
        chatId: item.chatId,
        senderId: item.senderId,
        receiverId: item.receiverId,
        type: item.type || 'text',
        content: item.content || '',
        createdAt: item.createdAt || 0,
        unread: !!item.unread
      };
    });
  });
}

function ensureDirectChat(data) {
  var payload = data || {};
  var currentUserId = String(payload.currentUserId || getCurrentUserId());
  var targetUserId = String(payload.targetUserId || '');
  var bizId = String(payload.bizId || '');

  if (!targetUserId) return Promise.reject(new Error('缺少目标用户'));
  return ensureChat(currentUserId, targetUserId, bizId).then(function (chat) {
    return Promise.all([
      Promise.resolve(chat),
      getUserProfileMap([targetUserId])
    ]).then(function (result) {
      var chatDoc = result[0] || {};
      var userMap = result[1] || {};
      var targetUser = normalizeUser(targetUserId, userMap[targetUserId] || {});
      return {
        chatId: chatDoc._id || buildChatDocId(currentUserId, targetUserId),
        bizId: chatDoc.bizId || bizId,
        updatedAt: chatDoc.updatedAt || 0,
        targetUser: targetUser,
        targetUsers: (function () {
          var map = {};
          map[currentUserId] = targetUser;
          return map;
        })(),
        unreadCount: 0,
        lastMessage: chatDoc.lastMessage || null
      };
    });
  });
}

function sendMessage(data) {
  var payload = data || {};
  var senderId = String(payload.senderId || getCurrentUserId());
  var receiverId = String(payload.receiverId || '');
  var content = String(payload.content || '').trim();
  var explicitChatId = String(payload.chatId || '');
  var bizId = String(payload.bizId || '');

  if (!receiverId) return Promise.reject(new Error('缺少接收方'));
  if (!content) return Promise.reject(new Error('消息不能为空'));

  var now = Date.now();
  var db = getDb();
  var chatPromise = explicitChatId
    ? db.collection('chat').doc(explicitChatId).get().then(function (res) { return res.data; })
    : ensureChat(senderId, receiverId, bizId);

  return chatPromise.then(function (chat) {
    var chatId = chat && chat._id ? chat._id : buildChatDocId(senderId, receiverId);
    return db.collection('chat_message').add({
      data: {
        chatId: chatId,
        senderId: senderId,
        receiverId: receiverId,
        type: 'text',
        content: content,
        unread: true,
        createdAt: now,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    }).then(function (res) {
      return db.collection('chat').doc(chatId).set({
        data: {
          participantIds: [senderId, receiverId],
          bizId: bizId || (chat && chat.bizId) || '',
          lastMessage: {
            type: 'text',
            content: content,
            senderId: senderId,
            createdAt: now
          },
          updatedAt: now,
          createTime: (chat && chat.createTime) || db.serverDate(),
          updateTime: db.serverDate()
        }
      }).then(function () {
        return {
          messageId: res._id,
          chatId: chatId,
          senderId: senderId,
          receiverId: receiverId,
          type: 'text',
          content: content,
          createdAt: now,
          unread: true
        };
      });
    });
  });
}

function getNotifications(userId) {
  var currentUserId = String(userId || getCurrentUserId());
  return getDb().collection('notifications').where({ toUserId: currentUserId }).orderBy('createdAt', 'desc').get().then(function (res) {
    return (res.data || []).map(function (item) {
      return {
        notificationId: item._id,
        type: item.type || 'system',
        subType: item.subType || '',
        title: item.title || '系统提醒',
        content: item.content || '',
        unread: !!item.unread,
        createdAt: item.createdAt || 0,
        bizId: item.bizId || '',
        fromUserId: item.fromUserId || '',
        toUserId: item.toUserId || currentUserId
      };
    });
  });
}

function markChatRead(a, b) {
  var data = typeof a === 'object' ? a : { chatId: a, userId: b };
  var chatId = String((data && data.chatId) || '');
  var userId = String((data && data.userId) || getCurrentUserId());
  if (!chatId) return Promise.resolve(true);
  return getDb().collection('chat_message').where({ chatId: chatId, receiverId: userId, unread: true }).get().then(function (res) {
    var list = res.data || [];
    return Promise.all(list.map(function (item) {
      return getDb().collection('chat_message').doc(item._id).update({
        data: {
          unread: false,
          updateTime: getDb().serverDate()
        }
      });
    }));
  }).then(function () {
    return true;
  });
}

function markNotificationRead(notificationId) {
  if (!notificationId) return Promise.resolve(true);
  return getDb().collection('notifications').doc(String(notificationId)).update({
    data: {
      unread: false,
      updateTime: getDb().serverDate()
    }
  }).then(function () {
    return true;
  });
}

module.exports = {
  getChatList,
  fetchChatList: getChatList,
  getMessageList,
  fetchMessageList: getMessageList,
  ensureDirectChat,
  sendMessage,
  sendTextMessage: sendMessage,
  getNotifications,
  fetchNotifications: getNotifications,
  markChatRead,
  markNotificationRead
};
