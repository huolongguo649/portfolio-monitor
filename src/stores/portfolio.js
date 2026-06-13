import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { encrypt, decrypt, checksum } from '@/utils/crypto.js'
import { parseCSV, parseExcel, exportToCSV } from '@/utils/parser.js'
import { calculateHealthScore, calculateIndustryDistribution, checkAlerts } from '@/utils/health.js'

export const usePortfolioStore = defineStore('portfolio', () => {
  // ===== 状态 =====
  const cash = ref(0)
  const holdings = ref([])
  const alertSettings = ref({
    priceChangeThreshold: 5,
    concentrationThreshold: 20
  })
  const currentPassword = ref('')
  const dataLoaded = ref(false)
  const alerts = ref([])
  const importWarnings = ref([])

  // ===== 计算属性 =====
  const totalMarketValue = computed(() =>
    holdings.value.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0)
  )

  const totalAssets = computed(() => totalMarketValue.value + cash.value)

  const todayPnL = computed(() =>
    holdings.value.reduce((sum, h) => sum + (h.currentPrice - h.costPrice) * h.quantity, 0)
  )

  const todayPnLPercent = computed(() => {
    const totalCost = holdings.value.reduce((sum, h) => sum + h.costPrice * h.quantity, 0)
    return totalCost > 0 ? (todayPnL.value / totalCost * 100) : 0
  })

  const cashRatio = computed(() =>
    totalAssets.value > 0 ? (cash.value / totalAssets.value * 100) : 0
  )

  const healthScore = computed(() =>
    calculateHealthScore(holdings.value, cash.value)
  )

  const industryData = computed(() =>
    calculateIndustryDistribution(holdings.value, cash.value)
  )

  // 带计算字段的持仓列表（用于表格展示）
  const holdingsWithStats = computed(() =>
    holdings.value.map(h => ({
      ...h,
      marketValue: h.quantity * h.currentPrice,
      pnL: (h.currentPrice - h.costPrice) * h.quantity,
      pnLPercent: h.costPrice > 0 ? ((h.currentPrice - h.costPrice) / h.costPrice * 100) : 0,
      ratio: totalAssets.value > 0 ? (h.quantity * h.currentPrice / totalAssets.value * 100) : 0,
      status: h.currentPrice >= h.costPrice ? 'up' : 'down'
    }))
  )

  // ===== 方法 =====

  /** 添加持仓 */
  function addHolding(holding) {
    holdings.value.push({
      code: holding.code || '',
      name: holding.name || '',
      quantity: parseFloat(holding.quantity) || 0,
      costPrice: parseFloat(holding.costPrice) || 0,
      currentPrice: parseFloat(holding.currentPrice) || parseFloat(holding.costPrice) || 0,
      industry: holding.industry || '其他'
    })
  }

  /** 删除持仓 */
  function removeHolding(index) {
    holdings.value.splice(index, 1)
  }

  /** 更新持仓字段 */
  function updateHolding(index, field, value) {
    if (index >= 0 && index < holdings.value.length) {
      if (['quantity', 'costPrice', 'currentPrice'].includes(field)) {
        holdings.value[index][field] = parseFloat(value) || 0
      } else {
        holdings.value[index][field] = value
      }
    }
  }

  /** 解析并导入文件 */
  async function importFile(filePath, content) {
    importWarnings.value = []
    const ext = filePath.toLowerCase().split('.').pop()
    let result

    if (ext === 'csv') {
      result = await parseCSV(content)
    } else if (ext === 'xlsx' || ext === 'xls') {
      result = parseExcel(content)
    } else {
      importWarnings.value.push(`不支持的文件格式: .${ext}`)
      return false
    }

    if (result.errors.length > 0) {
      importWarnings.value.push(...result.errors)
      return false
    }

    if (result.unmappedColumns.length > 0) {
      importWarnings.value.push(`以下列未被识别: ${result.unmappedColumns.join(', ')}`)
    }

    if (result.holdings.length === 0) {
      importWarnings.value.push('未发现有效持仓数据')
      return false
    }

    holdings.value = result.holdings
    refreshAlerts()
    return true
  }

  /** 导出 CSV */
  function exportCSV() {
    return exportToCSV(holdingsWithStats.value)
  }

  /** 加密保存 */
  function encryptSave(password) {
    const data = {
      version: 1,
      cash: cash.value,
      holdings: holdings.value,
      alertSettings: alertSettings.value,
      checksum: ''
    }
    data.checksum = checksum({ cash: data.cash, holdings: data.holdings, alertSettings: data.alertSettings })
    currentPassword.value = password
    return encrypt(data, password)
  }

  /** 解密加载 */
  function decryptLoad(ciphertext, password) {
    const data = decrypt(ciphertext, password)
    const expectedChecksum = checksum({ cash: data.cash, holdings: data.holdings, alertSettings: data.alertSettings })
    if (data.checksum && data.checksum !== expectedChecksum) {
      throw new Error('数据完整性校验失败，文件可能已损坏')
    }
    cash.value = data.cash || 0
    holdings.value = data.holdings || []
    alertSettings.value = data.alertSettings || { priceChangeThreshold: 5, concentrationThreshold: 20 }
    currentPassword.value = password
    dataLoaded.value = true
    refreshAlerts()
    return true
  }

  /** 刷新预警 */
  function refreshAlerts() {
    alerts.value = checkAlerts(holdings.value, cash.value, alertSettings.value)
  }

  /** 清除预警 */
  function clearAlerts() {
    alerts.value = []
  }

  /** 重置所有数据 */
  function resetAll() {
    cash.value = 0
    holdings.value = []
    alertSettings.value = { priceChangeThreshold: 5, concentrationThreshold: 20 }
    currentPassword.value = ''
    dataLoaded.value = false
    alerts.value = []
    importWarnings.value = []
  }

  return {
    // 状态
    cash, holdings, alertSettings, currentPassword, dataLoaded, alerts, importWarnings,
    // 计算属性
    totalMarketValue, totalAssets, todayPnL, todayPnLPercent, cashRatio, healthScore, industryData, holdingsWithStats,
    // 方法
    addHolding, removeHolding, updateHolding, importFile, exportCSV, encryptSave, decryptLoad, refreshAlerts, clearAlerts, resetAll
  }
})
