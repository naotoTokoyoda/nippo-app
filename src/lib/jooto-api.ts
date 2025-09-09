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

    const data = await response.json();
    
    // デバッグ用: 開発環境でのみレスポンス構造をログ出力
    if (process.env.NODE_ENV === 'development') {
      console.log('Jooto API Response:', JSON.stringify(data, null, 2));
    }
    
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
    } else {
      console.log('No tasks found in search results:', searchResults);
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
      console.log('No valid name found in task:', task);
      return null;
    }
    
    // 工番が含まれているかチェック（nameまたはdescriptionに含まれている場合）
    if (!taskName.includes(workNumber) && !taskDescription.includes(workNumber)) {
      return null;
    }

    // タスク名をパース（例: "TMT　6028-14105" -> 客先名: "TMT", 工番: "6028-14105"）
    const nameParts = taskName.trim().split(/\s+/);
    
    let customerName = '';
    const workName = taskDescription.trim(); // descriptionを作業名称として使用
    let workNumberIndex = -1;

    // 工番の位置を特定
    for (let i = 0; i < nameParts.length; i++) {
      if (nameParts[i].includes(workNumber)) {
        workNumberIndex = i;
        break;
      }
    }

    // 客先名を抽出（工番より前の部分）
    if (workNumberIndex > 0) {
      customerName = nameParts.slice(0, workNumberIndex).join(' ');
    } else if (workNumberIndex === -1 && nameParts.length > 0) {
      // 工番がdescriptionにある場合、name全体を客先名として扱う
      customerName = taskName.trim();
    }

    // カテゴリ情報も活用（機械種類として）
    const machineTypes = task.categories?.map(cat => cat.name).join(', ') || '';

    // デバッグ用: 開発環境でのみ抽出情報をログ出力
    if (process.env.NODE_ENV === 'development') {
      console.log('Extracted info:', {
        customerName,
        workName,
        workNumber,
        machineTypes,
        originalName: taskName,
        originalDescription: taskDescription
      });
    }

    return {
      workNumber: workNumber,
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
