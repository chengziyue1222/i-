import { fetchIndexData } from '../../services/index/index';
import { fetchScenicSpotData } from '../../services/scene/index';
import { fetchNewsData } from '../../services/news/index';

Page({
  data: {
    showUploadTip:false,
    bannerList:[],
    productAbilityList:[],
    applicationScene:[],
    newsList:[],
    partnersList:[],
    hotScenicList:[] // 热门景区列表
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
      
      if (!res1) {
        console.error('[首页] ❌ 景区数据返回为空！');
      } else if (res1.length === 0) {
        console.warn('[首页] ⚠️ 景区数据为空数组！');
      } else {
        console.log('[首页] ✅ 成功获取景区数据，共', res1.length, '条');
      }
      
      const res2 = await fetchNewsData({pageSize:3});
      console.log('[首页] 新闻数据加载完成:', res2);
      
      const {index_show,function_show,cooperation} = res?.[0] || {};
      console.log('[首页] 解析首页数据:', {index_show, function_show, cooperation});

      // 处理热门景区列表（按热度排序，取前5个）
      let hotScenicList = [];
      console.log('[首页] 原始景区数据 res1:', res1);
      
      // 云数据库已按热度降序排序，直接取前5个
      if (res1 && res1.length > 0) {
        hotScenicList = res1.slice(0, 5);
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
        applicationScene: res1 || [],
        newsList: res2 || [],
        hotScenicList: hotScenicList
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
  // 跳转最新动态列表页面
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
      url: `/pages/route/scenic-detail?scenicId=${scenicId}`
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
