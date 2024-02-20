/**
 * 登录用户信息
 */
export interface EmailSet {
  id: number;
  fromMailName: string;
  fromPwd: string;
  smtpHost: string;
  smtpPort: string;
  toMail: string;
  smtpSsl: string;
  heathInterval: number;
}
