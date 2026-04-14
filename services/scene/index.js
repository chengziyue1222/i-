const { DEFAULT_SCENIC_IMAGE, resolveScenicImageUrlByName } = require('../../config/scenic-images');

function getDb() {
  if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.database) {
    throw new Error('云开发未初始化');
  }
  return wx.cloud.database();
}

function resolveScenicImageUrl(item) {
  var scenicName = (item.scenicName || item.name || '').trim();
  return item.imageUrl || item.cover || resolveScenicImageUrlByName(scenicName) || DEFAULT_SCENIC_IMAGE;
}

function normalizeSceneItem(item, index) {
  var doc = item || {};
  var scenicName = doc.scenicName || doc.name || doc.title || '旅行目的地';
  return {
    scenicId: doc.scenicId || doc.id || doc._id || ('scene_' + index),
    scenicName: scenicName,
    name: scenicName,
    description: doc.description || doc.intro || doc.summary || '热门目的地',
    heat: Number(doc.heat || doc.hot || (100 - index)),
    suggestedDuration: Number(doc.suggestedDuration || doc.duration || 4),
    imageUrl: resolveScenicImageUrl(doc),
    cover: resolveScenicImageUrl(doc),
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    location: doc.location || '',
    id: doc.id || doc._id || doc.scenicId || ('scene_' + index)
  };
}

function fetchScenicSpotData() {
  return getDb().collection('scenic').orderBy('heat', 'desc').get().then(function (res) {
    return (res.data || []).map(normalizeSceneItem);
  }).catch(function (error) {
    var detail = '';
    try {
      detail = JSON.stringify(error);
    } catch (e) {
      detail = String(error);
    }
    throw new Error('景区数据加载失败：' + (error && error.message ? error.message : '未知错误') + ' | detail=' + detail);
  });
}

function fetchSceneDetail(id, type) {
  if (!id) return Promise.reject(new Error('缺少详情 ID'));
  var collectionName = type === 'news' ? 'news' : 'scenic';
  return getDb().collection(collectionName).doc(String(id)).get().then(function (res) {
    return res.data || null;
  }).catch(function (error) {
    throw new Error(error && error.message ? error.message : '详情加载失败');
  });
}

module.exports = {
  fetchScenicSpotData,
  fetchSceneDetail
};
