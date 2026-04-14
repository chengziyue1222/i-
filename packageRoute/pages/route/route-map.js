// pages/route/route-map.js
const { TENCENT_MAP_API_KEY } = require('../../../config/map');

Page({
  data: {
    scheme: {},
    scenicId: '',
    centerLocation: {
      latitude: 23.105994,
      longitude: 112.470000
    },
    markers: [],
    polyline: [],
    pathPoints: [], // 完整的路径点数据
    currentStopIndex: 0,
    sortedAttractions: []
  },

  async onLoad(options) {
    const raw = options && options.data ? options.data : encodeURIComponent('{}');
    let data = {};
    try {
      data = JSON.parse(decodeURIComponent(raw));
    } catch (e) {
      data = {};
    }

    const safeScheme = data.scheme || {};
    const safeStops = Array.isArray(safeScheme.stops) ? safeScheme.stops : [];
    const safeRoutePoints = Array.isArray(data.routePoints) ? data.routePoints : [];
    const safeSorted = Array.isArray(data.sortedAttractions) ? data.sortedAttractions : [];

    this.setData({
      scheme: {
        ...safeScheme,
        stops: safeStops.length ? safeStops : safeRoutePoints
      },
      scenicId: data.scenicId || '',
      sortedAttractions: safeSorted.length ? safeSorted : safeRoutePoints,
      currentStopIndex: 0
    });

    await this.initMap();
  },

  // 辅助函数：从点对象中提取 location
  extractLocation(point) {
    if (point && point.location) {
      return point.location; // 优先使用 location 对象
    } else if (point && typeof point.latitude === 'number' && typeof point.longitude === 'number') {
      return {
        latitude: point.latitude,
        longitude: point.longitude
      }; // 如果坐标在顶层，构建 location 对象
    }
    return null;
  },

  // 初始化地图
  async initMap() {
    // 优先使用页面参数，其次使用存储
    let sortedAttractions = this.data.sortedAttractions || [];
    if (!sortedAttractions.length) {
      sortedAttractions = wx.getStorageSync('sortedAttractions') || [];
    }
    let cachedPathData = wx.getStorageSync('routePathData');

    // 如果传递的 scheme 中有 pathData，优先使用传递的数据
    if (this.data.scheme && this.data.scheme.pathData) {
      cachedPathData = this.data.scheme.pathData;
    }

    if (sortedAttractions.length === 0) {
      wx.showToast({
        title: '路线点为空，无法展示地图',
        icon: 'none'
      });
      return;
    }

    // 显示加载提示
    wx.showLoading({
      title: '加载地图数据...',
      mask: true
    });

    try {
      // 检查并过滤掉无效的数据（没有location的）
      const validAttractions = sortedAttractions.filter(attr => {
        const location = this.extractLocation(attr);
        return attr && location;
      });

      if (validAttractions.length === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '路线数据无效（缺少位置信息）',
          icon: 'none'
        });
        return;
      }

      // 检查起点和终点是否重合
      const startPoint = validAttractions.find(attr => attr.type === 'start');
      const endPoint = validAttractions.find(attr => attr.type === 'end');

      let mergedAttractions = [...validAttractions];

      // 如果起点和终点都是"当前位置"，合并它们
      if (startPoint && endPoint &&
          startPoint.name === endPoint.name &&
          startPoint.type === 'start' && endPoint.type === 'end') {
        // 移除终点
        mergedAttractions = validAttractions.filter(attr => attr.type !== 'end');
      }

      // 生成标记点 - 使用自定义颜色区分起点终点
      const markers = this.generateMarkers(mergedAttractions);

      // 生成步行导航路线
      let polyline;
      let pathPoints = [];

      const pathData = (this.data.scheme && this.data.scheme.pathData) || cachedPathData;
      if (pathData && pathData.points && pathData.points.length > 0) {
        pathPoints = pathData.points;
        polyline = [{
          points: pathPoints,
          color: '#0F62FE',
          width: 5,
          dottedLine: false,
          arrowLine: true
        }];
      } else {
        try {
          polyline = this.generatePolyline(mergedAttractions);
          // 从polyline中提取路径点
          if (polyline && polyline[0] && polyline[0].points) {
            pathPoints = polyline[0].points;
          }
        } catch (error) {
          polyline = [];
        }
      }

      const firstStop = mergedAttractions[0];
      const firstLocation = this.extractLocation(firstStop);
      const centerLocation = firstLocation || this.calculateCenter(mergedAttractions);

      this.setData({
        markers,
        polyline: polyline || [],
        pathPoints: pathPoints,
        centerLocation,
        sortedAttractions: mergedAttractions,
        currentStopIndex: 0
      });
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      // 隐藏加载提示
      wx.hideLoading();
    }
  },

  // 生成标记点
  generateMarkers(attractions) {
    return attractions.filter(attr => {
      const location = this.extractLocation(attr);
      return attr && location;
    }).map((attr, index) => {
      const location = this.extractLocation(attr);

      // 根据类型和位置设置不同的颜色
      let color = '#0F62FE'; // 默认蓝色
      if (attr.type === 'start') color = '#52c41a'; // 起点绿色
      if (attr.type === 'end') color = '#ff4d4f'; // 终点红色

      return {
        id: index + 1,
        latitude: location.latitude,
        longitude: location.longitude,
        title: attr.name,
        iconPath: attr.type === 'start' ? '/images/icons/index-active.png' :
          attr.type === 'end' ? '/images/icons/address.png' :
            '/images/icons/index.png',
        width: 32,
        height: 32,
        callout: {
          content: `${attr.type === 'start' ? '起点' : attr.type === 'end' ? '终点' : index}. ${attr.name}`,
          color: color,
          fontSize: 14,
          borderRadius: 4,
          bgColor: '#fff',
          padding: 8,
          display: 'ALWAYS',
          textAlign: 'center',
          borderWidth: 2,
          borderColor: color
        }
      };
    });
  },

  // 生成路线（使用Haversine直线）
  generatePolyline(attractions) {
    if (!attractions || attractions.length === 0) {
      return [];
    }

    // 过滤掉没有location的景点
    const validAttractions = attractions.filter(attr => attr && attr.location);

    if (validAttractions.length === 0) {
      return [];
    }

    const points = validAttractions.map(attr => ({
      latitude: attr.location.latitude,
      longitude: attr.location.longitude
    }));

    return [{
      points,
      color: '#0F62FE',
      width: 5,
      dottedLine: false,
      arrowLine: true
    }];
  },

  // 计算地图中心点
  calculateCenter(attractions) {
    if (attractions.length === 0) {
      return { latitude: 23.105994, longitude: 116.405000 };
    }

    let sumLat = 0;
    let sumLon = 0;

    attractions.forEach(attr => {
      const location = this.extractLocation(attr);
      if (location) {
        sumLat += location.latitude;
        sumLon += location.longitude;
      }
    });

    return {
      latitude: sumLat / attractions.length,
      longitude: sumLon / attractions.length
    };
  },

  // 通过景点名称获取位置坐标（通过腾讯地图API查询）
  async getLocationByName(attractionName, attractions) {
    // 如果没有传入 attractions，则从 data 中获取
    if (!attractions) {
      attractions = this.data.sortedAttractions;
    }

    // 本地数据中没有，通过腾讯地图API查询
    try {
      // 使用腾讯地图地理编码API
      const response = await this.searchLocationByAPI(attractionName);

      if (response) {
        return response;
      }

      // API未返回有效结果，使用默认位置
      const defaultLocation = await this.getDefaultLocation(attractionName);
      return defaultLocation;
    } catch (error) {
      // 异常情况下也尝试使用默认位置
      const defaultLocation = await this.getDefaultLocation(attractionName);
      return defaultLocation;
    }
  },

  // 通过API搜索位置
  searchLocationByAPI(keyword) {
    return new Promise((resolve) => {
      // 使用统一的API Key
      const API_KEY = TENCENT_MAP_API_KEY;

      // 构建请求URL
      const url = 'https://apis.map.qq.com/ws/geocoder/v1/';

      // 添加城市限定，优先查找肇庆的景点
      const searchKeyword = `肇庆${keyword}`;

      wx.request({
        url: url,
        data: {
          address: searchKeyword,
          key: API_KEY
        },
        method: 'GET',
        success: (res) => {
          if (res.statusCode === 200 && res.data.status === 0 && res.data.result) {
            const location = {
              latitude: res.data.result.location.lat,
              longitude: res.data.result.location.lng
            };
            resolve(location);
          } else {
            // API调用失败，尝试使用默认位置
            this.getDefaultLocation(keyword).then(resolve).catch(() => resolve(null));
          }
        },
        fail: () => {
          // 如果API失败，尝试使用默认位置
          this.getDefaultLocation(keyword).then(resolve).catch(() => resolve(null));
        }
      });
    });
  },

  // 获取默认位置（当API不可用时）
  async getDefaultLocation(keyword) {
    // 肇庆地区景点默认位置库
    const defaultLocations = {
      // 核心景点
      '七星岩': { latitude: 23.105994, longitude: 112.470000 },
      '鼎湖山': { latitude: 23.170000, longitude: 112.550000 },
      '星湖': { latitude: 23.108000, longitude: 112.480000 },
      '端州古城': { latitude: 23.050000, longitude: 112.465000 },

      // 其他景点
      '阅江楼': { latitude: 23.048000, longitude: 112.462000 },
      '梅庵': { latitude: 23.052000, longitude: 112.470000 },
      '崇禧塔': { latitude: 23.055000, longitude: 112.468000 },
      '庆云寺': { latitude: 23.165000, longitude: 112.545000 },
      '砚洲岛': { latitude: 23.085000, longitude: 112.580000 },
      '羚山峡': { latitude: 23.120000, longitude: 112.510000 },
      '德庆孔庙': { latitude: 23.145000, longitude: 111.785000 },
      '龙母祖庙': { latitude: 23.285000, longitude: 111.670000 },
      '龙岩洞': { latitude: 23.075000, longitude: 112.475000 },

      // 公园景点
      '肇庆公园': { latitude: 23.058000, longitude: 112.466000 },
      '东门广场': { latitude: 23.060000, longitude: 112.472000 }
    };

    for (const key in defaultLocations) {
      if (keyword.includes(key)) {
        return defaultLocations[key];
      }
    }

    // 如果没有匹配到，返回肇庆中心位置作为兜底
    return { latitude: 23.105994, longitude: 112.470000 };
  },

  // 地图区域变化
  onMapRegionChange() {
    return null;
  },

  // 放大
  onZoomIn() {
    const map = wx.createMapContext('routeMap', this);
    map.moveToLocation();
  },

  // 缩小
  onZoomOut() {
    // 可以实现缩放逻辑
  },

  // 点击站点
  onStopTap(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentStopIndex: index });
  },

  // 查看攻略详情
  onSaveToLibrary() {
    const { scheme, scenicId, sortedAttractions } = this.data;
    if (!scheme || !scheme.pathData) {
      wx.showToast({ title: '路线数据不完整', icon: 'none' });
      return;
    }
    const pathData = scheme.pathData;
    const library = wx.getStorageSync('tripLibrary') || [];
    const now = new Date();
    const createTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const trip = {
      id: 'trip_' + Date.now(),
      name: scheme.name || '行程',
      scenicName: scheme.name || '景区路线',
      scenicId: scenicId || '',
      createTime,
      scheme,
      sortedAttractions: sortedAttractions || [],
      pathData
    };
    library.unshift(trip);
    wx.setStorageSync('tripLibrary', library);
    const days = wx.getStorageSync('travelDays') || 0;
    wx.setStorageSync('travelDays', days + 1);
    wx.showToast({ title: '已保存到行程库', icon: 'success' });
  },

  onViewDetail() {
    const params = encodeURIComponent(JSON.stringify({
      scheme: this.data.scheme,
      scenicId: this.data.scenicId
    }));
    wx.navigateTo({
      url: `/packageRoute/pages/route/route-detail?data=${params}`
    });
  },

  // 开始导航
  onStartNavigation() {
    const attractions = this.data.sortedAttractions || [];

    if (attractions.length === 0) {
      wx.showToast({
        title: '路线数据为空',
        icon: 'none'
      });
      return;
    }

    const params = encodeURIComponent(JSON.stringify({
      scheme: this.data.scheme,
      attractions: attractions
    }));

    wx.navigateTo({
      url: `/packageRoute/pages/route/route-nav-page?data=${params}`
    });
  }
});
