// pages/route/route-map.js
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
    currentStopIndex: 0,
    sortedAttractions: []
  },

  async onLoad(options) {
    const data = JSON.parse(decodeURIComponent(options.data));
    console.log('路线地图页面接收到的数据:', data);
    console.log('传递的scheme对象:', data.scheme);
    console.log('传递的scheme.pathData:', data.scheme?.pathData);
    console.log('传递的scheme.pathData.points:', data.scheme?.pathData?.points);

    this.setData({
      scheme: data.scheme,
      scenicId: data.scenicId
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
    // 从存储中获取排序后的景点数据和路径数据
    let sortedAttractions = wx.getStorageSync('sortedAttractions') || [];
    let cachedPathData = wx.getStorageSync('routePathData');

    console.log('从存储获取的路线数据:', sortedAttractions);
    console.log('从存储获取的路径数据:', cachedPathData);

    // 如果传递的 scheme 中有 pathData，优先使用传递的数据
    if (this.data.scheme && this.data.scheme.pathData) {
      console.log('使用传递的路径数据（优先）:', this.data.scheme.pathData);
      cachedPathData = this.data.scheme.pathData;
    }

    if (sortedAttractions.length === 0) {
      wx.showToast({
        title: '路线数据为空',
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
      // 不过滤任何点,直接使用所有路线数据
      console.log('路线点数量:', sortedAttractions.length);
      console.log('路线点列表:', sortedAttractions);

      // 检查并过滤掉无效的数据（没有location的）
      const validAttractions = sortedAttractions.filter(attr => {
        const location = this.extractLocation(attr);
        return attr && location;
      });
      console.log('有效路线点数量:', validAttractions.length);
      
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
        console.log('起点和终点重合，合并为一个标记');
        // 移除终点
        mergedAttractions = validAttractions.filter(attr => attr.type !== 'end');
      }

      // 生成标记点 - 使用自定义颜色区分起点终点
      const markers = this.generateMarkers(mergedAttractions);

      // 生成步行导航路线 - 优先使用缓存的路径数据
      let polyline;
      if (cachedPathData && cachedPathData.points && cachedPathData.points.length > 0) {
        console.log('使用缓存的路径数据，跳过API调用');
        polyline = this.buildPolylineFromCache(cachedPathData);
      } else {
        console.log('没有缓存的路径数据，调用API获取');
        polyline = await this.generateWalkingPolyline(sortedAttractions);
      }

      // 计算中心点
      const centerLocation = this.calculateCenter(mergedAttractions);
      // 输出中心点
      console.log('中心点坐标:', centerLocation);
      console.log('标记点数量:', markers.length);
      console.log('路线数据结构:', polyline);
      console.log('路线点数量:', polyline && polyline[0] && polyline[0].points ? polyline[0].points.length : 'N/A');

      this.setData({
        markers,
        polyline: polyline || [],
        centerLocation,
        sortedAttractions: mergedAttractions
      });
    } catch (error) {
      console.error('初始化地图失败:', error);
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
    console.log('[生成标记] attractions:', attractions);

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
      console.warn('generatePolyline: 没有景点数据');
      return [];
    }

    console.log('[生成路线] attractions:', attractions);
    
    // 过滤掉没有location的景点
    const validAttractions = attractions.filter(attr => attr && attr.location);
    
    if (validAttractions.length === 0) {
      console.warn('generatePolyline: 没有有效的景点数据（缺少location）');
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

  // 从缓存数据构建polyline
  buildPolylineFromCache(pathData) {
    console.log('buildPolylineFromCache 输入的 pathData:', pathData);

    if (!pathData) {
      console.warn('缓存路径数据为空或无效');
      return [];
    }

    const { points } = pathData;

    console.log('提取的 points:', points);
    console.log('points 类型:', typeof points);
    console.log('points 是否为数组:', Array.isArray(points));
    console.log('points 长度:', points ? points.length : 'N/A');

    if (!points || !Array.isArray(points) || points.length === 0) {
      console.warn('缓存路径点为空，尝试使用直线');
      const sortedAttractions = wx.getStorageSync('sortedAttractions') || [];
      return this.generatePolyline(sortedAttractions);
    }

    // 验证并过滤有效的坐标点
    const validPoints = points.filter(point => {
      const isValid = point && 
                      typeof point.latitude === 'number' && 
                      typeof point.longitude === 'number' &&
                      !isNaN(point.latitude) && 
                      !isNaN(point.longitude) &&
                      point.latitude >= -90 && 
                      point.latitude <= 90 &&
                      point.longitude >= -180 && 
                      point.longitude <= 180;
      
      if (!isValid) {
        console.warn('过滤无效的坐标点:', point);
      }
      return isValid;
    });

    console.log('从缓存构建polyline，原始路径点数量:', points.length);
    console.log('过滤后有效路径点数量:', validPoints.length);

    if (validPoints.length === 0) {
      console.warn('没有有效的路径点，尝试使用直线');
      const sortedAttractions = wx.getStorageSync('sortedAttractions') || [];
      return this.generatePolyline(sortedAttractions);
    }

    return [{
      points: validPoints,
      color: '#0F62FE',
      width: 5,
      dottedLine: false,
      arrowLine: true
    }];
  },

  // 生成步行导航路线（使用腾讯地图API）
  async generateWalkingPolyline(attractions) {
    try {
      // 获取腾讯地图API Key
      const key = wx.getStorageSync('tencentMapKey') || '6X2BZ-U466S-CKFOJ-67NXH-HLOSO-VRFLE';
      
      // 构建所有路线段
      let allPathPoints = [];
      
      // 逐段获取步行路径
      for (let i = 0; i < attractions.length - 1; i++) {
        const from = attractions[i];
        const to = attractions[i + 1];
        
        try {
          const pathPoints = await this.getWalkingPath(
            from.location,
            to.location,
            key
          );
          
          if (pathPoints && pathPoints.length > 0) {
            // 确保所有坐标点都是有效的
            const validPoints = pathPoints.filter(point => 
              point && 
              typeof point.latitude === 'number' && 
              typeof point.longitude === 'number' &&
              !isNaN(point.latitude) && 
              !isNaN(point.longitude)
            );
            
            if (validPoints.length > 0) {
              // 如果是第一段，直接添加；如果是后续段，跳过第一个点（避免重复）
              if (i === 0) {
                allPathPoints = allPathPoints.concat(validPoints);
              } else {
                allPathPoints = allPathPoints.concat(validPoints.slice(1));
              }
            }
          }
        } catch (error) {
          console.warn(`获取步行路径失败 (${from.name} -> ${to.name}):`, error);
        }
      }

      // 如果没有获取到任何有效路径点，回退到直线
      if (allPathPoints.length === 0) {
        console.warn('未获取到任何有效的步行路径点，使用直线连接');
        return this.generatePolyline(attractions);
      }

      console.log('步行导航路线点数量:', allPathPoints.length);
      console.log('前3个路径点示例:', allPathPoints.slice(0, 3));
      
      return [{
        points: allPathPoints,
        color: '#0F62FE',
        width: 5,
        dottedLine: false,
        arrowLine: true
      }];
    } catch (error) {
      console.error('生成步行导航路线失败:', error);
      // 出错时回退到直线连接
      return this.generatePolyline(attractions);
    }
  },

  // 获取两点间的步行路径（使用腾讯地图API）
  getWalkingPath(fromLocation, toLocation, key) {
    return new Promise((resolve, reject) => {
      const from = `${fromLocation.latitude},${fromLocation.longitude}`;
      const to = `${toLocation.latitude},${toLocation.longitude}`;
      
      console.log(`调用腾讯地图步行路径API: ${from} -> ${to}`);
      
      wx.request({
        url: 'https://apis.map.qq.com/ws/direction/v1/walking',
        method: 'GET',
        data: {
          from: from,
          to: to,
          key: key
        },
        success: (res) => {
          console.log('腾讯地图API原始响应:', res.data);
          
          if (res.data && res.data.status === 0 && res.data.result && res.data.result.routes && res.data.result.routes.length > 0) {
            // 解析路径坐标点
            const route = res.data.result.routes[0];
            console.log('路由数据:', route);
            
            const pathPoints = this.parseRoutePolyline(route);
            
            // 确保返回的是有效数组
            if (Array.isArray(pathPoints) && pathPoints.length > 0) {
              console.log(`成功获取步行路径: ${from} -> ${to}, 路径点数量: ${pathPoints.length}`);
              resolve(pathPoints);
            } else {
              console.warn('parseRoutePolyline返回空数组，使用直线作为备选');
              // 返回起点和终点作为直线
              resolve([
                { latitude: fromLocation.latitude, longitude: fromLocation.longitude },
                { latitude: toLocation.latitude, longitude: toLocation.longitude }
              ]);
            }
          } else {
            console.warn('腾讯地图API返回异常:', res.data);
            // API返回错误时，使用直线作为备选
            resolve([
              { latitude: fromLocation.latitude, longitude: fromLocation.longitude },
              { latitude: toLocation.latitude, longitude: toLocation.longitude }
            ]);
          }
        },
        fail: (err) => {
          console.error('腾讯地图API调用失败:', err);
          // 网络请求失败时，使用直线作为备选
          resolve([
            { latitude: fromLocation.latitude, longitude: fromLocation.longitude },
            { latitude: toLocation.latitude, longitude: toLocation.longitude }
          ]);
        }
      });
    });
  },

  // 解码腾讯地图的polyline（坐标压缩格式）
  decodePolyline(encoded) {
    // 类型检查：如果不是字符串，直接返回空数组或尝试其他处理方式
    if (typeof encoded !== 'string') {
      console.warn('decodePolyline: 输入不是字符串，无法解码:', encoded);
      return [];
    }
    
    const points = [];
    let index = 0;
    let lat = 0;
    let lng = 0;
    
    try {
      while (index < encoded.length) {
        let b;
        let shift = 0;
        let result = 0;
        
        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        
        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        
        shift = 0;
        result = 0;
        
        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        
        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        
        points.push({
          latitude: lat / 1e5,
          longitude: lng / 1e5
        });
      }
    } catch (error) {
      console.error('decodePolyline 解码失败:', error, '输入:', encoded);
      return [];
    }
    
    return points;
  },

  // 解析腾讯地图返回的路径数据
  parseRoutePolyline(route) {
    let pathPoints = [];
    
    try {
      console.log('开始解析route数据:', route);
      
      // 优先使用route.polyline（整体路径）
      if (route.polyline && typeof route.polyline === 'string') {
        console.log('发现route.polyline，类型为string，长度:', route.polyline.length);
        const coords = this.decodePolyline(route.polyline);
        if (coords && Array.isArray(coords) && coords.length > 0) {
          pathPoints = pathPoints.concat(coords);
          console.log('使用route.polyline，解析出坐标数:', coords.length);
        }
      }
      // 如果没有整体路径，尝试使用steps（分段路径）
      else if (route.steps && Array.isArray(route.steps) && route.steps.length > 0) {
        console.log('使用route.steps，段数:', route.steps.length);
        route.steps.forEach((step, index) => {
          if (step.polyline && typeof step.polyline === 'string') {
            console.log(`步骤 ${index + 1} 发现polyline，类型为string，长度:`, step.polyline.length);
            const coords = this.decodePolyline(step.polyline);
            if (coords && Array.isArray(coords) && coords.length > 0) {
              // 第一段完整添加，后续段跳过第一个点（避免重复）
              if (index === 0) {
                pathPoints = pathPoints.concat(coords);
              } else {
                pathPoints = pathPoints.concat(coords.slice(1));
              }
              console.log(`步骤 ${index + 1} 解析出坐标数:`, coords.length);
            }
          } else if (step.polyline) {
            console.warn(`步骤 ${index + 1} 的polyline格式未知:`, typeof step.polyline, step.polyline);
          } else {
            console.warn(`步骤 ${index + 1} 没有polyline属性`);
          }
        });
      }
      // 如果以上都没有，可能是其他格式
      else {
        console.warn('route中未找到可用的polyline数据，route结构:', Object.keys(route));
        // 尝试直接返回空数组，让调用方处理
      }
    } catch (error) {
      console.error('解析路径数据失败:', error, 'route数据:', route);
      // 返回空数组而不是undefined
      return [];
    }
    
    // 确保返回的是数组
    if (!Array.isArray(pathPoints)) {
      console.error('parseRoutePolyline 返回的不是数组，强制转换为空数组');
      return [];
    }
    
    console.log('parseRoutePolyline 最终返回坐标数:', pathPoints.length);
    return pathPoints;
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

    // 如果本地数据中有该景点，先使用本地数据
    // if (attractions && attractions.length > 0) {
    //   // 查找匹配的景点（支持模糊匹配）
    //   const targetAttraction = attractions.find(attr =>
    //     attr.name && attr.name.includes(attractionName)
    //   );

    //   if (targetAttraction && targetAttraction.location) {
    //     console.log(`从本地数据获取景点位置: ${attractionName}`, targetAttraction.location);
    //     return targetAttraction.location;
    //   }
    // }

    // 本地数据中没有，通过腾讯地图API查询
    try {
      console.log(`通过腾讯地图API查询景点位置: ${attractionName}`);

      // 使用腾讯地图地理编码API
      const response = await this.searchLocationByAPI(attractionName);

      if (response) {
        console.log(`API查询成功: ${attractionName}`, response);
        return response;
      }

      // API未返回有效结果，使用默认位置
      console.log(`API未返回结果，尝试使用默认位置: ${attractionName}`);
      const defaultLocation = await this.getDefaultLocation(attractionName);
      return defaultLocation;
    } catch (error) {
      console.error(`查询景点位置失败: ${attractionName}`, error);
      // 异常情况下也尝试使用默认位置
      const defaultLocation = await this.getDefaultLocation(attractionName);
      return defaultLocation;
    }
  },

  // 通过API搜索位置
  searchLocationByAPI(keyword) {
    return new Promise((resolve) => {
      // 腾讯地图地理编码API
      const API_KEY = '6X2BZ-U466S-CKFOJ-67NXH-HLOSO-VRFLE';

      // 构建请求URL
      const url = `https://apis.map.qq.com/ws/geocoder/v1/`;

      // 添加城市限定，优先查找肇庆的景点
      // 先尝试"肇庆+景点名称"
      const searchKeyword = `肇庆${keyword}`;

      console.log('调用腾讯地图API:', url, { address: searchKeyword, key: API_KEY });

      wx.request({
        url: url,
        data: {
          address: searchKeyword,
          key: API_KEY
        },
        method: 'GET',
        success: (res) => {
          console.log('腾讯地图API响应:', res.data);

          if (res.statusCode === 200 && res.data.status === 0 && res.data.result) {
            const location = {
              latitude: res.data.result.location.lat,
              longitude: res.data.result.location.lng
            };
            console.log('成功获取坐标:', location);
            resolve(location);
          } else {
            console.warn('腾讯地图API返回无结果或失败:', res.data);
            // API调用失败，尝试使用默认位置
            this.getDefaultLocation(keyword).then(resolve).catch(() => resolve(null));
          }
        },
        fail: (error) => {
          console.error('腾讯地图API调用失败:', error);
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
      '龙岩洞': { latitude: 23.075000, longitude: 112.475000 }, // 肇庆龙岩洞

      // 公园景点
      '肇庆公园': { latitude: 23.058000, longitude: 112.466000 },
      '东门广场': { latitude: 23.060000, longitude: 112.472000 }
    };

    for (const key in defaultLocations) {
      if (keyword.includes(key)) {
        console.log(`使用默认位置: ${keyword} -> 匹配: ${key}`, defaultLocations[key]);
        return defaultLocations[key];
      }
    }

    // 如果没有匹配到，返回肇庆中心位置作为兜底
    console.log(`未找到景点 "${keyword}" 的默认位置，使用肇庆中心位置`);
    return { latitude: 23.105994, longitude: 112.470000 };
  },

  // 地图区域变化
  onMapRegionChange(e) {
    console.log('地图区域变化', e);
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
  onViewDetail() {
    const params = encodeURIComponent(JSON.stringify({
      scheme: this.data.scheme,
      scenicId: this.data.scenicId
    }));
    wx.navigateTo({
      url: `/pages/route/route-detail?data=${params}`
    });
  },

  // 开始导航
  onStartNavigation() {
    wx.showToast({
      title: '导航功能开发中',
      icon: 'none'
    });
  }
});
