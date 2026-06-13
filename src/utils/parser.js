import Papa from 'papaparse'
import * as XLSX from 'xlsx'

/**
 * 表头映射：支持的主流券商导出格式
 * 键为可能的表头名（小写），值为标准字段名
 */
const HEADER_MAP = {
  // 代码
  '代码': 'code', '证券代码': 'code', '股票代码': 'code', '基金代码': 'code',
  'code': 'code', 'symbol': 'code',
  // 名称
  '名称': 'name', '证券名称': 'name', '股票名称': 'name', '基金名称': 'name',
  'name': 'name',
  // 数量
  '持仓数量': 'quantity', '数量': 'quantity', '股数': 'quantity', '份额': 'quantity',
  'quantity': 'quantity', 'shares': 'quantity',
  // 成本价
  '成本价': 'costPrice', '成本': 'costPrice', '持仓成本': 'costPrice', '买入均价': 'costPrice',
  'cost': 'costPrice', 'cost_price': 'costPrice',
  // 现价
  '现价': 'currentPrice', '最新价': 'currentPrice', '当前价': 'currentPrice', '收盘价': 'currentPrice',
  'price': 'currentPrice', 'current_price': 'currentPrice',
  // 行业
  '行业': 'industry', '板块': 'industry', '所属行业': 'industry', '行业分类': 'industry',
  'industry': 'industry', 'sector': 'industry'
}

const STANDARD_FIELDS = ['code', 'name', 'quantity', 'costPrice', 'currentPrice', 'industry']

/**
 * 根据表头映射标准化字段名
 */
function normalizeHeaders(headers) {
  const mapping = {}
  const unmapped = []

  for (const h of headers) {
    const trimmed = h.trim()
    const key = HEADER_MAP[trimmed] || HEADER_MAP[trimmed.toLowerCase()]
    if (key) {
      mapping[trimmed] = key
    } else {
      unmapped.push(trimmed)
    }
  }

  return { mapping, unmapped }
}

/**
 * 标准化一行数据
 */
function normalizeRow(row, mapping) {
  const normalized = {}
  for (const [originalKey, value] of Object.entries(row)) {
    const standardKey = mapping[originalKey.trim()]
    if (standardKey) {
      const numVal = parseFloat(value)
      if (['quantity', 'costPrice', 'currentPrice'].includes(standardKey)) {
        normalized[standardKey] = isNaN(numVal) ? 0 : numVal
      } else {
        normalized[standardKey] = String(value || '').trim()
      }
    }
  }
  // 补充缺失字段的默认值
  for (const field of STANDARD_FIELDS) {
    if (!(field in normalized)) {
      normalized[field] = field === 'industry' ? '其他' : (field === 'name' ? '' : 0)
    }
  }
  return normalized
}

/**
 * 解析 CSV 文件
 * @returns {{ holdings: array, unmappedColumns: array, errors: array }}
 */
export function parseCSV(content) {
  return new Promise((resolve) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete(results) {
        if (results.errors.length > 0) {
          resolve({ holdings: [], unmappedColumns: [], errors: results.errors })
          return
        }

        const headers = results.meta.fields || []
        const { mapping, unmapped } = normalizeHeaders(headers)
        const holdings = results.data
          .map(row => normalizeRow(row, mapping))
          .filter(h => h.code || h.name) // 过滤空行

        // 找到映射的列
        const mappedColumns = Object.keys(mapping)
        resolve({ holdings, unmappedColumns: unmapped, mappedColumns, errors: [] })
      },
      error(err) {
        resolve({ holdings: [], unmappedColumns: [], errors: [err.message] })
      }
    })
  })
}

/**
 * 解析 Excel 文件（.xlsx / .xls）
 * 取第一个 sheet
 */
export function parseExcel(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (rows.length === 0) {
      return { holdings: [], unmappedColumns: [], errors: ['Excel 文件为空'] }
    }

    const headers = Object.keys(rows[0])
    const { mapping, unmapped } = normalizeHeaders(headers)
    const holdings = rows
      .map(row => normalizeRow(row, mapping))
      .filter(h => h.code || h.name)

    return { holdings, unmappedColumns: unmapped, mappedColumns: Object.keys(mapping), errors: [] }
  } catch (err) {
    return { holdings: [], unmappedColumns: [], errors: [err.message] }
  }
}

/**
 * 自动检测文件类型并解析
 * @param {string} filePath - 文件路径
 * @param {string|Buffer} content - 文件内容（CSV 为字符串，Excel 为 Buffer）
 */
export async function parseFile(filePath, content) {
  const ext = filePath.toLowerCase().split('.').pop()
  if (ext === 'csv') {
    return parseCSV(content)
  } else if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(content)
  }
  return { holdings: [], unmappedColumns: [], errors: [`不支持的文件格式: .${ext}`] }
}

/**
 * 将持仓数据导出为 CSV 字符串
 */
export function exportToCSV(holdings) {
  const headers = ['代码', '名称', '持仓数量', '成本价', '现价', '行业', '持仓市值', '盈亏额', '盈亏比例', '占总资产比例']
  const rows = holdings.map(h => [
    h.code,
    h.name,
    h.quantity,
    h.costPrice.toFixed(3),
    h.currentPrice.toFixed(3),
    h.industry,
    (h.quantity * h.currentPrice).toFixed(2),
    ((h.currentPrice - h.costPrice) * h.quantity).toFixed(2),
    (h.costPrice > 0 ? ((h.currentPrice - h.costPrice) / h.costPrice * 100).toFixed(2) : '0.00') + '%',
    '0.00%' // 占比在导出时填入
  ])
  return Papa.unparse({ fields: headers, data: rows })
}
