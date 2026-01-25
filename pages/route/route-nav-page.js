// pages/route/route-nav-page.js
Page({
  data: {
    scheme: {},
    attractions: [],
    polyline: [],
    markers: [],
    centerLocation: {
      latitude: 23.105994,
      longitude: 112.470000
    }
  },

  onLoad(options) {
    const data = JSON.parse(decodeURIComponent(options.data));
    console.log('[导航页面] 接收到的数据:', data);
    console.log('[导航页面] attractions 数量:', data.attractions ? data.attractions.length : 0);

    this.setData({
      scheme: data.scheme,
      attractions: data.attractions || []
    });

    this.initNavigation();
  },

  // 辅助函数：从点对象中提取 location
  extractLocation(point) {
    if (point && point.location) {
      return point.location;
    } else if (point && typeof point.latitude === 'number' && typeof point.longitude === 'number') {
      return {
        latitude: point.latitude,
        longitude: point.longitude
      };
    }
    return null;
  },

  // 初始化导航
  async initNavigation() {
    const attractions = this.data.attractions;

    if (attractions.length === 0) {
      wx.showToast({
        title: '路线数据为空',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '加载导航路线...',
      mask: true
    });

    try {
      // 生成标记点
      const markers = this.generateMarkers(attractions);

      // 生成实际步行路线
      const polyline = await this.generateWalkingPolyline(attractions);

      // 计算中心点
      const centerLocation = this.calculateCenter(attractions);

      this.setData({
        markers,
        polyline,
        centerLocation
      });

      console.log('[导航页面] 地图初始化完成');
    } catch (error) {
      console.error('[导航页面] 初始化失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 生成实际步行路线（调用腾讯地图API）
  async generateWalkingPolyline(attractions) {
    if (!attractions || attractions.length === 0) {
      return [];
    }

    const validAttractions = attractions.filter(attr => attr && this.extractLocation(attr));
    
    if (validAttractions.length === 0) {
      return [];
    }

    console.log('[导航页面] 开始获取实际步行路线，路段数:', validAttractions.length - 1);

    const allPolylinePoints = [];
    const key = 'OB4BZ-D4W3U-B7VVO-4PJWW-6TKDJ-WPB77'; // 使用腾讯地图官网的测试Key

    // 调用腾讯地图API获取各路段的实际路径
    for (let i = 0; i < validAttractions.length - 1; i++) {
      const fromLocation = this.extractLocation(validAttractions[i]);
      const toLocation = this.extractLocation(validAttractions[i + 1]);

      console.log(`[导航页面] 获取路段 ${i + 1}: ${validAttractions[i].name} -> ${validAttractions[i + 1].name}`);

      const pathData = await this.getWalkingPathData(fromLocation, toLocation, key);

      if (pathData && pathData.points && pathData.points.length > 0) {
        allPolylinePoints.push(...pathData.points);
      }
    }

    console.log('[导航页面] 实际步行路线获取完成，总点数:', allPolylinePoints.length);

    if (allPolylinePoints.length === 0) {
      console.warn('[导航页面] 未获取到有效路径，使用直线连接');
      return this.generateStraightPolyline(validAttractions);
    }

    return [{
      points: allPolylinePoints,
      color: '#0F62FE',
      width: 5,
      dottedLine: false,
      arrowLine: true
    }];
  },

  // 获取两点间的步行路径数据
  async getWalkingPathData(fromLocation, toLocation, key) {
    return new Promise((resolve) => {
      const from = `${fromLocation.latitude},${fromLocation.longitude}`;
      const to = `${toLocation.latitude},${toLocation.longitude}`;

      console.log(`[导航页面] 调用API: ${from} -> ${to}`);

      wx.request({
        url: 'https://apis.map.qq.com/ws/direction/v1/walking',
        method: 'GET',
        data: {
          from: from,
          to: to,
          key: key
        },
        success: (res) => {
          console.log('[导航页面] API返回:', res.data);
          
          if (res.data && res.data.status === 0 && res.data.result && res.data.result.routes && res.data.result.routes.length > 0) {
            const route = res.data.result.routes[0];
            const pathPoints = this.parseRoutePolyline(route);
            
            console.log(`[导航页面] API成功，路径点数:`, pathPoints.length);
            resolve({ points: pathPoints });
          } else {
            console.warn('[导航页面] API失败或返回无效数据');
            resolve({ points: [] });
          }
        },
        fail: (err) => {
          console.error('[导航页面] 网络请求失败:', err);
          resolve({ points: [] });
        }
      });
    });
  },

  // 解析腾讯地图返回的路径数据（解压polyline）
  parseRoutePolyline(route) {
    if (!route) {
      console.log('[路径解析] route 为空');
      return [];
    }

    // 检查是否有polyline字段
    if (!route.polyline || !Array.isArray(route.polyline)) {
      console.log('[路径解析] route.polyline 不存在或不是数组');
      return [];
    }

    console.log('[路径解析] 找到 polyline 数组，长度:', route.polyline.length);
    
    // 使用腾讯地图的解压算法
    return this.decompressPolyline(route.polyline);
  },

  // 解压腾讯地图的polyline（前向差分算法）
  decompressPolyline(compressed) {
    if (!compressed || compressed.length === 0) {
      return [];
    }

    // 复制数组，避免修改原数组
    const coors = [...compressed];
    
    // 解压算法：从第3个元素开始（索引2），每个值等于前两个位置的值加上当前值除以1000000
    for (let i = 2; i < coors.length; i++) {
      coors[i] = coors[i - 2] + coors[i] / 1000000;
    }

    // 将一维数组转换为点数组
    const points = [];
    for (let i = 0; i < coors.length; i += 2) {
      points.push({
        latitude: coors[i],
        longitude: coors[i + 1]
      });
    }

    console.log('[解压] 解压完成，总点数:', points.length);
    console.log('[解压] 前3个点:', points.slice(0, 3));
    console.log('[解压] 最后3个点:', points.slice(-3));

    return points;
  },

  // 生成直线路线（备用方案）
  generateStraightPolyline(attractions) {
    const points = attractions.map(attr => {
      const location = this.extractLocation(attr);
      return {
        latitude: location.latitude,
        longitude: location.longitude
      };
    });

    return [{
      points,
      color: '#0F62FE',
      width: 5,
      dottedLine: false,
      arrowLine: true
    }];
  },

  // 生成标记点
  generateMarkers(attractions) {
    return attractions.filter(attr => {
      const location = this.extractLocation(attr);
      return attr && location;
    }).map((attr, index) => {
      const location = this.extractLocation(attr);

      let color = '#0F62FE';
      let iconPath = '/images/icons/index.png';
      
      if (attr.type === 'start') {
        color = '#52c41a';
        iconPath = '/images/icons/index-active.png';
      } else if (attr.type === 'end') {
        color = '#ff4d4f';
        iconPath = '/images/icons/address.png';
      }

      return {
        id: index + 1,
        latitude: location.latitude,
        longitude: location.longitude,
        title: attr.name,
        iconPath: iconPath,
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

  // 计算地图中心点
  calculateCenter(attractions) {
    if (attractions.length === 0) {
      return { latitude: 23.105994, longitude: 112.470000 };
    }

    let sumLat = 0;
    let sumLon = 0;
    let count = 0;

    attractions.forEach(attr => {
      const location = this.extractLocation(attr);
      if (location) {
        sumLat += location.latitude;
        sumLon += location.longitude;
        count++;
      }
    });

    return {
      latitude: count > 0 ? sumLat / count : 23.105994,
      longitude: count > 0 ? sumLon / count : 112.470000
    };
  },

  // 返回
  onBack() {
    wx.navigateBack();
  }
});
