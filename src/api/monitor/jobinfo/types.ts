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
  /** 任务名称 */
  jobName?: string;
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
  retryCount?: number;
  /** 超时时间（秒） */
  timeout?: number;
  /** 运行模式：BEAN, GLUE_SHELL, GLUE_PYTHON, GLUE_POWERSHELL */
  glueType?: string;
  /** GLUE源代码 */
  glueSource?: string;
  /** 调度过期策略：DO_NOTHING-忽略, FIRE_ONCE_NOW-立即执行一次 */
  misfirePolicy?: string;
  /** 路由策略：FIRST, LAST, ROUND, RANDOM, CONSISTENT_HASH, LEAST_FREQUENTLY_USED, LEAST_RECENTLY_USED, FAILOVER, BUSYOVER, SHARDING_BROADCAST */
  routeStrategy?: string;
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
export interface MisfirePolicyOption {
  label: string;
  value: string;
}
