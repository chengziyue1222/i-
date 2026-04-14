const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { postId } = event || {};

    if (!openid) return { success: false, message: '请先登录' };
    if (!postId) return { success: false, message: '缺少 postId' };

    const postRes = await db.collection('posts').doc(String(postId)).get();
    const post = postRes.data;
    if (!post) return { success: false, message: '帖子不存在' };
    if (String(post._openid || '') !== String(openid)) {
      return { success: false, message: '无权删除该帖子' };
    }

    await Promise.all([
      db.collection('posts').doc(String(postId)).remove(),
      db.collection('post_like').where({ postId: String(postId) }).remove(),
      db.collection('post_comment').where({ postId: String(postId) }).remove()
    ]);

    return { success: true, data: true };
  } catch (error) {
    return {
      success: false,
      message: error.message || '删除失败'
    };
  }
};
