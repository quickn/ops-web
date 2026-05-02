export interface JobInfoGroup {
  id?: number;
  title?: string;
}

/**
 * 任务信息
 */
export interface JobInfo extends PageQuery {
  id?: number;
  /** 任务分组ID */
  jobGroup?: number;
  /** 所属服务ID */
  serviceId?: number;
  /** 所属服务名称 */
  serviceName?: string;
  /** 任务描述 */
  jobDesc?: string;
  /** 负责人 */
  author?: string;
  /** 报警邮件 */
  alarmEmail?: string;
  /** 调度类型：NONE-无调度, CRON-Cron表达式, FIX_RATE-固定间隔 */
  scheduleType?: string;
  /** 调度配置（cron表达式或固定秒数） */
  scheduleConf?: string;
  /** 执行器Handler名称 */
  executorHandler?: string;
  /** 执行参数 */
  executorParam?: string;
  /** 重试次数 */
  executorFailRetryCount?: number;
  /** 超时时间（秒） */
  executorTimeout?: number;
  /** 运行模式：BEAN, GLUE_SHELL, GLUE_PYTHON, GLUE_POWERSHELL */
  glueType?: string;
  /** GLUE源代码 */
  glueSource?: string;
  /** 调度过期策略：DO_NOTHING-忽略, FIRE_ONCE_NOW-立即执行一次 */
  misfireStrategy?: string;
  /** 路由策略：FIRST, LAST, ROUND, RANDOM, CONSISTENT_HASH, LEAST_FREQUENTLY_USED, LEAST_RECENTLY_USED, FAILOVER, BUSYOVER, SHARDING_BROADCAST */
  executorRouteStrategy?: string;
  /** 执行器阻塞策略：SERIAL, PARALLEL */
  executorBlockStrategy?: string;
  /** 任务状态：0-停止, 1-运行 */
  triggerStatus?: number;
  /** 创建时间 */
  createTime?: string;
  /** 更新时间 */
  updateTime?: string;
}

/**
 * 调度类型选项
 */
export interface ScheduleTypeOption {
  label: string;
  value: string;
}

/**
 * 运行模式选项
 */
export interface GlueTypeOption {
  label: string;
  value: string;
}

/**
 * 路由策略选项
 */
export interface RouteStrategyOption {
  label: string;
  value: string;
}

/**
 * 调度过期策略选项
 */
export interface MisfireStrategyOption {
  label: string;
  value: string;
}


/**
 * 调度日志记录
 */
export interface JobLog {
  /** 日志ID */
  id?: number;
  /** 任务分组ID */
  jobGroup?: number;
  /** 任务ID */
  jobId?: number;
  /** 任务描述 */
  jobDesc?: string;
  /** 执行器地址 */
  executorAddress?: string;
  /** 执行器Handler */
  executorHandler?: string;
  /** 执行参数 */
  executorParam?: string;
  /** 调度时间 */
  triggerTime?: string;
  /** 调度结果码：0-成功 */
  triggerCode?: number;
  /** 调度备注 */
  triggerMsg?: string;
  /** 执行时间 */
  handleTime?: string;
  /** 执行结果码：0-成功 */
  handleCode?: number;
  /** 执行日志 */
  handleMsg?: string;
  /** 执行耗时(ms) */
  handleDuration?: number;
  /** 报警状态：0-默认, 1-无需报警, 2-报警成功, 3-报警失败 */
  alarmStatus?: number;
}
