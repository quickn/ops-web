/**
 * 登录用户信息
 */
export interface EmailConfig {
  id?: number | null;
  fromMailName?: string;
  fromPwd?: string;
  smtpHost?: string;
  smtpPort?: string;
  toMail?: string;
  smtpSsl?: string;
  timeInterval?: number;
  isSendMail?: Boolean;
}
