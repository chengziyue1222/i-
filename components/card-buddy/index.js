Component({
  properties: {
    group: { type: Object, value: {} }
  },
  methods: {
    onTap() { this.triggerEvent('tap', { group: this.properties.group }); }
  }
});
