const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { postId, content } = event || {};

    if (!openid) {
      return { success: false, message: '请先登录' };
    }
    if (!postId || !content) {
      return { success: false, message: '缺少必要参数' };
    }

    const userRes = await db.collection('users').where({ openid }).limit(1).get();
    const user = (userRes.data || [])[0] || {};

    const data = {
      postId: String(postId),
      userOpenid: openid,
      userName: user.nickName || '旅行者',
      userAvatar: user.avatarUrl || '',
      userEmoji: user.emoji || '💬',
      content: String(content),
      time: '刚刚',
      createTime: db.serverDate(),
      createdAt: Date.now(),
      updateTime: db.serverDate()
    };

    const addRes = await db.collection('post_comment').add({ data });

    return {
      success: true,
      data: {
        id: addRes._id,
        ...data
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || '评论失败'
    };
  }
};
