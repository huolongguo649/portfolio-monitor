<template>
  <table class="data-table">
    <thead>
      <tr>
        <th @click="sortBy('code')" :class="{ sorted: sortField === 'code' }">代码 {{ sortIcon('code') }}</th>
        <th @click="sortBy('name')" :class="{ sorted: sortField === 'name' }">名称 {{ sortIcon('name') }}</th>
        <th @click="sortBy('quantity')" :class="{ sorted: sortField === 'quantity' }">数量 {{ sortIcon('quantity') }}</th>
        <th @click="sortBy('costPrice')" :class="{ sorted: sortField === 'costPrice' }">成本价 {{ sortIcon('costPrice') }}</th>
        <th>现价</th>
        <th @click="sortBy('marketValue')" :class="{ sorted: sortField === 'marketValue' }">市值 {{ sortIcon('marketValue') }}</th>
        <th @click="sortBy('pnL')" :class="{ sorted: sortField === 'pnL' }">盈亏额 {{ sortIcon('pnL') }}</th>
        <th @click="sortBy('pnLPercent')" :class="{ sorted: sortField === 'pnLPercent' }">盈亏% {{ sortIcon('pnLPercent') }}</th>
        <th @click="sortBy('ratio')" :class="{ sorted: sortField === 'ratio' }">占比 {{ sortIcon('ratio') }}</th>
        <th>行业</th>
        <th style="width:40px;"></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(h, i) in sortedHoldings" :key="i">
        <td class="text-cell">{{ h.code }}</td>
        <td class="text-cell" style="font-weight:500;">{{ h.name }}</td>
        <td>
          <input type="number" :value="h.quantity"
            @change="e => store.updateHolding(i, 'quantity', e.target.value)" />
        </td>
        <td>{{ h.costPrice.toFixed(3) }}</td>
        <td>
          <input type="number" :value="h.currentPrice" step="0.001"
            @change="e => store.updateHolding(i, 'currentPrice', e.target.value)" />
        </td>
        <td>{{ formatMoney(h.marketValue) }}</td>
        <td :class="h.pnL >= 0 ? 'up' : 'down'">
          {{ h.pnL >= 0 ? '+' : '' }}{{ formatMoney(h.pnL) }}
        </td>
        <td>
          <span :class="['tag', h.pnLPercent >= 0 ? 'tag-up' : 'tag-down']">
            {{ h.pnLPercent >= 0 ? '+' : '' }}{{ h.pnLPercent.toFixed(2) }}%
          </span>
        </td>
        <td>
          <div>{{ h.ratio.toFixed(1) }}%</div>
          <div class="ratio-bar">
            <div :class="['ratio-bar-fill', h.ratio > 20 ? 'danger' : h.ratio > 10 ? 'warn' : 'safe']"
              :style="{ width: Math.min(h.ratio, 100) + '%' }"></div>
          </div>
        </td>
        <td class="text-cell">
          <input type="text" :value="h.industry" style="width:70px;"
            @change="e => store.updateHolding(i, 'industry', e.target.value)" />
        </td>
        <td>
          <button class="btn btn-sm" @click="store.removeHolding(i)" style="padding:2px 6px;">✕</button>
        </td>
      </tr>
      <tr v-if="store.holdings.length === 0">
        <td colspan="11" style="text-align:center;padding:40px;color:var(--text-muted);">
          暂无持仓数据，点击「导入持仓」或「手动添加」
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePortfolioStore } from '@/stores/portfolio.js'

const store = usePortfolioStore()
const sortField = ref('ratio')
const sortOrder = ref(-1) // -1 = 降序

const sortedHoldings = computed(() => {
  const list = [...store.holdingsWithStats]
  list.sort((a, b) => {
    let va = a[sortField.value]
    let vb = b[sortField.value]
    if (typeof va === 'string') va = va.toLowerCase()
    if (typeof vb === 'string') vb = vb.toLowerCase()
    if (va < vb) return -1 * sortOrder.value
    if (va > vb) return 1 * sortOrder.value
    return 0
  })
  return list
})

function sortBy(field) {
  if (sortField.value === field) {
    sortOrder.value *= -1
  } else {
    sortField.value = field
    sortOrder.value = -1
  }
}

function sortIcon(field) {
  if (sortField.value !== field) return ''
  return sortOrder.value === -1 ? '↓' : '↑'
}

function formatMoney(val) {
  const abs = Math.abs(val)
  if (abs >= 10000) return (val / 10000).toFixed(2) + '万'
  return val.toFixed(2)
}
</script>
