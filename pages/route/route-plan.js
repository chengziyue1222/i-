// pages/route/route-plan.js

// 腾讯地图API请求限流器（每秒最多5次）
class TencentMapRateLimiter {
  constructor(maxRequestsPerSecond = 5) {
    this.maxRequestsPerSecond = maxRequestsPerSecond;
    this.minInterval = 1000 / maxRequestsPerSecond; // 最小请求间隔（毫秒）
    this.requestQueue = [];
    this.isProcessing = false;
    this.requestTimestamps = []; // 记录实际发送请求的时间戳
    this.lastRequestTime = 0; // 上一次发送请求的时间
  }

  // 执行限流请求
  executeRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  // 处理请求队列
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    const now = Date.now();

    // 清理超过1秒的旧记录
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < 1000
    );

    // 双重检查：既检查1秒内的请求数，也检查相邻请求间隔
    let timeToWait = 0;

    // 检查1秒内的请求数是否达到上限
    if (this.requestTimestamps.length >= this.maxRequestsPerSecond) {
      const oldestTimestamp = this.requestTimestamps[0];
      timeToWait = oldestTimestamp + 1000 - now;
      console.log(`[1秒窗口] 达到上限 ${this.maxRequestsPerSecond} 次，需等待 ${timeToWait}ms`);
    }

    // 检查相邻请求间隔（确保每次至少间隔 minInterval 毫秒）
    if (this.lastRequestTime > 0) {
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minInterval) {
        const intervalWait = this.minInterval - timeSinceLastRequest;
        if (intervalWait > timeToWait) {
          timeToWait = intervalWait;
          console.log(`[间隔控制] 距上次请求 ${timeSinceLastRequest}ms，需再等待 ${intervalWait}ms`);
        }
      }
    }

    // 如果需要等待
    if (timeToWait > 0) {
      // 额外加一点缓冲时间（10ms），确保安全
      timeToWait = Math.ceil(timeToWait + 10);
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }

    // 从队列取出请求
    const { requestFn, resolve, reject } = this.requestQueue.shift();

    try {
      // 记录实际发送请求的时间（在发送前记录，确保准确）
      const sendTime = Date.now();
      this.requestTimestamps.push(sendTime);
      this.lastRequestTime = sendTime;
      console.log(`发送请求 [${sendTime}]，窗口内请求数: ${this.requestTimestamps.length}/${this.maxRequestsPerSecond}`);

      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.isProcessing = false;
      // 继续处理队列
      this.processQueue();
    }
  }
}

Page({
  data: {
    scenicId: '',
    routePoints: [], // 完整的路线点（包括起点和终点）
    attractions: [], // 仅包含中间的景点
    currentType: 'recommended',
    routeTypes: [
      { type: 'recommended', label: '推荐路线', icon: 'success' },
      { type: 'shortest', label: '最短距离', icon: 'waiting' },
      { type: 'relaxed', label: '轻松游玩', icon: 'circle' }
    ],
    routeSchemes: []
  },

  onLoad(options) {
    // 初始化限流器（每秒最多2次）
    this.rateLimiter = new TencentMapRateLimiter(2);

    const data = JSON.parse(decodeURIComponent(options.data));
    console.log('路线规划页面接收到的数据:', data);

    // 提取景点（排除起点和终点）
    const attractions = data.routePoints.filter(point => point.type === 'attraction');

    this.setData({
      scenicId: data.scenicId,
      routePoints: data.routePoints,
      attractions: attractions
    });
    this.generateRouteSchemes();
  },

  // 切换路线类型
  onTypeChange(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ currentType: type });
    this.generateRouteSchemes();
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

  // 生成路线方案
  generateRouteSchemes() {
    const { attractions, routePoints, currentType } = this.data;

    if (!attractions || attractions.length === 0) {
      console.warn('没有景点数据，无法生成路线方案');
      return;
    }
    
    // 验证景点数据的有效性
    const validAttractions = attractions.filter(attr => attr && attr.location);
    console.log(`[生成方案] 总景点数: ${attractions.length}, 有效景点数: ${validAttractions.length}`);
    console.log(`[生成方案] routePoints:`, routePoints); // 查看完整的路线点数据
    
    if (validAttractions.length === 0) {
      wx.showToast({
        title: '景点数据无效（缺少位置）',
        icon: 'none'
      });
      return;
    }

    let schemes = [];
    let sortedAttractions = [];

    if (currentType === 'recommended') {
      // 推荐路线：按地理位置就近原则排序
      sortedAttractions = this.sortByNearest(validAttractions);
      Promise.all([
        this.calculateTotalDistance(routePoints, sortedAttractions),
        this.calculateWalkTime(routePoints, sortedAttractions),
        this.calculateRoutePathData(routePoints, sortedAttractions)
      ]).then(([totalDistance, totalDuration, pathData]) => {
        schemes = [{
          id: 'scheme_001',
          name: '经典游玩路线',
          tag: '推荐',
          type: 'recommended',
          stops: this.buildCompleteRoute(routePoints, sortedAttractions),
          totalDistance: totalDistance,
          totalDuration: totalDuration,
          visitDuration: sortedAttractions.reduce((sum, attr) => sum + (attr.duration || 0), 0) / 60,
          pathData: pathData
        }];
        this.saveAndSetSchemes(schemes, routePoints, sortedAttractions);
      }).catch(err => {
        console.error('生成路线方案失败:', err);
      });
    } else if (currentType === 'shortest') {
      // 最短路线
      sortedAttractions = this.sortByShortest(validAttractions);
      Promise.all([
        this.calculateTotalDistance(routePoints, sortedAttractions),
        this.calculateWalkTime(routePoints, sortedAttractions),
        this.calculateRoutePathData(routePoints, sortedAttractions)
      ]).then(([totalDistance, totalDuration, pathData]) => {
        schemes = [{
          id: 'scheme_002',
          name: '最短距离路线',
          tag: '最短',
          type: 'shortest',
          stops: this.buildCompleteRoute(routePoints, sortedAttractions),
          totalDistance: totalDistance,
          totalDuration: totalDuration,
          visitDuration: sortedAttractions.reduce((sum, attr) => sum + (attr.duration || 0), 0) / 60,
          pathData: pathData
        }];
        this.saveAndSetSchemes(schemes, routePoints, sortedAttractions);
      }).catch(err => {
        console.error('生成路线方案失败:', err);
      });
    } else {
      // 轻松游玩：按景点游玩时长排序
      sortedAttractions = [...validAttractions].sort((a, b) => (b.duration || 0) - (a.duration || 0));
      Promise.all([
        this.calculateTotalDistance(routePoints, sortedAttractions),
        this.calculateWalkTime(routePoints, sortedAttractions),
        this.calculateRoutePathData(routePoints, sortedAttractions)
      ]).then(([totalDistance, totalDuration, pathData]) => {
        schemes = [{
          id: 'scheme_003',
          name: '轻松游玩路线',
          tag: '轻松',
          type: 'relaxed',
          stops: this.buildCompleteRoute(routePoints, sortedAttractions),
          totalDistance: totalDistance,
          totalDuration: totalDuration,
          visitDuration: sortedAttractions.reduce((sum, attr) => sum + (attr.duration || 0), 0) / 60,
          pathData: pathData
        }];
        this.saveAndSetSchemes(schemes, routePoints, sortedAttractions);
      }).catch(err => {
        console.error('生成路线方案失败:', err);
      });
    }
  },

  // 保存并设置路线方案
  saveAndSetSchemes(schemes, routePoints, sortedAttractions) {
    // 保存完整路线数据到存储（包括起点和终点及路径数据）
    const completeRoute = this.buildCompleteRoute(routePoints, sortedAttractions);
    wx.setStorageSync('sortedAttractions', completeRoute);
    
    // 如果有pathData，优先使用pathData中的数据（更精确）
    if (schemes[0].pathData) {
      // 更新总距离（pathData中的距离更精确）
      if (schemes[0].pathData.totalDistance > 0) {
        const oldDistance = schemes[0].totalDistance;
        schemes[0].totalDistance = Number(schemes[0].pathData.totalDistance.toFixed(2));
        console.log(`[更新总距离] ${oldDistance}km -> ${schemes[0].totalDistance}km`);
      }
      
      // 更新总时间
      if (schemes[0].pathData.totalDuration > 0) {
        // 计算游玩时间（小时）
        const visitDuration = sortedAttractions.reduce((sum, attr) => sum + (attr.duration || 0), 0) / 60;
        
        // 使用pathData中的步行时间（已转换为分钟）
        const walkDuration = schemes[0].pathData.totalDuration;
        
        // 更新scheme的总时间 = 游玩时间 + 步行时间
        schemes[0].totalDuration = Math.round(walkDuration + visitDuration * 60); // visitDuration是小时，转换为分钟
        
        console.log(`[更新总时间] 游玩: ${visitDuration}小时, 步行: ${Math.round(walkDuration)}分钟, 总计: ${schemes[0].totalDuration}分钟`);
      }
    }
    
    wx.setStorageSync('routePathData', schemes[0].pathData); // 保存路径数据供地图页使用

    console.log('[保存方案] schemes:', schemes);
    console.log('[保存方案] pathData:', schemes[0].pathData);
    this.setData({ routeSchemes: schemes });
  },

  // 构建完整路线（起点 + 排序后的景点 + 终点）
  buildCompleteRoute(routePoints, sortedAttractions) {
    console.log('[构建路线] 输入 routePoints:', routePoints);
    console.log('[构建路线] 输入 sortedAttractions:', sortedAttractions);

    const startPoint = routePoints.find(p => p.type === 'start');
    const endPoint = routePoints.find(p => p.type === 'end');

    console.log('[构建路线] startPoint:', startPoint);
    console.log('[构建路线] endPoint:', endPoint);

    const completeRoute = [];

    // 添加起点
    const startLocation = this.extractLocation(startPoint);
    if (startPoint && startLocation) {
      completeRoute.push({
        id: startPoint.id || 'start',
        name: startPoint.name || '起点',
        type: 'start',
        location: startLocation
      });
      console.log('[构建路线] 添加起点:', startPoint.name, startLocation);
    } else {
      console.warn('起点数据无效或缺少location:', startPoint);
    }

    // 添加排序后的景点
    sortedAttractions.forEach((attr, index) => {
      const attrLocation = this.extractLocation(attr);
      if (attr && attrLocation) {
        completeRoute.push({
          id: attr.id,
          name: attr.name,
          type: 'attraction',
          location: attrLocation,
          duration: attr.duration
        });
      } else {
        console.warn(`景点 ${index} 数据无效或缺少location:`, attr);
      }
    });

    // 添加终点
    const endLocation = this.extractLocation(endPoint);
    if (endPoint && endLocation) {
      completeRoute.push({
        id: endPoint.id || 'end',
        name: endPoint.name || '终点',
        type: 'end',
        location: endLocation
      });
      console.log('[构建路线] 添加终点:', endPoint.name, endLocation);
    } else {
      console.warn('终点数据无效或缺少location:', endPoint);
    }

    console.log('[构建路线] completeRoute:', completeRoute);
    return completeRoute;
  },

  // 按就近原则排序
  sortByNearest(attractions) {
    if (!attractions || attractions.length === 0) {
      return [];
    }

    const result = [];
    const remaining = [...attractions];

    // 使用第一个景点的位置作为起点
    const firstLocation = this.extractLocation(attractions[0]);
    if (!firstLocation) {
      console.warn('第一个景点没有位置信息，返回原始顺序');
      return attractions;
    }

    let current = firstLocation;

    while (remaining.length > 0) {
      let nearest = null;
      let minDist = Infinity;

      for (const attr of remaining) {
        const attrLocation = this.extractLocation(attr);
        if (!attrLocation) {
          console.warn(`景点 ${attr.name} 没有位置信息，跳过`);
          continue;
        }

        const dist = this.calculateHaversineDistance(current, attrLocation);
        if (dist < minDist) {
          minDist = dist;
          nearest = attr;
        }
      }

      if (nearest) {
        result.push(nearest);
        remaining.splice(remaining.indexOf(nearest), 1);
        const nearestLocation = this.extractLocation(nearest);
        if (nearestLocation) {
          current = nearestLocation;
        }
      } else {
        // 如果找不到最近的点，直接添加剩余的第一个
        const remainingItem = remaining.shift();
        if (remainingItem) {
          result.push(remainingItem);
          if (remainingItem.location) {
            current = remainingItem.location;
          }
        }
      }
    }

    return result;
  },

  // 按最短距离排序（使用简化的贪婪算法）
  sortByShortest(attractions) {
    return this.sortByNearest(attractions);
  },

  // 计算两点距离（使用Haversine公式，计算直线距离）
  calculateHaversineDistance(loc1, loc2) {
    const R = 6371; // 地球半径
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // 计算两点间的步行距离（使用腾讯地图API，带限流）
  calculateDistance(loc1, loc2) {
    return this.rateLimiter.executeRequest(() => {
      return new Promise((resolve) => {
        try {
          // 构造腾讯地图API请求参数
          const from = `${loc1.latitude},${loc1.longitude}`;
          const to = `${loc2.latitude},${loc2.longitude}`;

          // 注意：需要先在腾讯地图开放平台申请key，并在小程序后台配置request合法域名
          // 开发环境下可以使用mock数据作为备选
          const key = wx.getStorageSync('tencentMapKey') || '6X2BZ-U466S-CKFOJ-67NXH-HLOSO-VRFLE';

          wx.request({
            url: 'https://apis.map.qq.com/ws/direction/v1/walking',
            method: 'GET',
            data: {
              from: from,
              to: to,
              key: key
            },
            success: (res) => {
              if (res.data && res.data.status === 0 && res.data.result.routes && res.data.result.routes.length > 0) {
                // 获取第一条路线的距离（米）
                const distance = res.data.result.routes[0].distance / 1000; // 转换为公里
                console.log(`腾讯地图步行距离: ${from} -> ${to} = ${distance}km`);
                resolve(distance);
              } else {
                console.warn('腾讯地图API返回异常，使用Haversine距离作为备选:', res.data);
                // 如果API调用失败，回退到Haversine公式计算直线距离
                const fallbackDistance = this.calculateHaversineDistance(loc1, loc2);
                resolve(fallbackDistance);
              }
            },
            fail: (err) => {
              console.error('腾讯地图API调用失败:', err);
              // 网络请求失败时，回退到Haversine公式
              const fallbackDistance = this.calculateHaversineDistance(loc1, loc2);
              resolve(fallbackDistance);
            }
          });
        } catch (error) {
          console.error('计算步行距离时出错:', error);
          // 异常情况下回退到Haversine公式
          resolve(this.calculateHaversineDistance(loc1, loc2));
        }
      });
    });
  },

  // 计算总距离（使用腾讯地图步行距离，带限流）
  calculateTotalDistance(routePoints, sortedAttractions) {
    // 构建完整的路线点数组
    const startPoint = routePoints.find(p => p.type === 'start');
    const endPoint = routePoints.find(p => p.type === 'end');

    const allPoints = [];

    const startLocation = this.extractLocation(startPoint);
    if (startPoint && startLocation) {
      allPoints.push(startPoint);
    }

    sortedAttractions.forEach(attr => {
      const attrLocation = this.extractLocation(attr);
      if (attr && attrLocation) {
        allPoints.push(attr);
      }
    });

    const endLocation = this.extractLocation(endPoint);
    if (endPoint && endLocation) {
      allPoints.push(endPoint);
    }

    // 使用限流器串行计算所有路段的距离（避免超过QPS限制）
    const distancePromises = [];
    for (let i = 0; i < allPoints.length - 1; i++) {
      const fromLocation = this.extractLocation(allPoints[i]);
      const toLocation = this.extractLocation(allPoints[i + 1]);
      if (fromLocation && toLocation) {
        distancePromises.push(this.calculateDistance(fromLocation, toLocation));
      }
    }

    return Promise.all(distancePromises).then(distances => {
      const total = distances.reduce((sum, dist) => sum + dist, 0);
      console.log(`[总距离计算] 各段距离:`, distances, `总计:`, total);
      return Number(total.toFixed(2)); // 返回数字类型，而不是字符串
    });
  },

  // 计算步行时间（使用腾讯地图步行距离，带限流）
  calculateWalkTime(routePoints, sortedAttractions) {
    // 构建完整的路线点数组
    const startPoint = routePoints.find(p => p.type === 'start');
    const endPoint = routePoints.find(p => p.type === 'end');

    const allPoints = [];

    const startLocation = this.extractLocation(startPoint);
    if (startPoint && startLocation) {
      allPoints.push(startPoint);
    }

    sortedAttractions.forEach(attr => {
      const attrLocation = this.extractLocation(attr);
      if (attr && attrLocation) {
        allPoints.push(attr);
      }
    });

    const endLocation = this.extractLocation(endPoint);
    if (endPoint && endLocation) {
      allPoints.push(endPoint);
    }

    // 使用限流器串行计算所有路段的距离（避免超过QPS限制）
    const distancePromises = [];
    for (let i = 0; i < allPoints.length - 1; i++) {
      const fromLocation = this.extractLocation(allPoints[i]);
      const toLocation = this.extractLocation(allPoints[i + 1]);
      if (fromLocation && toLocation) {
        distancePromises.push(this.calculateDistance(fromLocation, toLocation));
      }
    }

    return Promise.all(distancePromises).then(distances => {
      const total = distances.reduce((sum, dist) => sum + dist * 12, 0); // 假设步行速度5km/h，每公里12分钟
      return Math.round(total);
    });
  },

  // 计算路线完整路径数据（包括距离、时间和路径坐标，带限流）
  calculateRoutePathData(routePoints, sortedAttractions) {
    // 构建完整的路线点数组
    const startPoint = routePoints.find(p => p.type === 'start');
    const endPoint = routePoints.find(p => p.type === 'end');

    const allPoints = [];

    const startLocation = this.extractLocation(startPoint);
    if (startPoint && startLocation) {
      allPoints.push(startPoint);
    }

    sortedAttractions.forEach(attr => {
      const attrLocation = this.extractLocation(attr);
      if (attr && attrLocation) {
        allPoints.push(attr);
      }
    });

    const endLocation = this.extractLocation(endPoint);
    if (endPoint && endLocation) {
      allPoints.push(endPoint);
    }

    console.log(`[路径计算] 共 ${allPoints.length} 个路线点, ${allPoints.length - 1} 个路段`);
    console.log(`[限流器] 最大请求数: ${this.rateLimiter.maxRequestsPerSecond}/秒`);

    // 使用限流器串行获取所有路段的路径数据（避免超过QPS限制）
    const pathPromises = [];
    const key = wx.getStorageSync('tencentMapKey') || '6X2BZ-U466S-CKFOJ-67NXH-HLOSO-VRFLE';

    for (let i = 0; i < allPoints.length - 1; i++) {
      const fromLocation = this.extractLocation(allPoints[i]);
      const toLocation = this.extractLocation(allPoints[i + 1]);
      if (fromLocation && toLocation) {
        pathPromises.push(this.getWalkingPathData(fromLocation, toLocation, key, i === 0));
      }
    }

    return Promise.all(pathPromises).then(pathSegments => {
      // 合并所有路径段
      let allPathPoints = [];
      const distances = [];
      const durations = [];

      console.log(`[路径计算] 成功获取 ${pathSegments.length} 个路段的数据`);
      console.log(`[路径计算] pathSegments:`, pathSegments); // 调试：查看返回的数据结构

      pathSegments.forEach((segment, index) => {
        console.log(`[路径计算] 处理路段 ${index + 1}:`, segment); // 调试：查看每个segment
        
        if (segment && segment.points && segment.points.length > 0) {
          // 第一段完整添加，后续段跳过第一个点（避免重复）
          if (index === 0) {
            allPathPoints = allPathPoints.concat(segment.points);
          } else {
            allPathPoints = allPathPoints.concat(segment.points.slice(1));
          }
          
          // 调试：检查 distance 是否存在
          console.log(`[路径计算] segment.distance:`, segment.distance, `类型:`, typeof segment.distance);
          
          distances.push(segment.distance || 0); // 如果为undefined，用0代替
          durations.push(segment.duration || (segment.distance || 0) * 12); // 如果没有duration，用距离估算
          
          console.log(`[路段 ${index + 1}] 距离: ${(segment.distance || 0).toFixed(2)}km, 时间: ${Math.round(segment.duration || (segment.distance || 0) * 12)}分钟, 坐标点: ${segment.points.length}个`);
        } else {
          console.warn(`[路段 ${index + 1}] 数据无效，跳过`);
          console.warn(`[路段 ${index + 1}] segment:`, segment);
        }
      });

      console.log(`[路径计算] distances 数组:`, distances); // 调试：查看distances数组
      console.log(`[路径计算] durations 数组:`, durations); // 调试：查看durations数组

      const totalDistance = distances.reduce((sum, dist) => {
        console.log(`[路径计算] reduce - 当前sum: ${sum}, 当前dist: ${dist}`);
        return sum + dist;
      }, 0);
      
      const totalDuration = durations.reduce((sum, dur) => sum + dur, 0);

      console.log(`[路径计算完成] 总距离: ${totalDistance.toFixed(2)}km, 总时间: ${Math.round(totalDuration)}分钟, 总坐标点: ${allPathPoints.length}个`);

      return {
        points: allPathPoints,
        distances: distances,
        durations: durations,
        totalDistance: totalDistance,
        totalDuration: totalDuration
      };
    }).catch(err => {
      console.error('[路径计算失败]', err);
      // 出错时使用降级方案
      return this.getFallbackPathData(allPoints);
    });
  },

  // 获取两点间的步行路径数据（包括路径坐标、距离和时间，带限流）
  getWalkingPathData(fromLocation, toLocation, key, isFirstSegment) {
    return this.rateLimiter.executeRequest(() => {
      return new Promise((resolve) => {
        const from = `${fromLocation.latitude},${fromLocation.longitude}`;
        const to = `${toLocation.latitude},${toLocation.longitude}`;

        console.log(`[限流请求] 获取步行路径: ${from} -> ${to}`);
        console.log(`[限流状态] 队列长度: ${this.rateLimiter.requestQueue.length}`);

        wx.request({
          url: 'https://apis.map.qq.com/ws/direction/v1/walking',
          method: 'GET',
          data: {
            from: from,
            to: to,
            key: key
          },
          success: (res) => {
            if (res.data && res.data.status === 0 && res.data.result.routes && res.data.result.routes.length > 0) {
              const route = res.data.result.routes[0];
              const distance = route.distance / 1000; // 转换为公里
              const duration = route.duration / 60; // 转换为分钟
              const pathPoints = this.parseRoutePolyline(route);

              console.log(`[API成功] 距离: ${distance.toFixed(2)}km, 时间: ${Math.round(duration)}分钟, 坐标点: ${pathPoints.length}个`);

              resolve({
                points: pathPoints,
                distance: distance,
                duration: duration
              });
            } else {
              console.warn(`[API失败] 状态: ${res.data?.status}, 消息: ${res.data?.message || '未知错误'}`);
              // 如果API失败，使用直线作为备选
              const fallbackDistance = this.calculateHaversineDistance(fromLocation, toLocation);
              const fallbackDuration = fallbackDistance * 12; // 假设步行速度5km/h，每公里12分钟
              
              console.log(`[降级方案] 使用直线: ${fallbackDistance.toFixed(2)}km, ${Math.round(fallbackDuration)}分钟`);
              
              resolve({
                points: [
                  { latitude: fromLocation.latitude, longitude: fromLocation.longitude },
                  { latitude: toLocation.latitude, longitude: toLocation.longitude }
                ],
                distance: fallbackDistance,
                duration: fallbackDuration
              });
            }
          },
          fail: (err) => {
            console.error(`[网络失败]`, err);
            // 网络请求失败时，使用直线作为备选
            const fallbackDistance = this.calculateHaversineDistance(fromLocation, toLocation);
            const fallbackDuration = fallbackDistance * 12; // 假设步行速度5km/h，每公里12分钟
            
            console.log(`[降级方案] 使用直线: ${fallbackDistance.toFixed(2)}km, ${Math.round(fallbackDuration)}分钟`);
            
            resolve({
              points: [
                { latitude: fromLocation.latitude, longitude: fromLocation.longitude },
                { latitude: toLocation.latitude, longitude: toLocation.longitude }
              ],
              distance: fallbackDistance,
              duration: fallbackDuration
            });
          }
        });
      });
    });
  },

  // 解析腾讯地图返回的路径数据
  parseRoutePolyline(route) {
    let pathPoints = [];
    
    try {
      console.log('[解析路径] 开始解析route数据:', route);
      console.log('[解析路径] route类型:', typeof route);
      
      if (!route || typeof route !== 'object') {
        console.warn('[解析路径] route数据无效或不是对象');
        return [];
      }
      
      // 优先使用route.polyline（整体路径）
      if (route.polyline && typeof route.polyline === 'string') {
        console.log('[解析路径] 发现route.polyline，长度:', route.polyline.length);
        const coords = this.decodePolyline(route.polyline);
        if (coords && Array.isArray(coords) && coords.length > 0) {
          pathPoints = pathPoints.concat(coords);
          console.log('[解析路径] 使用route.polyline，解析出坐标数:', coords.length);
          return pathPoints; // ✅ 关键修复：立即返回
        }
      }
      
      // 如果没有整体路径，尝试使用steps（分段路径）
      if (route.steps && Array.isArray(route.steps) && route.steps.length > 0) {
        console.log('[解析路径] 使用route.steps，段数:', route.steps.length);
        route.steps.forEach((step, index) => {
          if (step.polyline && typeof step.polyline === 'string') {
            const coords = this.decodePolyline(step.polyline);
            if (coords && Array.isArray(coords) && coords.length > 0) {
              // 第一段完整添加，后续段跳过第一个点（避免重复）
              if (index === 0) {
                pathPoints = pathPoints.concat(coords);
              } else {
                pathPoints = pathPoints.concat(coords.slice(1));
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('[解析路径] 解析失败:', error);
      return [];
    }
    
    // 验证并过滤有效的坐标点
    const validPoints = pathPoints.filter(point => {
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
        console.warn('[解析路径] 过滤无效坐标:', point);
      }
      return isValid;
    });
    
    console.log('[解析路径] 原始路径点数量:', pathPoints.length);
    console.log('[解析路径] 有效路径点数量:', validPoints.length);
    
    return validPoints;
  },

  // 获取备选的直线路径数据（当API失败时使用）
  getFallbackPathData(points) {
    console.log('[降级方案] 使用直线路径');
    
    const pathPoints = points.map(point => ({
      latitude: point.location.latitude,
      longitude: point.location.longitude
    }));

    const distances = [];
    const durations = [];
    
    for (let i = 0; i < points.length - 1; i++) {
      const dist = this.calculateHaversineDistance(points[i].location, points[i + 1].location);
      distances.push(dist);
      durations.push(dist * 12); // 假设步行速度5km/h，每公里12分钟
    }

    const totalDistance = distances.reduce((sum, dist) => sum + dist, 0);
    const totalDuration = durations.reduce((sum, dur) => sum + dur, 0);

    console.log(`[直线路径] 总距离: ${totalDistance.toFixed(2)}km, 总时间: ${Math.round(totalDuration)}分钟, 坐标点: ${pathPoints.length}个`);

    return {
      points: pathPoints,
      distances: distances,
      durations: durations,
      totalDistance: totalDistance,
      totalDuration: totalDuration
    };
  },

  // 解码腾讯地图的polyline（坐标压缩格式）
  decodePolyline(encoded) {
    if (typeof encoded !== 'string' || encoded.length === 0) {
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
        } while (b >= 0x20 && index < encoded.length);
        
        // 确保索引有效
        if (index > encoded.length) break;
        
        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        
        shift = 0;
        result = 0;
        
        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20 && index < encoded.length);
        
        // 确保索引有效
        if (index > encoded.length) break;
        
        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        
        const latitude = lat / 1e5;
        const longitude = lng / 1e5;
        
        // 验证坐标有效性
        if (typeof latitude === 'number' && typeof longitude === 'number' &&
            !isNaN(latitude) && !isNaN(longitude) &&
            latitude >= -90 && latitude <= 90 && 
            longitude >= -180 && longitude <= 180) {
          points.push({ latitude, longitude });
        } else {
          console.warn('decodePolyline 跳过无效坐标:', { latitude, longitude });
        }
      }
    } catch (error) {
      console.error('decodePolyline 解码失败:', error);
      return [];
    }
    
    console.log('decodePolyline - 解码后的坐标点数量:', points.length);
    return points;
  },

  // 选择路线方案
  onSchemeSelect(e) {
    // 不从 dataset 获取 scheme（会被转换为字符串），从 routeSchemes 数组中获取
    const schemeId = e.currentTarget.dataset.schemeId;
    const scheme = this.data.routeSchemes.find(s => s.id === schemeId);
    
    if (!scheme) {
      console.error('未找到对应的路线方案:', schemeId);
      wx.showToast({
        title: '选择路线失败',
        icon: 'none'
      });
      return;
    }
    
    console.log('选择的路线方案:', scheme);
    console.log('路线方案 pathData:', scheme.pathData);
    console.log('路线方案 pathData points 数量:', scheme.pathData?.points?.length || 0);

    const params = encodeURIComponent(JSON.stringify({
      scheme,
      scenicId: this.data.scenicId,
      routePoints: this.data.routePoints
    }));

    console.log('传递给 route-map 的参数长度:', params.length);

    wx.navigateTo({
      url: `/pages/route/route-map?data=${params}`
    });
  }
});
