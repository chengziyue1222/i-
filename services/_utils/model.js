const dayjs = require('dayjs');

function model() {
  return globalThis.dataModel || null;
}

/**
 * 读取多条数据
 * @param name 数据模型标识
 * @param pageNumber 第几页
 * @param pageSize 分页大小，建议指定，如需设置为其它值，需要和 pageNumber 配合使用，两者同时指定才会生效
 * @param filter 过滤条件
 * @param select 设置返回字段
 * @param orderBy 排序条件 {field: '字段名', order: 'asc'|'desc'}
 */
async function getAll({ filter, select, name, pageNumber = 1, pageSize = 200, orderBy }) {
  try {
    console.log('[数据层] getAll() 开始执行');
    console.log('[数据层] 参数:', { name, filter, orderBy, pageNumber, pageSize });
    
    const addSelect = (prop) => (select ? { ...prop, select } : prop);
    const addOrderBy = (prop) => {
      if (orderBy && orderBy.field && orderBy.order) {
        console.log('[数据层] 添加排序条件:', orderBy);
        return { ...prop, orderBy: [{ field: orderBy.field, order: orderBy.order }] };
      }
      return prop;
    };
    
    // console.log('[数据层] 调用 model()[name].list(), name:', name);
    // console.log('[数据层] model 对象:', model());
    // console.log('[数据层] model[name] 对象:', model()[name]);
    
    const first = await model()[name].list(
      addOrderBy(addSelect({
        pageNumber,
        pageSize,
        getCount: true,
        filter,
      })),
    );
    
    console.log('[数据层] 第一次查询结果 first:', first);
    
    const {
      data: { total },
    } = first;
    
    console.log('[数据层] 总记录数 total:', total);
    
    const totalPage = Math.ceil(total / 200);
    console.log('[数据层] 总页数 totalPage:', totalPage);
    
    let allRecords = first.data.records || [];
    console.log('[数据层] 第一页记录数:', allRecords.length);
    
    // 如果有多页，继续获取
    if (totalPage > 1) {
      console.log('[数据层] 开始获取剩余页面数据...');
      const lists = await Promise.all(
        Array.from({ length: totalPage - 1 }, (_, index) => index + 2).map((pageNumber) =>
          model()[name].list(
            addOrderBy(addSelect({
              pageNumber,
              pageSize,
              filter,
            })),
          ),
        ),
      );
      
      console.log('[数据层] 剩余页面数据:', lists);
      
      // 合并所有数据
      for (const list of lists) {
        if (list.data && list.data.records) {
          allRecords = allRecords.concat(list.data.records);
        }
      }
    }
    
    console.log('[数据层] 合并后的总记录数:', allRecords.length);
    
    // 格式化数据
    const ret = allRecords.map((item) => {
      return {
        time: dayjs(item.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
        ...item,
      };
    });
    
    console.log('[数据层] getAll() 执行完成，返回:', ret);
    return ret;
  } catch (error) {
    console.error('[数据层] ❌ getAll() 执行失败:', error);
    console.error('[数据层] 错误详情:', {
      message: error.message,
      stack: error.stack,
      name
    });
    throw error;
  }
}

/**
 * 读取单条数据
 * @param name 数据模型标识
 * @param _id 根据数据标识 _id 进行操作
 * @param select  设置返回字段
 */
async function getOne({name,_id,select}){
  const addSelect = (prop) => (select ? { ...prop, select } : prop);
  const { data } = await model()[name].get(  addSelect({
    filter: {
      where: {
        $and: [
          {
            _id: {
              $eq: _id,
            },
          },
        ]
      }
    }
  }));
  //转换时间 格式为YYYY-MM-DD HH:mm:ss
  data.time = dayjs(data.updatedAt).format('YYYY-MM-DD HH:mm:ss');
  return data;
}

module.exports = { model, getAll, getOne };