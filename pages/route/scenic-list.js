// pages/route/scenic-list.js
import { fetchScenicSpotData } from '../../services/scene/index';
import { DEFAULT_SCENIC_IMAGE, resolveScenicImageUrlByName } from '../../config/scenic-images';

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
      this.applyFilter(keyword);
    }
  },

  // 在 setData 之前注入 imageUrl
  decorateScenicList(list = []) {
    return list.map(item => {
      const scenicName = (item.scenicName || item.name || '').trim();
      const mappedUrl = resolveScenicImageUrlByName(scenicName);
      const imageUrl = mappedUrl || item.imageUrl || DEFAULT_SCENIC_IMAGE;
      return {
        ...item,
        imageUrl,
        _imageLoading: true
      };
    });
  },

  applyFilter(keyword = '') {
    const list = this.data.scenicList || [];
    const filtered = keyword
      ? list.filter(item => item.scenicName && item.scenicName.includes(keyword))
      : list;

    this.setData({
      filteredScenicList: filtered.map(item => ({ ...item, _imageLoading: true }))
    });
  },

  // 获取缓存的定位信息
  getCachedLocation() {
    try {
      const cache = wx.getStorageSync('location_cache');
      if (cache) {
        const now = Date.now();
        const cacheTime = cache.timestamp || 0;
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

  calculateDistance(lat1, lng1, lat2, lng2) {
    const rad = (d) => d * Math.PI / 180;
    const R = 6378137;
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  },

  sortByDistance(list) {
    const { currentLatitude, currentLongitude } = this.data;
    if (!currentLatitude || !currentLongitude) {
      return list;
    }

    return list
      .map(item => {
        const lat = item.latitude || item.lat || (item.location && item.location.latitude);
        const lng = item.longitude || item.lng || (item.location && item.location.longitude);
        const distance = this.calculateDistance(currentLatitude, currentLongitude, lat, lng);
        return { ...item, distance };
      })
      .sort((a, b) => a.distance - b.distance);
  },

  async loadScenicList() {
    wx.showLoading({ title: '加载中...' });
    try {
      const list = await fetchScenicSpotData();
      const sortedList = this.sortByDistance(list);
      const scenicList = this.decorateScenicList(sortedList);
      const keyword = wx.getStorageSync('homeSearchKeyword') || '';
      if (keyword) {
        wx.removeStorageSync('homeSearchKeyword');
      }
      this.setData({
        searchKeyword: keyword,
        scenicList
      }, () => {
        this.applyFilter(keyword);
      });
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onImageLoad(e) {
    const index = e.currentTarget.dataset.index;
    if (index === undefined) return;
    this.setData({
      [`filteredScenicList[${index}]._imageLoading`]: false
    });
  },

  // 图片失败回退默认图
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    if (index === undefined) return;
    this.setData({
      [`filteredScenicList[${index}].imageUrl`]: DEFAULT_SCENIC_IMAGE,
      [`filteredScenicList[${index}]._imageLoading`]: false
    });
  },

  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    this.applyFilter(keyword);
  },

  onScenicTap(e) {
    const scenic = e.currentTarget.dataset.scenic;
    const scenicId = scenic.scenicId || scenic._id;

    if (!scenicId) {
      wx.showToast({
        title: '景区ID不存在',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/packageRoute/pages/route/scenic-detail?scenicId=${scenicId}`,
      fail: () => {
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
