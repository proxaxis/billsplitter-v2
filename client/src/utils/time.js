/**
 * UTC 時間を特定のタイムゾーンに変換する
 * @param {string|Date} time ISO 8601 形式の日時文字列
 * @param {number} offset タイムゾーンオフセット
 * @returns {Date} 変換後の日時
 */
export function toLocal(time, offset) {
  const base = new Date(time)
  if (Number.isNaN(base.getTime())) {
    return new Date('')
  }

  return new Date(base.getTime() + Number(offset || 0) * 60 * 60 * 1000)
}

/**
 * 特定のタイムゾーンを UTC 時間に変換する
 * @param {string|Date} time ISO 8601 形式の日時文字列
 * @param {number} offset タイムゾーンオフセット
 * @returns {Date} 変換後の日時
 */
export function toUTC(time, offset) {
  const base = new Date(time)
  if (Number.isNaN(base.getTime())) {
    return new Date('')
  }

  return new Date(base.getTime() - Number(offset || 0) * 60 * 60 * 1000)
}

/**
 * 現在の UTC 時間を ISO 8601 形式で取得する
 * @returns {string} 現在の UTC 時間
 */
export function getNowUTC() {
  return new Date().toISOString()
}

/**
 * 現在のローカル時間(時差適用後)を Date で取得する
 * @param {number} offset タイムゾーンオフセット
 * @returns {Date} 現在のローカル時間
 */
export function getNowLocal(offset) {
  return toLocal(new Date(), offset)
}

export default {
  toLocal,
  toUTC,
  getNowUTC,
  getNowLocal,
}
