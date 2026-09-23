import request from "@/utils/request";
import { AxiosPromise } from "axios";
import {
  AlertRule,
  AlertRuleQuery,
  AlertRecord,
  AlertRecordQuery,
  AlertContact,
  AlertContactQuery,
  AlertContactGroup,
  AlertContactGroupQuery
} from "./types";

const RULE_BASE = "/alertRule";
const RECORD_BASE = "/alertRecord";
const CONTACT_BASE = "/alertContact";
const CONTACT_GROUP_BASE = "/alertContactGroup";

// ==================== 报警联系人 ====================

/**
 * 联系人列表（分页）
 */
export function listAlertContactPage(
  queryParams?: AlertContactQuery
): AxiosPromise<PageRecords<AlertContact[]>> {
  return request({
    url: CONTACT_BASE + "/page",
    method: "get",
    params: queryParams
  });
}

/**
 * 联系人列表（全部）
 */
export function listAllAlertContact(): AxiosPromise<AlertContact[]> {
  return request({
    url: CONTACT_BASE + "/list",
    method: "get"
  });
}

/**
 * 保存联系人
 */
export function saveAlertContact(data: AlertContact) {
  return request({
    url: CONTACT_BASE + "/save",
    method: "post",
    data
  });
}

/**
 * 删除联系人
 */
export function deleteAlertContact(id: number) {
  return request({
    url: CONTACT_BASE + "/delete/" + id,
    method: "delete"
  });
}

// ==================== 报警联系人组 ====================

/**
 * 联系人组列表（分页）
 */
export function listAlertContactGroupPage(
  queryParams?: AlertContactGroupQuery
): AxiosPromise<PageRecords<AlertContactGroup[]>> {
  return request({
    url: CONTACT_GROUP_BASE + "/page",
    method: "get",
    params: queryParams
  });
}

/**
 * 联系人组列表（全部）
 */
export function listAllAlertContactGroup(): AxiosPromise<AlertContactGroup[]> {
  return request({
    url: CONTACT_GROUP_BASE + "/list",
    method: "get"
  });
}

/**
 * 保存联系人组
 */
export function saveAlertContactGroup(data: AlertContactGroup) {
  return request({
    url: CONTACT_GROUP_BASE + "/save",
    method: "post",
    data
  });
}

/**
 * 删除联系人组
 */
export function deleteAlertContactGroup(id: number) {
  return request({
    url: CONTACT_GROUP_BASE + "/delete/" + id,
    method: "delete"
  });
}

// ==================== 预警规则 ====================

/**
 * 预警规则列表（分页）
 */
export function listAlertRulePage(
  queryParams?: AlertRuleQuery
): AxiosPromise<PageRecords<AlertRule[]>> {
  return request({
    url: RULE_BASE + "/page",
    method: "get",
    params: queryParams
  });
}

/**
 * 获取预警规则详情
 */
export function getAlertRuleById(id: number): AxiosPromise<AlertRule> {
  return request({
    url: RULE_BASE + "/" + id,
    method: "get"
  });
}

/**
 * 保存预警规则（新增/更新）
 */
export function saveAlertRule(data: AlertRule) {
  return request({
    url: RULE_BASE + "/save",
    method: "post",
    data
  });
}

/**
 * 删除预警规则
 */
export function deleteAlertRule(id: number) {
  return request({
    url: RULE_BASE + "/delete/" + id,
    method: "delete"
  });
}

/**
 * 触发预警
 */
export function triggerAlert(id: number, alertContent: string) {
  return request({
    url: RULE_BASE + "/trigger/" + id,
    method: "post",
    params: { alertContent }
  });
}

/**
 * 手动触发预警（跳过连续阈值）
 */
export function manualTriggerAlert(id: number, alertContent: string) {
  return request({
    url: RULE_BASE + "/manualTrigger/" + id,
    method: "post",
    params: { alertContent }
  });
}

// ==================== 预警记录 ====================

/**
 * 预警记录列表（分页）
 */
export function listAlertRecordPage(
  queryParams?: AlertRecordQuery
): AxiosPromise<PageRecords<AlertRecord[]>> {
  return request({
    url: RECORD_BASE + "/page",
    method: "get",
    params: queryParams
  });
}
