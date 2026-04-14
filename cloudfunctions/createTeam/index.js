const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const {
      creatorId,
      nickname,
      destination,
      startTime,
      max,
      tags,
      intro,
      cover,
      imageUrl
    } = event || {};

    const wxContext = cloud.getWXContext();
    const openId = wxContext.OPENID;
    const finalCreatorId = String(openId || '');

    if (!finalCreatorId) {
      return {
        success: false,
        message: '无法获取当前用户身份'
      };
    }

    if (!destination) {
      return {
        success: false,
        message: '目的地不能为空'
      };
    }

    if (max && (max < 2 || max > 20)) {
      return {
        success: false,
        message: '人数限制必须在2-20之间'
      };
    }

    const groupData = {
      creatorId: finalCreatorId,
      nickname: nickname || '旅行爱好者',
      destination,
      startTime: startTime || '待定',
      max: max || 4,
      tags: Array.isArray(tags) ? tags : [],
      intro: intro || '欢迎加入，一起出发。',
      cover: cover || {
        color: 'linear-gradient(135deg,#4facfe,#00f2fe)',
        emoji: '🌄'
      },
      imageUrl: imageUrl || '',
      members: [finalCreatorId],
      currentPeople: 1,
      status: 'recruiting',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    const result = await db.collection('group').add({
      data: groupData
    });

    return {
      success: true,
      data: {
        id: result._id,
        groupId: result._id,
        current: 1,
        remainCount: Math.max(Number(groupData.max || 0) - 1, 0),
        ...groupData
      },
      message: '组队创建成功'
    };
  } catch (error) {
    console.error('[createTeam] error:', error);
    return {
      success: false,
      message: error.message || '创建组队失败'
    };
  }
};
