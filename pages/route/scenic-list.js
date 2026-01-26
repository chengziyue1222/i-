// pages/route/scenic-list.js
import { fetchScenicSpotData } from '../../services/scene/index';

Page({
  data: {
    scenicList: [],
    filteredScenicList: [],
    searchKeyword: '',
    currentLatitude: 0,
    currentLongitude: 0
  },

  onLoad() {
    this.getCurrentLocation();
  },

  // 获取缓存的定位信息
  getCachedLocation() {
    try {
      const cache = wx.getStorageSync('location_cache');
      if (cache) {
        const now = Date.now();
        const cacheTime = cache.timestamp || 0;
        // 10分钟有效期 = 10 * 60 * 1000 = 600000ms
        if (now - cacheTime < 600000) {
          return {
            latitude: cache.latitude,
            longitude: cache.longitude
          };
        }
      }
    } catch (e) {
      console.error('读取定位缓存失败', e);
    }
    return null;
  },

  // 保存定位信息到缓存
  saveLocationToCache(latitude, longitude) {
    try {
      wx.setStorageSync('location_cache', {
        latitude,
        longitude,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error('保存定位缓存失败', e);
    }
  },

  // 获取当前位置
  getCurrentLocation() {
    // 尝试读取缓存的定位
    const cachedLocation = this.getCachedLocation();
    
    if (cachedLocation) {
      this.setData({
        currentLatitude: cachedLocation.latitude,
        currentLongitude: cachedLocation.longitude
      });
      this.loadScenicList();
      return;
    }

    // 缓存不存在或已过期,重新获取定位
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        // 保存到缓存
        this.saveLocationToCache(res.latitude, res.longitude);
        
        this.setData({
          currentLatitude: res.latitude,
          currentLongitude: res.longitude
        });
        this.loadScenicList();
      },
      fail: () => {
        wx.showToast({
          title: '定位失败，使用默认排序',
          icon: 'none'
        });
        this.loadScenicList();
      }
    });
  },

  // 计算两点之间的距离(单位:米)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const rad = (d) => d * Math.PI / 180;
    const R = 6378137; // 地球半径(m)
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  },

  // 按距离排序景点列表
  sortByDistance(list) {
    const { currentLatitude, currentLongitude } = this.data;

    // 如果没有定位信息,返回原列表
    if (!currentLatitude || !currentLongitude) {
      return list;
    }

    return list
      .map(item => {
        const distance = this.calculateDistance(
          currentLatitude,
          currentLongitude,
          item.latitude || item.lat,
          item.longitude || item.lng
        );
        return { ...item, distance };
      })
      .sort((a, b) => a.distance - b.distance);
  },

  // 加载景区列表
  async loadScenicList() {
    wx.showLoading({ title: '加载中...' });
    try {
      const list = await fetchScenicSpotData();
      const sortedList = this.sortByDistance(list);
      this.setData({
        scenicList: sortedList,
        filteredScenicList: sortedList
      });
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value;
    const filtered = this.data.scenicList.filter(item =>
      item.scenicName.includes(keyword)
    );
    this.setData({
      searchKeyword: keyword,
      filteredScenicList: filtered
    });
  },

  // 点击景区卡片
  onScenicTap(e) {
    const scenic = e.currentTarget.dataset.scenic;
    wx.navigateTo({
      url: `/pages/route/scenic-detail?scenicId=${scenic.scenicId}`
    });
  },

  onPullDownRefresh() {
    this.getCurrentLocation().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
