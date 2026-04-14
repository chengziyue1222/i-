const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { title, content, type, tags, images, visibility } = event || {};

    if (!openid) {
      return { success: false, message: '请先登录' };
    }
    if (!title || !content) {
      return { success: false, message: '缺少必要参数' };
    }

    const userRes = await db.collection('users').where({ openid }).limit(1).get();
    const user = (userRes.data || [])[0] || {};
    const imageList = Array.isArray(images) ? images.filter(Boolean) : [];
    const tagList = Array.isArray(tags) ? tags.filter(Boolean) : [];

    const data = {
      title: String(title),
      content: String(content),
      type: type || '景点',
      tags: tagList,
      images: imageList,
      cover: imageList[0] || '',
      desc: String(content).slice(0, 42),
      visibility: visibility === 'private' ? 'private' : 'public',
      authorName: user.nickName || '旅行者',
      authorAvatar: user.avatarUrl || '',
      _openid: openid,
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
      createdAt: Date.now()
    };

    const addRes = await db.collection('posts').add({ data });

    return {
      success: true,
      data: {
        id: addRes._id,
        ...data,
        likeCount: 0,
        commentCount: 0,
        liked: false,
        author: {
          name: data.authorName,
          avatar: data.authorAvatar
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || '发布失败'
    };
  }
};
