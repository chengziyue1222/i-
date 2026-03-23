Component({
  properties: {
    group: { type: Object, value: {} }
  },
  methods: {
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
