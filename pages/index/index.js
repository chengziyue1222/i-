import { fetchIndexData } from '../../services/index/index';
import { fetchScenicSpotData } from '../../services/scene/index';
import { fetchNewsData } from '../../services/news/index';
import { fetchPostList } from '../../services/post/index';
import { DEFAULT_SCENIC_IMAGE, resolveScenicImageUrlByName } from '../../config/scenic-images';

const store = require('../../store/index');

Page({
  data: {
    showUploadTip: false,
    bannerList: [],
    productAbilityList: [],
    applicationScene: [],
    newsList: [],
    partnersList: [],
    hotScenicList: [],
    postList: [],
    postAppliedMap: {},
    activeShortcut: 'walk',
    routeFilter: 'time',
    searchKeyword: ''
  },
  async onLoad() {
    await this.getRequestList();
  },
  // 首页数据请求
  async getRequestList(){
    try {
      wx.showTabBar();
      wx.showLoading({
        title: '加载中',
      })
      
      console.log('[首页] ===== 开始加载数据 =====');
      console.log('[首页] 当前模式:', getApp().cloudbaseTemplateConfig?.useMock ? 'Mock数据' : '云数据库');
      
      // 加载首页其他数据
      const res = await fetchIndexData({pageSize:1});
      console.log('[首页] 首页数据加载完成:', res);
      
      // 加载景区数据（热门景区）
      console.log('[首页] 开始加载景区数据...');
      const res1 = await fetchScenicSpotData();
      console.log('[首页] 景区数据加载完成:', res1);
      
      // 在 setData 之前统一注入 imageUrl
      const scenicList = (res1 || []).map((item) => {
        const scenicName = (item.scenicName || item.name || '').trim();
        return {
          ...item,
          imageUrl: item.imageUrl || resolveScenicImageUrlByName(scenicName) || DEFAULT_SCENIC_IMAGE
        };
      });

      if (!scenicList || scenicList.length === 0) {
        console.error('[首页] ❌ 景区数据返回为空！');
      } else {
        console.log('[首页] ✅ 成功获取景区数据，共', scenicList.length, '条');
      }
      
      const res2 = await fetchNewsData({pageSize:3});
      console.log('[首页] 新闻数据加载完成:', res2);

      const res3 = await fetchPostList({ pageSize: 20 });
      const postList = this.decoratePostsWithApplyStatus(res3 || []);
      console.log('[首页] 搭子帖子加载完成:', postList.length);

      const {index_show,function_show,cooperation} = res?.[0] || {};
      console.log('[首页] 解析首页数据:', {index_show, function_show, cooperation});

      // 处理热门景区列表（按热度排序，取前5个）
      let hotScenicList = [];
      console.log('[首页] 原始景区数据 scenicList:', scenicList);
      
      // 云数据库已按热度降序排序，直接取前5个
      if (scenicList && scenicList.length > 0) {
        hotScenicList = scenicList.slice(0, 5);
        console.log('[首页] ✅ 热门景区列表:', hotScenicList.length, '个');
        console.log('[首页] 热门景区详情:', hotScenicList.map(item => ({
          name: item.scenicName,
          heat: item.heat,
          id: item.scenicId
        })));
      } else {
        console.warn('[首页] ⚠️ 没有获取到景区数据，hotScenicList 为空');
        // 不添加测试数据，保持为空
      }

      this.setData({
        showUploadTip: true,
        bannerList: index_show || [],
        productAbilityList: function_show || [],
        partnersList: cooperation || [],
        applicationScene: scenicList || [],
        newsList: res2 || [],
        hotScenicList: hotScenicList,
        postList: postList
      }, () => {
        console.log('[首页] ✅ setData完成');
        console.log('[首页] 最终 hotScenicList:', this.data.hotScenicList);
        console.log('[首页] applicationScene:', this.data.applicationScene);
        
        // 如果热门景区为空，给出明确提示
        if (this.data.hotScenicList.length === 0) {
          console.warn('[首页] ⚠️ 警告: hotScenicList 为空数组，请检查云数据库 scene 集合是否有数据');
        }
      });
    } catch (error) {
      console.error('[首页] ❌ 数据加载失败:', error);
      wx.showToast({
        title: error?.message || '页面请求失败，请刷新页面',
        icon: 'error',
        duration: 2000
      })   
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
    return String(ui.userId || ui._id || ui.openid || 'me');
  },

  decoratePostsWithApplyStatus(posts) {
    const uid = this.getCurrentUserId();
    return (posts || []).map((item) => {
      const postId = item.postId || item._id;
      const applied = postId ? store.hasAppliedApplication(String(postId), uid) : false;
      return { ...item, _applied: applied };
    });
  },
  onPostTap(e) {
    const postId = e.currentTarget.dataset.postId;
    if (postId) {
      wx.navigateTo({ url: `/pages/post-detail/index?postId=${postId}` });
    }
  },

  onPostChatTap(e) {
    const post = e.currentTarget.dataset.post || {};
    const postId = post.postId || post._id || ('post_' + Date.now());
    const partnerName = (post.publisher && post.publisher.nickname) || '帖子作者';
    const groupName = post.destination || post.title || '搭子会话';

    store.track('post_chat_tap', {
      postId: String(postId),
      destination: groupName
    });

    store.getOrCreateConversation({
      groupId: String(postId),
      groupName: groupName,
      partnerName: partnerName
    });

    wx.navigateTo({
      url: '/pages/chat/index?groupId=' + encodeURIComponent(String(postId))
        + '&groupName=' + encodeURIComponent(groupName)
        + '&partnerName=' + encodeURIComponent(partnerName)
    });
  },

  onPostCommentTap(e) {
    const post = e.currentTarget.dataset.post || {};
    const postId = post.postId || post._id;
    if (!postId) return;

    store.track('post_comment_tap', {
      postId: String(postId),
      destination: post.destination || ''
    });

    wx.navigateTo({
      url: '/pages/post-comment/index?postId=' + encodeURIComponent(String(postId))
        + '&postTitle=' + encodeURIComponent(post.title || post.destination || '搭子帖子')
        + '&postAuthor=' + encodeURIComponent((post.publisher && post.publisher.nickname) || '')
    });
  },

  onPostApplyTap(e) {
    const post = e.currentTarget.dataset.post || {};
    const postId = post.postId || post._id;
    if (!postId) return;

    const uid = this.getCurrentUserId();
    if (store.hasAppliedApplication(String(postId), uid)) {
      wx.showToast({ title: '你已申请过该帖子', icon: 'none' });
      return;
    }

    const nick = (wx.getStorageSync('userInfo') || {}).nickName || '我';
    const result = store.submitApplication({
      groupId: String(postId),
      groupName: post.destination || post.title || '搭子行程',
      destination: post.destination || '',
      fromUserId: uid,
      fromUserName: nick,
      fromUserEmoji: '🙋',
      message: '我想加入这个行程，一起出发！'
    });

    if (result && result.duplicated) {
      wx.showToast({ title: '你已申请过该帖子', icon: 'none' });
      return;
    }

    store.track('post_apply_submit', {
      postId: String(postId),
      destination: post.destination || ''
    });

    const nextList = (this.data.postList || []).map((item) => {
      const id = item.postId || item._id;
      if (String(id) === String(postId)) return { ...item, _applied: true };
      return item;
    });
    this.setData({ postList: nextList });
    wx.showToast({ title: '申请已提交', icon: 'success' });
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
  }
});
