<template>
  <div>
    <!-- 核心指标卡片 -->
    <div class="metric-card">
      <div class="metric-label">总资产</div>
      <div class="metric-value neutral">{{ formatMoney(store.totalAssets) }}</div>
    </div>

    <div class="metric-card">
      <div class="metric-label">持仓总市值</div>
      <div class="metric-value neutral">{{ formatMoney(store.totalMarketValue) }}</div>
    </div>

    <div class="metric-card">
      <div class="metric-label">可用资金</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span class="metric-value neutral">{{ formatMoney(store.cash) }}</span>
        <span style="font-size:12px;color:var(--text-muted);">
          占比 {{ store.cashRatio.toFixed(1) }}%
        </span>
      </div>
      <input type="number" :value="store.cash" @change="e => store.cash = parseFloat(e.target.value) || 0"
        style="width:100%;margin-top:8px;" placeholder="修改可用资金" />
    </div>

    <div class="metric-card">
      <div class="metric-label">今日盈亏</div>
      <div :class="['metric-value', store.todayPnL >= 0 ? 'up' : 'down']">
        {{ store.todayPnL >= 0 ? '+' : '' }}{{ formatMoney(store.todayPnL) }}
      </div>
      <div :class="['metric-value', store.todayPnLPercent >= 0 ? 'up' : 'down']" style="font-size:14px;">
        {{ store.todayPnLPercent >= 0 ? '+' : '' }}{{ store.todayPnLPercent.toFixed(2) }}%
      </div>
    </div>

    <!-- 健康度环形图 -->
    <div class="metric-card health-ring-area">
      <div class="metric-label" style="text-align:center;">持仓健康度</div>
      <div ref="healthChart" class="chart-container" style="height:200px;"></div>
    </div>

    <!-- 健康度详情 -->
    <div v-if="store.healthScore.details.length > 0" style="margin-top:8px;">
      <div v-for="(d, i) in store.healthScore.details" :key="i"
        style="font-size:11px;color:var(--text-muted);padding:4px 0;border-bottom:1px solid var(--border-subtle);">
        <span :style="{ color: d.type === 'danger' ? 'var(--down-red)' : d.type === 'warning' ? 'var(--warning-yellow)' : 'var(--up-green)' }">
          {{ d.type === 'success' ? '✅' : '⚠️' }} {{ d.message }}
        </span>
        <span v-if="d.penalty < 0" style="color:var(--down-red);margin-left:4px;">{{ d.penalty }}分</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { usePortfolioStore } from '@/stores/portfolio.js'
import * as echarts from 'echarts'

const store = usePortfolioStore()
const healthChart = ref(null)
let chartInstance = null

function formatMoney(val) {
  const abs = Math.abs(val)
  if (abs >= 10000) return (val / 10000).toFixed(2) + ' 万'
  return val.toFixed(2)
}

function initChart() {
  if (!healthChart.value) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(healthChart.value, null, { devicePixelRatio: window.devicePixelRatio })

  const { score, color } = store.healthScore
  const option = {
    series: [{
      type: 'gauge',
      startAngle: 210,
      endAngle: -30,
      center: ['50%', '55%'],
      radius: '85%',
      min: 0,
      max: 100,
      pointer: { show: false },
      progress: {
        show: true,
        width: 14,
        roundCap: true,
        itemStyle: { color }
      },
      axisLine: { lineStyle: { width: 14, color: [[1, 'rgba(255,255,255,0.06)']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        valueAnimation: true,
        fontSize: 40,
        fontWeight: 'bold',
        fontFamily: 'JetBrains Mono',
        color: color,
        offsetCenter: [0, '50%'],
        formatter: '{value}'
      },
      title: { show: false },
      data: [{ value: score }]
    }]
  }
  chartInstance.setOption(option)
}

onMounted(() => { nextTick(initChart) })
watch(() => store.healthScore.score, () => nextTick(initChart))
watch(() => store.holdings.length, () => nextTick(initChart))
</script>
