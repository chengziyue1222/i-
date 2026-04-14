/**
 * 地图配置
 * 统一存放腾讯地图API相关配置
 */

// 腾讯地图API Key
// 注意：如果Key出现请求量限制，请自行申请替换
const TENCENT_MAP_API_KEY = '6X2BZ-U466S-CKFOJ-67NXH-HLOSO-VRFLE';

// 腾讯地图API基础URL
const TENCENT_MAP_API_URL = 'https://apis.map.qq.com';

// API接口路径
const TENCENT_MAP_APIS = {
  placeSearch: '/ws/place/v1/search',
  direction: '/ws/direction/v1/driving',
  geocoder: '/ws/geocoder/v1/'
};

// 默认配置
const TENCENT_MAP_CONFIG = {
  maxSearchRadius: 3000,
  pageSize: 10,
  defaultDelay: 200,
  maxRequestsPerSecond: 5
};

module.exports = {
  TENCENT_MAP_API_KEY,
  TENCENT_MAP_API_URL,
  TENCENT_MAP_APIS,
  TENCENT_MAP_CONFIG,
  default: {
    apiKey: TENCENT_MAP_API_KEY,
    baseUrl: TENCENT_MAP_API_URL,
    apis: TENCENT_MAP_APIS,
    config: TENCENT_MAP_CONFIG
  }
};
