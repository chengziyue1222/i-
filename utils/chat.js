function pad(num) {
  return String(num).padStart(2, '0');
}

function formatTime(ts) {
  const date = new Date(ts);
  return pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function formatConversationTime(ts) {
  if (!ts) return '';
  const now = new Date();
  const date = new Date(ts);

  const isToday =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  if (isToday) {
    return formatTime(ts);
  }

  return pad(date.getMonth() + 1) + '/' + pad(date.getDate());
}

function getDateLabel(ts) {
  const date = new Date(ts);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = (today - target) / (24 * 60 * 60 * 1000);

  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function buildGroupedMessages(list, currentUserId) {
  const result = [];
  let lastLabel = '';

  (list || []).forEach((item) => {
    const label = getDateLabel(item.createdAt);
    if (label !== lastLabel) {
      result.push({
        _type: 'time',
        id: 'time_' + label + '_' + item.createdAt,
        label
      });
      lastLabel = label;
    }

    result.push({
      _type: 'message',
      id: item.messageId,
      isMine: item.senderId === currentUserId,
      type: item.type,
      senderId: item.senderId,
      content: item.content,
      timeText: formatTime(item.createdAt),
      createdAt: item.createdAt,
      raw: item
    });
  });

  return result;
}

module.exports = {
  formatTime,
  formatConversationTime,
  buildGroupedMessages
};
