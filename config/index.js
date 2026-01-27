/** 云开发使用 */
export const cloudbaseTemplateConfig = {
  useMock: true,
};

// 腾讯地图API配置（从统一配置文件导入）
export { TENCENT_MAP_API_KEY as apiKey } from './map';

// 为了保持向后兼容，保留tencentMapConfig对象
import { TENCENT_MAP_API_KEY } from './map';
export const tencentMapConfig = {
  apiKey: TENCENT_MAP_API_KEY,
};