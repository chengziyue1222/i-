const STORAGE_KEY = 'apiBaseUrl';

function trimTrailingSlash(url) {
  return String(url || '').replace(/\/+$/, '');
}

function getStoredBaseUrl() {
  try {
    return trimTrailingSlash(wx.getStorageSync(STORAGE_KEY) || '');
  } catch (error) {
    return '';
  }
}

function getBaseUrl() {
  return getStoredBaseUrl();
}

function unwrapResponse(response) {
  const payload = response && response.data ? response.data : response;
  if (!payload || typeof payload.code === 'undefined') {
    throw new Error('接口返回格式错误');
  }
  if (payload.code !== 0) {
    throw new Error(payload.message || '请求失败');
  }
  return payload.data;
}

function request(url, method = 'GET', data = {}, options = {}) {
  var baseUrl = getBaseUrl();
  if (!baseUrl) {
    return Promise.reject(new Error('AI 服务未配置，请先将能力迁移到云函数或设置 apiBaseUrl'));
  }

  var fullUrl = baseUrl + url;

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method,
      data,
      timeout: 10000,
      header: {
        'content-type': 'application/json',
        ...(options.header || {})
      },
      success(res) {
        try {
          resolve(unwrapResponse(res));
        } catch (error) {
          reject(error);
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'));
      }
    });
  });
}

request.STORAGE_KEY = STORAGE_KEY;
request.getBaseUrl = getBaseUrl;

module.exports = request;
