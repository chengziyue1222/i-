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
  onShow() {
    const keyword = wx.getStorageSync('homeSearchKeyword');
    if (keyword !== undefined && keyword !== '' && keyword !== null) {
      wx.removeStorageSync('homeSearchKeyword');
      this.setData({ searchKeyword: keyword });
      const list = this.data.scenicList || [];
      const filtered = list.filter(item => item.scenicName && item.scenicName.includes(keyword));
      this.setData({ filteredScenicList: filtered });
    }
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

  // 获取当前位置，返回 Promise
  getCurrentLocation() {
    return new Promise((resolve) => {
      const cachedLocation = this.getCachedLocation();
      if (cachedLocation) {
        this.setData({
          currentLatitude: cachedLocation.latitude,
          currentLongitude: cachedLocation.longitude
        });
        this.loadScenicList().then(resolve).catch(resolve);
        return;
      }
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          this.saveLocationToCache(res.latitude, res.longitude);
          this.setData({
            currentLatitude: res.latitude,
            currentLongitude: res.longitude
          });
          this.loadScenicList().then(resolve).catch(resolve);
        },
        fail: () => {
          wx.showToast({ title: '定位失败，使用默认排序', icon: 'none' });
          this.loadScenicList().then(resolve).catch(resolve);
        }
      });
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
        // 兼容多种经纬度字段名：location.latitude/longitude, lat/lng, latitude/longitude
        const lat = item.latitude || item.lat || (item.location && item.location.latitude);
        const lng = item.longitude || item.lng || (item.location && item.location.longitude);
        const distance = this.calculateDistance(
          currentLatitude,
          currentLongitude,
          lat,
          lng
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
      const keyword = wx.getStorageSync('homeSearchKeyword') || '';
      let filtered = sortedList;
      if (keyword) {
        wx.removeStorageSync('homeSearchKeyword');
        this.setData({ searchKeyword: keyword });
        filtered = sortedList.filter(item => item.scenicName && item.scenicName.includes(keyword));
      }
      this.setData({
        scenicList: sortedList,
        filteredScenicList: filtered
      });
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
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
    console.log('点击景区:', scenic);
    console.log('景区所有字段:', Object.keys(scenic));

    // 兼容多种ID字段名：scenicId, _id
    const scenicId = scenic.scenicId || scenic._id;
    console.log('跳转到景区详情, scenicId:', scenicId);

    if (!scenicId) {
      console.error('景区ID不存在，无法跳转');
      wx.showToast({
        title: '景区ID不存在',
        icon: 'none'
      });
      return;
    }

    // 使用分包的物理路径进行跳转
    const url = `/packageRoute/pages/route/scenic-detail?scenicId=${scenicId}`;
    console.log('跳转路径:', url);

    wx.navigateTo({
      url: url,
      success: () => {
        console.log('跳转成功');
      },
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  onPullDownRefresh() {
    this.getCurrentLocation().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
