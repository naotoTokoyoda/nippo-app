/**
 * 機械種類に基づく条件付き書式の判定
 * @param machineType 機械種類
 * @returns 強調表示するかどうか
 */
export function shouldHighlightMachine(machineType: string): boolean {
  if (!machineType) return false;
  
  // 「12尺」「正面盤」「1052」のいずれかが含まれているかチェック
  const highlightKeywords = ['12尺', '正面盤', '1052'];
  return highlightKeywords.some(keyword => machineType.includes(keyword));
}

/**
 * 客先名と工番（後番）に基づく条件付き書式の判定
 * @param customerName 客先名
 * @param workNumberBack 工番（後番）
 * @returns 灰色表示するかどうか
 */
export function shouldGrayOutCustomer(customerName: string, workNumberBack?: string): boolean {
  // 「クオール市原」の場合は灰色表示
  if (customerName && customerName.includes('クオール市原')) {
    return true;
  }
  
  // 工番（後番）が「なし」の場合は灰色表示
  if (workNumberBack === 'なし' || workNumberBack === '') {
    return true;
  }
  
  return false;
}

/**
 * 行の背景色クラスを取得
 * @param machineType 機械種類
 * @param customerName 客先名
 * @param workNumberBack 工番（後番）
 * @returns Tailwind CSSクラス名
 */
export function getRowBackgroundClass(machineType: string, customerName: string, workNumberBack?: string): string {
  if (shouldGrayOutCustomer(customerName, workNumberBack)) {
    return 'bg-gray-200'; // 灰色
  }
  
  if (shouldHighlightMachine(machineType)) {
    return 'bg-yellow-100'; // 明るい黄色
  }
  
  return 'bg-white'; // 通常の白色
} 