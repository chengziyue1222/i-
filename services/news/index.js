import { getAll } from '../_utils/model';
import { cloudbaseTemplateConfig } from '../../config/index';
import {NewsData} from '../cloudbaseMock/index'
import { DATA_MODEL_KEY } from '../../config/model'

/** 获取最新动态数据 */
export async function fetchNewsData(params) {
  /** 返回最新动态 mock数据 */
  return NewsData;
}
