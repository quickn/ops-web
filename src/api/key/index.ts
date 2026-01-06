// src/key/index.ts
import request from '@/utils/request'
import { AxiosPromise } from 'axios'

/**
 * 生成密钥对
 */
export function generateKeyPair(data: { userId: number }): AxiosPromise<string> {
  return request({
    url: '/crypto/generate',
    method: 'post',
    data: data
  })
}

/**
 * 获取公钥
 */
export function getPublicKey(userId: number): AxiosPromise<string> {
  return request({
    url: `/crypto/publicKey/${userId}`,
    method: 'get'
  })
}

/**
 * 加密数据
 */
export function encryptData(data: { userId: number; plainText: string }): AxiosPromise<string> {
  return request({
    url: '/crypto/encrypt',
    method: 'post',
    data: data
  })
}

/**
 * 解密数据
 */
export function decryptData(data: { userId: number; cipherText: string; privateKeyPassword?: string }): AxiosPromise<string> {
  return request({
    url: '/crypto/decrypt',
    method: 'post',
    data: data
  })
}
