const express = require('express');

const router = express.Router();

function normalizeTeam(team) {
  return Object.assign({}, team, {
    remainCount: Math.max(Number(team.max || 0) - Number(team.current || 0), 0),
    startTimeDisplay: team.startTime || '待定'
  });
}

router.get('/applications', (req, res) => {
  const { userId } = req.query || {};
  const { ok, fail } = req.helpers;
  const db = req.db;

  if (!userId) return res.json(fail('缺少 userId'));

  const applications = db.applications.filter((item) => String(item.targetUserId) === String(userId));
  const myApplications = db.applications.filter((item) => String(item.fromUserId) === String(userId));
  return res.json(ok({ applications, myApplications }));
});

router.post('/application/read', (req, res) => {
  const { id, role } = req.body || {};
  const { ok, fail } = req.helpers;
  const db = req.db;
  if (!id) return res.json(fail('缺少申请 id'));

  const application = db.applications.find((item) => String(item.id) === String(id));
  if (!application) return res.json(fail('申请不存在'));

  if (role === 'applicant') application.applicantUnread = false;
  else application.unread = false;

  return res.json(ok(true));
});

router.get('/comments', (req, res) => {
  const { postId } = req.query || {};
  const { ok, fail } = req.helpers;
  const db = req.db;
  if (!postId) return res.json(fail('缺少 postId'));

  const comments = db.comments
    .filter((item) => String(item.postId) === String(postId))
    .sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
  return res.json(ok(comments));
});

router.post('/comment', (req, res) => {
  const { postId, userId, userName, userEmoji, content, postAuthor } = req.body || {};
  const { ok, fail } = req.helpers;
  const db = req.db;
  if (!postId || !content) return res.json(fail('缺少必要参数'));

  const comment = {
    id: 'c_' + Date.now(),
    postId: String(postId),
    userId: String(userId || 'me'),
    userName: userName || '我',
    userEmoji: userEmoji || '🙋',
    content: String(content),
    time: '刚刚',
    ts: Date.now()
  };
  db.comments.unshift(comment);

  if (postAuthor && postAuthor !== comment.userName) {
    db.interactions.unshift({
      id: 'int_' + Date.now(),
      type: 'comment',
      userEmoji: '💬',
      userName: comment.userName,
      desc: comment.userName + ' 评论了你：「' + comment.content + '」',
      postId: String(postId),
      time: '刚刚',
      unread: true
    });
  }

  return res.json(ok(comment));
});

router.post('/interaction', (req, res) => {
  const { type, userEmoji, userName, desc, postId } = req.body || {};
  const { ok } = req.helpers;
  const db = req.db;

  const interaction = {
    id: 'int_' + Date.now(),
    type: type || 'like',
    userEmoji: userEmoji || '👍',
    userName: userName || '有人',
    desc: desc || '',
    postId: postId || '',
    time: '刚刚',
    unread: true
  };

  db.interactions.unshift(interaction);
  return res.json(ok(interaction));
});

router.get('/interactions', (req, res) => {
  const { ok } = req.helpers;
  const db = req.db;
  return res.json(ok(db.interactions.slice()));
});

router.post('/interaction/read', (req, res) => {
  const { id } = req.body || {};
  const { ok, fail } = req.helpers;
  const db = req.db;
  if (!id) return res.json(fail('缺少互动 id'));

  const interaction = db.interactions.find((item) => String(item.id) === String(id));
  if (!interaction) return res.json(fail('互动不存在'));
  interaction.unread = false;
  return res.json(ok(true));
});

/**
 * 【新增】GET /api/team/list
 * 返回示例：
 * {
 *   "code": 0,
 *   "message": "success",
 *   "data": {
 *     "groups": [],
 *     "posts": []
 *   }
 * }
 */
router.get('/list', (req, res) => {
  const { ok } = req.helpers;
  const db = req.db;
  const groups = db.teams
    .slice()
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .map(normalizeTeam);
  return res.json(ok({ groups, posts: db.posts.slice() }));
});

/**
 * 【新增】POST /api/team/create
 * 请求示例：
 * {
 *   "creatorId": "u003",
 *   "nickname": "旅行爱好者",
 *   "destination": "星湖",
 *   "startTime": "04-25 09:30",
 *   "max": 4,
 *   "tags": ["拍照", "citywalk"],
 *   "intro": "一起慢慢逛"
 * }
 */
router.post('/create', (req, res) => {
  const { ok, fail } = req.helpers;
  const db = req.db;
  const body = req.body || {};

  if (!body.creatorId || !body.destination) {
    return res.json(fail('缺少必要参数'));
  }

  const team = {
    id: 'g' + Date.now(),
    creatorId: String(body.creatorId),
    nickname: body.nickname || '我',
    personality: body.personality || 'ENFP',
    destination: body.destination,
    startTime: body.startTime || '待定',
    current: 1,
    max: Number(body.max || 4),
    status: 'recruiting',
    tags: Array.isArray(body.tags) ? body.tags : [],
    intro: body.intro || '欢迎加入，一起出发。',
    matchReasons: [],
    imageUrl: body.imageUrl || '',
    coverHeight: Number(body.coverHeight || 240),
    cover: body.cover || { color: 'linear-gradient(135deg,#4facfe,#00f2fe)', emoji: '🌄' },
    createdAt: Date.now()
  };

  db.teams.unshift(team);
  return res.json(ok(normalizeTeam(team)));
});

/**
 * 【新增】POST /api/team/apply
 * 请求示例：
 * {
 *   "groupId": "g001",
 *   "fromUserId": "u003",
 *   "fromUserName": "旅行爱好者",
 *   "fromUserEmoji": "🙋",
 *   "message": "我想一起去"
 * }
 */
router.post('/apply', (req, res) => {
  const { ok, fail } = req.helpers;
  const db = req.db;
  const body = req.body || {};
  const group = db.teams.find((item) => String(item.id) === String(body.groupId));

  if (!group) {
    return res.json(fail('组队不存在'));
  }

  const duplicated = db.applications.find((item) => String(item.groupId) === String(body.groupId) && String(item.fromUserId) === String(body.fromUserId));
  if (duplicated) {
    return res.json(fail('你已申请过该队伍', 2));
  }

  const application = {
    id: 'app_' + Date.now(),
    groupId: group.id,
    groupName: group.destination,
    groupDest: group.destination,
    fromUserId: String(body.fromUserId),
    fromUserName: body.fromUserName || '申请人',
    fromUserEmoji: body.fromUserEmoji || '🙋',
    targetUserId: group.creatorId,
    targetUserName: group.nickname,
    targetUserEmoji: (group.cover && group.cover.emoji) || '🧭',
    message: body.message || '',
    status: 'pending',
    unread: true,
    applicantUnread: false,
    createTime: Date.now()
  };

  db.applications.unshift(application);
  return res.json(ok(application));
});

/**
 * 【新增】POST /api/team/review
 * 请求示例：
 * {
 *   "applicationId": "app_001",
 *   "reviewerId": "u001",
 *   "action": "accepted"
 * }
 */
router.post('/review', (req, res) => {
  const { ok, fail, ensureChat, pushNotification } = req.helpers;
  const db = req.db;
  const { applicationId, reviewerId, action } = req.body || {};
  const application = db.applications.find((item) => String(item.id) === String(applicationId));

  if (!application) {
    return res.json(fail('申请不存在'));
  }

  if (String(application.targetUserId) !== String(reviewerId)) {
    return res.json(fail('无权限审核该申请'));
  }

  application.status = action === 'accepted' ? 'accepted' : 'rejected';
  application.unread = false;
  application.applicantUnread = true;

  const result = { application };

  if (application.status === 'accepted') {
    const team = db.teams.find((item) => String(item.id) === String(application.groupId));
    if (team) {
      team.current = Math.min(Number(team.current || 1) + 1, Number(team.max || 1));
      team.status = team.current >= team.max ? 'full' : 'recruiting';
    }

    const chat = ensureChat(String(application.targetUserId), String(application.fromUserId), application.groupId);
    const systemMessage = {
      messageId: 'msg_sys_' + Date.now(),
      chatId: chat.chatId,
      type: 'system',
      senderId: 'system',
      receiverId: application.fromUserId,
      content: '你已加入队伍',
      ext: { action: 'apply_approved', groupId: application.groupId },
      status: 'sent',
      createdAt: Date.now()
    };
    db.messages.push(systemMessage);
    chat.lastMessage = {
      messageId: systemMessage.messageId,
      type: systemMessage.type,
      content: systemMessage.content,
      senderId: systemMessage.senderId,
      createdAt: systemMessage.createdAt
    };
    chat.updatedAt = systemMessage.createdAt;
    chat.unreadMap[String(application.fromUserId)] = Number(chat.unreadMap[String(application.fromUserId)] || 0) + 1;

    pushNotification({
      notificationId: 'noti_' + Date.now(),
      type: 'audit',
      subType: 'approved',
      bizId: application.groupId,
      fromUserId: application.targetUserId,
      toUserId: application.fromUserId,
      title: '申请已通过',
      content: '你申请加入「' + application.groupName + '」的请求已通过，系统已为你创建聊天会话',
      unread: true,
      actionStatus: 'done',
      createdAt: Date.now()
    });

    result.chat = chat;
    result.systemMessage = systemMessage;
  } else {
    pushNotification({
      notificationId: 'noti_' + Date.now(),
      type: 'audit',
      subType: 'rejected',
      bizId: application.groupId,
      fromUserId: application.targetUserId,
      toUserId: application.fromUserId,
      title: '申请未通过',
      content: '你申请加入「' + application.groupName + '」的请求未通过，可以再看看其他同路线搭子',
      unread: true,
      actionStatus: 'done',
      createdAt: Date.now()
    });
  }

  return res.json(ok(result));
});

module.exports = router;
