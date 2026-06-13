<template>
  <div style="margin-top:12px;">
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">⚡ 当前预警阈值</div>
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <span class="tag tag-warn">涨跌幅 ±{{ store.alertSettings.priceChangeThreshold }}%</span>
      <span class="tag tag-warn">单只上限 {{ store.alertSettings.concentrationThreshold }}%</span>
    </div>

    <div v-if="store.alerts.length === 0"
      style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;border:1px dashed var(--border-subtle);border-radius:8px;">
      ✅ 暂无预警触发
    </div>

    <div v-else style="max-height:200px;overflow-y:auto;">
      <div v-for="(a, i) in store.alerts" :key="i"
        :style="{
          padding: '8px 10px',
          marginBottom: '4px',
          borderRadius: '6px',
          fontSize: '11px',
          background: a.type === 'concentration' ? 'rgba(255,215,0,0.08)' : a.type === 'up' ? 'rgba(0,255,148,0.06)' : 'rgba(255,71,87,0.08)',
          borderLeft: '2px solid ' + (a.type === 'concentration' ? 'var(--warning-yellow)' : a.type === 'up' ? 'var(--up-green)' : 'var(--down-red)')
        }">
        <div style="font-weight:500;color:var(--text-primary);">{{ a.name }} ({{ a.code }})</div>
        <div :style="{ color: a.type === 'concentration' ? 'var(--warning-yellow)' : a.type === 'up' ? 'var(--up-green)' : 'var(--down-red)' }">
          {{ a.message }}
        </div>
      </div>
    </div>

    <button class="btn btn-sm" @click="store.clearAlerts()"
      style="width:100%;margin-top:8px;justify-content:center;"
      v-if="store.alerts.length > 0">
      清除预警
    </button>
  </div>
</template>

<script setup>
import { usePortfolioStore } from '@/stores/portfolio.js'
const store = usePortfolioStore()
</script>
