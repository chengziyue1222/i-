function getDb() {
  if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.database) {
    throw new Error('云开发未初始化');
  }
  return wx.cloud.database();
}

function normalizeNewsItem(item) {
  var doc = item || {};
  return {
    _id: doc._id,
    title: doc.title || '',
    time: doc.time || doc.publishTime || doc.createdAtText || '',
    picture: doc.picture || doc.image || doc.cover || ''
  };
}

function fetchNewsData() {
  return getDb().collection('news').orderBy('publishTime', 'desc').get().then(function (res) {
    return (res.data || []).map(normalizeNewsItem);
  }).catch(function (error) {
    var detail = '';
    try {
      detail = JSON.stringify(error);
    } catch (e) {
      detail = String(error);
    }
    throw new Error('新闻数据加载失败：' + (error && error.message ? error.message : '未知错误') + ' | detail=' + detail);
  });
}

module.exports = {
  fetchNewsData
};
