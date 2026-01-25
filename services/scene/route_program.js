/**
 * 生成多种路线方案
 */
async function generateRouteOptions(scenicId, selectedAttractions, startPoint) {
  const options = [];

  // 方案1: 经典推荐路线(按景点热度排序)
  const recommended = await generateRecommendedRoute(
    selectedAttractions,
    startPoint
  );
  recommended.routeType = "recommended";
  recommended.routeName = "经典推荐路线";
  options.push(recommended);

  // 方案2: 最短距离路线
  const shortest = await generateShortestRoute(
    selectedAttractions,
    startPoint
  );
  shortest.routeType = "shortest";
  shortest.routeName = "最短距离路线";
  options.push(shortest);

  // 方案3: 轻松休闲路线(减少步行距离)
  const relaxed = await generateRelaxedRoute(
    selectedAttractions,
    startPoint
  );
  relaxed.routeType = "relaxed";
  relaxed.routeName = "轻松休闲路线";
  options.push(relaxed);

  return options;
}