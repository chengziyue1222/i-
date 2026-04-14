const express = require('express');

const router = express.Router();

function formatChatItem(chat, currentUserId) {
  const targetUser = (chat.targetUsers && chat.targetUsers[currentUserId]) || {
    userId: '',
    nickName: '对方',
    avatar: '',
    emoji: '💬'
  };

  return {
    chatId: chat.chatId,
    type: chat.type,
    bizType: chat.bizType,
    bizId: chat.bizId,
    memberIds: chat.memberIds,
    targetUser,
    lastMessage: chat.lastMessage,
    unreadCount: Number((chat.unreadMap && chat.unreadMap[currentUserId]) || 0),
    updatedAt: chat.updatedAt,
    createdAt: chat.createdAt
  };
}

/**
 * 【新增】GET /api/chat/list?userId=u001
 * 返回示例：
 * {
 *   "code": 0,
 *   "message": "success",
 *   "data": [{ "chatId": "chat_u001_u002" }]
 * }
 */
router.get('/list', (req, res) => {
  const { userId } = req.query || {};
  const { ok, fail } = req.helpers;
  const db = req.db;

  if (!userId) {
    return res.json(fail('缺少 userId'));
  }

  const list = db.chats
    .filter((item) => (item.memberIds || []).includes(String(userId)))
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .map((item) => formatChatItem(item, String(userId)));

  return res.json(ok(list));
});

/**
 * 【新增】GET /api/chat/messages?chatId=chat_u001_u002
 * 返回示例：
 * {
 *   "code": 0,
 *   "message": "success",
 *   "data": [{ "messageId": "msg_001" }]
 * }
 */
router.get('/messages', (req, res) => {
  const { chatId } = req.query || {};
  const { ok, fail } = req.helpers;
  const db = req.db;

  if (!chatId) {
    return res.json(fail('缺少 chatId'));
  }

  const list = db.messages
    .filter((item) => String(item.chatId) === String(chatId))
    .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));

  return res.json(ok(list));
});

router.get('/notifications', (req, res) => {
  const { userId } = req.query || {};
  const { ok, fail } = req.helpers;
  const db = req.db;

  if (!userId) return res.json(fail('缺少 userId'));

  const list = db.notifications
    .filter((item) => !item.toUserId || String(item.toUserId) === String(userId))
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

  return res.json(ok(list));
});

router.post('/read', (req, res) => {
  const { chatId, userId } = req.body || {};
  const { ok, fail } = req.helpers;
  const db = req.db;
  if (!chatId || !userId) return res.json(fail('缺少必要参数'));

  const chat = db.chats.find((item) => String(item.chatId) === String(chatId));
  if (!chat) return res.json(fail('会话不存在'));

  chat.unreadMap[String(userId)] = 0;
  return res.json(ok(true));
});

router.post('/notification/read', (req, res) => {
  const { notificationId } = req.body || {};
  const { ok, fail } = req.helpers;
  const db = req.db;
  if (!notificationId) return res.json(fail('缺少 notificationId'));

  const notification = db.notifications.find((item) => String(item.notificationId) === String(notificationId));
  if (!notification) return res.json(fail('通知不存在'));

  notification.unread = false;
  return res.json(ok(true));
});

/**
 * 【新增】POST /api/chat/send
 * 请求示例：
 * {
 *   "chatId": "chat_u001_u002",
 *   "senderId": "u001",
 *   "receiverId": "u002",
 *   "content": "你好呀"
 * }
 * 返回示例：
 * {
 *   "code": 0,
 *   "message": "success",
 *   "data": {
 *     "messageId": "msg_123"
 *   }
 * }
 */
router.post('/send', (req, res) => {
  const { chatId, senderId, receiverId, content } = req.body || {};
  const { ok, fail, ensureChat } = req.helpers;
  const db = req.db;

  if (!senderId || !receiverId || !content) {
    return res.json(fail('缺少必要参数'));
  }

  const chat = ensureChat(String(senderId), String(receiverId));
  if (chatId && String(chat.chatId) !== String(chatId)) {
    chat.chatId = String(chatId);
  }

  const message = {
    messageId: 'msg_' + Date.now(),
    chatId: chat.chatId,
    type: 'text',
    senderId: String(senderId),
    receiverId: String(receiverId),
    content: String(content),
    ext: {},
    status: 'sent',
    createdAt: Date.now()
  };

  db.messages.push(message);
  chat.lastMessage = {
    messageId: message.messageId,
    type: message.type,
    content: message.content,
    senderId: message.senderId,
    createdAt: message.createdAt
  };
  chat.updatedAt = message.createdAt;
  chat.unreadMap[String(receiverId)] = Number(chat.unreadMap[String(receiverId)] || 0) + 1;

  return res.json(ok(message));
});

module.exports = router;
