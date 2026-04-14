const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function buildDefaultUser(openid, nickName, avatarUrl) {
  return {
    openid,
    nickName: nickName || '旅行爱好者',
    avatarUrl: avatarUrl || '',
    manifesto: '用脚步丈量世界，用心感受每一处风景',
    tags: ['山水', '人文', '美食', '徒步'],
    bgImage: '',
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  };
}

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { nickName, avatarUrl } = event || {};

    if (!openid) {
      return {
        success: false,
        message: '获取 openid 失败'
      };
    }

    const userCollection = db.collection('users');
    const docId = String(openid);
    const nowName = nickName || '旅行爱好者';
    const nowAvatar = avatarUrl || '';

    let current = null;
    try {
      const res = await userCollection.doc(docId).get();
      current = res.data || null;
    } catch (error) {
      current = null;
    }

    if (current) {
      await userCollection.doc(docId).update({
        data: {
          openid,
          nickName: nowName,
          avatarUrl: nowAvatar,
          updateTime: db.serverDate()
        }
      });

      return {
        success: true,
        data: {
          userInfo: {
            ...current,
            _id: docId,
            openid,
            nickName: nowName,
            avatarUrl: nowAvatar
          }
        }
      };
    }

    const nextUser = buildDefaultUser(openid, nowName, nowAvatar);
    await userCollection.doc(docId).set({ data: nextUser });

    return {
      success: true,
      data: {
        userInfo: {
          ...nextUser,
          _id: docId,
          openid,
          nickName: nowName,
          avatarUrl: nowAvatar,
          createTime: Date.now(),
          updateTime: Date.now()
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || '登录失败'
    };
  }
};
