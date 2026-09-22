/**
 * 任务类型：定时部署
 */
export const TASK_TYPE_DEPLOY = "deploy";

/**
 * 任务类型：预发布Jar同步
 */
export const TASK_TYPE_SYNC_JAR = "syncJar";

/**
 * 任务类型：Shell脚本
 */
export const TASK_TYPE_SHELL = "shell";

/**
 * 定时部署配置（存于 taskParams 字段的 JSON 结构）
 */
export interface DeployConfig {
  /** 项目名称列表，逗号分隔 */
  projectNames?: string;
  /** 部署方式 1:重新构建 2:直接替换jar */
  deployType?: number;
  /** 是否同步部署 */
  sync?: boolean;
  /** 时间间隔(秒) */
  interval?: number;
}

/**
 * 预发布Jar同步配置（存于 taskParams 字段的 JSON 结构）
 */
export interface SyncJarConfig {
  /** 项目名称列表，逗号分隔 */
  projectNames?: string;
  /** 时间间隔(秒)，多个项目同步时每完成一个后的等待时间 */
  interval?: number;
}

/**
 * Shell脚本任务配置（存于 taskParams 字段的 JSON 结构）
 */
export interface ShellConfig {
  /** 执行主机ID列表 */
  agentIds?: number[];
  /** 脚本内容 */
  script?: string;
}

/**
 * 任务告警配置
 */
export interface TaskAlert extends PageQuery {
  /** 主键 */
  id?: number;
  /** 服务ID */
  serviceId?: number;
  /** 服务名称 */
  serviceName?: string;
  /** 任务名称 */
  taskName?: string;
  /** 任务类型: shell脚本 / 接口检测 / 数据库备份 等 */
  taskType?: string;
  /** 任务参数 */
  taskParams?: string;
  /** cron 表达式 */
  cron?: string;
  /** 关联主机Id */
  agentId?: number;
  /** 是否启用告警 */
  isEnabled?: boolean;
  /** 状态: 1-启动 0-停止 */
  status?: number;
  /** 是否发送邮件告警 */
  isEmail?: boolean;
  /** 连续失败次数阈值，超过则告警 */
  failThreshold?: number;
  /** 备注 */
  remark?: string;
  /** 创建时间 */
  createTime?: string;
}

/**
 * 任务告警查询参数
 */
export interface TaskAlertQuery extends PageQuery {
  /** 环境id */
  serviceId?: number;
  /** 任务名称 */
  taskName?: string;
  /** 任务类型 */
  taskType?: string;
  /** 是否启用 */
  isEnabled?: boolean;
  /** 状态: 1-启动 0-停止 */
  status?: number;
}
