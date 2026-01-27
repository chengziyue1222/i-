// pages/route/scenic-detail.js
import { fetchScenicSpotDetail, fetchAttractionData } from '../../services/scene/index';
import { TENCENT_MAP_API_KEY } from '../../config/map';

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
    selectedEndPoint: 'current', // 选择的终点类型：'current' 或 'exit'
    showExitSelector: false, // 是否显示出入口选择器
    availableExits: [] // 可用的出入口列表
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
      const cachedData = wx.getStorageSync(cacheKey);
      let attractions = [];

      // 检查缓存是否有效
      const isCacheValid = cachedData && 
                          cachedData.data && 
                          cachedData.data.length > 0 && 
                          cachedData.expiry && 
                          (Date.now() - cachedData.timestamp < cachedData.expiry);

      if (isCacheValid) {
        console.log('[缓存] 从缓存获取景点数据:', cachedData.data);
        attractions = cachedData.data;
        wx.showToast({
          title: '已加载缓存的景点数据',
          icon: 'success',
          duration: 1500
        });
      } else {
        console.log('[搜索] 缓存未命中或已过期，从腾讯地图API查询景点');
        // 从腾讯地图API查询该景区的景点列表
        attractions = await this.searchAttractionsByAPI(scenicInfo);

        console.log(`[结果] API搜索到 ${attractions.length} 个景点`);
        
        if (attractions && attractions.length > 0) {
          // 缓存到本地（有效期24小时）
          const cacheData = {
            data: attractions,
            timestamp: Date.now(),
            expiry: 24 * 60 * 60 * 1000 // 24小时
          };
          wx.setStorageSync(cacheKey, cacheData);
          console.log('[缓存] 景点数据已缓存到本地');
        } else {
          // 如果API查询失败，使用备用数据源
          console.log('[备用] API未找到景点，使用备用数据源');
          attractions = await fetchAttractionData(scenicId);
          console.log('[备用] 获取到备用数据:', attractions.length, '个景点');
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
      // 使用统一的API Key
      const API_KEY = TENCENT_MAP_API_KEY;

      // 常见的景区景点关键词
      const keywords = [
        '景点', '公园', '古迹', '寺庙', '塔', '楼', '庙',
        '山', '湖', '岩', '洞', '寺', '观', '亭', '阁'
      ];

      // 构建搜索关键词：景区名称 + 景点关键词
      const searchKeywords = keywords.map(kw => `${scenicInfo.scenicName}${kw}`);

      console.log('[搜索参数]');
      console.log('- 景区名称:', scenicInfo.scenicName);
      console.log('- 景区位置:', scenicInfo.location);
      console.log('- 搜索范围: 3公里');
      console.log('- 搜索关键词:', searchKeywords);
      console.log('- API Key:', API_KEY.substring(0, 10) + '...');

      // 带间隔搜索所有关键词（每个请求间隔200ms，避免触发API频率限制）
      const requests = searchKeywords.map((keyword, index) => {
        return new Promise((resolveSearch) => {
          // 设置延迟，第一个请求立即发送，后续每个请求延迟200ms
          const delay = index * 200;
          setTimeout(() => {
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
                console.log(`[API响应] 关键词: "${keyword}", 状态码: ${res.statusCode}, API状态: ${res.data?.status}`);
                if (res.statusCode === 200 && res.data.status === 0 && res.data.data) {
                  const pois = res.data.data;
                  console.log(`[成功] 搜索 "${keyword}" 找到 ${pois.length} 个结果 (延迟: ${delay}ms)`);
                  resolveSearch(pois);
                } else {
                  console.warn(`[失败] 搜索 "${keyword}" 未找到结果或API错误:`, res.data);
                  resolveSearch([]);
                }
              },
              fail: (error) => {
                console.error(`搜索 "${keyword}" 失败:`, error);
                resolveSearch([]);
              }
            });
          }, delay);
        });
      });

      // 等待所有搜索完成
      Promise.all(requests).then(results => {
        console.log('[搜索结果汇总]');
        console.log('- 关键词数量:', searchKeywords.length);
        console.log('- 各关键词结果:', results.map((pois, i) => `${searchKeywords[i]}: ${pois.length}个`).join(', '));
        
        // 合并所有结果
        const allPOIs = results.flat();
        
        // 过滤掉没有location的数据
        const validPOIs = allPOIs.filter(poi => poi && poi.location && poi.location.lat && poi.location.lng);
        console.log(`[统计] 原始结果: ${allPOIs.length} 个, 有效结果: ${validPOIs.length} 个`);

        // 去重：根据名称和位置去重
        const uniquePOIs = this.deduplicatePOIs(validPOIs);
        console.log(`[去重] 去重后: ${uniquePOIs.length} 个景点`);

        if (uniquePOIs.length === 0) {
          console.warn('[警告] 未找到任何景点，将使用备用数据源');
        }

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
      }).catch(error => {
        console.error('[搜索异常]', error);
        resolve([]);
      });
    });
  },

  // 通过腾讯地图API查询景区出入口
  async searchExitsByAPI(scenicInfo) {
    return new Promise((resolve) => {
      // 使用统一的API Key
      const API_KEY = TENCENT_MAP_API_KEY;

      // 常见的出入口关键词
      const exitKeywords = [
        '入口', '出口', '大门', '检票口', '售票处', '游客中心', '停车场'
      ];

      // 构建搜索关键词：景区名称 + 出入口关键词
      const searchKeywords = exitKeywords.map(kw => `${scenicInfo.scenicName}${kw}`);

      console.log('[searchExitsByAPI] 搜索参数');
      console.log('- 景区名称:', scenicInfo.scenicName);
      console.log('- 景区位置:', scenicInfo.location);
      console.log('- 搜索范围: 2公里');
      console.log('- 搜索关键词:', searchKeywords);

      // 带间隔搜索所有关键词（每个请求间隔200ms）
      const requests = searchKeywords.map((keyword, index) => {
        return new Promise((resolveSearch) => {
          const delay = index * 200;
          setTimeout(() => {
            wx.request({
              url: 'https://apis.map.qq.com/ws/place/v1/search',
              data: {
                keyword: keyword,
                boundary: `nearby(${scenicInfo.location.latitude},${scenicInfo.location.longitude},2000)`, // 2公里范围内
                key: API_KEY,
                page_size: 10,
                page_index: 1
              },
              method: 'GET',
              success: (res) => {
                console.log(`[searchExitsByAPI] API响应: ${keyword}, 状态码: ${res.statusCode}, API状态: ${res.data?.status}`);
                if (res.statusCode === 200 && res.data.status === 0 && res.data.data) {
                  const pois = res.data.data;
                  console.log(`[searchExitsByAPI] 搜索 "${keyword}" 找到 ${pois.length} 个结果`);
                  resolveSearch(pois);
                } else {
                  console.warn(`[searchExitsByAPI] 搜索 "${keyword}" 失败:`, res.data);
                  resolveSearch([]);
                }
              },
              fail: (error) => {
                console.error(`[searchExitsByAPI] 搜索 "${keyword}" 请求失败:`, error);
                resolveSearch([]);
              }
            });
          }, delay);
        });
      });

      // 等待所有搜索完成
      Promise.all(requests).then(results => {
        console.log('[searchExitsByAPI] 所有搜索完成');
        console.log('- 关键词数量:', searchKeywords.length);
        console.log('- 各关键词结果:', results.map((pois, i) => `${searchKeywords[i]}: ${pois.length}个`).join(', '));
        
        // 合并所有结果
        const allPOIs = results.flat();
        
        // 过滤掉没有location的数据
        const validPOIs = allPOIs.filter(poi => poi && poi.location && poi.location.lat && poi.location.lng);
        console.log(`[searchExitsByAPI] 原始结果: ${allPOIs.length} 个, 有效结果: ${validPOIs.length} 个`);

        // 去重：根据名称和位置去重
        const uniquePOIs = this.deduplicatePOIs(validPOIs);
        console.log(`[searchExitsByAPI] 去重后: ${uniquePOIs.length} 个出入口`);

        // 转换为出入口数据格式
        const exits = uniquePOIs.map((poi, index) => ({
          id: poi.id || `exit_${index}`,
          name: poi.title,
          description: poi.address || poi.category,
          location: {
            latitude: poi.location.lat,
            longitude: poi.location.lng
          }
        }));

        console.log(`[searchExitsByAPI] 最终返回: ${exits.length} 个出入口`);
        resolve(exits);
      }).catch(error => {
        console.error('[searchExitsByAPI] 搜索异常:', error);
        resolve([]);
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
    const { type } = e.currentTarget.dataset;

    if (type === 'current') {
      // 选择当前位置作为终点
      this.setData({
        endPoint: this.data.currentLocation,
        selectedEndPoint: 'current',
        showExitSelector: false
      });
      wx.showToast({
        title: '已选择当前位置作为终点',
        icon: 'none'
      });
    } else if (type === 'exit') {
      // 选择景区出口作为终点
      console.log('[选择终点] 用户选择景区出口');
      this.setData({
        selectedEndPoint: 'exit',
        showExitSelector: true,
        endPoint: null  // 清空之前的终点，让用户重新选择具体出入口
      }, () => {
        console.log('[选择终点] showExitSelector 已设置为 true');
        console.log('[选择终点] 当前 showExitSelector:', this.data.showExitSelector);
      });
      
      // 查询并显示出入口列表
      this.loadAvailableExits();
    }
  },

  // 加载可用的出入口列表
  async loadAvailableExits() {
    const { scenicId, scenicInfo } = this.data;
    
    console.log('[加载出入口] 开始加载');
    console.log('[加载出入口] scenicId:', scenicId);
    console.log('[加载出入口] scenicInfo:', scenicInfo);
    
    // 检查缓存
    const cacheKey = `exits_${scenicId}`;
    const cachedData = wx.getStorageSync(cacheKey);
    
    console.log('[加载出入口] 缓存数据:', cachedData);
    
    // 检查缓存是否有效
    const isCacheValid = cachedData && 
                        cachedData.data && 
                        cachedData.data.length > 0 && 
                        cachedData.expiry && 
                        (Date.now() - cachedData.timestamp < cachedData.expiry);
    
    console.log('[加载出入口] 缓存是否有效:', isCacheValid);
    
    if (isCacheValid) {
      console.log('[加载出入口] 从缓存获取数据:', cachedData.data);
      this.setData({
        availableExits: cachedData.data,
        showExitSelector: true
      }, () => {
        console.log('[加载出入口] 已设置 showExitSelector:', this.data.showExitSelector);
        console.log('[加载出入口] 已设置 availableExits:', this.data.availableExits);
      });
    } else {
      // 从腾讯地图API查询出入口
      console.log('[加载出入口] 缓存无效，从API查询');
      wx.showLoading({ title: '查询出入口...' });
      
      try {
        const exits = await this.searchExitsByAPI(scenicInfo);
        
        console.log('[加载出入口] API查询结果:', exits);
        
        if (exits && exits.length > 0) {
          // 缓存到本地（有效期24小时）
          const cacheData = {
            data: exits,
            timestamp: Date.now(),
            expiry: 24 * 60 * 60 * 1000 // 24小时
          };
          wx.setStorageSync(cacheKey, cacheData);
          console.log('[加载出入口] 数据已缓存');
          
          this.setData({
            availableExits: exits,
            showExitSelector: true
          }, () => {
            console.log('[加载出入口] API数据设置完成，showExitSelector:', this.data.showExitSelector);
          });
        } else {
          // 如果没有找到出入口，使用默认的
          console.log('[加载出入口] API未找到数据，使用默认出口');
          const defaultExits = this.generateExitPoints(scenicInfo, this.data.attractions || []);
          console.log('[加载出入口] 默认出口:', defaultExits);
          this.setData({
            availableExits: defaultExits,
            showExitSelector: true
          }, () => {
            console.log('[加载出入口] 默认数据设置完成，showExitSelector:', this.data.showExitSelector);
          });
        }
      } catch (error) {
        console.error('[加载出入口] API查询失败:', error);
        // 使用默认出口
        const defaultExits = this.generateExitPoints(scenicInfo, this.data.attractions || []);
        this.setData({
          availableExits: defaultExits,
          showExitSelector: true
        }, () => {
          console.log('[加载出入口] 错误处理设置完成，showExitSelector:', this.data.showExitSelector);
        });
      } finally {
        wx.hideLoading();
      }
    }
  },

  // 选择具体的出入口作为终点
  onSelectSpecificExit(e) {
    const { index } = e.currentTarget.dataset;
    const selectedExit = this.data.availableExits[index];
    
    if (selectedExit) {
      this.setData({
        endPoint: {
          ...selectedExit,
          type: 'end'
        },
        showExitSelector: false
      });
      
      wx.showToast({
        title: `已选择${selectedExit.name}`,
        icon: 'none'
      });
    }
  },

  // 取消出入口选择
  onCancelExitSelector() {
    this.setData({
      showExitSelector: false,
      selectedEndPoint: 'current'
    });
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
  }
});
