// 游玩路线方案
{
  routeId: "route_001",
  scenicId: "scenic_001",
  routeName: "经典游览路线",
  routeType: "recommended", // recommended/shortest/relaxed
  attractions: [{
      attractionId: "attr_001",
      order: 1,
      visitTime: 30
    },
    {
      attractionId: "attr_002",
      order: 2,
      visitTime: 20
    }
  ],
  pathSegments: [{
    from: {
      latitude: 23.106994,
      longitude: 116.406000
    },
    to: {
      latitude: 23.107994,
      longitude: 116.407000
    },
    distance: 150, // 米
    duration: 3, // 分钟(步行)
    polyline: "..." // 腾讯地图路线编码
  }],
  totalDistance: 2500, // 总距离(米)
  totalDuration: 180, // 总时长(分钟)
  walkingTime: 45, // 纯步行时间(分钟)
  visitTime: 135 // 景点游览时间(分钟)
}