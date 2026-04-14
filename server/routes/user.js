const express = require('express');

const router = express.Router();

/**
 * 【新增】POST /api/user/login
 * 请求示例：
 * {
 *   "code": "wx-login-code-demo",
 *   "nickName": "旅行爱好者"
 * }
 * 返回示例：
 * {
 *   "code": 0,
 *   "message": "success",
 *   "data": {
 *     "token": "token_u003",
 *     "userInfo": {
 *       "userId": "u003",
 *       "nickName": "旅行爱好者"
 *     }
 *   }
 * }
 */
router.post('/login', (req, res) => {
  const { code, nickName, avatarUrl } = req.body || {};
  const { ok, fail } = req.helpers;
  const db = req.db;

  if (!code) {
    return res.json(fail('缺少登录 code'));
  }

  let user = db.users.find((item) => item.openid === code || item.userId === code);
  if (!user) {
    const nextId = 'u' + String(db.users.length + 1).padStart(3, '0');
    user = {
      userId: nextId,
      openid: code,
      nickName: nickName || '旅行爱好者',
      avatarUrl: avatarUrl || '',
      emoji: '🙋',
      manifesto: '用脚步丈量世界',
      tags: ['旅行', '搭子']
    };
    db.users.push(user);
  } else if (nickName || avatarUrl) {
    user.nickName = nickName || user.nickName;
    user.avatarUrl = avatarUrl || user.avatarUrl;
  }

  return res.json(ok({
    token: 'token_' + user.userId,
    userInfo: user
  }));
});

module.exports = router;
