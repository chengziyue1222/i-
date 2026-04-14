const express = require('express');

const router = express.Router();

function getPostVisibility(post) {
  return post && post.visibility === 'private' ? 'private' : 'public';
}

function canViewPost(post, userId) {
  if (!post) return false;
  return getPostVisibility(post) === 'public' || String(post.authorId) === String(userId || '');
}

function normalizePost(post, userId, db) {
  const likeCount = db.postLikes.filter((item) => String(item.postId) === String(post.id)).length;
  const commentCount = db.postComments.filter((item) => String(item.postId) === String(post.id)).length;
  const liked = userId
    ? db.postLikes.some((item) => String(item.postId) === String(post.id) && String(item.userId) === String(userId))
    : false;

  return Object.assign({}, post, {
    visibility: getPostVisibility(post),
    likeCount,
    commentCount,
    liked,
    author: post.author || { name: '匿名用户', avatar: '' }
  });
}

function formatComment(comment, db) {
  const user = db.users.find((item) => String(item.userId) === String(comment.userId));
  return Object.assign({}, comment, {
    userName: comment.userName || (user && user.nickName) || '旅行者',
    userAvatar: comment.userAvatar || (user && user.avatarUrl) || ''
  });
}

router.get('/list', (req, res) => {
  const { type = '推荐', keyword = '', userId = '' } = req.query || {};
  const { ok } = req.helpers;
  const db = req.db;

  const normalizedType = String(type || '推荐');
  const normalizedKeyword = String(keyword || '').trim();

  const list = db.posts
    .slice()
    .filter((item) => canViewPost(item, userId))
    .filter((item) => {
      if (normalizedType !== '推荐' && String(item.type) !== normalizedType) return false;
      if (!normalizedKeyword) return true;
      const source = [item.title, item.desc, item.content, (item.tags || []).join(' ')].join(' ');
      return source.indexOf(normalizedKeyword) > -1;
    })
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .map((item) => normalizePost(item, userId, db));

  return res.json(req.helpers.ok(list));
});

router.get('/detail', (req, res) => {
  const { id, userId = '' } = req.query || {};
  const { ok, fail } = req.helpers;
  const db = req.db;

  if (!id) return res.json(fail('缺少帖子 id'));

  const post = db.posts.find((item) => String(item.id) === String(id));
  if (!post) return res.json(fail('帖子不存在'));
  if (!canViewPost(post, userId)) return res.json(fail('无权查看该帖子'));

  return res.json(ok(normalizePost(post, userId, db)));
});

router.get('/myPosts', (req, res) => {
  const { userId } = req.query || {};
  const { ok, fail } = req.helpers;
  const db = req.db;

  if (!userId) return res.json(fail('缺少 userId'));

  const list = db.posts
    .slice()
    .filter((item) => String(item.authorId) === String(userId))
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .map((item) => normalizePost(item, userId, db));

  return res.json(ok(list));
});

router.post('/create', (req, res) => {
  const body = req.body || {};
  const { ok, fail, getUserById } = req.helpers;
  const db = req.db;

  if (!body.title || !body.type || !body.content) {
    return res.json(fail('缺少必要参数'));
  }

  const authorId = String(body.authorId || 'u003');
  const user = getUserById(authorId) || {};
  const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
  const tags = Array.isArray(body.tags) ? body.tags.filter(Boolean) : [];

  const post = {
    id: 'p' + Date.now(),
    title: String(body.title),
    content: String(body.content),
    images,
    cover: images[0] || body.cover || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80',
    desc: String(body.desc || body.content).slice(0, 42),
    type: String(body.type),
    tags,
    visibility: body.visibility === 'private' ? 'private' : 'public',
    authorId,
    author: {
      name: user.nickName || body.authorName || '旅行者',
      avatar: user.avatarUrl || body.authorAvatar || ''
    },
    likeCount: 0,
    commentCount: 0,
    createdAt: Date.now()
  };

  db.posts.unshift(post);
  return res.json(ok(normalizePost(post, authorId, db)));
});

router.post('/delete', (req, res) => {
  const { postId, userId } = req.body || {};
  const { ok, fail } = req.helpers;
  const db = req.db;

  if (!postId || !userId) return res.json(fail('缺少必要参数'));

  const postIndex = db.posts.findIndex((item) => String(item.id) === String(postId));
  if (postIndex < 0) return res.json(fail('帖子不存在'));
  if (String(db.posts[postIndex].authorId) !== String(userId)) return res.json(fail('无权删除该帖子'));

  db.posts.splice(postIndex, 1);
  db.postLikes = db.postLikes.filter((item) => String(item.postId) !== String(postId));
  db.postComments = db.postComments.filter((item) => String(item.postId) !== String(postId));
  db.interactions = db.interactions.filter((item) => String(item.postId) !== String(postId));

  return res.json(ok(true));
});

router.post('/updateVisibility', (req, res) => {
  const { postId, userId, visibility } = req.body || {};
  const { ok, fail } = req.helpers;
  const db = req.db;

  if (!postId || !userId || !visibility) return res.json(fail('缺少必要参数'));
  if (visibility !== 'public' && visibility !== 'private') return res.json(fail('visibility 无效'));

  const post = db.posts.find((item) => String(item.id) === String(postId));
  if (!post) return res.json(fail('帖子不存在'));
  if (String(post.authorId) !== String(userId)) return res.json(fail('无权修改该帖子'));

  post.visibility = visibility;
  return res.json(ok(normalizePost(post, userId, db)));
});

router.post('/like', (req, res) => {
  const { postId, userId } = req.body || {};
  const { ok, fail, getUserById } = req.helpers;
  const db = req.db;

  if (!postId || !userId) return res.json(fail('缺少必要参数'));

  const post = db.posts.find((item) => String(item.id) === String(postId));
  if (!post) return res.json(fail('帖子不存在'));
  if (!canViewPost(post, userId)) return res.json(fail('无权操作该帖子'));

  const existingIndex = db.postLikes.findIndex((item) => String(item.postId) === String(postId) && String(item.userId) === String(userId));
  let liked = false;

  if (existingIndex > -1) {
    db.postLikes.splice(existingIndex, 1);
    liked = false;
  } else {
    db.postLikes.unshift({
      id: 'like_' + Date.now(),
      userId: String(userId),
      postId: String(postId),
      createdAt: Date.now()
    });
    liked = true;

    if (String(post.authorId) !== String(userId)) {
      const user = getUserById(userId) || {};
      db.interactions.unshift({
        id: 'int_' + Date.now(),
        type: 'like',
        userEmoji: user.emoji || '❤️',
        userName: user.nickName || '旅行者',
        desc: (user.nickName || '旅行者') + ' 赞了你的帖子《' + post.title + '》',
        postId: String(postId),
        time: '刚刚',
        unread: true
      });
    }
  }

  const likeCount = db.postLikes.filter((item) => String(item.postId) === String(postId)).length;
  return res.json(ok({ liked, likeCount }));
});

router.get('/myLikes', (req, res) => {
  const { userId } = req.query || {};
  const { ok, fail } = req.helpers;
  const db = req.db;

  if (!userId) return res.json(fail('缺少 userId'));

  const postIds = db.postLikes
    .filter((item) => String(item.userId) === String(userId))
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .map((item) => String(item.postId));

  const list = postIds
    .map((postId) => db.posts.find((item) => String(item.id) === String(postId)))
    .filter((item) => item && canViewPost(item, userId))
    .map((item) => normalizePost(item, userId, db));

  return res.json(ok(list));
});

router.post('/comment', (req, res) => {
  const { postId, userId, content } = req.body || {};
  const { ok, fail, getUserById } = req.helpers;
  const db = req.db;

  if (!postId || !userId || !content) return res.json(fail('缺少必要参数'));

  const post = db.posts.find((item) => String(item.id) === String(postId));
  if (!post) return res.json(fail('帖子不存在'));
  if (!canViewPost(post, userId)) return res.json(fail('无权评论该帖子'));

  const user = getUserById(userId) || {};
  const comment = {
    id: 'pc_' + Date.now(),
    postId: String(postId),
    userId: String(userId),
    userName: user.nickName || '旅行者',
    userAvatar: user.avatarUrl || '',
    content: String(content),
    createdAt: Date.now()
  };

  db.postComments.unshift(comment);

  if (String(post.authorId) !== String(userId)) {
    db.interactions.unshift({
      id: 'int_' + Date.now(),
      type: 'comment',
      userEmoji: user.emoji || '💬',
      userName: user.nickName || '旅行者',
      desc: (user.nickName || '旅行者') + ' 评论了你的帖子：「' + String(content) + '」',
      postId: String(postId),
      time: '刚刚',
      unread: true
    });
  }

  return res.json(ok(formatComment(comment, db)));
});

router.get('/comments', (req, res) => {
  const { postId } = req.query || {};
  const { ok, fail } = req.helpers;
  const db = req.db;

  if (!postId) return res.json(fail('缺少 postId'));

  const post = db.posts.find((item) => String(item.id) === String(postId));
  if (!post) return res.json(fail('帖子不存在'));

  const list = db.postComments
    .filter((item) => String(item.postId) === String(postId))
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .map((item) => formatComment(item, db));

  return res.json(ok(list));
});

module.exports = router;
