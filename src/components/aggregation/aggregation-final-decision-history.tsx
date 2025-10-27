'use client';

import { useState } from 'react';
import { AggregationAdjustment } from '@/types/aggregation';
import { canEditComment, canDeleteComment, type User } from '@/lib/auth/permissions';
import { useToast } from '@/components/ToastProvider';

interface AggregationFinalDecisionHistoryProps {
  workOrderId: string;
  currentAmount: number | null | undefined;
  comments: AggregationAdjustment[];
  formatCurrency: (amount: number) => string;
  onRefresh: () => Promise<void>;
  // 本番ではセッションから取得する想定だが、今は仮で渡す
  currentUser: User;
}

export default function AggregationFinalDecisionHistory({
  workOrderId,
  currentAmount,
  comments,
  formatCurrency,
  onRefresh,
  currentUser,
}: AggregationFinalDecisionHistoryProps) {
  const { showToast } = useToast();
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingMemo, setEditingMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 最終決定金額関連のコメントのみフィルタリング（削除されていないもの）
  const finalDecisionComments = comments.filter(
    (c) => c.type === 'final_decision_change' && !c.isDeleted
  );

  // 日時フォーマット
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // コメント追加
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      showToast('コメントを入力してください', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/aggregation/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workOrderId,
          amount: currentAmount || 0,
          reason: 'コメント追加',
          memo: newComment,
          userId: currentUser.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'コメントの追加に失敗しました');
      }

      showToast('コメントを追加しました', 'success');
      setNewComment('');
      await onRefresh();
    } catch (error) {
      console.error('Error adding comment:', error);
      const message = error instanceof Error ? error.message : 'コメントの追加に失敗しました';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // コメント編集開始
  const handleEditStart = (comment: AggregationAdjustment) => {
    setEditingCommentId(comment.id);
    setEditingMemo(comment.memo || '');
  };

  // コメント編集キャンセル
  const handleEditCancel = () => {
    setEditingCommentId(null);
    setEditingMemo('');
  };

  // コメント編集保存
  const handleEditSave = async (commentId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/aggregation/comment/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memo: editingMemo,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'コメントの更新に失敗しました');
      }

      showToast('コメントを更新しました', 'success');
      setEditingCommentId(null);
      setEditingMemo('');
      await onRefresh();
    } catch (error) {
      console.error('Error updating comment:', error);
      const message = error instanceof Error ? error.message : 'コメントの更新に失敗しました';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // コメント削除
  const handleDelete = async (comment: AggregationAdjustment) => {
    const isOwnComment = comment.createdBy === currentUser.id;
    const userName = comment.user?.name || '不明なユーザー';

    const message = isOwnComment
      ? 'このコメントを削除しますか？'
      : `${userName}さんのコメントを削除しますか？\n※管理者権限での削除操作です`;

    if (!confirm(message)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/aggregation/comment/${comment.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'コメントの削除に失敗しました');
      }

      showToast('コメントを削除しました', 'success');
      await onRefresh();
    } catch (error) {
      console.error('Error deleting comment:', error);
      const message = error instanceof Error ? error.message : 'コメントの削除に失敗しました';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="bg-purple-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-purple-900">最終決定金額の変更履歴</h3>
      </div>

      <div className="p-6">
        {finalDecisionComments.length > 0 ? (
          <div className="space-y-4 mb-6">
            {finalDecisionComments.map((comment) => {
              const isOwnComment = comment.createdBy === currentUser.id;
              const canEdit = canEditComment(comment, currentUser);
              const canDelete = canDeleteComment(comment, currentUser);
              const isEditing = editingCommentId === comment.id;

              return (
                <div
                  key={comment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {comment.user?.name || '不明なユーザー'}
                      </span>
                      {isOwnComment && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          あなた
                        </span>
                      )}
                      {currentUser.role === 'admin' && !isOwnComment && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                          👑 管理者として操作可能
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {comment.user?.role === 'admin' ? '(Admin)' : '(Manager)'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDateTime(comment.createdAt)}
                    </span>
                  </div>

                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      金額: ¥{formatCurrency(comment.amount)}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingMemo}
                        onChange={(e) => setEditingMemo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        rows={3}
                        maxLength={500}
                        disabled={isSubmitting}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSave(comment.id)}
                          disabled={isSubmitting}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleEditCancel}
                          disabled={isSubmitting}
                          className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 disabled:opacity-50"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {comment.memo || 'メモなし'}
                      </p>
                      <div className="mt-3 flex gap-2">
                        {canEdit && (
                          <button
                            onClick={() => handleEditStart(comment)}
                            disabled={isSubmitting}
                            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          >
                            編集
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(comment)}
                            disabled={isSubmitting}
                            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            削除
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {!isOwnComment && currentUser.role === 'admin' && (
                    <div className="mt-2 text-xs text-orange-600">
                      ⚠️ このコメントは{comment.user?.name || '不明なユーザー'}さんが作成したものです
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 mb-6 border border-dashed border-gray-300 rounded">
            まだコメントがありません
          </div>
        )}

        {/* コメント追加エリア */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            コメントを追加
          </label>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="コメントを入力..."
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
            rows={3}
            maxLength={500}
            disabled={isSubmitting}
          />
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {currentUser.name}
              <span className="text-xs ml-2">
                ({currentUser.role === 'admin' ? 'Admin' : 'Manager'})
              </span>
            </div>
            <button
              onClick={handleAddComment}
              disabled={isSubmitting || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '送信中...' : 'コメントを追加'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

