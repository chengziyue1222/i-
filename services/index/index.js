function getDb() {
  if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.database) {
    throw new Error('云开发未初始化');
  }
  return wx.cloud.database();
}

function normalizeHomeDoc(item) {
  var doc = item || {};
  return {
    index_show: Array.isArray(doc.index_show) ? doc.index_show : [],
    function_show: Array.isArray(doc.function_show) ? doc.function_show : [],
    cooperation: Array.isArray(doc.cooperation) ? doc.cooperation : []
  };
}

function fetchIndexData() {
  return getDb().collection('home').limit(1).get().then(function (res) {
    var list = res.data || [];
    if (!list.length) return [];
    return [normalizeHomeDoc(list[0])];
  }).catch(function (error) {
    var detail = '';
    try {
      detail = JSON.stringify(error);
    } catch (e) {
      detail = String(error);
    }
    throw new Error('首页数据加载失败：' + (error && error.message ? error.message : '未知错误') + ' | detail=' + detail);
  });
}

module.exports = {
  fetchIndexData
};
