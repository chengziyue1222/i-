/** 搭子帖子相关服务 - 支持云数据库与 Mock 降级 */

// Mock 数据：搭子帖子列表
const MockPostData = [
  {
    postId: 'post_001',
    publisher: {
      avatar: 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6RIrAkxqNLemdadAQmcZ20fhOd0I5bh1HfCnvq2vGDKz9w/132',
      nickname: '旅行小达人'
    },
    destination: '七星岩风景区',
    departureTime: '2025-03-22 09:00',
    peopleNeeded: 3,
    tags: ['徒步', '拍照']
  },
  {
    postId: 'post_002',
    publisher: {
      avatar: 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6RIrAkxqNLemdadAQmcZ20fhOd0I5bh1HfCnvq2vGDKz9w/132',
      nickname: '山水爱好者'
    },
    destination: '鼎湖山景区',
    departureTime: '2025-03-23 08:30',
    peopleNeeded: 2,
    tags: ['登山', '吸氧']
  },
  {
    postId: 'post_003',
    publisher: {
      avatar: 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6RIrAkxqNLemdadAQmcZ20fhOd0I5bh1HfCnvq2vGDKz9w/132',
      nickname: '美食探店王'
    },
    destination: '端州古城',
    departureTime: '2025-03-24 10:00',
    peopleNeeded: 4,
    tags: ['美食', '打卡']
  },
  {
    postId: 'post_004',
    publisher: {
      avatar: 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6RIrAkxqNLemdadAQmcZ20fhOd0I5bh1HfCnvq2vGDKz9w/132',
      nickname: '户外运动控'
    },
    destination: '星湖风景区',
    departureTime: '2025-03-25 07:00',
    peopleNeeded: 2,
    tags: ['骑行', '环湖']
  }
];

/**
 * 获取搭子帖子列表
 */
export async function fetchPostList(params = {}) {
  const { pageSize = 20, pageNum = 1 } = params;
  try {
    const db = wx.cloud.database();
    const result = await db.collection('travel_post')
      .orderBy('createTime', 'desc')
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .get();
    if (result.data && result.data.length > 0) {
      return result.data.map(normalizePost);
    }
  } catch (err) {
    console.warn('[post] 云数据库获取搭子帖子失败，使用 Mock:', err.message);
  }
  return MockPostData;
}

/**
 * 获取帖子详情
 */
export async function fetchPostDetail(postId) {
  try {
    const db = wx.cloud.database();
    const result = await db.collection('travel_post')
      .where({ postId: postId })
      .get();
    if (result.data && result.data.length > 0) {
      return normalizePost(result.data[0]);
    }
  } catch (err) {
    console.warn('[post] 云数据库获取帖子详情失败:', err.message);
  }
  return MockPostData.find(p => p.postId === postId) || null;
}

/**
 * 统一帖子数据结构
 */
function normalizePost(raw) {
  return {
    postId: raw.postId || raw._id,
    publisher: raw.publisher || {
      avatar: 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6RIrAkxqNLemdadAQmcZ20fhOd0I5bh1HfCnvq2vGDKz9w/132',
      nickname: raw.publisherName || '匿名用户'
    },
    destination: raw.destination || '',
    departureTime: raw.departureTime || '',
    peopleNeeded: raw.peopleNeeded || 1,
    tags: Array.isArray(raw.tags) ? raw.tags : (raw.tags ? [raw.tags] : []),
    content: raw.content || ''
  };
}
