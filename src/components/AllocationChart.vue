<template>
  <div>
    <div ref="pieChart" class="chart-container" style="height:200px;"></div>

    <!-- 集中度预警 -->
    <div v-if="store.industryData.highConcentration"
      style="margin-top:8px;padding:8px 12px;background:rgba(255,71,87,0.08);border-radius:6px;font-size:11px;color:var(--down-red);">
      ⚠️ 前三大持仓占比 {{ (store.industryData.top3Ratio * 100).toFixed(1) }}%，超过 50% 警戒线
    </div>

    <!-- 前三大持仓 -->
    <div style="margin-top:12px;">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">🏆 前三大持仓</div>
      <div v-for="(h, i) in store.industryData.top3" :key="i"
        style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px;">
        <span style="color:var(--text-secondary);">{{ h.name }}</span>
        <span style="font-family:var(--font-mono);color:var(--text-primary);">{{ formatMoney(h.value) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { usePortfolioStore } from '@/stores/portfolio.js'
import * as echarts from 'echarts'

const store = usePortfolioStore()
const pieChart = ref(null)
let chartInstance = null

function formatMoney(val) {
  const abs = Math.abs(val)
  if (abs >= 10000) return (val / 10000).toFixed(2) + '万'
  return val.toFixed(2)
}

function initChart() {
  if (!pieChart.value) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(pieChart.value, null, { devicePixelRatio: window.devicePixelRatio })

  const data = store.industryData.distribution.map(d => ({
    name: d.name,
    value: d.value
  }))

  const colors = ['#00D4FF', '#2563EB', '#7C3AED', '#00FF94', '#FFD700', '#FF4757', '#F472B6', '#38BDF8']

  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(18,24,40,0.95)',
      borderColor: 'rgba(0,212,255,0.2)',
      textStyle: { color: '#E2E8F0', fontSize: 12 },
      formatter: '{b}: {c} ({d}%)'
    },
    series: [{
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderColor: '#0A0E1A',
        borderWidth: 2,
        borderRadius: 4
      },
      label: {
        show: true,
        position: 'outside',
        color: '#94A3B8',
        fontSize: 10,
        formatter: '{b}
{d}%'
      },
      labelLine: {
        lineStyle: { color: 'rgba(148,163,184,0.3)' }
      },
      emphasis: {
        label: { fontSize: 14, fontWeight: 'bold' },
        scaleSize: 8
      },
      color: colors,
      data: data.length > 0 ? data : [{ name: '暂无数据', value: 1, itemStyle: { color: 'rgba(255,255,255,0.06)' } }]
    }]
  }
  chartInstance.setOption(option)
}

onMounted(() => { nextTick(initChart) })
watch(() => store.industryData.distribution, () => nextTick(initChart), { deep: true })
watch(() => store.holdings.length, () => nextTick(initChart))
</script>
