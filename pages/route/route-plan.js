// pages/route/route-plan.js
import { TENCENT_MAP_API_KEY } from '../../config/map';

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

    console.log('[保存方案] 开始');
    console.log('[保存方案] schemes[0]:', schemes[0]);
    console.log('[保存方案] schemes[0].totalDistance (初始值):', schemes[0].totalDistance);
    console.log('[保存方案] schemes[0].totalDuration (初始值):', schemes[0].totalDuration);
    console.log('[保存方案] schemes[0].pathData:', schemes[0].pathData);

    // 如果有pathData，优先使用pathData中的数据（更精确）
    if (schemes[0] && schemes[0].pathData) {
      const pathData = schemes[0].pathData;

      console.log('[保存方案] pathData.totalDistance:', pathData.totalDistance, '类型:', typeof pathData.totalDistance);
      console.log('[保存方案] pathData.totalDuration:', pathData.totalDuration, '类型:', typeof pathData.totalDuration);
      console.log('[保存方案] pathData.distances:', pathData.distances);

      // 更新总距离（pathData中的距离更精确）
      if (typeof pathData.totalDistance === 'number' && !isNaN(pathData.totalDistance)) {
        const oldDistance = schemes[0].totalDistance;
        schemes[0].totalDistance = Number(pathData.totalDistance.toFixed(2));
        console.log(`[更新总距离] ${oldDistance}km -> ${schemes[0].totalDistance}km`);
      } else {
        console.warn('[保存方案] pathData.totalDistance 无效，保持原值:', schemes[0].totalDistance);
      }

      // 更新总时间
      if (typeof pathData.totalDuration === 'number' && !isNaN(pathData.totalDuration)) {
        // 计算游玩时间（小时）
        const visitDuration = sortedAttractions.reduce((sum, attr) => sum + (attr.duration || 0), 0) / 60;

        // 使用pathData中的步行时间（已转换为分钟）
        const walkDuration = pathData.totalDuration;

        // 更新scheme的总时间 = 游玩时间 + 步行时间
        schemes[0].totalDuration = Math.round(walkDuration + visitDuration * 60); // visitDuration是小时，转换为分钟

        console.log(`[更新总时间] 游玩: ${visitDuration}小时, 步行: ${Math.round(walkDuration)}分钟, 总计: ${schemes[0].totalDuration}分钟`);
      } else {
        console.warn('[保存方案] pathData.totalDuration 无效，保持原值:', schemes[0].totalDuration);
      }
    } else {
      console.warn('[保存方案] schemes[0].pathData 不存在或为空');
      console.warn('[保存方案] schemes[0]:', schemes[0]);
    }

    // 构建 polyline 格式供 route-map 使用
    console.log('[保存方案] 检查是否生成 polyline...');
    console.log('[保存方案] schemes[0].pathData 存在:', !!schemes[0].pathData);
    console.log('[保存方案] schemes[0].pathData.points 存在:', !!schemes[0].pathData?.points);
    console.log('[保存方案] schemes[0].pathData.points 长度:', schemes[0].pathData?.points?.length || 0);
    
    if (schemes[0].pathData && schemes[0].pathData.points && schemes[0].pathData.points.length > 0) {
      const points = schemes[0].pathData.points;
      console.log('[保存方案] 前3个坐标点示例:', points.slice(0, 3));
      console.log('[保存方案] 坐标点总数:', points.length);
      
      schemes[0].pathData.polyline = [{
        points: points,
        color: '#0F62FE',
        width: 5,
        dottedLine: false,
        arrowLine: true
      }];
      console.log('[保存方案] 已生成 polyline，坐标点数量:', points.length);
    } else {
      console.warn('[保存方案] 未生成 polyline - pathData 或 points 为空');
    }

    wx.setStorageSync('routePathData', schemes[0].pathData); // 保存路径数据供地图页使用

    console.log('[保存方案] 最终 schemes[0].totalDistance:', schemes[0].totalDistance);
    console.log('[保存方案] 最终 schemes[0].totalDuration:', schemes[0].totalDuration);

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
          const key = wx.getStorageSync('tencentMapKey') || TENCENT_MAP_API_KEY;

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
      allPoints.push({
        ...startPoint,
        location: startLocation
      });
    }

    sortedAttractions.forEach(attr => {
      const attrLocation = this.extractLocation(attr);
      if (attr && attrLocation) {
        allPoints.push({
          ...attr,
          location: attrLocation
        });
      }
    });

    const endLocation = this.extractLocation(endPoint);
    if (endPoint && endLocation) {
      allPoints.push({
        ...endPoint,
        location: endLocation
      });
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
      allPoints.push({
        ...startPoint,
        location: startLocation
      });
    }

    sortedAttractions.forEach(attr => {
      const attrLocation = this.extractLocation(attr);
      if (attr && attrLocation) {
        allPoints.push({
          ...attr,
          location: attrLocation
        });
      }
    });

    const endLocation = this.extractLocation(endPoint);
    if (endPoint && endLocation) {
      allPoints.push({
        ...endPoint,
        location: endLocation
      });
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

  // 计算路线完整路径数据（调用API获取准确距离和时间，但使用直线坐标）
  calculateRoutePathData(routePoints, sortedAttractions) {
    // 构建完整的路线点数组
    const startPoint = routePoints.find(p => p.type === 'start');
    const endPoint = routePoints.find(p => p.type === 'end');

    const allPoints = [];

    const startLocation = this.extractLocation(startPoint);
    if (startPoint && startLocation) {
      allPoints.push({
        ...startPoint,
        location: startLocation
      });
    }

    sortedAttractions.forEach(attr => {
      const attrLocation = this.extractLocation(attr);
      if (attr && attrLocation) {
        allPoints.push({
          ...attr,
          location: attrLocation
        });
      }
    });

    const endLocation = this.extractLocation(endPoint);
    if (endPoint && endLocation) {
      allPoints.push({
        ...endPoint,
        location: endLocation
      });
    }

    console.log(`[路径计算] 共 ${allPoints.length} 个路线点, ${allPoints.length - 1} 个路段`);
    console.log(`[路径计算] allPoints:`, allPoints);

    // 检查 allPoints 是否为空
    if (allPoints.length === 0) {
      console.error('[路径计算] allPoints 为空，无法计算路径');
      return Promise.resolve({
        points: [],
        distances: [],
        durations: [],
        totalDistance: 0,
        totalDuration: 0
      });
    }

    // 使用限流器调用腾讯地图 API 获取各路段的准确距离和时间
    const pathPromises = [];
    const key = wx.getStorageSync('tencentMapKey') || TENCENT_MAP_API_KEY;

    for (let i = 0; i < allPoints.length - 1; i++) {
      const fromLocation = this.extractLocation(allPoints[i]);
      const toLocation = this.extractLocation(allPoints[i + 1]);
      console.log(`[路径计算] 路段 ${i + 1}:`, fromLocation, '->', toLocation);
      if (fromLocation && toLocation) {
        pathPromises.push(this.getWalkingPathData(fromLocation, toLocation, key));
      }
    }

    console.log(`[路径计算] 共创建 ${pathPromises.length} 个路径请求`);

    return Promise.all(pathPromises).then(segments => {
      // 提取 API 返回的准确距离和时间
      const distances = segments.map(seg => seg.distance || 0);
      const durations = segments.map(seg => seg.duration || 0);

      const totalDistance = distances.reduce((sum, dist) => sum + dist, 0);
      const totalDuration = durations.reduce((sum, dur) => sum + dur, 0);

      // 合并所有路段的路径点（使用 API 返回的实际路径）
      const allPathPoints = [];
      segments.forEach((seg, index) => {
        if (seg.points && seg.points.length > 0) {
          if (index > 0 && allPathPoints.length > 0) {
            // 如果不是第一个路段，移除第一个点（避免重复）
            allPathPoints.push(...seg.points.slice(1));
          } else {
            allPathPoints.push(...seg.points);
          }
        }
      });

      console.log(`[路径计算完成] 总距离: ${totalDistance.toFixed(2)}km, 总时间: ${Math.round(totalDuration)}分钟, 路径点数: ${allPathPoints.length}个`);
      console.log(`[路径计算完成] 使用 API 返回的实际路径坐标`);

      return {
        points: allPathPoints,
        distances: distances,
        durations: durations,
        totalDistance: totalDistance,
        totalDuration: totalDuration
      };
    }).catch(err => {
      console.error('[路径计算失败]', err);
      // 出错时使用 Haversine 直线距离
      return this.getFallbackPathData(allPoints);
    });
  },

  // 获取两点间的步行路径数据（包括距离和时间，带限流，解析 polyline）
  getWalkingPathData(fromLocation, toLocation, key) {
    return this.rateLimiter.executeRequest(() => {
      return new Promise((resolve) => {
        const from = `${fromLocation.latitude},${fromLocation.longitude}`;
        const to = `${toLocation.latitude},${toLocation.longitude}`;

        console.log(`[限流请求] 获取步行路径: ${from} -> ${to}`);

        wx.request({
          url: 'https://apis.map.qq.com/ws/direction/v1/walking',
          method: 'GET',
          data: {
            from: from,
            to: to,
            key: key
          },
          success: (res) => {
            console.log(`[API响应] 状态: ${res.data?.status}, 消息: ${res.data?.message || '成功'}`);

            if (res.data && res.data.status === 0 && res.data.result.routes && res.data.result.routes.length > 0) {
              const route = res.data.result.routes[0];
              const distance = route.distance / 1000; // 转换为公里
              const duration = route.duration / 60; // 转换为分钟

              // 解析 polyline 获取实际路径点
              const pathPoints = this.parseRoutePolyline(route);

              console.log(`[API成功] 距离: ${distance.toFixed(2)}km, 时间: ${Math.round(duration)}分钟, 路径点数: ${pathPoints.length}`);

              if (pathPoints.length === 0) {
                console.warn('[路径解析] 未能解析出路径点，返回直线');
                resolve({
                  points: [
                    { latitude: fromLocation.latitude, longitude: fromLocation.longitude },
                    { latitude: toLocation.latitude, longitude: toLocation.longitude }
                  ],
                  distance: distance,
                  duration: duration
                });
              } else {
                resolve({
                  points: pathPoints,
                  distance: distance,
                  duration: duration
                });
              }
            } else {
              console.warn('[API失败] 返回降级方案');
              const fallbackDistance = this.calculateHaversineDistance(fromLocation, toLocation);
              const fallbackDuration = fallbackDistance * 12;
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
            console.error('[网络失败]', err);
            const fallbackDistance = this.calculateHaversineDistance(fromLocation, toLocation);
            const fallbackDuration = fallbackDistance * 12;
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
    if (!route) {
      console.log('[路径解析] route 为空');
      return [];
    }

    console.log('[路径解析] 开始解析 route 对象:', route);
    console.log('[路径解析] route.polyline:', route.polyline);
    console.log('[路径解析] route.steps:', route.steps);

    // 尝试从 polyline 字段解码
    if (route.polyline) {
      try {
        console.log('[路径解析] 尝试解码 polyline 字符串:', route.polyline);
        const points = this.decodePolyline(route.polyline);
        console.log('[路径解析] polyline 解码成功，点数:', points.length);
        if (points.length > 0) {
          return points;
        }
      } catch (e) {
        console.warn('[路径解析] polyline解码失败:', e);
      }
    } else {
      console.log('[路径解析] route.polyline 不存在');
    }

    // 尝试从 steps 中提取
    if (route.steps && Array.isArray(route.steps)) {
      console.log('[路径解析] 尝试从 steps 提取，steps 数量:', route.steps.length);
      const points = [];
      route.steps.forEach((step, index) => {
        console.log(`[路径解析] step ${index} polyline:`, step.polyline);
        if (step.polyline) {
          try {
            const stepPoints = this.parsePolylineArray(step.polyline);
            console.log(`[路径解析] step ${index} 解析出点数:`, stepPoints.length);
            points.push(...stepPoints);
          } catch (e) {
            console.warn(`[路径解析] step ${index} polyline解析失败:`, e);
          }
        }
      });
      console.log('[路径解析] 从 steps 提取的总点数:', points.length);
      if (points.length > 0) {
        return points;
      }
    } else {
      console.log('[路径解析] route.steps 不存在或不是数组');
    }

    console.log('[路径解析] 未能解析出任何路径点');
    return [];
  },

  // 解码 polyline 字符串（Google Maps 编码格式）
  decodePolyline(encoded) {
    if (!encoded || typeof encoded !== 'string') {
      return [];
    }

    const points = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let shift = 0;
      let result = 0;
      let b;

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

    return points;
  },

  // 解析 polyline 数组格式 [[lng, lat], [lng, lat]]
  parsePolylineArray(polylineArray) {
    if (!polylineArray || !Array.isArray(polylineArray)) {
      return [];
    }

    return polylineArray.map(point => ({
      latitude: point[1],
      longitude: point[0]
    }));
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
  },

  // 查看详情
  onNavigate(e) {
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

    console.log('导航的路线方案:', scheme);
    console.log('路线方案 pathData:', scheme.pathData);
    console.log('路线方案 pathData points 数量:', scheme.pathData?.points?.length || 0);

    const params = encodeURIComponent(JSON.stringify({
      scheme,
      scenicId: this.data.scenicId,
      routePoints: this.data.routePoints
    }));

    console.log('传递给 route-detail 的参数长度:', params.length);

    wx.navigateTo({
      url: `/pages/route/route-detail?data=${params}`
    });
  }
});
