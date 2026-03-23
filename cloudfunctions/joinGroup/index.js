const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const { groupId } = event || {};
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

    // 防重复申请：同一用户对同一组队只允许申请一次
    const existed = await db.collection('join_request')
      .where({
        groupId,
        userId
      })
      .limit(1)
      .get();

    if (existed.data && existed.data.length > 0) {
      return {
        success: false,
        message: '你已经申请过该搭子了'
      };
    }

    await db.collection('join_request').add({
      data: {
        groupId,
        userId,
        status: 'pending',
        createTime: db.serverDate()
      }
    });

    return {
      success: true,
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
