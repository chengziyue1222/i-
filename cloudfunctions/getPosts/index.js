const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

function normalizePost(doc, currentOpenid, likeCountMap, commentCountMap, likedMap) {
  return {
    id: doc._id,
    title: doc.title || '',
    content: doc.content || '',
    images: Array.isArray(doc.images) ? doc.images : [],
    cover: doc.cover || ((Array.isArray(doc.images) && doc.images[0]) || ''),
    desc: doc.desc || '',
    type: doc.type || '推荐',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    visibility: doc.visibility || 'public',
    createTime: doc.createTime,
    createdAt: doc.createdAt || 0,
    _openid: doc._openid || '',
    authorId: doc._openid || '',
    authorName: doc.authorName || '旅行者',
    authorAvatar: doc.authorAvatar || '',
    author: {
      name: doc.authorName || '旅行者',
      avatar: doc.authorAvatar || ''
    },
    likeCount: Number(likeCountMap[doc._id] || 0),
    commentCount: Number(commentCountMap[doc._id] || 0),
    liked: !!likedMap[doc._id],
    isMine: String(doc._openid || '') === String(currentOpenid || '')
  };
}

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const currentOpenid = wxContext.OPENID;
    const type = String((event && event.type) || '推荐');
    const keyword = String((event && event.keyword) || '').trim();

    const postRes = await db.collection('posts').orderBy('createTime', 'desc').get();
    var list = (postRes.data || []).filter(function (item) {
      if (item.visibility === 'private' && String(item._openid || '') !== String(currentOpenid || '')) return false;
      if (type !== '推荐' && String(item.type || '') !== type) return false;
      if (!keyword) return true;
      var source = [item.title, item.desc, item.content, (item.tags || []).join(' ')].join(' ');
      return source.indexOf(keyword) > -1;
    });

    const postIds = list.map(function (item) { return item._id; });
    const likeCountMap = {};
    const commentCountMap = {};
    const likedMap = {};

    if (postIds.length) {
      const [likeRes, commentRes] = await Promise.all([
        db.collection('post_like').where({ postId: _.in(postIds) }).get(),
        db.collection('post_comment').where({ postId: _.in(postIds) }).get()
      ]);

      (likeRes.data || []).forEach(function (item) {
        likeCountMap[item.postId] = Number(likeCountMap[item.postId] || 0) + 1;
        if (String(item.userOpenid || '') === String(currentOpenid || '')) likedMap[item.postId] = true;
      });

      (commentRes.data || []).forEach(function (item) {
        commentCountMap[item.postId] = Number(commentCountMap[item.postId] || 0) + 1;
      });
    }

    return {
      success: true,
      data: list.map(function (item) {
        return normalizePost(item, currentOpenid, likeCountMap, commentCountMap, likedMap);
      })
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || '获取帖子失败'
    };
  }
};
