// 统一景区图片配置（核心景区使用本地压缩图）
const DEFAULT_SCENIC_IMAGE = '/images/scenic/qixingyan.jpg';

const SCENIC_IMAGE_MAP = {
  '七星岩风景区': '/images/scenic/qixingyan.jpg',
  '七星岩': '/images/scenic/qixingyan.jpg',
  '鼎湖山景区': '/images/scenic/dinghushan.jpg',
  '鼎湖山': '/images/scenic/dinghushan.jpg',
  '星湖风景区': '/images/scenic/xinghu.jpg',
  '星湖': '/images/scenic/xinghu.jpg',
  '端州古城': '/images/scenic/duanzhou.jpg',
  '肇庆古城': '/images/scenic/duanzhou.jpg',
  '龙母祖庙': '/images/scenic/longmu.jpg',
  '端州美食街': 'https://picsum.photos/seed/duanzhou-food/400/500',
  '西江苗寨': 'https://picsum.photos/seed/xijiang/400/500',
  '鸡笼顶': 'https://picsum.photos/seed/jilongding/400/500'
};

function resolveScenicImageUrlByName(name) {
  return SCENIC_IMAGE_MAP[String(name || '').trim()] || DEFAULT_SCENIC_IMAGE;
}

module.exports = {
  DEFAULT_SCENIC_IMAGE,
  SCENIC_IMAGE_MAP,
  resolveScenicImageUrlByName
};
