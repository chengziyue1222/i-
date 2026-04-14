/** 云开发使用 */
const cloudbaseTemplateConfig = {
  useMock: false, // 改为 false，使用云数据库
};

// 腾讯地图API配置（从统一配置文件导入）
const { TENCENT_MAP_API_KEY } = require('./map');

// 为了保持向后兼容，保留tencentMapConfig对象
const tencentMapConfig = {
  apiKey: TENCENT_MAP_API_KEY,
};

module.exports = { cloudbaseTemplateConfig, tencentMapConfig, TENCENT_MAP_API_KEY };