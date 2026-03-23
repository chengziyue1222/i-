const DEFAULT_COVER = 'https://main.qcloudimg.com/raw/f859ae9d38d34a5ddaa89ae108109cd4.png';

Component({
  properties: {
    scenic: { type: Object, value: {} }
  },
  data: {
    imageLoaded: false,
    imageError: false
  },
  observers: {
    scenic() {
      this.setData({ imageLoaded: false, imageError: false });
    }
  },
  methods: {
    onImageLoad() {
      this.setData({ imageLoaded: true });
    },
    onImageError() {
      this.setData({ imageError: true, imageLoaded: true });
    },
    onTap() {
      this.triggerEvent('tap', { scenic: this.properties.scenic });
    },
    getFallback() {
      return DEFAULT_COVER;
    }
  }
});
