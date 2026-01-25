// pages/route/scenic-detail.js
import { fetchScenicSpotDetail, fetchAttractionData } from '../../services/scene/index';

Page({
  data: {
    scenicId: '',
    scenicInfo: {},
    attractions: [],
    selectedAttractions: [],
    startPoint: null, // 起点（当前位置）
    endPoint: null, // 终点
    exitPoints: [], // 出口列表
    currentLocation: null, // 当前位置
    selectedEndPoint: 'current' // 选择的终点类型：'current' 或 'exit'
  },

  onLoad(options) {
    const { scenicId } = options;
    this.setData({ 
      scenicId,
      selectedEndPoint: 'current' // 默认选择当前位置作为终点
    });
    this.loadScenicDetail(scenicId);
    this.getCurrentLocation();
  },

  // 下拉刷新
  onPullDownRefresh() {
    const { scenicId } = this.data;

    // 清除该景区的缓存
    const cacheKey = `attractions_${scenicId}`;
    wx.removeStorageSync(cacheKey);
    console.log('已清除景点缓存');

    // 重新加载数据
    this.loadScenicDetail(scenicId);
    this.getCurrentLocation();

    // 停止下拉刷新
    wx.stopPullDownRefresh();
  },

  // 手动刷新（清除缓存）
  onRefresh() {
    const { scenicId } = this.data;

    wx.showModal({
      title: '刷新景点数据',
      content: '刷新将从腾讯地图重新查询最新的景点数据，确定要继续吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除该景区的缓存
          const cacheKey = `attractions_${scenicId}`;
          wx.removeStorageSync(cacheKey);
          console.log('已清除景点缓存');

          // 重新加载数据
          wx.showLoading({ title: '刷新中...' });
          this.loadScenicDetail(scenicId).finally(() => {
            wx.hideLoading();
          });
        }
      }
    });
  },

  // 获取当前位置
  getCurrentLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const currentLocation = {
          latitude: res.latitude,
          longitude: res.longitude,
          name: '当前位置'
        };
        
        // 设置起点为当前位置
        this.setData({
          startPoint: currentLocation,
          currentLocation: currentLocation
        });
        
        // 根据默认的终点选择，设置终点
        const selectedEndPoint = this.data.selectedEndPoint;
        if (selectedEndPoint === 'current') {
          // 默认选择当前位置作为终点
          this.setData({
            endPoint: {
              id: 'current',
              name: '当前位置',
              type: 'end',
              location: currentLocation
            }
          });
          console.log('设置默认终点: 当前位置');
        }
        
        console.log('获取当前位置成功:', currentLocation);
      },
      fail: (err) => {
        console.error('获取当前位置失败:', err);
        wx.showToast({
          title: '无法获取位置，请检查定位权限',
          icon: 'none'
        });
      }
    });
  },

  // 加载景区详情
  async loadScenicDetail(scenicId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const scenicInfo = await fetchScenicSpotDetail(scenicId);

      // 尝试从缓存获取景点数据
      const cacheKey = `attractions_${scenicId}`;
      const cachedAttractions = wx.getStorageSync(cacheKey);
      let attractions = [];

      if (cachedAttractions && cachedAttractions.length > 0) {
        console.log('从缓存获取景点数据:', cachedAttractions);
        attractions = cachedAttractions;
        wx.showToast({
          title: '已加载缓存的景点数据',
          icon: 'success',
          duration: 1500
        });
      } else {
        console.log('缓存未命中，从腾讯地图API查询景点');
        // 从腾讯地图API查询该景区的景点列表
        attractions = await this.searchAttractionsByAPI(scenicInfo);

        if (attractions && attractions.length > 0) {
          // 缓存到本地（有效期24小时）
          const cacheData = {
            data: attractions,
            timestamp: Date.now(),
            expiry: 24 * 60 * 60 * 1000 // 24小时
          };
          wx.setStorageSync(cacheKey, cacheData);
          console.log('景点数据已缓存到本地:', attractions);
        } else {
          // 如果API查询失败，使用备用数据源
          attractions = await fetchAttractionData(scenicId);
          console.log('使用备用数据源:', attractions);
        }
      }

      // 为每个景点添加 selected 字段
      const attractionsWithState = attractions.map(attr => ({
        ...attr,
        selected: false
      }));

      // 生成出口列表（可以从景区配置中获取，这里模拟几个出口）
      const exitPoints = this.generateExitPoints(scenicInfo, attractions);

      this.setData({
        scenicInfo,
        attractions: attractionsWithState,
        exitPoints
      });
    } catch (error) {
      console.error('加载景区详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 通过腾讯地图API查询景点列表
  async searchAttractionsByAPI(scenicInfo) {
    return new Promise((resolve) => {
      // 腾讯地图地点搜索API
      const API_KEY = '6X2BZ-U466S-CKFOJ-67NXH-HLOSO-VRFLE';

      // 常见的景区景点关键词
      const keywords = [
        '景点', '风景区', '公园', '古迹', '寺庙', '塔', '楼', '庙',
        '山', '湖', '岩', '洞', '寺', '观', '亭', '阁'
      ];

      // 构建搜索关键词：景区名称 + 景点关键词
      const searchKeywords = keywords.map(kw => `${scenicInfo.scenicName}${kw}`);

      console.log('搜索景区景点:', searchKeywords);

      // 并发搜索所有关键词
      const requests = searchKeywords.map(keyword => {
        return new Promise((resolveSearch) => {
          wx.request({
            url: 'https://apis.map.qq.com/ws/place/v1/search',
            data: {
              keyword: keyword,
              boundary: `nearby(${scenicInfo.location.latitude},${scenicInfo.location.longitude},3000)`, // 3公里范围内
              key: API_KEY,
              page_size: 10,
              page_index: 1
            },
            method: 'GET',
            success: (res) => {
              if (res.statusCode === 200 && res.data.status === 0 && res.data.data) {
                const pois = res.data.data;
                console.log(`搜索 "${keyword}" 找到 ${pois.length} 个结果`);
                resolveSearch(pois);
              } else {
                resolveSearch([]);
              }
            },
            fail: (error) => {
              console.error(`搜索 "${keyword}" 失败:`, error);
              resolveSearch([]);
            }
          });
        });
      });

      // 等待所有搜索完成
      Promise.all(requests).then(results => {
        // 合并所有结果
        const allPOIs = results.flat();
        
        // 过滤掉没有location的数据
        const validPOIs = allPOIs.filter(poi => poi && poi.location && poi.location.lat && poi.location.lng);
        console.log(`[搜索] 原始结果: ${allPOIs.length} 个, 有效结果: ${validPOIs.length} 个`);

        // 去重：根据名称和位置去重
        const uniquePOIs = this.deduplicatePOIs(validPOIs);
        console.log(`[去重] 去重后: ${uniquePOIs.length} 个景点`);

        // 转换为景点数据格式
        const attractions = uniquePOIs.map(poi => ({
          id: poi.id,
          name: poi.title,
          description: poi.address || poi.category,
          location: {
            latitude: poi.location.lat,
            longitude: poi.location.lng
          },
          duration: this.estimateDuration(poi.category) // 根据类别估算游览时长
        }));

        console.log(`[最终] 有效景点数: ${attractions.length}`);
        resolve(attractions);
      });
    });
  },

  // POI去重
  deduplicatePOIs(pois) {
    const unique = [];
    const seen = new Set();

    for (const poi of pois) {
      // 跳过无效数据
      if (!poi || !poi.title || !poi.location || !poi.location.lat || !poi.location.lng) {
        console.warn('[去重] 跳过无效POI:', poi);
        continue;
      }
      
      // 生成唯一标识：名称+经纬度
      const key = `${poi.title}_${poi.location.lat.toFixed(4)}_${poi.location.lng.toFixed(4)}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(poi);
      }
    }

    return unique;
  },

  // 根据POI类别估算游览时长（分钟）
  estimateDuration(category) {
    // 根据不同类别返回估算时长
    const durationMap = {
      '风景名胜': 90,
      '公园': 60,
      '古迹': 45,
      '寺庙': 45,
      '塔': 30,
      '楼': 30,
      '庙': 45,
      '山': 120,
      '湖': 90,
      '岩': 60,
      '洞': 45,
      '寺': 45,
      '观': 30,
      '亭': 20,
      '阁': 30
    };

    for (const key in durationMap) {
      if (category && category.includes(key)) {
        return durationMap[key];
      }
    }

    return 60; // 默认60分钟
  },

  // 生成出口列表
  generateExitPoints(scenicInfo, attractions) {
    // 如果景区信息中包含出口数据，使用景区出口
    if (scenicInfo.exits && scenicInfo.exits.length > 0) {
      return scenicInfo.exits;
    }

    // 否则，根据景区位置生成默认出口
    const defaultExits = [];

    // 主入口/出口
    if (scenicInfo.location) {
      defaultExits.push({
        id: 'exit_main',
        name: '主入口',
        location: scenicInfo.location
      });
    }

    // 可以根据实际需要添加更多出口
    // 例如：北门、南门、东门、西门等
    if (attractions.length > 0) {
      // 使用第一个景点作为备用出口
      defaultExits.push({
        id: 'exit_attraction',
        name: '景区出口',
        location: attractions[0].location
      });
    }

    return defaultExits;
  },

  // 点击景点
  onAttractionTap(e) {
    const { id } = e.currentTarget.dataset;
    const attractions = this.data.attractions.map(item => {
      if (item.id === id) {
        return { ...item, selected: !item.selected };
      }
      return item;
    });
    const selectedAttractions = attractions.filter(item => item.selected);
    this.setData({ attractions, selectedAttractions });
  },

  // 选择终点
  onEndPointSelect(e) {
    const { type, index } = e.currentTarget.dataset;

    if (type === 'current') {
      // 选择当前位置作为终点
      this.setData({
        endPoint: this.data.currentLocation
      });
      wx.showToast({
        title: '已选择当前位置作为终点',
        icon: 'none'
      });
    } else if (type === 'exit') {
      // 选择出口作为终点
      const endPoint = this.data.exitPoints[index];
      this.setData({
        endPoint: endPoint
      });
      wx.showToast({
        title: `已选择${endPoint.name}作为终点`,
        icon: 'none'
      });
    }
  },

  // 清除终点选择
  onClearEndPoint() {
    this.setData({
      endPoint: null
    });
    wx.showToast({
      title: '已清除终点',
      icon: 'none'
    });
  },

  // 生成路线方案
  onPlanRoute() {
    if (this.data.selectedAttractions.length < 1) {
      wx.showToast({
        title: '请至少选择1个景点',
        icon: 'none'
      });
      return;
    }

    if (!this.data.startPoint) {
      wx.showToast({
        title: '无法获取起点位置',
        icon: 'none'
      });
      return;
    }

    // 构建完整的路线点：起点 → 选择的景点 → 终点
    const routePoints = [
      {
        ...this.data.startPoint,
        type: 'start',
        name: this.data.startPoint.name || '起点'
      },
      ...this.data.selectedAttractions.map(attr => ({
        ...attr,
        type: 'attraction'
      }))
    ];

    // 如果设置了终点，添加到路线中
    if (this.data.endPoint) {
      routePoints.push({
        ...this.data.endPoint,
        type: 'end',
        name: this.data.endPoint.name || '终点'
      });
    }

    console.log('生成的路线点:', routePoints);

    const params = encodeURIComponent(JSON.stringify({
      scenicId: this.data.scenicId,
      routePoints: routePoints
    }));

    wx.navigateTo({
      url: `/pages/route/route-plan?data=${params}`
    });
  },

  // 选择终点类型
  onEndPointSelect(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ selectedEndPoint: type });
    
    // 根据选择更新终点数据
    if (type === 'current') {
      // 使用当前位置作为终点
      const currentLocation = this.data.currentLocation;
      if (currentLocation) {
        this.setData({
          endPoint: {
            id: 'current',
            name: '当前位置',
            type: 'end',
            location: currentLocation
          }
        });
        console.log('选择终点: 当前位置');
      } else {
        console.warn('当前位置数据为空');
        wx.showToast({
          title: '当前位置未获取',
          icon: 'none'
        });
      }
    } else if (type === 'exit') {
      // 使用景区出口作为终点
      const exitPoints = this.data.exitPoints;
      if (exitPoints && exitPoints.length > 0) {
        // 选择第一个出口作为终点（或者可以选择最近的出口）
        const exitPoint = exitPoints[0];
        if (exitPoint && exitPoint.location) {
          this.setData({
            endPoint: {
              id: exitPoint.id || 'exit',
              name: exitPoint.name || '景区出口',
              type: 'end',
              location: exitPoint.location
            }
          });
          console.log('选择终点: 景区出口', exitPoint.name);
        } else {
          console.warn('景区出口数据无效:', exitPoint);
          wx.showToast({
            title: '景区出口数据无效',
            icon: 'none'
          });
        }
      } else {
        wx.showToast({
          title: '未找到景区出口',
          icon: 'none'
        });
      }
    }
  }
});
