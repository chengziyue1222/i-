Component({
  properties: {
    tabs: { type: Array, value: [] },
    active: { type: String, value: '' }
  },
  methods: {
    onSwitch(e) {
      const val = e.currentTarget.dataset.val;
      if (val === this.properties.active) return;
      this.triggerEvent('switch', { val });
    }
  }
});
