// 统一景区图片配置

export const DEFAULT_SCENIC_IMAGE = 'https://main.qcloudimg.com/raw/f859ae9d38d34a5ddaa89ae108109cd4.png';

export const SCENIC_IMAGE_MAP = {
  '七星岩风景区': 'https://qcloudimg.tencent-cloud.cn/raw/962c82d62bf201702204a74b4a20035c.png',
  '七星岩': 'https://qcloudimg.tencent-cloud.cn/raw/962c82d62bf201702204a74b4a20035c.png',
  '鼎湖山景区': 'https://main.qcloudimg.com/raw/f859ae9d38d34a5ddaa89ae108109cd4.png',
  '鼎湖山': 'https://main.qcloudimg.com/raw/f859ae9d38d34a5ddaa89ae108109cd4.png',
  '星湖风景区': 'https://qcloudimg.tencent-cloud.cn/raw/3ea5139beeae6c4e2e98d30ad1ed7ade.png',
  '星湖': 'https://qcloudimg.tencent-cloud.cn/raw/3ea5139beeae6c4e2e98d30ad1ed7ade.png',
  '端州古城': 'https://main.qcloudimg.com/raw/a329db7230d1a9c79a0b10e096b236e8.png',
  '肇庆古城': 'https://main.qcloudimg.com/raw/a329db7230d1a9c79a0b10e096b236e8.png',
  '龙母祖庙': 'https://main.qcloudimg.com/raw/28644f5655e9f2b5e470676d77903bcb.png'
};

export function resolveScenicImageUrlByName(name = '') {
  return SCENIC_IMAGE_MAP[(name || '').trim()] || DEFAULT_SCENIC_IMAGE;
}
