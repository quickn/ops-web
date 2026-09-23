/**
 * 预警通道类型
 */
export const ALERT_CHANNEL_EMAIL = "EMAIL";
export const ALERT_CHANNEL_SMS = "SMS";

/**
 * 预警通道选项
 */
export const ALERT_CHANNEL_OPTIONS: OptionType[] = [
  { value: ALERT_CHANNEL_EMAIL, label: "邮件" },
  { value: ALERT_CHANNEL_SMS, label: "短信" }
];

/**
 * 预警级别选项
 */
export const ALERT_LEVEL_OPTIONS: OptionType[] = [
  { value: 1, label: "通知" },
  { value: 2, label: "警告" },
  { value: 3, label: "严重" }
];

/**
 * 触发类型：关键字触发
 */
export const TRIGGER_TYPE_KEYWORD = "KEYWORD";

/**
 * 触发类型：超过阈值触发
 */
export const TRIGGER_TYPE_THRESHOLD = "THRESHOLD";

/**
 * 触发类型选项
 */
export const TRIGGER_TYPE_OPTIONS: OptionType[] = [
  { value: TRIGGER_TYPE_KEYWORD, label: "关键字触发" },
  { value: TRIGGER_TYPE_THRESHOLD, label: "超过阈值触发" }
];

// ==================== 报警联系人 ====================

/**
 * 报警联系人
 */
export interface AlertContact extends PageQuery {
  /** 主键 */
  id?: number;
  /** 服务ID */
  serviceId?: number;
  /** 服务名称 */
  serviceName?: string;
  /** 联系人姓名 */
  contactName?: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  phone?: string;
  /** 备注 */
  remark?: string;
  /** 创建人ID */
  createBy?: number;
  /** 创建人名称 */
  createByName?: string;
  /** 创建时间 */
  createTime?: string;
}

/**
 * 联系人查询参数
 */
export interface AlertContactQuery extends PageQuery {
  /** 联系人姓名 */
  contactName?: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  phone?: string;
}

// ==================== 报警联系人组 ====================

/**
 * 报警联系人组
 */
export interface AlertContactGroup extends PageQuery {
  /** 主键 */
  id?: number;
  /** 服务ID */
  serviceId?: number;
  /** 服务名称 */
  serviceName?: string;
  /** 组名称 */
  groupName?: string;
  /** 联系人ID列表，逗号分隔 */
  contactIds?: string;
  /** 备注 */
  remark?: string;
  /** 创建人ID */
  createBy?: number;
  /** 创建人名称 */
  createByName?: string;
  /** 创建时间 */
  createTime?: string;
}

/**
 * 联系人组查询参数
 */
export interface AlertContactGroupQuery extends PageQuery {
  /** 组名称 */
  groupName?: string;
}

// ==================== 预警规则 ====================

/**
 * 预警规则
 */
export interface AlertRule extends PageQuery {
  /** 主键 */
  id?: number;
  /** 规则名称 */
  ruleName?: string;
  /** 预警通道，多选逗号分隔: EMAIL,SMS */
  alertChannels?: string;
  /** 预警级别: 1-通知 2-警告 3-严重 */
  alertLevel?: number;
  /** 触发类型: KEYWORD-关键字触发 THRESHOLD-超过阈值触发 */
  triggerType?: string;
  /** 触发关键字，逗号分隔，结果包含任一关键字即触发 */
  conditionKeyword?: string;
  /** 触发阈值，结果中的数值超过该阈值即触发 */
  conditionThreshold?: number;
  /** 报警联系人组ID */
  contactGroupId?: number;
  /** 报警联系人组名称 */
  contactGroupName?: string;
  /** 是否启用 */
  isEnabled?: boolean;
  /** 静默期（分钟） */
  silencePeriod?: number;
  /** 连续触发阈值 */
  triggerThreshold?: number;
  /** 聚合窗口（分钟） */
  aggregateWindow?: number;
  /** 创建人ID */
  createBy?: number;
  /** 创建人名称 */
  createByName?: string;
  /** 备注 */
  remark?: string;
  /** 创建时间 */
  createTime?: string;
}

/**
 * 预警规则查询参数
 */
export interface AlertRuleQuery extends PageQuery {
  /** 规则名称 */
  ruleName?: string;
  /** 预警通道 */
  alertChannels?: string;
  /** 预警级别 */
  alertLevel?: number;
  /** 是否启用 */
  isEnabled?: boolean;
}

// ==================== 预警记录 ====================

/**
 * 预警记录
 */
export interface AlertRecord extends PageQuery {
  /** 主键 */
  id?: number;
  /** 服务ID */
  serviceId?: number;
  /** 服务名称 */
  serviceName?: string;
  /** 关联预警规则ID */
  ruleId?: number;
  /** 规则名称 */
  ruleName?: string;
  /** 预警级别 */
  alertLevel?: number;
  /** 预警通道 */
  alertChannel?: string;
  /** 预警内容 */
  alertContent?: string;
  /** 接收人 */
  recipient?: string;
  /** 发送状态: 0-成功 1-失败 */
  sendStatus?: number;
  /** 失败原因 */
  failReason?: string;
  /** 是否被降噪静默: 0-否 1-是 */
  isSilenced?: number;
  /** 连续触发次数 */
  triggerCount?: number;
  /** 创建人ID */
  createBy?: number;
  /** 创建人名称 */
  createByName?: string;
  /** 创建时间 */
  createTime?: string;
}

/**
 * 预警记录查询参数
 */
export interface AlertRecordQuery extends PageQuery {
  /** 环境id */
  serviceId?: number;
  /** 规则ID */
  ruleId?: number;
  /** 预警通道 */
  alertChannel?: string;
  /** 发送状态 */
  sendStatus?: number;
  /** 是否被静默 */
  isSilenced?: number;
}
