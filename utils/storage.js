function get(key, defaultValue) {
  try {
    const value = wx.getStorageSync(key);
    return value === '' || typeof value === 'undefined' ? defaultValue : value;
  } catch (err) {
    return defaultValue;
  }
}

function set(key, value) {
  wx.setStorageSync(key, value);
  return value;
}

function remove(key) {
  wx.removeStorageSync(key);
}

module.exports = {
  get,
  set,
  remove
};
