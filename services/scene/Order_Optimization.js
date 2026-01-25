/**
 * 景点顺序优化 - 最近邻算法
 */
async function optimizeAttractionOrder(startPoint, attractions) {
  const ordered = [];
  const remaining = [...attractions];
  let current = startPoint;

  while (remaining.length > 0) {
    // 找到距离当前点最近的景点
    let nearest = null;
    let minDistance = Infinity;

    for (const attraction of remaining) {
      const distance = calculateDistance(
        current,
        attraction.location
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = attraction;
      }
    }

    ordered.push(nearest);
    remaining.splice(remaining.indexOf(nearest), 1);
    current = nearest.location;
  }

  return ordered;
}

/**
 * 计算两点间直线距离(米)
 */
function calculateDistance(p1, p2) {
  const R = 6371000; // 地球半径
  const φ1 = p1.latitude * Math.PI / 180;
  const φ2 = p2.latitude * Math.PI / 180;
  const Δφ = (p2.latitude - p1.latitude) * Math.PI / 180;
  const Δλ = (p2.longitude - p1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}