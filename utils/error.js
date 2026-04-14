function safeStringify(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

function formatError(error) {
  if (!error) {
    return '未知错误';
  }

  if (typeof error === 'string') {
    return error;
  }

  var parts = [];
  if (error.message) parts.push('message: ' + error.message);
  if (error.errMsg) parts.push('errMsg: ' + error.errMsg);
  if (error.code) parts.push('code: ' + error.code);
  if (error.stack) parts.push('stack: ' + error.stack);

  if (parts.length) {
    return parts.join(' | ');
  }

  return safeStringify(error);
}

function logError(scope, error, extra) {
  var scopeText = scope || '未命名模块';
  var formatted = formatError(error);
  if (typeof extra === 'undefined') {
    console.error('[' + scopeText + '] ' + formatted);
    return formatted;
  }
  console.error('[' + scopeText + '] ' + formatted, extra);
  return formatted;
}

module.exports = {
  safeStringify,
  formatError,
  logError
};
