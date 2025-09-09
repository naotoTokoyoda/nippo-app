/**
 * Jooto API呼び出し用ユーティリティ関数
 */

import { JootoSearchResponse, JootoTask, WorkNumberSearchResult } from '@/types/jooto';

// Jooto API設定
const JOOTO_CONFIG = {
  apiKey: process.env.JOOTO_API_KEY,
  boardId: process.env.JOOTO_BOARD_ID,
  baseUrl: 'https://api.jooto.com'
};

/**
 * Jooto APIでタスクを検索する
 * @param searchQuery 検索クエリ（工番など）
 * @returns 検索結果
 */
export async function searchJootoTasks(searchQuery: string): Promise<JootoSearchResponse> {
  try {
    // 環境変数の確認
    if (!JOOTO_CONFIG.apiKey) {
      throw new Error('JOOTO_API_KEY environment variable is not set');
    }
    if (!JOOTO_CONFIG.boardId) {
      throw new Error('JOOTO_BOARD_ID environment variable is not set');
    }

    const url = `${JOOTO_CONFIG.baseUrl}/v1/boards/${JOOTO_CONFIG.boardId}/search`;
    const params = new URLSearchParams({
      search_query: searchQuery
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'X-Jooto-Api-Key': JOOTO_CONFIG.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Jooto API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Jooto API search error:', error);
    throw error;
  }
}

/**
 * 工番から客先名・作業名称を抽出する
 * @param workNumber 工番
 * @returns 抽出結果
 */
export async function searchWorkNumberInfo(workNumber: string): Promise<WorkNumberSearchResult[]> {
  try {
    // 工番が空の場合は空の配列を返す
    if (!workNumber.trim()) {
      return [];
    }

    const searchResults = await searchJootoTasks(workNumber);
    const results: WorkNumberSearchResult[] = [];

    // 検索結果からタスク情報を抽出
    if (searchResults.tasks && Array.isArray(searchResults.tasks)) {
      for (const task of searchResults.tasks) {
        const result = extractWorkInfoFromTask(task, workNumber);
        if (result) {
          results.push(result);
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Work number search error:', error);
    return [];
  }
}

/**
 * タスクから工番情報を抽出する
 * @param task Jootoタスク
 * @param workNumber 検索した工番
 * @returns 抽出された情報
 */
function extractWorkInfoFromTask(task: JootoTask, workNumber: string): WorkNumberSearchResult | null {
  try {
    // タスク名（例: "TMT　6028-14105"）とdescription（例: "プローブホルダー　長さ160"）を取得
    const taskName = task.name || '';
    const taskDescription = task.description || '';
    
    if (!taskName || typeof taskName !== 'string') {
      return null;
    }
    
    // 工番が含まれているかチェック（nameまたはdescriptionに含まれている場合）
    if (!taskName.includes(workNumber) && !taskDescription.includes(workNumber)) {
      return null;
    }

    // タスク名をパース（例: "たつみ　6028-14051" -> 客先名: "たつみ", 前番: "6028", 後番: "14051"）
    let customerName = '';
    let workNumberFront = '';
    let workNumberBack = '';
    const workName = taskDescription.trim(); // descriptionを作業名称として使用

    // 工番パターンを検索（例: 6028-14051）
    const workNumberPattern = /(\d{4})-?(\d+)/;
    const match = taskName.match(workNumberPattern);

    if (match) {
      workNumberFront = match[1]; // 前番（例: 6028）
      workNumberBack = match[2];  // 後番（例: 14051）
      
      // 工番より前の部分を客先名として抽出
      const beforeWorkNumber = taskName.substring(0, taskName.indexOf(match[0])).trim();
      customerName = beforeWorkNumber.replace(/[　\s]+$/, ''); // 末尾の空白・全角空白を削除
    } else {
      // 工番パターンが見つからない場合、従来の方法でフォールバック
      const nameParts = taskName.trim().split(/\s+/);
      let workNumberIndex = -1;

      // 工番の位置を特定
      for (let i = 0; i < nameParts.length; i++) {
        if (nameParts[i].includes(workNumber)) {
          workNumberIndex = i;
          break;
        }
      }

      if (workNumberIndex > 0) {
        customerName = nameParts.slice(0, workNumberIndex).join(' ');
        // 工番を前番・後番に分離
        const fullWorkNumber = nameParts[workNumberIndex];
        const parts = fullWorkNumber.split('-');
        workNumberFront = parts[0] || '';
        workNumberBack = parts.slice(1).join('-') || fullWorkNumber;
      } else {
        customerName = taskName.trim();
        // 検索クエリから工番を推測
        const queryParts = workNumber.split('-');
        workNumberFront = queryParts[0] || '';
        workNumberBack = queryParts.slice(1).join('-') || workNumber;
      }
    }

    return {
      workNumber: `${workNumberFront}-${workNumberBack}`,
      workNumberFront: workNumberFront || '',
      workNumberBack: workNumberBack || '',
      customerName: customerName || '',
      workName: workName || '',
      taskId: task.id
    };
  } catch (error) {
    console.error('Task parsing error:', error);
    return null;
  }
}

/**
 * 組織情報を取得する（デバッグ用）
 */
export async function getJootoOrganization() {
  try {
    // 環境変数の確認
    if (!JOOTO_CONFIG.apiKey) {
      throw new Error('JOOTO_API_KEY environment variable is not set');
    }

    const response = await fetch(`${JOOTO_CONFIG.baseUrl}/v1/organization`, {
      method: 'GET',
      headers: {
        'X-Jooto-Api-Key': JOOTO_CONFIG.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Jooto API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Jooto organization API error:', error);
    throw error;
  }
}
