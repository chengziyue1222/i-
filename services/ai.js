const teamApi = require('./team');

function normalizeTypes(list) {
  return (Array.isArray(list) ? list : []).map(function (item) {
    return String(item || '').trim();
  }).filter(Boolean);
}

function buildReasons(destination, types, groups) {
  const reasons = [];
  if (destination) {
    reasons.push('已优先匹配目的地相同或相近的组队');
  }
  if (types.length) {
    reasons.push('已结合你的出行偏好标签筛选合适搭子');
  }
  if (groups.length) {
    reasons.push('优先展示仍在招募中的高匹配队伍');
  }
  return reasons.slice(0, 3);
}

function calcScore(group, destination, types) {
  let score = 55;
  const groupDestination = String(group.destination || '').trim();
  const groupTags = Array.isArray(group.tags) ? group.tags.map(function (tag) {
    return String(tag || '').trim();
  }) : [];

  if (destination && groupDestination && groupDestination.indexOf(destination) > -1) {
    score += 25;
  } else if (destination && groupDestination && destination.indexOf(groupDestination) > -1) {
    score += 20;
  }

  if (types.length) {
    const matchedTypeCount = types.filter(function (type) {
      return groupTags.some(function (tag) {
        return tag.indexOf(type) > -1 || type.indexOf(tag) > -1;
      });
    }).length;
    score += Math.min(matchedTypeCount * 10, 20);
  }

  if (group.status === 'recruiting') score += 5;
  if (group.remainCount > 0) score += 5;

  return Math.max(60, Math.min(score, 98));
}

function mapGroupToMatch(group, score) {
  return {
    groupId: group.groupId || group.id,
    destination: group.destination || '待定目的地',
    time: group.startTimeDisplay || group.startTime || '待定',
    tags: Array.isArray(group.tags) ? group.tags : [],
    score: score,
    user: {
      nickname: group.nickname || '旅行爱好者',
      avatar: group.imageUrl || '/images/avatar-default.png',
      personality: (Array.isArray(group.tags) && group.tags[0]) || '同频出行'
    }
  };
}

function createAiPlan(data) {
  const payload = data || {};
  const destination = String(payload.destination || '').trim();
  const types = normalizeTypes(payload.types);

  return teamApi.getTeamList().then(function (result) {
    const groups = (result && result.groups) || [];
    const filtered = groups.filter(function (group) {
      if (group.status && group.status !== 'recruiting') return false;
      if (!destination) return true;
      const groupDestination = String(group.destination || '').trim();
      return groupDestination.indexOf(destination) > -1 || destination.indexOf(groupDestination) > -1;
    });

    const baseList = filtered.length ? filtered : groups.filter(function (group) {
      return !group.status || group.status === 'recruiting';
    });

    const matchedGroups = baseList.map(function (group) {
      const score = calcScore(group, destination, types);
      return mapGroupToMatch(group, score);
    }).sort(function (a, b) {
      return (b.score || 0) - (a.score || 0);
    }).slice(0, 6);

    const matchScore = matchedGroups.length
      ? Math.round(matchedGroups.reduce(function (sum, item) { return sum + (item.score || 0); }, 0) / matchedGroups.length)
      : 0;

    return {
      matchedGroups: matchedGroups,
      matchScore: matchScore,
      reasons: buildReasons(destination, types, matchedGroups)
    };
  });
}

module.exports = {
  createAiPlan
};
