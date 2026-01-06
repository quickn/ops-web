// src/api/key/index.ts
import request from '@/utils/request'
import { AxiosPromise } from 'axios'

/**
 * 生成密钥对
 */
export function generateKeyPair(data: { userId: string }): AxiosPromise<string> {
  return request({
    url: '/api/encryption/keypair/generate',
    method: 'post',
    data: data
  })
}

/**
 * 重新生成密钥对
 */
export function regenerateKeyPair(userId: string): AxiosPromise<string> {
  return request({
    url: `/api/encryption/keypair/regenerate/${userId}`,
    method: 'post'
  })
}

/**
 * 获取公钥
 */
export function getPublicKey(userId: string): AxiosPromise<string> {
  return request({
    url: `/api/encryption/keypair/public-key/${userId}`,
    method: 'get'
  })
}

/**
 * 加密数据
 */
export function encryptData(data: { userId: string; plainText: string }): AxiosPromise<string> {
  return request({
    url: '/api/encryption/encrypt',
    method: 'post',
    data: data
  })
}

/**
 * 解密数据
 */
export function decryptData(data: { userId: string; cipherText: string; privateKeyPassword?: string }): AxiosPromise<string> {
  return request({
    url: '/api/encryption/decrypt',
    method: 'post',
    data: data
  })
}
