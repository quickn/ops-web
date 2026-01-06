// src/api/key/types.ts
export interface KeyPairRequest {
  userId: number
  keySize?: number
  algorithm?: string
}

export interface EncryptRequest {
  userId: number
  plainText: string
  keyVersion?: string
}

export interface DecryptRequest {
  userId: number
  cipherText: string
  privateKeyPassword?: string
}
