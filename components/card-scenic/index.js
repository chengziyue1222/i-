Component({
  properties: {
    scenic: { type: Object, value: {} }
  },
  methods: {
    onTap() { this.triggerEvent('tap', { scenic: this.properties.scenic }); }
  }
});
