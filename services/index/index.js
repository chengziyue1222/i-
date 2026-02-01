import { getAll } from '../_utils/model';
import { cloudbaseTemplateConfig } from '../../config/index';
import { IndexData} from '../cloudbaseMock/index'
import { DATA_MODEL_KEY } from '../../config/model'

/** 获取企业信息数据 */
export function fetchIndexData() {
  console.log('[服务层] fetchIndexData() 被调用');
  /** 返回企业信息 mock数据 */
  console.log('[服务层] 使用 Mock 数据，返回 IndexData:', IndexData);
  return IndexData;
}
