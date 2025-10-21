/**
 * 共通APIレスポンス型定義
 * 
 * Next.js基本原則に基づき、API レスポンスの型安全性と一貫性を確保
 */

/**
 * 成功レスポンス
 */
export type ApiSuccessResponse<T = unknown> = {
  success: true;
  data?: T;
  message?: string;
};

/**
 * エラーレスポンス
 */
export type ApiErrorResponse = {
  success: false;
  error: string;
  message?: string;
  details?: unknown;
};

/**
 * 統一APIレスポンス型
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * ページネーション情報
 */
export type PaginationInfo = {
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

/**
 * ページネーション付きレスポンス
 */
export type PaginatedResponse<T> = {
  success: true;
  data: T[];
  pagination: PaginationInfo;
  totalCount: number;
};

/**
 * リスト型レスポンス（ページネーションなし）
 */
export type ListResponse<T> = {
  success: true;
  items: T[];
  total: number;
};

/**
 * 型ガード: 成功レスポンスかどうかを判定
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * 型ガード: エラーレスポンスかどうかを判定
 */
export function isErrorResponse(
  response: ApiResponse<unknown>
): response is ApiErrorResponse {
  return response.success === false;
}

