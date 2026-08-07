/** 指令库 */
export interface CmdLib {
  /** 主键ID */
  id?: number;
  /** 指令名称 */
  cmdName?: string;
  /** 指令内容 */
  cmd?: string;
  /** 类型：shell / python */
  type?: string;
  /** 创建时间 */
  createTime?: string;
  /** 更新时间 */
  updateTime?: string;
}

/** 分页查询参数 */
export interface CmdLibQuery extends PageQuery {
  /** 按类型过滤 */
  type?: string;
  /** 按指令内容模糊搜索 */
  keyword?: string;
}
