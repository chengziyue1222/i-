const updateManager = require('./common/updateManager');

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('当前基础库不支持云开发');
      return;
    }

    wx.cloud.init({
      env: 'cloudbase-1g71i8nk689cee71',
      traceUser: true
    });

    this.cloudbaseTemplateConfig = {
      env: 'cloudbase-1g71i8nk689cee71',
      useMock: false
    };
  },
  onShow: function () {
    updateManager();
  },
});
