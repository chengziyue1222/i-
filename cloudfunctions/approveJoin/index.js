const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { requestId, action } = event || {};
  const wxContext = cloud.getWXContext();
  const operatorId = wxContext.OPENID;

  if (!requestId) {
    return { success: false, message: 'requestId 不能为空' };
  }

  if (action !== 'accept' && action !== 'reject') {
    return { success: false, message: 'action 必须是 accept 或 reject' };
  }

  if (!operatorId) {
    return { success: false, message: '无法获取操作者身份' };
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      const reqRes = await transaction.collection('join_request').doc(requestId).get();
      const reqDoc = reqRes.data;

      if (!reqDoc) {
        throw new Error('申请记录不存在');
      }

      const { groupId, userId } = reqDoc;
      if (!groupId || !userId) {
        throw new Error('申请记录数据不完整');
      }

      const groupRes = await transaction.collection('group').doc(groupId).get();
      const group = groupRes.data;

      if (!group) {
        throw new Error('搭子组不存在');
      }

      // 只允许帖主审核
      if (group.creatorId !== operatorId) {
        throw new Error('无权限操作该申请');
      }

      // 防止重复审核
      if (reqDoc.status === 'accepted' || reqDoc.status === 'rejected') {
        throw new Error('该申请已处理');
      }

      if (action === 'reject') {
        await transaction.collection('join_request').doc(requestId).update({
          data: {
            status: 'rejected',
            updateTime: db.serverDate()
          }
        });
        return { success: true };
      }

      // accept 逻辑
      const members = Array.isArray(group.members) ? group.members : [];
      const maxPeople = Number(group.maxPeople || 0);
      const currentPeople = Number(group.currentPeople || members.length || 0);

      // 防止重复加入
      if (members.includes(userId)) {
        await transaction.collection('join_request').doc(requestId).update({
          data: {
            status: 'accepted',
            updateTime: db.serverDate()
          }
        });
        return { success: true };
      }

      // 满员拦截
      if (maxPeople > 0 && currentPeople >= maxPeople) {
        throw new Error('当前组队已满员');
      }

      const newMembers = members.concat(userId);
      const newCurrentPeople = currentPeople + 1;
      const isFull = maxPeople > 0 && newCurrentPeople >= maxPeople;

      await transaction.collection('join_request').doc(requestId).update({
        data: {
          status: 'accepted',
          updateTime: db.serverDate()
        }
      });

      await transaction.collection('group').doc(groupId).update({
        data: {
          members: newMembers,
          currentPeople: newCurrentPeople,
          status: isFull ? 'locked' : (group.status || 'recruiting'),
          updateTime: db.serverDate()
        }
      });

      return { success: true };
    });

    return result || { success: true };
  } catch (error) {
    console.error('[approveJoin][transaction] error:', error);
    return {
      success: false,
      message: error.message || '审核失败'
    };
  }
};
