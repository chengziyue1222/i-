const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { postId } = event || {};

    if (!openid) {
      return { success: false, message: '请先登录' };
    }
    if (!postId) {
      return { success: false, message: '缺少 postId' };
    }

    const likeCollection = db.collection('post_like');
    const existed = await likeCollection.where({
      postId: String(postId),
      userOpenid: openid
    }).limit(1).get();

    let liked = false;
    if (existed.data && existed.data.length) {
      await likeCollection.doc(existed.data[0]._id).remove();
      liked = false;
    } else {
      await likeCollection.add({
        data: {
          postId: String(postId),
          userOpenid: openid,
          createTime: db.serverDate(),
          createdAt: Date.now()
        }
      });
      liked = true;
    }

    const countRes = await likeCollection.where({ postId: String(postId) }).count();

    return {
      success: true,
      data: {
        liked,
        likeCount: countRes.total || 0
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || '点赞失败'
    };
  }
};
