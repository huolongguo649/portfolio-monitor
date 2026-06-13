/**
 * 持仓健康度评分计算
 *
 * 评分规则（总分 100）：
 * - 单只持仓占比 > 20%：每超 1 只扣 15 分（最多扣 30）
 * - 行业数量 < 3：每少一个扣 15 分（最多扣 30）
 * - 现金占比 < 5%：扣 15 分
 * - 持仓数量 > 15 只：扣 10 分（过度分散）
 */

/**
 * @param {array} holdings - 持仓列表
 * @param {number} cash - 可用资金
 * @returns {{ score: number, details: array }}
 */
export function calculateHealthScore(holdings, cash) {
  const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0) + cash
  const details = []
  let score = 100

  // 1. 单只持仓集中度检查
  const highConcentration = holdings.filter(h => {
    const ratio = (h.quantity * h.currentPrice) / totalValue
    return ratio > 0.20
  })
  const concentrationPenalty = Math.min(highConcentration.length * 15, 30)
  score -= concentrationPenalty
  if (highConcentration.length > 0) {
    details.push({
      type: 'warning',
      message: `${highConcentration.length} 只标的持仓占比超过 20%`,
      penalty: -concentrationPenalty,
      items: highConcentration.map(h => `${h.name}(${h.code})`)
    })
  }

  // 2. 行业分散度检查
  const industries = new Set(holdings.filter(h => h.industry).map(h => h.industry))
  if (industries.size < 3) {
    const penalty = (3 - industries.size) * 15
    score -= penalty
    details.push({
      type: 'warning',
      message: `行业覆盖仅 ${industries.size} 个，建议至少 3 个行业`,
      penalty: -penalty,
      items: [...industries]
    })
  }

  // 3. 现金占比检查
  const cashRatio = totalValue > 0 ? cash / totalValue : 0
  if (cashRatio < 0.05) {
    score -= 15
    details.push({
      type: 'danger',
      message: `现金占比仅 ${(cashRatio * 100).toFixed(1)}%，低于 5% 安全线`,
      penalty: -15
    })
  } else {
    details.push({
      type: 'success',
      message: `现金占比 ${(cashRatio * 100).toFixed(1)}%，流动性充足`,
      penalty: 0
    })
  }

  // 4. 过度分散检查
  if (holdings.length > 15) {
    score -= 10
    details.push({
      type: 'warning',
      message: `持仓 ${holdings.length} 只，过于分散可能影响跟踪效率`,
      penalty: -10
    })
  }

  // 确保分数在 0-100 之间
  score = Math.max(0, Math.min(100, Math.round(score)))

  // 颜色映射
  let color
  if (score >= 80) color = '#00FF94'
  else if (score >= 60) color = '#FFD700'
  else if (score >= 40) color = '#FF8C00'
  else color = '#FF4757'

  return { score, color, details }
}

/**
 * 计算行业分布
 * @returns {{ name: string, value: number, percent: number }[]}
 */
export function calculateIndustryDistribution(holdings, cash) {
  const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0) + cash
  const industryMap = {}

  for (const h of holdings) {
    const value = h.quantity * h.currentPrice
    const industry = h.industry || '其他'
    industryMap[industry] = (industryMap[industry] || 0) + value
  }

  const result = Object.entries(industryMap).map(([name, value]) => ({
    name,
    value,
    percent: totalValue > 0 ? (value / totalValue * 100) : 0
  }))

  // 按占比降序
  result.sort((a, b) => b.value - a.value)

  // 前 3 大持仓集中度
  const top3 = holdings
    .map(h => ({ name: h.name, code: h.code, value: h.quantity * h.currentPrice }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)

  const top3Ratio = top3.reduce((s, h) => s + h.value, 0) / (totalValue || 1)
  const highConcentration = top3Ratio > 0.5

  return { distribution: result, top3, top3Ratio, highConcentration }
}

/**
 * 检查预警条件
 */
export function checkAlerts(holdings, cash, alertSettings) {
  const alerts = []
  const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0) + cash

  for (const h of holdings) {
    if (h.costPrice <= 0) continue

    const changePercent = (h.currentPrice - h.costPrice) / h.costPrice * 100
    const threshold = alertSettings.priceChangeThreshold || 5

    // 涨跌幅预警
    if (Math.abs(changePercent) >= threshold) {
      alerts.push({
        type: changePercent >= 0 ? 'up' : 'down',
        code: h.code,
        name: h.name,
        message: `${h.name} ${changePercent >= 0 ? '上涨' : '下跌'} ${Math.abs(changePercent).toFixed(2)}%，触发 ${threshold}% 预警`,
        changePercent
      })
    }

    // 单只占比预警
    const ratio = (h.quantity * h.currentPrice) / totalValue * 100
    const concentrationLimit = alertSettings.concentrationThreshold || 20
    if (ratio > concentrationLimit) {
      alerts.push({
        type: 'concentration',
        code: h.code,
        name: h.name,
        message: `${h.name} 持仓占比 ${ratio.toFixed(1)}%，超过 ${concentrationLimit}% 上限`,
        ratio
      })
    }
  }

  return alerts
}
