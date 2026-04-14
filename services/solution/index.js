const { getAll } = require('../_utils/model');
const { cloudbaseTemplateConfig } = require('../../config/index');
const { SolutionData } = require('../cloudbaseMock/index');
const { DATA_MODEL_KEY } = require('../../config/model');

/** 获取解决方案数据 */
async function fetchSolutionData() {
  if (cloudbaseTemplateConfig.useMock) {
    return SolutionData;
  }
  const modelKey = DATA_MODEL_KEY.SOLUTION_LIST;
  if (!modelKey) {
    return SolutionData;
  }
  try {
    return await getAll({ name: modelKey });
  } catch (err) {
    console.warn('[solution] 云数据库获取失败，降级 Mock:', err.message);
    return SolutionData;
  }
}

module.exports = { fetchSolutionData };
