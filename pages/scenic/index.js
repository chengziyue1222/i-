import { SCENIC_DEMO_LIST } from '../../config/scenic-demo';

const DEFAULT_COVER = 'https://main.qcloudimg.com/raw/f859ae9d38d34a5ddaa89ae108109cd4.png';

Page({
  data: {
    loading: true,
    scenicList: [],
    leftList: [],
    rightList: []
  },

  onLoad() {
    this.loadScenicList();
  },

  loadScenicList() {
    this.setData({ loading: true });

    setTimeout(() => {
      const list = (SCENIC_DEMO_LIST || []).map((item, idx) => ({
        ...item,
        cover: item.cover || DEFAULT_COVER,
        _displayHeight: idx % 3 === 0 ? 500 : (idx % 3 === 1 ? 460 : 540)
      }));

      const columns = this.splitWaterfall(list);

      this.setData({
        scenicList: list,
        leftList: columns.left,
        rightList: columns.right,
        loading: false
      });
    }, 900);
  },

  splitWaterfall(list = []) {
    let leftHeight = 0;
    let rightHeight = 0;
    const left = [];
    const right = [];

    list.forEach((item) => {
      const estimate = (item._displayHeight || 500) + (item.tags || []).length * 8 + 120;
      if (leftHeight <= rightHeight) {
        left.push(item);
        leftHeight += estimate;
      } else {
        right.push(item);
        rightHeight += estimate;
      }
    });

    return { left, right };
  },

  onCardTap(e) {
    const scenic = e.detail.scenic || e.currentTarget.dataset.scenic;
    if (!scenic || !scenic.id) return;

    const scenicData = encodeURIComponent(JSON.stringify(scenic));
    wx.navigateTo({
      url: `/pages/detail/index?mode=scenic&scenicId=${scenic.id}&scenicData=${scenicData}&title=${encodeURIComponent(scenic.name)}`
    });
  }
});
