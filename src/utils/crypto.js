import CryptoJS from 'crypto-js'

/**
 * 使用 AES-256 加密数据
 * @param {object|string} data - 要加密的数据
 * @param {string} password - 加密密码
 * @returns {string} Base64 编码的密文
 */
export function encrypt(data, password) {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data)
  const ciphertext = CryptoJS.AES.encrypt(jsonStr, password).toString()
  return ciphertext
}

/**
 * 使用 AES-256 解密数据
 * @param {string} ciphertext - Base64 编码的密文
 * @param {string} password - 解密密码
 * @returns {object} 解密后的数据对象
 * @throws {Error} 密码错误或数据损坏时抛出异常
 */
export function decrypt(ciphertext, password) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, password)
  const jsonStr = bytes.toString(CryptoJS.enc.Utf8)
  if (!jsonStr) {
    throw new Error('密码错误或数据已损坏')
  }
  return JSON.parse(jsonStr)
}

/**
 * 计算数据的 SHA256 校验和（用于完整性验证）
 */
export function checksum(data) {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data)
  return CryptoJS.SHA256(jsonStr).toString()
}
