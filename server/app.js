const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

const userRouter = require('./routes/user');
const chatRouter = require('./routes/chat');
const teamRouter = require('./routes/team');
const aiRouter = require('./routes/ai');
const postRouter = require('./routes/post');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
      console.warn('db.json 读取失败，使用默认数据');
    }
  }
  return null;
}

const now = Date.now();

const defaultDb = {
  users: [
    {
      userId: 'u001',
      openid: 'openid_u001',
      nickName: '小明',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
      emoji: '🧭',
      manifesto: '喜欢在人少的时候看城市醒来',
      tags: ['路线', '徒步', '摄影']
    },
    {
      userId: 'u002',
      openid: 'openid_u002',
      nickName: '阿柚',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
      emoji: '🍊',
      manifesto: '逛市场、吃小店、记录好天气',
      tags: ['美食', 'citywalk', '探店']
    },
    {
      userId: 'u003',
      openid: 'openid_u003',
      nickName: '旅行爱好者',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
      emoji: '🙋',
      manifesto: '用脚步丈量世界，用心收藏风景',
      tags: ['山水', '人文', '美食']
    }
  ],
  teams: [
    {
      id: 'g001',
      creatorId: 'u001',
      nickname: '小明',
      personality: 'ENFP',
      destination: '七星岩',
      startTime: '04-20 09:00',
      current: 2,
      max: 4,
      status: 'recruiting',
      tags: ['拍照', '徒步', '打卡'],
      intro: '喜欢拍风景，希望找到志同道合的朋友一起去七星岩。',
      matchReasons: ['兴趣一致', '时间匹配'],
      imageUrl: '/images/scenic/qixingyan.jpg',
      coverHeight: 240,
      cover: { color: 'linear-gradient(135deg,#667eea,#764ba2)', emoji: '🏔️' },
      createdAt: now - 1000 * 60 * 60 * 4
    },
    {
      id: 'g002',
      creatorId: 'u002',
      nickname: '阿柚',
      personality: 'INFP',
      destination: '鼎湖山',
      startTime: '04-21 08:30',
      current: 3,
      max: 4,
      status: 'recruiting',
      tags: ['登山', '自然', '解压'],
      intro: '周末登鼎湖山，目前 3 人，再招 1 名队友。',
      matchReasons: ['路线同向'],
      imageUrl: '/images/scenic/dinghushan.jpg',
      coverHeight: 250,
      cover: { color: 'linear-gradient(135deg,#11998e,#38ef7d)', emoji: '🌿' },
      createdAt: now - 1000 * 60 * 60 * 2
    }
  ],
  applications: [
    {
      id: 'app_001',
      groupId: 'g001',
      groupName: '七星岩',
      groupDest: '七星岩',
      fromUserId: 'u002',
      fromUserName: '阿柚',
      fromUserEmoji: '🍊',
      targetUserId: 'u001',
      targetUserName: '小明',
      targetUserEmoji: '🧭',
      message: '我也喜欢拍照，可以一起规划机位。',
      status: 'pending',
      unread: true,
      applicantUnread: false,
      createTime: now - 1000 * 60 * 15
    }
  ],
  chats: [
    {
      chatId: 'chat_u001_u002',
      type: 'private',
      bizType: 'buddy',
      bizId: 'g001',
      memberIds: ['u001', 'u002'],
      targetUsers: {
        u001: { userId: 'u002', nickName: '阿柚', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80', emoji: '🍊' },
        u002: { userId: 'u001', nickName: '小明', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80', emoji: '🧭' }
      },
      unreadMap: { u001: 0, u002: 1 },
      lastMessage: {
        messageId: 'msg_001',
        type: 'system',
        content: '你的入队申请已通过，现在可以开始聊天了',
        senderId: 'system',
        createdAt: now - 1000 * 60 * 20
      },
      updatedAt: now - 1000 * 60 * 20,
      createdAt: now - 1000 * 60 * 60
    }
  ],
  messages: [
    {
      messageId: 'msg_001',
      chatId: 'chat_u001_u002',
      type: 'system',
      senderId: 'system',
      receiverId: 'u002',
      content: '你的入队申请已通过，现在可以开始聊天了',
      ext: { action: 'apply_approved', groupId: 'g001' },
      status: 'sent',
      createdAt: now - 1000 * 60 * 20
    },
    {
      messageId: 'msg_002',
      chatId: 'chat_u001_u002',
      type: 'text',
      senderId: 'u001',
      receiverId: 'u002',
      content: '你好呀，我们先确认一下出发时间～',
      ext: {},
      status: 'sent',
      createdAt: now - 1000 * 60 * 18
    }
  ],
  notifications: [
    {
      notificationId: 'noti_001',
      type: 'audit',
      subType: 'approved',
      bizId: 'g001',
      fromUserId: 'u001',
      toUserId: 'u002',
      title: '申请已通过',
      content: '你申请加入「七星岩」的请求已通过，快去和队长沟通行程吧',
      unread: true,
      actionStatus: 'done',
      createdAt: now - 1000 * 60 * 20
    }
  ],
  posts: [
    {
      id: 'p1',
      title: '广州三日游攻略：人均 500 也能玩得很饱满',
      content: '第一天住北京路附近，早上喝银记肠粉，中午去沙面走走，晚上去永庆坊。第二天留给陈家祠和上下九，第三天专门安排给海珠湖和夜游珠江。全程地铁都很方便，适合第一次来广州的人。',
      images: [
        'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80',
        'https://images.unsplash.com/photo-1526481280695-3c4691f11f21?w=1200&q=80',
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80'
      ],
      cover: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80',
      desc: '三天两晚不赶路，吃喝玩拍全部兼顾。',
      type: '路线',
      tags: ['广州', '路线', 'citywalk'],
      authorId: 'u001',
      author: { name: '小明', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80' },
      likeCount: 120,
      commentCount: 2,
      createdAt: now - 1000 * 60 * 60 * 12
    },
    {
      id: 'p2',
      title: '顺德一日美食暴走：鱼生、双皮奶、煲仔饭不踩雷',
      content: '顺德真的适合专门为了吃去一趟。建议上午先去华盖路逛老街，中午排一家本地鱼生店，下午喝双皮奶，晚上回到大良吃煲仔饭。不要安排太满，留点时间慢慢消化。',
      images: [
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80',
        'https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&q=80'
      ],
      cover: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80',
      desc: '顺德美食密度太高，这份路线适合第一次去。',
      type: '美食',
      tags: ['顺德', '美食', '探店'],
      authorId: 'u002',
      author: { name: '阿柚', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80' },
      likeCount: 89,
      commentCount: 1,
      createdAt: now - 1000 * 60 * 60 * 8
    },
    {
      id: 'p3',
      title: '七星岩清晨拍照机位分享，雾气出来的时候最绝',
      content: '如果是冲着出片去的，建议 6 点前到东门附近，晨雾会在湖面上铺开。带长焦会更容易压景，穿浅色系衣服也更适合这里的山水背景。',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80',
        'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=80'
      ],
      cover: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80',
      desc: '适合拍山水、晨雾和人像，清晨真的很稳。',
      type: '景点',
      tags: ['七星岩', '景点', '摄影'],
      authorId: 'u003',
      author: { name: '旅行爱好者', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80' },
      likeCount: 64,
      commentCount: 1,
      createdAt: now - 1000 * 60 * 60 * 4
    }
  ],
  postLikes: [
    { id: 'like_001', userId: 'u003', postId: 'p1', createdAt: now - 1000 * 60 * 50 },
    { id: 'like_002', userId: 'u003', postId: 'p2', createdAt: now - 1000 * 60 * 30 }
  ],
  postComments: [
    { id: 'pc_001', postId: 'p1', userId: 'u002', userName: '阿柚', userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80', content: '这个路线很适合周末快闪！', createdAt: now - 1000 * 60 * 25 },
    { id: 'pc_002', postId: 'p1', userId: 'u003', userName: '旅行爱好者', userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80', content: '收藏了，下次就按这个顺序走。', createdAt: now - 1000 * 60 * 10 },
    { id: 'pc_003', postId: 'p2', userId: 'u001', userName: '小明', userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80', content: '顺德真的值得为了吃单独跑一趟。', createdAt: now - 1000 * 60 * 18 },
    { id: 'pc_004', postId: 'p3', userId: 'u001', userName: '小明', userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80', content: '这个机位分享太有用了。', createdAt: now - 1000 * 60 * 12 }
  ],
  interactions: [
    {
      id: 'int_001',
      type: 'like',
      userEmoji: '👍',
      userName: '特种兵小王',
      desc: '赞了你的帖子《一次玩够肇庆五大景点》',
      postId: 'p001',
      time: '5分钟前',
      unread: true
    }
  ],
  metrics: { events: [], counters: {} }
};

const db = loadDb() || defaultDb;

function saveDb() {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8'); } catch (e) {}
}

function ok(data, message = 'success') {
  return { code: 0, message, data };
}

function fail(message, code = 1, data = null) {
  return { code, message, data };
}

function getUserById(userId) {
  return db.users.find((item) => String(item.userId) === String(userId));
}

function buildChatId(userA, userB) {
  return ['chat', userA, userB].sort().join('_');
}

function ensureChat(userA, userB, bizId) {
  const chatId = buildChatId(userA, userB);
  let chat = db.chats.find((item) => item.chatId === chatId);
  if (!chat) {
    const userAProfile = getUserById(userA);
    const userBProfile = getUserById(userB);
    chat = {
      chatId,
      type: 'private',
      bizType: 'buddy',
      bizId: bizId || '',
      memberIds: [userA, userB],
      targetUsers: {
        [userA]: { userId: userB, nickName: userBProfile?.nickName || '对方', avatar: userBProfile?.avatarUrl || '', emoji: userBProfile?.emoji || '💬' },
        [userB]: { userId: userA, nickName: userAProfile?.nickName || '对方', avatar: userAProfile?.avatarUrl || '', emoji: userAProfile?.emoji || '💬' }
      },
      unreadMap: { [userA]: 0, [userB]: 0 },
      lastMessage: null,
      updatedAt: Date.now(),
      createdAt: Date.now()
    };
    db.chats.unshift(chat);
  }
  return chat;
}

function pushNotification(notification) {
  db.notifications.unshift(notification);
  db.notifications = db.notifications.slice(0, 200);
  return notification;
}

app.use((req, res, next) => {
  req.db = db;
  req.helpers = { ok, fail, getUserById, ensureChat, pushNotification, buildChatId, saveDb };
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      saveDb();
    }
    return originalJson(data);
  };
  next();
});

app.get('/api/health', (req, res) => {
  res.json(ok({ status: 'running', port: PORT }));
});

app.use('/api/user', userRouter);
app.use('/api/chat', chatRouter);
app.use('/api/team', teamRouter);
app.use('/api/ai', aiRouter);
app.use('/api/post', postRouter);

app.use((req, res) => {
  res.status(404).json(fail('接口不存在: ' + req.originalUrl, 404));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n[iTravelMap Server] running at http://127.0.0.1:${PORT}\n`);
  console.log('[API Routes]');
  console.log('  GET    /api/health');
  console.log('  POST   /api/user/login');
  console.log('  GET    /api/post/list');
  console.log('  GET    /api/post/detail');
  console.log('  GET    /api/post/myPosts');
  console.log('  POST   /api/post/create');
  console.log('  POST   /api/post/delete');
  console.log('  POST   /api/post/updateVisibility');
  console.log('  POST   /api/post/like');
  console.log('  GET    /api/post/myLikes');
  console.log('  POST   /api/post/comment');
  console.log('  GET    /api/post/comments');
  console.log('  GET    /api/chat/list');
  console.log('  GET    /api/chat/messages');
  console.log('  GET    /api/chat/notifications');
  console.log('  POST   /api/chat/read');
  console.log('  POST   /api/chat/notification/read');
  console.log('  POST   /api/chat/send');
  console.log('  GET    /api/team/list');
  console.log('  POST   /api/team/create');
  console.log('  POST   /api/team/apply');
  console.log('  POST   /api/team/review');
  console.log('  GET    /api/team/applications');
  console.log('  POST   /api/team/application/read');
  console.log('  GET    /api/team/comments');
  console.log('  POST   /api/team/comment');
  console.log('  POST   /api/team/interaction');
  console.log('  GET    /api/team/interactions');
  console.log('  POST   /api/team/interaction/read');
  console.log('  POST   /api/ai/plan\n');
});
