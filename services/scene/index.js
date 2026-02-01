import {SceneData, SolutionData, NewsData, ScenicSpotData, AttractionData} from '../cloudbaseMock/index'
import { DATA_MODEL_KEY } from '../../config/model'

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
  
  // 从云数据库scene集合直接获取数据，不使用云函数
  console.log('[服务层] 使用云数据库直接查询，集合名: scene');
  
  try {
    const db = wx.cloud.database();
    const result = await db.collection('scene')
      .orderBy('heat', 'desc') // 按热度降序排序
      .get();
    
    console.log('[服务层] ✅ 云数据库返回成功:', result);
    console.log('[服务层] 返回数据类型:', Array.isArray(result.data) ? '数组' : typeof result.data);
    console.log('[服务层] 返回数据长度:', result.data ? result.data.length : 'null');
    
    // 返回数据数组
    return result.data || [];
  } catch (error) {
    console.error('[服务层] ❌ 从云数据库获取数据失败，降级使用Mock数据:', error.message);
    console.log('[服务层] 使用 Mock 数据，返回 ScenicSpotData:', ScenicSpotData);
    return ScenicSpotData;
  }
}

/** 获取景区详情数据 */
export async function fetchScenicSpotDetail(scenicId) {
  console.log('[服务层] fetchScenicSpotDetail() 被调用, scenicId:', scenicId);
  
  // 使用云数据库直接查询，使用where条件查询scenicId字段
  try {
    const db = wx.cloud.database();
    const result = await db.collection('scene')
      .where({
        scenicId: scenicId
      })
      .get();
    
    console.log('[服务层] ✅ 景区详情查询成功:', result);
    // 返回第一条匹配的数据
    return result.data && result.data.length > 0 ? result.data[0] : null;
  } catch (error) {
    console.error('[服务层] ❌ 从云数据库获取景区详情失败，降级使用Mock数据:', error.message);
    /** 返回景区详情 mock数据 */
    return ScenicSpotData.find((item)=> item?.scenicId === scenicId);
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