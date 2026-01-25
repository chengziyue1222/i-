// 请求地址
GET https: //apis.map.qq.com/ws/direction/v1/walking/

  // 参数
  {
    from: "23.106994,116.406000", // 起点
    to: "23.107994,116.407000", // 终点
    key: "YOUR_TENCENT_MAP_KEY"
  }

// 响应数据
{
  status: 0,
  message: "success",
  result: {
    routes: [{
      distance: 150, // 距离(米)
      duration: 3, // 时间(秒)
      polyline: "..." // 路线编码
    }]
  }
}