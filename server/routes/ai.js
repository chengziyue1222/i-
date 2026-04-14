const express = require('express');

const router = express.Router();

/**
 * 【新增】POST /api/ai/plan
 * 请求示例：
 * {
 *   "destination": "七星岩",
 *   "time": "周末",
 *   "types": ["拍照", "徒步"]
 * }
 * 返回示例：
 * {
 *   "code": 0,
 *   "message": "success",
 *   "data": {
 *     "matchScore": 88,
 *     "reasons": ["目的地匹配"]
 *   }
 * }
 */
router.post('/plan', (req, res) => {
  const { ok } = req.helpers;
  const db = req.db;
  const { destination = '', time = '', types = [] } = req.body || {};

  const groups = db.teams
    .filter((item) => item.status === 'recruiting')
    .map((item) => {
      let score = 60;
      if (destination && String(item.destination).includes(destination)) score += 25;
      if (Array.isArray(types) && types.length) {
        const tagHit = types.filter((tag) => (item.tags || []).includes(tag)).length;
        score += tagHit * 5;
      }
      score = Math.min(score, 98);
      return {
        groupId: item.id,
        user: {
          nickname: item.nickname,
          avatar: '',
          personality: item.personality
        },
        destination: item.destination,
        time: item.startTime,
        people: {
          current: item.current,
          max: item.max
        },
        status: item.status,
        tags: item.tags,
        score
      };
    })
    .sort((a, b) => b.score - a.score);

  const reasons = [];
  if (destination) reasons.push('目的地「' + destination + '」存在高匹配队伍');
  if (Array.isArray(types) && types.length) reasons.push('兴趣标签与队伍标签高度重合');
  if (time) reasons.push('出行时间段相近，便于协同出发');
  if (!reasons.length) reasons.push('系统已按热门队伍为你智能推荐');

  const matchScore = groups.length
    ? Math.round(groups.reduce((sum, item) => sum + item.score, 0) / groups.length)
    : 75;

  return res.json(ok({
    destination,
    time,
    types,
    matchScore,
    reasons,
    matchedGroups: groups
  }));
});

module.exports = router;
