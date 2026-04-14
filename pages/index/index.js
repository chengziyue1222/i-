const { fetchIndexData } = require('../../services/index/index');
const { fetchScenicSpotData } = require('../../services/scene/index');
const teamApi = require('../../services/team');
const postApi = require('../../services/post');
const chatApi = require('../../services/chat');
const { DEFAULT_SCENIC_IMAGE, resolveScenicImageUrlByName } = require('../../config/scenic-images');
const { logError } = require('../../utils/error');
const store = require('../../store/index');

function normalizeText(value) {
  return String(value || '').trim();
}

function formatGroupTime(startTime) {
  if (!startTime || startTime === '待定') return '时间待定';
  return startTime;
}

function computeGroupScore(group) {
  const tags = Array.isArray(group.tags) ? group.tags : [];
  const remainCount = Number(group.remainCount || 0);
  const currentPeople = Number(group.currentPeople || group.current || 0);
  let score = 0;

  if (group.status === 'recruiting') score += 50;
  if (remainCount > 0 && remainCount <= 3) score += 22;
  if (currentPeople > 0) score += Math.min(currentPeople * 4, 20);
  if (group.startTime && group.startTime !== '待定') score += 12;
  if (tags.length > 0) score += Math.min(tags.length * 4, 12);
  if (normalizeText(group.intro)) score += 8;

  return score;
}

function pickSmartGroups(groups) {
  return (groups || [])
    .filter((item) => item && item.status === 'recruiting' && Number(item.remainCount || 0) > 0)
    .map((item) => ({ ...item, recommendScore: computeGroupScore(item) }))
    .sort((a, b) => {
      if (b.recommendScore !== a.recommendScore) return b.recommendScore - a.recommendScore;
      return Number(b.createTime || 0) - Number(a.createTime || 0);
    })
    .slice(0, 3)
    .map((item) => ({
      ...item,
      displayTime: formatGroupTime(item.startTime),
      summary: normalizeText(item.intro) || '一起出发，寻找同频旅伴。'
    }));
}

function buildPostSummary(post) {
  const desc = normalizeText(post.desc);
  const content = normalizeText(post.content);
  const source = desc || content;
  if (!source) return '真实旅行体验分享，点击查看完整内容。';
  return source.slice(0, 34);
}

function computePostScore(post) {
  const likeCount = Number(post.likeCount || 0);
  const commentCount = Number(post.commentCount || 0);
  const createdAt = Number(post.createdAt || post.createTime || 0);
  return likeCount * 3 + commentCount * 5 + Math.floor(createdAt / 1000000000);
}

function pickFeaturedPosts(posts) {
  return (posts || [])
    .filter((item) => item && item.visibility !== 'private')
    .filter((item) => normalizeText(item.cover))
    .filter((item) => normalizeText(item.title))
    .filter((item) => normalizeText(item.desc) || normalizeText(item.content))
    .map((item) => ({
      ...item,
      summary: buildPostSummary(item),
      recommendScore: computePostScore(item)
    }))
    .sort((a, b) => {
      if (b.recommendScore !== a.recommendScore) return b.recommendScore - a.recommendScore;
      return Number(b.createdAt || b.createTime || 0) - Number(a.createdAt || a.createTime || 0);
    })
    .slice(0, 4);
}

Page({
  data: {
    showUploadTip: false,
    bannerList: [],
    productAbilityList: [],
    applicationScene: [],
    newsList: [],
    guidePostList: [],
    partnersList: [],
    hotScenicList: [],
    postList: [],
    postAppliedMap: {},
    activeShortcut: 'walk',
    routeFilter: 'time',
    searchKeyword: '',
    weather: {
      city: '肇庆',
      temperature: '25°',
      weather: '晴',
      icon: '☀️',
      humidity: '65%',
      wind: '东南风2级',
      airQuality: '优',
      updateTime: '刚刚更新'
    },
    recommendedRoutes: [
      {
        id: 'route_1',
        title: '肇庆经典一日游',
        description: '七星岩+鼎湖山精华路线',
        duration: '1天',
        difficulty: '轻松',
        cover: '/images/scenic/qixingyan.jpg',
        tags: ['经典', '自然', '摄影']
      },
      {
        id: 'route_2', 
        title: '肇庆美食探寻',
        description: '地道美食+文化体验',
        duration: '半天',
        difficulty: '休闲',
        cover: '/images/scenic/duanzhou.jpg',
        tags: ['美食', '文化', 'citywalk']
      },
      {
        id: 'route_3',
        title: '肇庆夜景漫步',
        description: '星湖夜景+城区漫步',
        duration: '3小时',
        difficulty: '轻松',
        cover: '/images/scenic/xinghu.jpg',
        tags: ['夜景', '散步', '浪漫']
      }
    ]
  },
  async onLoad() {
    this._hasLoadedOnce = false;
    await this.getRequestList();
  },
  async onShow() {
    if (!this._hasLoadedOnce) return;
    await this.getRequestList();
  },
  async getRequestList(){
    this._hasLoadedOnce = true;
    wx.showTabBar();
    wx.showLoading({
      title: '加载中',
    });

    try {
      const [homeResult, scenicResult, teamResult, postResult] = await Promise.allSettled([
        fetchIndexData({ pageSize: 1 }),
        fetchScenicSpotData(),
        teamApi.getTeamList(),
        postApi.fetchPostList({ type: '推荐' })
      ]);

      const homeList = homeResult.status === 'fulfilled' ? (homeResult.value || []) : [];
      const scenicRawList = scenicResult.status === 'fulfilled' ? (scenicResult.value || []) : [];
      const teamGroups = teamResult.status === 'fulfilled' ? ((teamResult.value && teamResult.value.groups) || []) : [];
      const communityPosts = postResult.status === 'fulfilled' ? (postResult.value || []) : [];

      if (homeResult.status === 'rejected') {
        logError('首页-首页配置加载失败', homeResult.reason);
      }

      if (scenicResult.status === 'rejected') {
        logError('首页-景区数据加载失败', scenicResult.reason);
      }

      if (teamResult.status === 'rejected') {
        logError('首页-组队数据加载失败', teamResult.reason);
      }

      if (postResult.status === 'rejected') {
        logError('首页-社区帖子加载失败', postResult.reason);
      }

      const scenicList = scenicRawList.map((item) => {
        const scenicName = (item.scenicName || item.name || '').trim();
        return {
          ...item,
          imageUrl: item.imageUrl || resolveScenicImageUrlByName(scenicName) || DEFAULT_SCENIC_IMAGE
        };
      });

      const { index_show, function_show, cooperation } = homeList[0] || {};

      let hotScenicList = [];
      if (scenicList.length > 0) {
        hotScenicList = scenicList.slice(0, 5);
      }

      const smartGroups = pickSmartGroups(teamGroups);
      const featuredPosts = pickFeaturedPosts(communityPosts);

      this.setData({
        showUploadTip: true,
        bannerList: index_show || [],
        productAbilityList: function_show || [],
        partnersList: cooperation || [],
        applicationScene: scenicList,
        newsList: featuredPosts,
        guidePostList: featuredPosts,
        hotScenicList,
        postList: smartGroups
      });

      const failedModules = [];
      if (homeResult.status === 'rejected') failedModules.push('首页配置');
      if (scenicResult.status === 'rejected') failedModules.push('景区');
      if (teamResult.status === 'rejected') failedModules.push('组队');
      if (postResult.status === 'rejected') failedModules.push('社区帖子');

      if (failedModules.length > 0) {
        wx.showToast({
          title: failedModules.join('、') + '加载失败',
          icon: 'none',
          duration: 1800
        });
      }
    } finally {
      wx.hideLoading();
    }
  },
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },
  onSearchConfirm() {
    const keyword = (this.data.searchKeyword || '').trim();
    wx.setStorageSync('homeSearchKeyword', keyword);
    wx.switchTab({ url: '/pages/route/scenic-list' });
  },
  onShortcutTap(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeShortcut: id });
    if (id === 'attraction') {
      wx.switchTab({ url: '/pages/route/scenic-list' });
    }
  },
  onRouteFilterTap(e) {
    const filter = e.currentTarget.dataset.filter;
    let hotScenicList = [...(this.data.hotScenicList || [])];
    if (filter === 'time') {
      hotScenicList.sort((a, b) => (b.heat || 0) - (a.heat || 0));
    } else if (filter === 'checkin') {
      hotScenicList.sort((a, b) => (b.heat || 0) - (a.heat || 0));
    } else if (filter === 'route') {
      hotScenicList.sort((a, b) => (a.scenicName || '').localeCompare(b.scenicName || ''));
    }
    this.setData({ routeFilter: filter, hotScenicList });
  },

  getCurrentUserId() {
    const ui = wx.getStorageSync('userInfo') || {};
    return String(ui.openid || ui._openid || ui.userId || ui._id || '');
  },

  onPostTap(e) {
    const groupId = e.currentTarget.dataset.groupId;
    if (groupId) {
      wx.navigateTo({ url: '/pages/buddy-detail/index?id=' + encodeURIComponent(groupId) });
    }
  },

  async onPostChatTap(e) {
    const group = e.currentTarget.dataset.post || {};
    const groupId = group.groupId || group.id || ('group_' + Date.now());
    const partnerName = group.nickname || '组队发起人';
    const currentUserId = this.getCurrentUserId();

    if (!currentUserId || currentUserId === 'guest') {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const targetUserId = String(group.creatorId || '');
    if (!targetUserId) {
      wx.showToast({ title: '发起人信息缺失', icon: 'none' });
      return;
    }

    await chatApi.sendMessage({
      senderId: currentUserId,
      receiverId: targetUserId,
      content: '你好，我想了解一下你的组队安排～'
    }).catch((error) => {
      const message = logError('首页-发起组队私聊失败', error, {
        groupId,
        targetUserId,
        currentUserId
      });
      wx.showToast({ title: message, icon: 'none' });
      throw error;
    });

    const chatList = await chatApi.getChatList(currentUserId).catch((error) => {
      const message = logError('首页-获取会话列表失败', error, {
        currentUserId,
        targetUserId
      });
      wx.showToast({ title: message, icon: 'none' });
      throw error;
    });
    const chat = (chatList || []).find((item) => item.targetUser && String(item.targetUser.userId) === String(targetUserId));
    if (!chat) return;

    wx.navigateTo({
      url: '/pages/chat/index?chatId=' + encodeURIComponent(chat.chatId)
        + '&targetUserId=' + encodeURIComponent(chat.targetUser.userId)
        + '&targetName=' + encodeURIComponent(chat.targetUser.nickName || partnerName)
        + '&targetEmoji=' + encodeURIComponent(chat.targetUser.emoji || '💬')
    });
  },

  onPostCommentTap(e) {
    const group = e.currentTarget.dataset.post || {};
    const groupId = group.groupId || group.id;
    if (!groupId) return;

    store.track('team_detail_tap', {
      groupId: String(groupId),
      destination: group.destination || ''
    });

    wx.navigateTo({
      url: '/pages/buddy-detail/index?id=' + encodeURIComponent(String(groupId))
    });
  },

  async onPostApplyTap(e) {
    const group = e.currentTarget.dataset.post || {};
    const groupId = group.groupId || group.id;
    if (!groupId) return;

    wx.navigateTo({
      url: '/pages/buddy-apply/index?id=' + encodeURIComponent(String(groupId))
    });
  },

  onGuideTap(e) {
    const postId = e.currentTarget.dataset.postId;
    if (!postId) return;
    wx.navigateTo({ url: '/pages/community/detail/index?id=' + encodeURIComponent(postId) });
  },
  onGoScenicList() {
    wx.switchTab({ url: '/pages/route/scenic-list' });
  },
  onGoNews(){
    wx.navigateTo({
      url: '/pages/news/index'
    })
  },
  // 跳转景区详情页
  goScenicDetail(event) {
    const scenicId = event.currentTarget.dataset.id;

    if (!scenicId) {
      wx.showToast({
        title: '景区信息获取失败',
        icon: 'error',
        duration: 2000
      });
      return;
    }

    wx.navigateTo({
      url: `/packageRoute/pages/route/scenic-detail?scenicId=${scenicId}`
    });
  },

  // 跳转详情页
  async goDetail(event){
    try {
      const id = event.currentTarget.dataset.id;
      const title = event.currentTarget.dataset.title;
      if(!id){
        throw new Error("id获取失败")
      }
      wx.navigateTo({
        url:`/pages/detail/index?type=scene&id=${id}&title=${title}`
      })
    } catch (error) {
      wx.showToast({
        title: error.message || '页面跳转失败',
        icon: 'error',
        duration: 2000
      }) 
    }
  },

  // 轮播图点击事件
  onBannerTap(e) {
    const id = e.currentTarget.dataset.id;
    const title = e.currentTarget.dataset.title;
    console.log('[首页] 轮播图点击:', { id, title });
    
    // 根据不同的banner类型跳转到不同页面
    if (id && title) {
      wx.navigateTo({
        url: `/pages/detail/index?type=banner&id=${id}&title=${encodeURIComponent(title)}`
      });
    }
  },

  // 功能入口点击事件
  onFunctionTap(e) {
    const id = e.currentTarget.dataset.id;
    const title = e.currentTarget.dataset.title;
    console.log('[首页] 功能入口点击:', { id, title });
    
    if (id === 'fn_1') {
      wx.navigateTo({
        url: '/packageRoute/pages/route/route-plan'
      });
    } else if (id === 'fn_2') {
      wx.navigateTo({
        url: '/pages/buddy-match/index'
      });
    } else if (id === 'fn_3') {
      wx.switchTab({
        url: '/pages/route/scenic-list'
      });
    } else if (id === 'fn_4') {
      wx.navigateTo({
        url: '/pages/community/index'
      });
    } else {
      wx.navigateTo({
        url: `/pages/detail/index?type=function&id=${id}&title=${encodeURIComponent(title || '功能')}`
      });
    }
  },

  // 推荐路线点击事件
  onRouteTap(e) {
    const id = e.currentTarget.dataset.id;
    const title = e.currentTarget.dataset.title;
    console.log('[首页] 推荐路线点击:', { id, title });
    
    // 跳转到路线详情页
    wx.navigateTo({
      url: `/packageRoute/pages/route/route-detail?id=${id}&title=${encodeURIComponent(title || '路线')}`
    });
  },

  // 跳转到路线规划页面
  onGoRoutePlan() {
    wx.navigateTo({
      url: '/packageRoute/pages/route/route-plan'
    });
  }
});
