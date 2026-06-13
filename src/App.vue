<template>
  <div id="app-root">
    <!-- 自定义标题栏 -->
    <div class="titlebar">
      <div class="titlebar-left">
        <span class="logo">◆ 持仓监控</span>
        <span v-if="store.dataLoaded">· 数据已加载</span>
      </div>
      <div class="titlebar-actions">
        <button class="titlebar-btn" @click="minimize" title="最小化">─</button>
        <button class="titlebar-btn" @click="toggleMaximize" title="最大化">☐</button>
        <button class="titlebar-btn close" @click="closeWindow" title="关闭">✕</button>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-group">
        <button class="btn" @click="showImportModal = true">📂 导入持仓</button>
        <button class="btn" @click="showSaveModal = true">🔒 加密保存</button>
        <button class="btn" @click="showLoadModal = true">🔓 解密加载</button>
        <button class="btn" @click="exportData">📤 导出 CSV</button>
      </div>
      <div class="toolbar-group">
        <button class="btn" @click="showAddModal = true">＋ 手动添加</button>
        <button class="btn" @click="showSettingsModal = true">⚙ 预警设置</button>
        <button class="btn btn-sm" @click="toggleAlwaysOnTop">{{ alwaysOnTop ? '📌 已置顶' : '📌 置顶' }}</button>
      </div>
    </div>

    <!-- 预警条 -->
    <div v-if="store.alerts.length > 0" style="border-bottom: 1px solid var(--border-subtle);">
      <div v-for="(a, i) in store.alerts" :key="i"
        :class="['alert-bar', a.type === 'concentration' ? 'warning' : a.type]">
        <span>{{ a.type === 'up' ? '📈' : a.type === 'down' ? '📉' : '⚠️' }}</span>
        <span>{{ a.message }}</span>
      </div>
    </div>

    <!-- 主布局：三栏 -->
    <div class="main-content">
      <!-- 左栏：资产总览 30% -->
      <div class="panel panel-left" style="width: 30%; min-width: 280px;">
        <div class="panel-header">📊 资产总览</div>
        <div class="panel-body">
          <AssetOverview />
        </div>
      </div>

      <!-- 中栏：持仓明细 45% -->
      <div class="panel panel-center" style="flex: 1; min-width: 400px;">
        <div class="panel-header">
          <span>📋 持仓明细 ({{ store.holdings.length }} 只)</span>
          <span style="font-size:11px;color:var(--text-muted);">点击表头排序</span>
        </div>
        <div class="panel-body" style="padding: 0;">
          <HoldingTable />
        </div>
      </div>

      <!-- 右栏：行业分布 + 预警 25% -->
      <div class="panel panel-right" style="width: 25%; min-width: 240px;">
        <div class="panel-header">🏭 行业分布</div>
        <div class="panel-body">
          <AllocationChart />
          <AlertPanel />
        </div>
      </div>
    </div>

    <!-- 导入模态框 -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal">
        <h3>📂 导入持仓文件</h3>
        <p style="color:var(--text-muted);font-size:12px;margin-bottom:12px;">
          支持东方财富、同花顺等券商导出的 CSV/Excel 文件。<br>
          自动识别表头：代码/名称/数量/成本价/现价/行业
        </p>
        <button class="btn btn-primary" @click="handleImport" style="width:100%;justify-content:center;">
          选择文件
        </button>
        <div v-if="store.importWarnings.length > 0" style="margin-top:12px;">
          <p v-for="(w, i) in store.importWarnings" :key="i"
            style="color:var(--warning-yellow);font-size:11px;">⚠ {{ w }}</p>
        </div>
        <div class="modal-actions">
          <button class="btn" @click="showImportModal = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 加密保存模态框 -->
    <div v-if="showSaveModal" class="modal-overlay" @click.self="showSaveModal = false">
      <div class="modal">
        <h3>🔒 加密保存</h3>
        <input type="password" v-model="savePassword" placeholder="设置加密密码" />
        <input type="password" v-model="savePasswordConfirm" placeholder="确认密码" />
        <div class="modal-actions">
          <button class="btn" @click="showSaveModal = false">取消</button>
          <button class="btn btn-primary" @click="handleSave">保存</button>
        </div>
      </div>
    </div>

    <!-- 解密加载模态框 -->
    <div v-if="showLoadModal" class="modal-overlay" @click.self="showLoadModal = false">
      <div class="modal">
        <h3>🔓 解密加载</h3>
        <input type="password" v-model="loadPassword" placeholder="输入密码" />
        <div class="modal-actions">
          <button class="btn" @click="showLoadModal = false">取消</button>
          <button class="btn btn-primary" @click="handleLoad">加载</button>
        </div>
      </div>
    </div>

    <!-- 手动添加模态框 -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal">
        <h3>＋ 手动添加持仓</h3>
        <input type="text" v-model="newHolding.code" placeholder="代码 (如 000001)" />
        <input type="text" v-model="newHolding.name" placeholder="名称 (如 平安银行)" />
        <input type="number" v-model="newHolding.quantity" placeholder="持仓数量" />
        <input type="number" v-model="newHolding.costPrice" placeholder="成本价" step="0.001" />
        <input type="number" v-model="newHolding.currentPrice" placeholder="现价" step="0.001" />
        <input type="text" v-model="newHolding.industry" placeholder="行业 (如 银行)" />
        <div class="modal-actions">
          <button class="btn" @click="showAddModal = false">取消</button>
          <button class="btn btn-primary" @click="handleAdd">添加</button>
        </div>
      </div>
    </div>

    <!-- 设置模态框 -->
    <div v-if="showSettingsModal" class="modal-overlay" @click.self="showSettingsModal = false">
      <div class="modal">
        <h3>⚙ 预警设置</h3>
        <label style="color:var(--text-secondary);font-size:12px;">涨跌幅预警阈值 (%)</label>
        <input type="number" v-model.number="store.alertSettings.priceChangeThreshold" step="0.5" />
        <label style="color:var(--text-secondary);font-size:12px;">单只持仓占比上限 (%)</label>
        <input type="number" v-model.number="store.alertSettings.concentrationThreshold" step="1" />
        <div class="modal-actions">
          <button class="btn" @click="showSettingsModal = false">取消</button>
          <button class="btn btn-primary" @click="handleSaveSettings">保存设置</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { usePortfolioStore } from '@/stores/portfolio.js'
import AssetOverview from '@/components/AssetOverview.vue'
import HoldingTable from '@/components/HoldingTable.vue'
import AllocationChart from '@/components/AllocationChart.vue'
import AlertPanel from '@/components/AlertPanel.vue'

const store = usePortfolioStore()

// 模态框状态
const showImportModal = ref(false)
const showSaveModal = ref(false)
const showLoadModal = ref(false)
const showAddModal = ref(false)
const showSettingsModal = ref(false)
const savePassword = ref('')
const savePasswordConfirm = ref('')
const loadPassword = ref('')
const alwaysOnTop = ref(false)
const newHolding = reactive({ code: '', name: '', quantity: '', costPrice: '', currentPrice: '', industry: '' })

// 窗口控制
function minimize() { window.electronAPI?.minimize() }
async function toggleMaximize() { window.electronAPI?.maximize() }
function closeWindow() { window.electronAPI?.close() }
function toggleAlwaysOnTop() {
  alwaysOnTop.value = !alwaysOnTop.value
  window.electronAPI?.setAlwaysOnTop(alwaysOnTop.value)
}

// 导入
async function handleImport() {
  const filePath = await window.electronAPI?.openFile()
  if (!filePath) return
  const ext = filePath.toLowerCase().split('.').pop()
  try {
    let content
    if (ext === 'csv') {
      content = await window.electronAPI?.readFile(filePath)
    } else {
      const buffer = await window.electronAPI?.readBinaryFile(filePath)
      content = new Uint8Array(buffer)
    }
    await store.importFile(filePath, content)
    showImportModal.value = false
  } catch (e) {
    alert('导入失败: ' + e.message)
  }
}

// 加密保存
async function handleSave() {
  if (!savePassword.value) return alert('请输入密码')
  if (savePassword.value !== savePasswordConfirm.value) return alert('两次密码不一致')
  const data = store.encryptSave(savePassword.value)
  const filePath = await window.electronAPI?.saveFile('持仓数据.dat')
  if (!filePath) return
  await window.electronAPI?.writeFile(filePath, data)
  savePassword.value = ''
  savePasswordConfirm.value = ''
  showSaveModal.value = false
}

// 解密加载
async function handleLoad() {
  if (!loadPassword.value) return alert('请输入密码')
  const filePath = await window.electronAPI?.openFile()
  if (!filePath) return
  try {
    const data = await window.electronAPI?.readFile(filePath)
    store.decryptLoad(data, loadPassword.value)
    loadPassword.value = ''
    showLoadModal.value = false
  } catch (e) {
    alert('解密失败: ' + e.message)
  }
}

// 导出 CSV
async function exportData() {
  const csv = store.exportCSV()
  const filePath = await window.electronAPI?.saveFile('持仓快照.csv')
  if (!filePath) return
  await window.electronAPI?.writeFile(filePath, csv)
}

// 手动添加
function handleAdd() {
  store.addHolding({ ...newHolding })
  Object.keys(newHolding).forEach(k => newHolding[k] = '')
  showAddModal.value = false
  store.refreshAlerts()
}

// 保存设置
function handleSaveSettings() {
  store.refreshAlerts()
  showSettingsModal.value = false
}
</script>
