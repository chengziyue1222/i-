const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const {
      nickName,
      avatarUrl,
      manifesto,
      tags,
      bgImage
    } = event || {};

    if (!openid) {
      return {
        success: false,
        message: '请先登录'
      };
    }

    const userCollection = db.collection('users');
    const docId = String(openid);

    let current = null;
    try {
      const res = await userCollection.doc(docId).get();
      current = res.data || null;
    } catch (error) {
      current = null;
    }

    if (!current) {
      const initialDoc = {
        openid,
        nickName: nickName || '旅行爱好者',
        avatarUrl: avatarUrl || '',
        manifesto: manifesto || '用脚步丈量世界，用心感受每一处风景',
        tags: Array.isArray(tags) ? tags.slice(0, 8) : ['山水', '人文', '美食', '徒步'],
        bgImage: bgImage || '',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      };
      await userCollection.doc(docId).set({ data: initialDoc });
      return {
        success: true,
        data: {
          userInfo: {
            ...initialDoc,
            createTime: Date.now(),
            updateTime: Date.now()
          }
        }
      };
    }

    const updateData = {
      openid,
      updateTime: db.serverDate()
    };

    if (typeof nickName !== 'undefined') updateData.nickName = nickName || '旅行爱好者';
    if (typeof avatarUrl !== 'undefined') updateData.avatarUrl = avatarUrl || '';
    if (typeof manifesto !== 'undefined') updateData.manifesto = manifesto || '';
    if (typeof bgImage !== 'undefined') updateData.bgImage = bgImage || '';
    if (typeof tags !== 'undefined') updateData.tags = Array.isArray(tags) ? tags.slice(0, 8) : [];

    await userCollection.doc(docId).update({
      data: updateData
    });

    const nextRes = await userCollection.doc(docId).get();

    return {
      success: true,
      data: {
        userInfo: nextRes.data
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || '更新资料失败'
    };
  }
};
