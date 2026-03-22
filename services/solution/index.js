import { getAll } from '../_utils/model';
import { cloudbaseTemplateConfig } from '../../config/index';
import {SolutionData} from '../cloudbaseMock/index'
import { DATA_MODEL_KEY } from '../../config/model'

/** 获取解决方案数据 */
export async function fetchSolutionData() {
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
