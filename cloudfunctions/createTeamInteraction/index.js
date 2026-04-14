const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  try {
    const { type, userEmoji, userName, desc, postId, ownerId } = event || {};

    if (!ownerId) {
      return {
        success: false,
        message: '缺少 ownerId'
      };
    }

    const data = {
      ownerId: String(ownerId),
      type: type || 'like',
      userEmoji: userEmoji || '👍',
      userName: userName || '有人',
      desc: desc || '',
      postId: postId || '',
      time: '刚刚',
      unread: true,
      createdAt: db.serverDate(),
      updateTime: db.serverDate()
    };

    const result = await db.collection('team_interaction').add({ data });

    return {
      success: true,
      data: {
        id: result._id,
        ...data
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || '创建互动失败'
    };
  }
};
