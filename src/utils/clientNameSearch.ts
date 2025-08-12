/**
 * 客先名の検索結果を表す型
 */
export interface ClientNameSearchResult {
  name: string;
  matchType: 'exact' | 'partial' | 'fuzzy';
  relevance: number;
}

/**
 * 実際のデータベースの客先名を検索する
 * @param query 検索クエリ
 * @param availableNames 利用可能な客先名の配列
 * @param maxResults 最大結果数
 * @returns 検索結果の配列
 */
export function searchDatabaseClientNames(
  query: string, 
  availableNames: string[], 
  maxResults: number = 10
): ClientNameSearchResult[] {
  if (!query.trim() || availableNames.length === 0) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  const results: ClientNameSearchResult[] = [];

  for (const name of availableNames) {
    const normalizedName = name.toLowerCase();
    
    // 完全一致
    if (normalizedName === normalizedQuery) {
      results.push({
        name,
        matchType: 'exact',
        relevance: 100
      });
      continue;
    }

    // 部分一致（前方一致）
    if (normalizedName.startsWith(normalizedQuery)) {
      results.push({
        name,
        matchType: 'partial',
        relevance: 80 - (name.length - query.length)
      });
      continue;
    }

    // 部分一致（含む）
    if (normalizedName.includes(normalizedQuery)) {
      results.push({
        name,
        matchType: 'partial',
        relevance: 60 - (name.length - query.length)
      });
      continue;
    }

    // あいまい検索（文字の順序を考慮）
    if (isFuzzyMatch(normalizedName, normalizedQuery)) {
      results.push({
        name,
        matchType: 'fuzzy',
        relevance: 40 - (name.length - query.length)
      });
    }
  }

  // 関連性でソートして最大結果数を返す
  return results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults);
}

/**
 * あいまい検索の実装
 * @param text 検索対象のテキスト
 * @param query 検索クエリ
 * @returns マッチするかどうか
 */
function isFuzzyMatch(text: string, query: string): boolean {
  let queryIndex = 0;
  
  for (let i = 0; i < text.length && queryIndex < query.length; i++) {
    if (text[i] === query[queryIndex]) {
      queryIndex++;
    }
  }
  
  return queryIndex === query.length;
}



/**
 * 実際のデータベースの客先名の候補を取得する
 * @param input 入力値
 * @param availableNames 利用可能な客先名の配列
 * @param maxSuggestions 最大候補数
 * @returns 候補の配列
 */
export function getDatabaseClientNameSuggestions(
  input: string, 
  availableNames: string[], 
  maxSuggestions: number = 5
): string[] {
  const results = searchDatabaseClientNames(input, availableNames, maxSuggestions);
  return results.map(result => result.name);
}

 