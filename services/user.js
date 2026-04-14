function callCloud(name, data) {
  if (!name) {
    throw new Error('云函数名称不能为空');
  }
  if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.callFunction) {
    throw new Error('云开发未初始化');
  }

  return wx.cloud.callFunction({
    name,
    data: data || {}
  }).then(function (res) {
    var result = res ? res.result : null;

    if (!result) {
      throw new Error('云函数返回为空');
    }

    if (typeof result.success === 'boolean') {
      if (result.success) {
        return typeof result.data === 'undefined' ? result : result.data;
      }

      console.error('[user.callCloud][' + name + '] result:', result);
      throw new Error(result.message || result.errMsg || '云函数执行失败');
    }

    if (result.userInfo || result.openid || result._id) {
      return result;
    }

    return result;
  }).catch(function (error) {
    var message = error && error.message ? error.message : '';
    if (message.indexOf('FUNCTION_NOT_FOUND') > -1 || message.indexOf('FunctionName parameter could not be found') > -1) {
      throw new Error('云函数 ' + name + ' 未找到，请先上传并部署该云函数');
    }
    if (message.indexOf('云函数 ') === 0 || message === '云函数返回为空') {
      throw error;
    }
    throw new Error('云函数 ' + name + ' 调用失败：' + (message || '未知错误'));
  });
}

function normalizeUserResponse(result) {
  var userInfo = null;
  if (result && result.userInfo) {
    userInfo = result.userInfo;
  } else if (result && result.data && result.data.userInfo) {
    userInfo = result.data.userInfo;
  } else if (result && (result.openid || result._openid || result._id)) {
    userInfo = result;
  }

  if (!userInfo || !(userInfo.openid || userInfo._openid || userInfo._id)) {
    throw new Error('登录结果无效，请确认 login / updateUserProfile 云函数已重新上传部署');
  }

  var stableOpenId = String(userInfo.openid || userInfo._openid || userInfo._id || '');
  return {
    userInfo: {
      ...userInfo,
      openid: stableOpenId,
      _id: userInfo._id || stableOpenId,
      userId: userInfo.userId || stableOpenId
    }
  };
}

function login(data) {
  return callCloud('login', data || {}).then(normalizeUserResponse);
}

function updateUserProfile(data) {
  return callCloud('updateUserProfile', data || {}).then(normalizeUserResponse);
}

module.exports = {
  login,
  updateUserProfile
};
