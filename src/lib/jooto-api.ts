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
    console.log(`[Jooto] Searching for: "${searchQuery}"`);
    
    // 環境変数の確認
    if (!JOOTO_CONFIG.apiKey) {
      console.warn('[Jooto] JOOTO_API_KEY environment variable is not set - returning empty result');
      return { tasks: [], total: 0, page: 1, per_page: 20, total_pages: 0 };
    }
    if (!JOOTO_CONFIG.boardId) {
      console.warn('[Jooto] JOOTO_BOARD_ID environment variable is not set - returning empty result');
      return { tasks: [], total: 0, page: 1, per_page: 20, total_pages: 0 };
    }

    const url = `${JOOTO_CONFIG.baseUrl}/v1/boards/${JOOTO_CONFIG.boardId}/search`;
    const params = new URLSearchParams({
      search_query: searchQuery
    });

    console.log(`[Jooto] API URL: ${url}?${params}`);

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'X-Jooto-Api-Key': JOOTO_CONFIG.apiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log(`[Jooto] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Jooto] API error response: ${errorText}`);
      throw new Error(`Jooto API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Jooto] Found ${data.tasks?.length || 0} tasks`);
    return data;
  } catch (error) {
    console.error('[Jooto] API search error:', error);
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
 * 特定のリストのタスク一覧を取得する
 * @param listId リストID
 * @returns タスク一覧
 */
export async function getJootoTasksByListId(listId: string): Promise<JootoTask[]> {
  try {
    // 環境変数の確認
    if (!JOOTO_CONFIG.apiKey) {
      console.warn('JOOTO_API_KEY environment variable is not set - returning empty array');
      return [];
    }
    if (!JOOTO_CONFIG.boardId) {
      console.warn('JOOTO_BOARD_ID environment variable is not set - returning empty array');
      return [];
    }

    // 全タスクを取得（list_idパラメータは存在しないため）
    const url = `${JOOTO_CONFIG.baseUrl}/v1/boards/${JOOTO_CONFIG.boardId}/tasks`;
    const params = new URLSearchParams({
      per_page: '100',
      archived: 'false' // アーカイブされていないタスクのみ取得
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
    const allTasks = data.tasks || [];

    // クライアント側で指定されたlist_idのタスクのみフィルタリング
    const filteredTasks = allTasks.filter(task => 
      task.list_id && task.list_id.toString() === listId
    );

    return filteredTasks;
  } catch (error) {
    console.error('Jooto tasks by list ID error:', error);
    throw error;
  }
}

/**
 * 納品済みリストのタスクを取得し、工番情報を抽出する
 * @returns 工番情報の配列
 */
export async function getDeliveredTasks(): Promise<WorkNumberSearchResult[]> {
  try {
    const deliveredListId = process.env.JOOTO_DELIVERED_LIST_ID;
    if (!deliveredListId) {
      console.warn('JOOTO_DELIVERED_LIST_ID environment variable is not set - returning empty array');
      return [];
    }

    const tasks = await getJootoTasksByListId(deliveredListId);
    const results: WorkNumberSearchResult[] = [];

    // 各タスクから工番情報を抽出
    for (const task of tasks) {
      // タスク名から工番を抽出
      const workNumberMatch = task.name.match(/(\d{4})-?([^\s]+)/);
      if (workNumberMatch) {
        const [, frontNumber, backNumber] = workNumberMatch;
        const workNumber = `${frontNumber}-${backNumber}`;
        
        const result = extractWorkInfoFromTask(task, workNumber);
        if (result) {
          results.push(result);
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Get delivered tasks error:', error);
    return [];
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

/**
 * Jootoタスクを別のリストに移動する
 */
export async function moveJootoTask(taskId: string, listId: string): Promise<void> {
  try {
    if (!JOOTO_CONFIG.apiKey) {
      console.warn('JOOTO_API_KEY environment variable is not set - skipping task move');
      return;
    }
    if (!JOOTO_CONFIG.boardId) {
      console.warn('JOOTO_BOARD_ID environment variable is not set - skipping task move');
      return;
    }

    const url = `https://api.jooto.com/v1/tasks/${taskId}/move`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'X-Jooto-Api-Key': JOOTO_CONFIG.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        board_id: parseInt(JOOTO_CONFIG.boardId),
        list_id: parseInt(listId),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jooto task move error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    console.log(`Successfully moved Jooto task ${taskId} to list ${listId}`);
  } catch (error) {
    console.error('Jooto task move error:', error);
    throw error;
  }
}
