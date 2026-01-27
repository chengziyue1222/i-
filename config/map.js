/**
 * 地图配置
 * 统一存放腾讯地图API相关配置
 */

// 腾讯地图API Key
// 注意：如果Key出现请求量限制，请自行申请替换
export const TENCENT_MAP_API_KEY = '6X2BZ-U466S-CKFOJ-67NXH-HLOSO-VRFLE';

// 腾讯地图API基础URL
export const TENCENT_MAP_API_URL = 'https://apis.map.qq.com';

// API接口路径
export const TENCENT_MAP_APIS = {
  placeSearch: '/ws/place/v1/search',      // 地点搜索
  direction: '/ws/direction/v1/driving',   // 路线规划
  geocoder: '/ws/geocoder/v1/',            // 逆地址解析
};

// 默认配置
export const TENCENT_MAP_CONFIG = {
  maxSearchRadius: 3000,  // 最大搜索范围（米）
  pageSize: 10,           // 每页结果数量
  defaultDelay: 200,      // 请求间隔（毫秒）
  maxRequestsPerSecond: 5, // 每秒最大请求数
};

export default {
  apiKey: TENCENT_MAP_API_KEY,
  baseUrl: TENCENT_MAP_API_URL,
  apis: TENCENT_MAP_APIS,
  config: TENCENT_MAP_CONFIG
};
