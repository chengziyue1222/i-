const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  try {
    const {
      postId,
      userId,
      userName,
      userEmoji,
      content,
      postAuthor,
      ownerId
    } = event || {};

    if (!postId || !content) {
      return {
        success: false,
        message: '缺少必要参数'
      };
    }

    const data = {
      postId: String(postId),
      userId: String(userId || ''),
      userName: userName || '我',
      userEmoji: userEmoji || '🙋',
      content: String(content),
      time: '刚刚',
      ts: Date.now(),
      createdAt: db.serverDate(),
      updateTime: db.serverDate()
    };

    const result = await db.collection('team_comment').add({ data });

    if (postAuthor && ownerId && postAuthor !== data.userName) {
      await db.collection('team_interaction').add({
        data: {
          ownerId: String(ownerId),
          type: 'comment',
          userEmoji: '💬',
          userName: data.userName,
          desc: data.userName + ' 评论了你：「' + data.content + '」',
          postId: String(postId),
          time: '刚刚',
          unread: true,
          createdAt: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
    }

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
      message: error.message || '评论失败'
    };
  }
};
