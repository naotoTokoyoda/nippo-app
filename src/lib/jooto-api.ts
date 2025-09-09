/**
 * Jooto API呼び出し用ユーティリティ関数
 */

import { JootoSearchResponse, JootoTask, WorkNumberSearchResult } from '@/types/jooto';

// Jooto API設定
const JOOTO_CONFIG = {
  apiKey: process.env.JOOTO_API_KEY || '506ccea5e3fbf13c9bde60ea61d00935',
  boardId: process.env.JOOTO_BOARD_ID || '1207054',
  baseUrl: 'https://api.jooto.com'
};

/**
 * Jooto APIでタスクを検索する
 * @param searchQuery 検索クエリ（工番など）
 * @returns 検索結果
 */
export async function searchJootoTasks(searchQuery: string): Promise<JootoSearchResponse> {
  try {
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

    const data: JootoSearchResponse = await response.json();
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
    for (const task of searchResults.tasks) {
      const result = extractWorkInfoFromTask(task, workNumber);
      if (result) {
        results.push(result);
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
    // タスクタイトルから客先名と作業名称を抽出
    // 例: "TMT 6028-14105 プローブホルダー 長さ160"
    // または: "客先名 工番 作業名称"
    const title = task.title.trim();
    
    // 工番が含まれているかチェック
    if (!title.includes(workNumber)) {
      return null;
    }

    // タスクタイトルを空白で分割
    const parts = title.split(/\s+/);
    
    if (parts.length < 3) {
      return null;
    }

    // 基本的なパターン: [客先名] [工番] [作業名称...]
    let customerName = '';
    let workName = '';
    let workNumberIndex = -1;

    // 工番の位置を特定
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].includes(workNumber)) {
        workNumberIndex = i;
        break;
      }
    }

    if (workNumberIndex === -1) {
      return null;
    }

    // 客先名（工番より前の部分）
    if (workNumberIndex > 0) {
      customerName = parts.slice(0, workNumberIndex).join(' ');
    }

    // 作業名称（工番より後の部分）
    if (workNumberIndex < parts.length - 1) {
      workName = parts.slice(workNumberIndex + 1).join(' ');
    }

    // 最低限の情報が揃っている場合のみ返す
    if (customerName || workName) {
      return {
        workNumber: workNumber,
        customerName: customerName || '',
        workName: workName || '',
        taskId: task.id
      };
    }

    return null;
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
