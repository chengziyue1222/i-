Component({
  properties: {
    group: { type: Object, value: {} }
  },
  data: {
    imageFailed: false
  },
  observers: {
    group: function() {
      if (this.data.imageFailed) {
        this.setData({ imageFailed: false });
      }
    }
  },
  methods: {
    onImageError() {
      this.setData({ imageFailed: true });
    },
    onTap() {
      this.triggerEvent('tap', { group: this.properties.group });
    },
    onChatTap() {
      this.triggerEvent('chat', { group: this.properties.group });
    },
    onJoinTap() {
      this.triggerEvent('join', { group: this.properties.group });
    }
  }
});
