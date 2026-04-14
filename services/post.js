function getDb() {
  if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.database) {
    throw new Error('云开发未初始化');
  }
  return wx.cloud.database();
}

function getCommand() {
  return getDb().command;
}

function callCloud(name, data) {
  if (!name) {
    throw new Error('云函数名称不能为空');
  }
  if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.callFunction) {
    throw new Error('云开发未初始化');
  }

  return wx.cloud.callFunction({
    name,
    data: data || {}
  }).then(function (res) {
    if (res.result && res.result.success) {
      return typeof res.result.data === 'undefined' ? true : res.result.data;
    }
    throw new Error((res.result && (res.result.message || res.result.errMsg)) || ('云函数 ' + name + ' 调用失败'));
  }).catch(function (error) {
    var message = error && error.message ? error.message : '';
    if (message.indexOf('FUNCTION_NOT_FOUND') > -1 || message.indexOf('FunctionName parameter could not be found') > -1) {
      throw new Error('云函数 ' + name + ' 未找到，请先上传并部署该云函数');
    }
    if (message.indexOf('云函数 ') === 0 || message.indexOf('请先上传并部署') > -1) {
      throw error;
    }
    throw new Error(message || ('云函数 ' + name + ' 调用异常'));
  });
}

function getCurrentOpenId() {
  var ui = wx.getStorageSync('userInfo') || {};
  return String(ui.openid || ui._openid || '');
}

function normalizePost(doc, currentOpenId, likeCount, commentCount, liked) {
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
    createdAt: doc.createdAt || doc.createTime,
    _openid: doc._openid || '',
    authorId: doc._openid || '',
    authorName: doc.authorName || '旅行者',
    authorAvatar: doc.authorAvatar || '',
    author: {
      name: doc.authorName || '旅行者',
      avatar: doc.authorAvatar || ''
    },
    likeCount: Number(likeCount || 0),
    commentCount: Number(commentCount || 0),
    liked: !!liked,
    isMine: String(doc._openid || '') === String(currentOpenId || '')
  };
}

function ensureLoggedIn() {
  var openid = getCurrentOpenId();
  if (!openid) {
    throw new Error('请先登录');
  }
  return openid;
}

function decoratePosts(posts, currentOpenId) {
  var db = getDb();
  var _ = getCommand();
  var postIds = (posts || []).map(function (item) { return item._id; });
  if (!postIds.length) return Promise.resolve([]);

  var likesPromise = db.collection('post_like').where({ postId: _.in(postIds) }).get();
  var commentsPromise = db.collection('post_comment').where({ postId: _.in(postIds) }).get();

  return Promise.all([likesPromise, commentsPromise]).then(function (result) {
    var likes = result[0].data || [];
    var comments = result[1].data || [];
    return posts.map(function (item) {
      var likeCount = likes.filter(function (like) { return String(like.postId) === String(item._id); }).length;
      var commentCount = comments.filter(function (comment) { return String(comment.postId) === String(item._id); }).length;
      var liked = likes.some(function (like) {
        return String(like.postId) === String(item._id) && String(like.userOpenid || '') === String(currentOpenId || '');
      });
      return normalizePost(item, currentOpenId, likeCount, commentCount, liked);
    });
  });
}

function getPostList(params) {
  return callCloud('getPosts', params || {});
}

function getPostDetail(id) {
  if (!id) {
    return Promise.reject(new Error('缺少帖子 id'));
  }
  var currentOpenId = getCurrentOpenId();
  return getDb().collection('posts').doc(String(id)).get().then(function (res) {
    var post = res.data;
    if (!post) throw new Error('帖子不存在');
    if (post.visibility === 'private' && String(post._openid || '') !== String(currentOpenId || '')) {
      throw new Error('无权查看该帖子');
    }
    return decoratePosts([post], currentOpenId).then(function (list) {
      return list[0] || null;
    });
  });
}

function createPost(data) {
  return callCloud('createPost', data || {});
}

function likePost(data) {
  if (!data || !data.postId) {
    return Promise.reject(new Error('缺少 postId'));
  }
  ensureLoggedIn();
  return callCloud('togglePostLike', { postId: String(data.postId) });
}

function getMyLikes() {
  var currentOpenId = ensureLoggedIn();
  var db = getDb();
  var _ = getCommand();
  return db.collection('post_like').where({ userOpenid: currentOpenId }).orderBy('createTime', 'desc').get().then(function (res) {
    var likes = res.data || [];
    var postIds = likes.map(function (item) { return String(item.postId); });
    if (!postIds.length) return [];
    return db.collection('posts').where({ _id: _.in(postIds) }).get().then(function (postRes) {
      var posts = postIds.map(function (id) {
        return (postRes.data || []).find(function (item) { return String(item._id) === String(id); });
      }).filter(Boolean);
      return decoratePosts(posts, currentOpenId);
    });
  });
}

function getMyPosts() {
  var currentOpenId = ensureLoggedIn();
  return getDb().collection('posts').where({ _openid: currentOpenId }).orderBy('createTime', 'desc').get().then(function (res) {
    return decoratePosts(res.data || [], currentOpenId);
  });
}

function deletePost(data) {
  if (!data || !data.postId) {
    return Promise.reject(new Error('缺少 postId'));
  }
  ensureLoggedIn();
  return callCloud('deletePost', { postId: String(data.postId) });
}

function updatePostVisibility(data) {
  if (!data || !data.postId || !data.visibility) {
    return Promise.reject(new Error('缺少必要参数'));
  }
  ensureLoggedIn();
  return callCloud('updatePostVisibility', {
    postId: String(data.postId),
    visibility: data.visibility
  });
}

function createComment(data) {
  if (!data || !data.postId || !data.content) {
    return Promise.reject(new Error('缺少必要参数'));
  }
  ensureLoggedIn();
  return callCloud('createPostComment', {
    postId: String(data.postId),
    content: String(data.content)
  });
}

function getComments(postId) {
  if (!postId) {
    return Promise.reject(new Error('缺少 postId'));
  }
  return getDb().collection('post_comment').where({ postId: String(postId) }).orderBy('createTime', 'asc').get().then(function (res) {
    return (res.data || []).map(function (item) {
      return {
        id: item._id,
        postId: item.postId,
        userOpenid: item.userOpenid || '',
        userName: item.userName || '旅行者',
        userAvatar: item.userAvatar || '',
        userEmoji: item.userEmoji || '💬',
        content: item.content || '',
        createTime: item.createTime,
        createdAt: item.createdAt || item.createTime,
        time: item.time || '刚刚'
      };
    });
  });
}

module.exports = {
  getPostList,
  fetchPostList: getPostList,
  getPostDetail,
  fetchPostDetail: getPostDetail,
  createPost,
  likePost,
  getMyLikes,
  getMyPosts,
  deletePost,
  updatePostVisibility,
  createComment,
  getComments
};
