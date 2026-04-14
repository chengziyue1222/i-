const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const { groupId, message, fromUserName, fromUserEmoji } = event || {};
    const wxContext = cloud.getWXContext();
    const userId = wxContext.OPENID;

    if (!groupId) {
      return {
        success: false,
        message: 'groupId 不能为空'
      };
    }

    if (!userId) {
      return {
        success: false,
        message: '无法获取用户身份'
      };
    }

    const groupRes = await db.collection('group').doc(String(groupId)).get();
    const group = groupRes.data;

    if (!group) {
      return {
        success: false,
        message: '组队不存在'
      };
    }

    if (String(group.creatorId || '') === String(userId)) {
      return {
        success: false,
        message: '不能申请加入自己创建的组队'
      };
    }

    const existed = await db.collection('join_request')
      .where({
        groupId: String(groupId),
        fromUserId: String(userId)
      })
      .limit(1)
      .get();

    if (existed.data && existed.data.length > 0) {
      return {
        success: false,
        message: '你已经申请过该搭子了'
      };
    }

    const createResult = await db.collection('join_request').add({
      data: {
        groupId: String(groupId),
        groupName: group.destination || '组队',
        groupDest: group.destination || '',
        fromUserId: String(userId),
        fromUserName: fromUserName || '申请人',
        fromUserEmoji: fromUserEmoji || '🙋',
        targetUserId: group.creatorId || '',
        targetUserName: group.nickname || '队长',
        targetUserEmoji: (group.cover && group.cover.emoji) || '🧭',
        message: message || '',
        status: 'pending',
        unread: true,
        applicantUnread: false,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });

    return {
      success: true,
      data: {
        id: createResult._id
      },
      message: '申请已提交'
    };
  } catch (error) {
    console.error('[joinGroup] error:', error);
    return {
      success: false,
      message: error.message || '申请失败'
    };
  }
};
