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
      const res = await fetchIndexData({pageSize:1});
      const res1 = await fetchScenicSpotData();
      const res2 = await fetchNewsData({pageSize:3});
      const {index_show,function_show,cooperation} = res?.[0];

      // 处理热门景区列表（按热度排序，取前5个）
      let hotScenicList = [];
      console.log('[首页] 原始景区数据 res1:', res1);
      
      // 如果数据没有heat字段，手动添加（备用方案）
      let processedScenicData = res1 || [];
      if (processedScenicData.length > 0 && !processedScenicData[0].heat) {
        console.log('[首页] 数据缺少heat字段，使用备用热度数据');
        const heatMap = {
          'scenic_001': 98.5,
          'scenic_002': 95.2,
          'scenic_003': 87.3,
          'scenic_004': 91.7,
          'scenic_005': 82.1
        };
        processedScenicData = processedScenicData.map(item => ({
          ...item,
          heat: heatMap[item.scenicId] || 80.0
        }));
        console.log('[首页] 添加热度后的数据:', processedScenicData);
      }
      
      if (processedScenicData && processedScenicData.length > 0) {
        // 按热度从高到低排序
        const sorted = processedScenicData.sort((a, b) => (b.heat || 0) - (a.heat || 0));
        console.log('[首页] 排序后数据:', sorted.map(item => ({name: item.scenicName, heat: item.heat})));
        hotScenicList = sorted.slice(0, 5);
        console.log('[首页] 最终热门景区列表:', hotScenicList.length, '个', hotScenicList.map(item => item.scenicName));
      }

      this.setData({
        showUploadTip: true,
        bannerList:index_show,
        productAbilityList:function_show,
        partnersList: cooperation,
        applicationScene:res1,
        newsList: res2,
        hotScenicList: hotScenicList
      }, () => {
        console.log('[首页] setData完成，hotScenicList:', this.data.hotScenicList);
      });
    } catch (error) {
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
