const postService = require('../../../services/post');

var TYPE_OPTIONS = ['景点', '美食', '路线'];

function getCurrentUser() {
  var ui = wx.getStorageSync('userInfo') || {};
  return {
    openid: String(ui.openid || ui._openid || ''),
    nickName: ui.nickName || '旅行爱好者',
    avatarUrl: ui.avatarUrl || ''
  };
}

function getTempFilePath(file) {
  if (!file) return '';
  if (typeof file === 'string') return file;
  return String(file.tempFilePath || file.path || '');
}

function buildCloudFilePath(file, index) {
  var tempFilePath = getTempFilePath(file);
  var extMatch = /\.([^.\/]+)$/.exec(tempFilePath || '');
  var ext = extMatch ? extMatch[1] : 'jpg';
  return 'post-images/' + Date.now() + '_' + index + '.' + ext;
}

function uploadImagesToCloud(tempFiles) {
  var list = tempFiles || [];
  var fileIDs = [];

  return list.reduce(function (promise, file, index) {
    return promise.then(function () {
      var filePath = getTempFilePath(file);
      if (!filePath) {
        throw new Error('第' + (index + 1) + '张图片路径无效');
      }
      return wx.cloud.uploadFile({
        cloudPath: buildCloudFilePath(file, index),
        filePath: filePath
      }).then(function (res) {
        if (!res || !res.fileID) {
          throw new Error('第' + (index + 1) + '张图片上传失败');
        }
        fileIDs.push(res.fileID);
      }).catch(function (error) {
        var message = error && error.message ? error.message : '';
        throw new Error('第' + (index + 1) + '张图片上传失败：' + (message || '未知错误'));
      });
    });
  }, Promise.resolve()).then(function () {
    return fileIDs;
  });
}

Page({
  data: {
    typeOptions: TYPE_OPTIONS,
    typeIndex: 0,
    form: {
      title: '',
      type: '景点',
      content: '',
      tagsText: ''
    },
    imageList: [],
    submitting: false,
    uploadProgressText: ''
  },

  onFieldInput: function (e) {
    var field = e.currentTarget.dataset.field;
    var value = e.detail.value || '';
    this.setData({ ['form.' + field]: value });
  },

  onTypeChange: function (e) {
    var index = Number(e.detail.value || 0);
    this.setData({ typeIndex: index, 'form.type': TYPE_OPTIONS[index] });
  },

  onChooseImages: function () {
    var self = this;
    wx.chooseImage({
      count: 9 - this.data.imageList.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var next = (self.data.imageList || []).concat((res.tempFilePaths || []).map(function (path) {
          return { tempFilePath: path };
        })).slice(0, 9);
        self.setData({ imageList: next });
      }
    });
  },

  onRemoveImage: function (e) {
    var index = Number(e.currentTarget.dataset.index);
    var next = (this.data.imageList || []).slice();
    next.splice(index, 1);
    this.setData({ imageList: next });
  },

  onSubmit: function () {
    var self = this;
    var form = this.data.form || {};
    var title = (form.title || '').trim();
    var content = (form.content || '').trim();
    var type = form.type || '景点';
    var currentUser = getCurrentUser();

    if (!currentUser.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (!title) return wx.showToast({ title: '请填写标题', icon: 'none' });
    if (!content) return wx.showToast({ title: '请填写正文内容', icon: 'none' });
    if (!(this.data.imageList || []).length) return wx.showToast({ title: '请至少上传一张图片', icon: 'none' });
    if (this.data.submitting) return;

    var tags = (form.tagsText || '').split(/[，,\s]+/).filter(function (item) { return !!item; }).slice(0, 8);
    this.setData({ submitting: true, uploadProgressText: '正在上传图片...' });

    uploadImagesToCloud(this.data.imageList).then(function (fileIDs) {
      self.setData({ uploadProgressText: '正在发布内容...' });
      return postService.createPost({
        title: title,
        type: type,
        images: fileIDs,
        content: content,
        desc: content.slice(0, 42),
        tags: tags,
        authorName: currentUser.nickName,
        authorAvatar: currentUser.avatarUrl
      });
    }).then(function () {
      wx.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(function () {
        wx.redirectTo({ url: '/pages/community/index' });
      }, 500);
    }).catch(function (error) {
      self.setData({ submitting: false, uploadProgressText: '' });
      wx.showToast({
        title: (error && error.message) ? error.message.slice(0, 20) : '发布失败',
        icon: 'none'
      });
    });
  }
});
