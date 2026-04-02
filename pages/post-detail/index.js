import { fetchPostDetail } from '../../services/post/index';

const FALLBACK_CENTER = { latitude: 23.0515, longitude: 112.4650 };
const DESTINATION_COORDS = {
  '七星岩风景区': { latitude: 23.0938, longitude: 112.4849 },
  '七星岩': { latitude: 23.0938, longitude: 112.4849 },
  '鼎湖山景区': { latitude: 23.1642, longitude: 112.5748 },
  '鼎湖山': { latitude: 23.1642, longitude: 112.5748 },
  '端州古城': { latitude: 23.0506, longitude: 112.4703 },
  '星湖风景区': { latitude: 23.0788, longitude: 112.4832 },
  '星湖': { latitude: 23.0788, longitude: 112.4832 }
};

const SPOT_HINTS = [
  { keyword: '七星岩', name: '七星岩', latitude: 23.0938, longitude: 112.4849 },
  { keyword: '鼎湖山', name: '鼎湖山', latitude: 23.1642, longitude: 112.5748 },
  { keyword: '星湖', name: '星湖', latitude: 23.0788, longitude: 112.4832 },
  { keyword: '端州古城', name: '端州古城', latitude: 23.0506, longitude: 112.4703 },
  { keyword: '龙母祖庙', name: '龙母祖庙', latitude: 23.2406, longitude: 111.8664 }
];

function extractAttractionsFromPost(post) {
  var source = [post.destination || '', post.content || '', (post.tags || []).join(' ')].join(' ');
  var matched = [];

  SPOT_HINTS.forEach(function(spot) {
    if (source.indexOf(spot.keyword) > -1) matched.push(spot);
  });

  if (!matched.length) {
    var center = DESTINATION_COORDS[post.destination] || FALLBACK_CENTER;
    matched.push({ keyword: post.destination || '目的地', name: post.destination || '目的地', latitude: center.latitude, longitude: center.longitude });
  }

  return {
    attractions: matched.slice(0, 3),
    matchedKnown: matched.length > 0
  };
}

function buildRoutePayload(post, postId) {
  var destination = post.destination || '旅行目的地';
  var center = DESTINATION_COORDS[destination] || FALLBACK_CENTER;
  var parsed = extractAttractionsFromPost(post);
  var attractions = parsed.attractions;

  var routePoints = [{
    id: 'start_' + postId,
    name: '出发点',
    type: 'start',
    location: { latitude: center.latitude - 0.005, longitude: center.longitude - 0.005 },
    latitude: center.latitude - 0.005,
    longitude: center.longitude - 0.005
  }];

  attractions.forEach(function(spot, idx) {
    routePoints.push({
      id: 'spot_' + postId + '_' + idx,
      name: spot.name,
      type: 'attraction',
      duration: 90,
      location: { latitude: spot.latitude, longitude: spot.longitude },
      latitude: spot.latitude,
      longitude: spot.longitude
    });
  });

  routePoints.push({
    id: 'end_' + postId,
    name: '终点',
    type: 'end',
    location: { latitude: center.latitude + 0.005, longitude: center.longitude + 0.005 },
    latitude: center.latitude + 0.005,
    longitude: center.longitude + 0.005
  });

  return { scenicId: String(postId), destination: destination, routePoints: routePoints };
}

Page({
  data: {
    post: null,
    postId: '',
    loaded: false
  },

  onLoad(options) {
    const postId = options.postId || '';
    if (!postId) {
      wx.showToast({ title: '帖子不存在', icon: 'none' });
      return;
    }
    this.setData({ postId });
    this.loadPostDetail();
  },

  async loadPostDetail() {
    wx.showLoading({ title: '加载中' });
    try {
      const post = await fetchPostDetail(this.data.postId);
      this.setData({ post, loaded: true });
      if (!post) {
        wx.showToast({ title: '帖子不存在', icon: 'none' });
      }
    } catch (e) {
      this.setData({ loaded: true });
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onCopyToRoutePlan() {
    const post = this.data.post || {};
    const postId = this.data.postId || post.postId || post._id;
    if (!postId) {
      wx.showToast({ title: '帖子信息不完整', icon: 'none' });
      return;
    }

    const parsed = extractAttractionsFromPost(post);
    if (!parsed.matchedKnown) {
      wx.showToast({ title: '未识别到具体景点，已按目的地生成基础路线', icon: 'none', duration: 1800 });
    }

    const payload = buildRoutePayload(post, postId);
    wx.navigateTo({
      url: `/packageRoute/pages/route/route-plan?data=${encodeURIComponent(JSON.stringify(payload))}`
    });
  },

  onApplyJoin() {
    wx.showToast({
      title: '已发送申请，等待对方确认',
      icon: 'success'
    });
  }
});
