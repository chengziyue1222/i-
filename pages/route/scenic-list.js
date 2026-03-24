import { DEFAULT_SCENIC_IMAGE, resolveScenicImageUrlByName } from '../../config/scenic-images';

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
    popupSpots: collectRecommendedSpots()
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
    const selected = this.data.selectedSpots || [];
    if (!selected.length) {
      wx.showToast({ title: '请先添加地点', icon: 'none' });
      return;
    }

    const pref = (this.data.userPreference || '').trim();
    wx.showLoading({ title: '生成中...' });
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: pref ? '已按需求生成路线' : '已生成推荐路线',
        icon: 'success'
      });
    }, 700);
  },

  onPullDownRefresh() {
    this.loadRouteList();
    wx.stopPullDownRefresh();
  }
});
