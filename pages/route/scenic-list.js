const { DEFAULT_SCENIC_IMAGE, resolveScenicImageUrlByName } = require('../../config/scenic-images');

const store = require('../../store/index');

const TIME_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'half', label: '半天' },
  { id: 'one', label: '1天' },
  { id: 'two', label: '2天' }
];

const TYPE_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'hiking', label: '徒步' },
  { id: 'photo', label: '拍照' },
  { id: 'relax', label: '休闲' }
];

const BASE_ROUTES = [
  {
    id: 'r001',
    name: '肇庆一日游经典路线',
    spots: ['七星岩', '鼎湖山'],
    totalDuration: '1天',
    distanceKm: 26,
    budget: '￥100-200',
    tags: ['轻松', '拍照'],
    timeType: 'one',
    type: 'photo',
    heat: 98
  },
  {
    id: 'r002',
    name: '端州人文半日漫游',
    spots: ['端州古城', '龙母祖庙'],
    totalDuration: '半天',
    distanceKm: 9,
    budget: '￥50-120',
    tags: ['休闲', '人文'],
    timeType: 'half',
    type: 'relax',
    heat: 86
  },
  {
    id: 'r003',
    name: '山水徒步两日线',
    spots: ['鼎湖山', '星湖风景区', '七星岩'],
    totalDuration: '2天',
    distanceKm: 45,
    budget: '￥220-380',
    tags: ['徒步', '自然'],
    timeType: 'two',
    type: 'hiking',
    heat: 92
  },
  {
    id: 'r004',
    name: '拍照打卡轻松线',
    spots: ['七星岩', '星湖风景区'],
    totalDuration: '1天',
    distanceKm: 18,
    budget: '￥80-180',
    tags: ['拍照', '轻松'],
    timeType: 'one',
    type: 'photo',
    heat: 90
  },
  {
    id: 'r005',
    name: '亲子休闲一日线',
    spots: ['龙母祖庙', '端州古城', '星湖风景区'],
    totalDuration: '1天',
    distanceKm: 22,
    budget: '￥120-220',
    tags: ['休闲', '亲子'],
    timeType: 'one',
    type: 'relax',
    heat: 84
  }
];

function decorateRoutes(list = []) {
  return list.map((item) => {
    const firstSpot = (item.spots && item.spots[0]) || '';
    const cover = resolveScenicImageUrlByName(firstSpot) || DEFAULT_SCENIC_IMAGE;
    return {
      ...item,
      cover,
      spotsText: (item.spots || []).join(' + ')
    };
  });
}

function collectRecommendedSpots() {
  const map = {};
  BASE_ROUTES.forEach((route) => {
    (route.spots || []).forEach((spot) => {
      if (spot) map[spot] = true;
    });
  });
  return Object.keys(map);
}

function resolveSpotLocation(name, index) {
  const LOCATION_MAP = {
    '七星岩': { latitude: 23.105994, longitude: 112.470000 },
    '鼎湖山': { latitude: 23.170000, longitude: 112.550000 },
    '星湖风景区': { latitude: 23.108000, longitude: 112.480000 },
    '星湖': { latitude: 23.108000, longitude: 112.480000 },
    '端州古城': { latitude: 23.050000, longitude: 112.465000 },
    '龙母祖庙': { latitude: 23.285000, longitude: 111.670000 }
  };
  if (LOCATION_MAP[name]) return LOCATION_MAP[name];

  return {
    latitude: 23.105994 + index * 0.01,
    longitude: 112.470000 + index * 0.01
  };
}

function formatGenerateTime(ts) {
  const date = new Date(ts || Date.now());
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

Page({
  data: {
    routeList: [],
    filteredRouteList: [],
    timeFilters: TIME_FILTERS,
    typeFilters: TYPE_FILTERS,
    activeTime: 'all',
    activeType: 'all',
    sortMode: 'hot',
    selectedSpots: [],
    userPreference: '',
    showSpotPopup: false,
    spotKeyword: '',
    recommendedSpots: collectRecommendedSpots(),
    popupSpots: collectRecommendedSpots(),
    lastGenerate: null
  },

  onLoad() {
    this.loadRouteList();
  },

  loadRouteList() {
    const list = decorateRoutes(BASE_ROUTES);
    this.setData({ routeList: list }, () => {
      this.applyFilterAndSort();
    });
  },

  applyFilterAndSort() {
    const { routeList, activeTime, activeType, sortMode } = this.data;
    let list = (routeList || []).filter((item) => {
      const hitTime = activeTime === 'all' || item.timeType === activeTime;
      const hitType = activeType === 'all' || item.type === activeType;
      return hitTime && hitType;
    });

    list = list.sort((a, b) => {
      if (sortMode === 'hot') return (b.heat || 0) - (a.heat || 0);
      return (a.heat || 0) - (b.heat || 0);
    });

    this.setData({ filteredRouteList: list });
  },

  onTimeFilterTap(e) {
    this.setData({ activeTime: e.currentTarget.dataset.id }, () => {
      this.applyFilterAndSort();
    });
  },

  onTypeFilterTap(e) {
    this.setData({ activeType: e.currentTarget.dataset.id }, () => {
      this.applyFilterAndSort();
    });
  },

  onSortToggle() {
    this.setData({
      sortMode: this.data.sortMode === 'hot' ? 'cold' : 'hot'
    }, () => {
      this.applyFilterAndSort();
    });
  },

  onOpenSpotPopup() {
    this.setData({
      showSpotPopup: true,
      spotKeyword: '',
      popupSpots: this.data.recommendedSpots || []
    });
  },

  onCloseSpotPopup() {
    this.setData({
      showSpotPopup: false,
      spotKeyword: '',
      popupSpots: this.data.recommendedSpots || []
    });
  },

  onSpotSearchInput(e) {
    const keyword = e.detail.value || '';
    const base = this.data.recommendedSpots || [];
    const popupSpots = !keyword
      ? base
      : base.filter((spot) => spot.indexOf(keyword) > -1);
    this.setData({ spotKeyword: keyword, popupSpots: popupSpots });
  },

  onSelectSpot(e) {
    const spot = e.currentTarget.dataset.spot;
    if (!spot) return;
    const selected = this.data.selectedSpots || [];
    if (selected.indexOf(spot) > -1) {
      wx.showToast({ title: '已选择该地点', icon: 'none' });
      return;
    }
    this.setData({ selectedSpots: selected.concat(spot) });
  },

  onRemoveSpot(e) {
    const spot = e.currentTarget.dataset.spot;
    const next = (this.data.selectedSpots || []).filter((name) => name !== spot);
    this.setData({ selectedSpots: next });
  },

  onPreferenceInput(e) {
    this.setData({ userPreference: e.detail.value || '' });
  },

  noop() {},

  onRouteTap(e) {
    const route = e.currentTarget.dataset.route;
    const payload = {
      scenicId: '',
      routePoints: [],
      scheme: {
        name: route.name,
        tag: route.tags[0] || '推荐',
        totalDistance: route.distanceKm,
        totalDuration: route.totalDuration === '半天' ? 180 : route.totalDuration === '1天' ? 360 : 720,
        visitDuration: route.totalDuration,
        stops: (route.spots || []).map((name, index) => ({
          id: `${route.id}_${index}`,
          name,
          duration: 60,
          feature: '热门打卡景点',
          tips: '建议提前规划拍照和游玩时间'
        }))
      }
    };

    wx.navigateTo({
      url: `/packageRoute/pages/route/route-detail?data=${encodeURIComponent(JSON.stringify(payload))}`
    });
  },

  onGenerateRoute() {
    let selected = this.data.selectedSpots || [];
    const pref = (this.data.userPreference || '').trim();
    const recommended = this.data.recommendedSpots || [];
    let matched = [];

    // 兜底：未手动添加地点时，尝试从输入中自动识别地点
    if (!selected.length && pref) {
      matched = recommended.filter((spot) => pref.indexOf(spot) > -1);

      if (matched.length) {
        selected = matched;
        this.setData({ selectedSpots: selected });
        wx.showToast({ title: '已从输入命中地点', icon: 'none' });
      }
    }

    if (!selected.length) {
      const reason = !pref ? '无地点：请先添加地点或输入目的地' : '无匹配：输入中未识别到已知景点';
      this.setData({
        lastGenerate: {
          time: formatGenerateTime(Date.now()),
          keyword: pref || '(未输入)',
          matchedSpots: [],
          status: 'failed',
          reason
        }
      });
      store.track('generate_route_failed', {
        reason,
        keyword: pref || '',
        selectedCount: 0
      });
      wx.showToast({ title: reason, icon: 'none' });
      return;
    }

    const requestTime = Date.now();
    this.setData({
      lastGenerate: {
        time: formatGenerateTime(requestTime),
        keyword: pref || '(无偏好关键词)',
        matchedSpots: selected.slice(0, 6),
        status: 'success',
        reason: ''
      }
    });

    wx.showLoading({ title: 'AI生成中...' });

    setTimeout(() => {
      wx.hideLoading();

      // 组装 route-plan 需要的完整路线点：起点 + 景点 + 终点
      const startPoint = {
        id: 'start_' + Date.now(),
        name: '当前位置',
        type: 'start',
        location: { latitude: 23.105994, longitude: 112.470000 }
      };

      const attractionPoints = selected.map((spot, index) => ({
        id: 'spot_' + Date.now() + '_' + index,
        name: spot,
        type: 'attraction',
        duration: 60,
        location: resolveSpotLocation(spot, index)
      }));

      const endPoint = {
        id: 'end_' + Date.now(),
        name: '当前位置',
        type: 'end',
        location: { latitude: 23.105994, longitude: 112.470000 }
      };

      const payload = {
        scenicId: selected[0] || '',
        routePoints: [startPoint].concat(attractionPoints).concat([endPoint]),
        preference: pref,
        source: 'tab-custom'
      };

      store.track('generate_route_success', {
        keyword: pref || '',
        selectedCount: selected.length,
        selectedSpots: selected.slice(0, 6)
      });

      wx.navigateTo({
        url: `/packageRoute/pages/route/route-plan?data=${encodeURIComponent(JSON.stringify(payload))}`
      });
    }, 500);
  },

  onPullDownRefresh() {
    this.loadRouteList();
    wx.stopPullDownRefresh();
  }
});
