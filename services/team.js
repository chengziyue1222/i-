function getDb() {
  if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.database) {
    throw new Error('云开发未初始化');
  }
  return wx.cloud.database();
}

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
  }).then((res) => {
    var result = res ? res.result : null;

    if (!result) {
      throw new Error('云函数返回为空');
    }

    if (typeof result.success === 'boolean') {
      if (result.success) {
        return typeof result.data === 'undefined' ? true : result.data;
      }
      console.error('[team.callCloud][' + name + '] result:', result);
      throw new Error(result.message || result.errMsg || '云函数执行失败');
    }

    if (typeof result === 'object') {
      return result;
    }

    return true;
  }).catch((error) => {
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

function getCurrentOpenId() {
  var ui = wx.getStorageSync('userInfo') || {};
  return String(ui.openid || ui._openid || ui.userId || ui._id || 'guest');
}

function normalizeGroup(doc) {
  var current = Number(doc.currentPeople || (Array.isArray(doc.members) ? doc.members.length : 0) || 0);
  var max = Number(doc.max || 0);
  return {
    id: doc._id,
    groupId: doc._id,
    creatorId: doc.creatorId || '',
    nickname: doc.nickname || '旅行爱好者',
    destination: doc.destination || '',
    startTime: doc.startTime || '待定',
    startTimeDisplay: doc.startTime || '待定',
    current: current,
    currentPeople: current,
    max: max,
    status: doc.status || 'recruiting',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    intro: doc.intro || '',
    imageUrl: doc.imageUrl || '',
    cover: doc.cover || null,
    remainCount: Math.max(max - current, 0),
    createTime: doc.createTime,
    updateTime: doc.updateTime
  };
}

function normalizeApplication(doc, currentUserId) {
  var fromUserId = doc.fromUserId || doc.userId || '';
  var targetUserId = doc.targetUserId || '';
  return {
    id: doc._id,
    applicationId: doc._id,
    groupId: doc.groupId || '',
    groupName: doc.groupName || doc.groupDest || '组队',
    groupDest: doc.groupDest || doc.groupName || '',
    fromUserId: fromUserId,
    fromUserName: doc.fromUserName || '申请人',
    fromUserEmoji: doc.fromUserEmoji || '🙋',
    targetUserId: targetUserId,
    targetUserName: doc.targetUserName || '队长',
    targetUserEmoji: doc.targetUserEmoji || '🧭',
    message: doc.message || '',
    status: doc.status || 'pending',
    unread: !!doc.unread,
    applicantUnread: !!doc.applicantUnread,
    createTime: doc.createTime,
    updateTime: doc.updateTime,
    isMine: String(fromUserId) === String(currentUserId || '')
  };
}

function normalizeComment(doc) {
  return {
    id: doc._id,
    postId: doc.postId || '',
    userId: doc.userId || '',
    userName: doc.userName || '我',
    userEmoji: doc.userEmoji || '🙋',
    content: doc.content || '',
    time: doc.time || '刚刚',
    ts: doc.ts || 0,
    createdAt: doc.createdAt
  };
}

function normalizeInteraction(doc) {
  return {
    id: doc._id,
    type: doc.type || 'like',
    userEmoji: doc.userEmoji || '👍',
    userName: doc.userName || '有人',
    desc: doc.desc || '',
    postId: doc.postId || '',
    unread: !!doc.unread,
    time: doc.time || '刚刚',
    createdAt: doc.createdAt,
    ownerId: doc.ownerId || ''
  };
}

function normalizeReviewAction(action) {
  if (action === 'accepted') return 'accept';
  if (action === 'rejected') return 'reject';
  return action;
}

function getTeamList() {
  return getDb().collection('group').orderBy('createTime', 'desc').get().then(function (res) {
    return {
      groups: (res.data || []).map(normalizeGroup)
    };
  });
}

function createTeam(data) {
  return callCloud('createTeam', data || {}).then(function (result) {
    if (!result || !(result.id || result.groupId || result._id)) {
      throw new Error('创建组队未返回有效记录，请确认 createTeam 云函数已重新上传部署');
    }
    return result;
  });
}

function applyTeam(data) {
  var groupId = data.groupId || (data.group && data.group.id) || data.id || data.postId;
  if (!groupId) {
    throw new Error('缺少groupId参数');
  }

  return callCloud('joinGroup', {
    groupId: String(groupId),
    message: data.message || '',
    fromUserName: data.fromUserName || '',
    fromUserEmoji: data.fromUserEmoji || ''
  });
}

function reviewTeam(data) {
  var requestId = data.applicationId || data.requestId || data.id;
  var action = normalizeReviewAction(data.action);
  if (!requestId) {
    throw new Error('缺少申请ID参数');
  }
  if (action !== 'accept' && action !== 'reject') {
    throw new Error('action必须是accept或reject');
  }
  return callCloud('approveJoin', { requestId: String(requestId), action: action });
}

function getApplications(userId) {
  var currentUserId = String(userId || getCurrentOpenId());
  var db = getDb();
  return Promise.all([
    db.collection('join_request').where({ targetUserId: currentUserId }).orderBy('createTime', 'desc').get(),
    db.collection('join_request').where({ fromUserId: currentUserId }).orderBy('createTime', 'desc').get()
  ]).then(function (result) {
    return {
      applications: (result[0].data || []).map(function (item) { return normalizeApplication(item, currentUserId); }),
      myApplications: (result[1].data || []).map(function (item) { return normalizeApplication(item, currentUserId); })
    };
  });
}

function markApplicationRead(data) {
  var id = data && data.id;
  var role = data && data.role;
  if (!id) {
    throw new Error('缺少申请 id');
  }
  var updateData = { updateTime: getDb().serverDate() };
  if (role === 'applicant') updateData.applicantUnread = false;
  else updateData.unread = false;
  return getDb().collection('join_request').doc(String(id)).update({ data: updateData }).then(function () {
    return true;
  });
}

function getComments(postId) {
  if (!postId) {
    throw new Error('缺少 postId');
  }
  return getDb().collection('team_comment').where({ postId: String(postId) }).orderBy('ts', 'desc').get().then(function (res) {
    return (res.data || []).map(normalizeComment);
  });
}

function createComment(data) {
  return callCloud('createTeamComment', data || {});
}

function createInteraction(data) {
  return callCloud('createTeamInteraction', data || {});
}

function getInteractions(userId) {
  var currentUserId = String(userId || getCurrentOpenId());
  return getDb().collection('team_interaction').where({ ownerId: currentUserId }).orderBy('createdAt', 'desc').get().then(function (res) {
    return (res.data || []).map(normalizeInteraction);
  });
}

function markInteractionRead(id) {
  if (!id) {
    throw new Error('缺少互动 id');
  }
  return getDb().collection('team_interaction').doc(String(id)).update({
    data: {
      unread: false,
      updateTime: getDb().serverDate()
    }
  }).then(function () {
    return true;
  });
}

module.exports = {
  getTeamList,
  createTeam,
  applyTeam,
  reviewTeam,
  getApplications,
  markApplicationRead,
  getComments,
  createComment,
  createInteraction,
  getInteractions,
  markInteractionRead
};
