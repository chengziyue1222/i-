const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { postId, visibility } = event || {};

    if (!openid) return { success: false, message: '请先登录' };
    if (!postId || !visibility) return { success: false, message: '缺少必要参数' };
    if (visibility !== 'public' && visibility !== 'private') {
      return { success: false, message: 'visibility 无效' };
    }

    const postRes = await db.collection('posts').doc(String(postId)).get();
    const post = postRes.data;
    if (!post) return { success: false, message: '帖子不存在' };
    if (String(post._openid || '') !== String(openid)) {
      return { success: false, message: '无权修改该帖子' };
    }

    await db.collection('posts').doc(String(postId)).update({
      data: {
        visibility,
        updateTime: db.serverDate()
      }
    });

    return { success: true, data: true };
  } catch (error) {
    return {
      success: false,
      message: error.message || '设置失败'
    };
  }
};
