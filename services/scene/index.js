import {SceneData, SolutionData, NewsData, ScenicSpotData, AttractionData} from '../cloudbaseMock/index'
import { DATA_MODEL_KEY } from '../../config/model'
import { DEFAULT_SCENIC_IMAGE, resolveScenicImageUrlByName } from '../../config/scenic-images';

function resolveScenicImageUrl(item = {}) {
  const scenicName = (item.scenicName || item.name || '').trim();
  return item.imageUrl || resolveScenicImageUrlByName(scenicName) || (item.images && item.images[0]) || DEFAULT_SCENIC_IMAGE;
}

/** 获取应用场景数据 */
export async function fetchSceneData(params) {
  /** 返回应用场景 mock数据 */
  return SceneData;
}

/** 获取应用场景数据详情 */
export async function fetchSceneDetail(id,type) {
  /** 返回应用场景 mock数据 */
  if(type === 'news'){
    return NewsData.find((item)=> item?._id === id);
  }else if(type === 'scene'){
    return SceneData.find((item)=> item?._id === id);
  }else if(type === 'solution'){
    return SolutionData.find((item)=> item?._id === id);
  }
}

/** 获取景区列表数据 */
export async function fetchScenicSpotData() {
  console.log('[服务层] fetchScenicSpotData() 被调用');
  
  // 从云数据库scene集合直接获取数据
  console.log('[服务层] 使用云数据库直接查询，集合名: scene');
  
  try {
    const db = wx.cloud.database();
    const result = await db.collection('scene')
      .orderBy('heat', 'desc') // 按热度降序排序
      .get();
    
    console.log('[服务层] ✅ 云数据库返回成功:', result);
    console.log('[服务层] 返回数据类型:', Array.isArray(result.data) ? '数组' : typeof result.data);
    console.log('[服务层] 返回数据长度:', result.data ? result.data.length : 'null');
    
    // 打印第一条数据的字段，方便调试
    if (result.data && result.data.length > 0) {
      console.log('[服务层] 第一条数据的字段:', Object.keys(result.data[0]));
      console.log('[服务层] 第一条数据内容:', result.data[0]);
    }
    
    // 返回数据数组，注入 imageUrl
    return (result.data || []).map(item => ({
      ...item,
      imageUrl: resolveScenicImageUrl(item)
    }));
  } catch (error) {
    console.error('[服务层] ❌ 从云数据库获取数据失败:', error.message);
    return [];
  }
}

/** 获取景区详情数据 */
export async function fetchScenicSpotDetail(scenicId) {
  console.log('[服务层] fetchScenicSpotDetail() 被调用, scenicId:', scenicId);

  // 使用云数据库直接查询，兼容多种ID字段
  try {
    const db = wx.cloud.database();
    // 先尝试按 scenicId 查询
    let result = await db.collection('scene')
      .where({
        scenicId: scenicId
      })
      .get();

    // 如果 scenicId 查询无结果，尝试按 _id 查询
    if (!result.data || result.data.length === 0) {
      console.log('[服务层] scenicId 查询无结果，尝试按 _id 查询');
      result = await db.collection('scene')
        .where({
          _id: scenicId
        })
        .get();
    }

    console.log('[服务层] ✅ 景区详情查询成功:', result);
    if (result.data && result.data.length > 0) {
      const item = result.data[0];
      return { ...item, imageUrl: resolveScenicImageUrl(item) };
    }
    return null;
  } catch (error) {
    console.error('[服务层] ❌ 从云数据库获取景区详情失败:', error.message);
    return null;
  }
}

/** 获取景区景点列表数据 */
export async function fetchAttractionData(scenicId) {
  console.log('[服务层] fetchAttractionData() 被调用, scenicId:', scenicId);
  
  // 从云数据库attraction集合获取数据，按sortOrder升序排序
  try {
    const db = wx.cloud.database();
    const result = await db.collection('attraction')
      .where({
        scenicId: scenicId
      })
      .orderBy('sortOrder', 'asc')
      .get();
    
    console.log('[服务层] ✅ 景点列表查询成功:', result);
    return result.data || [];
  } catch (error) {
    console.error('[服务层] ❌ 从云数据库获取景点列表失败，降级使用Mock数据:', error.message);
    /** 返回景区景点 mock数据 */
    return AttractionData[scenicId] || [];
  }
}