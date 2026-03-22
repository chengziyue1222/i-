Page({
  data: { destination:'', time:'', types:[], personality:'', matchScore:0, reasons:[], matchedGroups:[] },
  onLoad(options) {
    const { destination='', time='', types='', personality='' } = options;
    this.setData({ destination, time, types: types ? types.split(',') : [], personality });
    this.runMatch(destination, types ? types.split(',') : []);
  },
  runMatch(destination, types) {
    wx.showLoading({ title: 'AI匹配中...' });
    setTimeout(() => {
      wx.hideLoading();
      const allGroups = [
        { groupId:'g001', user:{nickname:'盗哥',avatar:'https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTLL3cuCJJSicqhLWKCRNyOicicFQF7sAjTYGDmMgvJibFRicVl2VzRoO9e3ick5ZCJDTsZJRHIxmqKHhMFw/132',personality:'ENFP'}, destination:'七星岩', time:'03-28 09:00', people:{current:2,max:4}, status:'recruiting', tags:['拍照','徒步','打卡'] },
        { groupId:'g002', user:{nickname:'旅行的意义',avatar:'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6RIrAkxqNLemdadAQmcZ20fhOd0I5bh1HfCnvq2vGDKz9w/132',personality:'INFP'}, destination:'鼎湖山', time:'03-29 08:30', people:{current:3,max:4}, status:'recruiting', tags:['自然','登山','解压'] },
        { groupId:'g004', user:{nickname:'cpdd女孩',avatar:'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6RIrAkxqNLemdadAQmcZ20fhOd0I5bh1HfCnvq2vGDKz9w/132',personality:'ENFJ'}, destination:'端州美食街', time:'03-30 18:00', people:{current:1,max:3}, status:'recruiting', tags:['美食','cpdd','夜生活'] }
      ];
      const scored = allGroups.filter(g => g.status === 'recruiting').map(g => {
        let score = 60;
        if (destination && g.destination.includes(destination)) score += 25;
        if (types.length) { const match = types.filter(t => g.tags.includes(t)).length; score += match * 5; }
        score = Math.min(score, 98);
        return { ...g, score };
      }).sort((a,b) => b.score - a.score);
      const reasons = [];
      if (destination) reasons.push(`目的地「${destination}」有匹配组队`);
      if (types.length) reasons.push(`兴趣标签「${types.slice(0,2).join('、')}」高度匹配`);
      reasons.push('出行时间段基本一致');
      const avgScore = scored.length ? Math.round(scored.reduce((s,g)=>s+g.score,0)/scored.length) : 75;
      this.setData({ matchedGroups: scored, matchScore: avgScore, reasons });
    }, 1500);
  },
  onJoinGroup(e) {
    const group = e.currentTarget.dataset.group;
    wx.showModal({
      title: `申请加入「${group.destination}」`,
      editable: true,
      placeholderText: '介绍一下自己，增加通过率～',
      success: (res) => {
        if (res.confirm) {
          const req = { groupId: group.groupId, destination: group.destination, message: res.content || '', status: 'pending', createTime: Date.now() };
          const h = wx.getStorageSync('myApplyHistory') || []; h.unshift(req); wx.setStorageSync('myApplyHistory', h.slice(0,50));
          wx.showToast({ title: '申请已提交！', icon: 'success' });
        }
      }
    });
  },
  onBack() { wx.navigateBack(); },
  onCreateOwn() {
    wx.navigateBack();
    setTimeout(() => wx.showToast({ title: '点击右上角 + 发起组队', icon: 'none', duration: 3000 }), 500);
  }
});
