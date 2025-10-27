import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { canEditComment, canDeleteComment, type User } from '@/lib/auth/permissions';

// コメント更新のバリデーションスキーマ
const updateCommentSchema = z.object({
  memo: z.string().max(500),
  userId: z.string(), // 本番ではセッションから取得
  userName: z.string(),
  userRole: z.enum(['manager', 'admin']),
});

// コメント削除のバリデーションスキーマ
const deleteCommentSchema = z.object({
  userId: z.string(), // 本番ではセッションから取得
  userName: z.string(),
  userRole: z.enum(['manager', 'admin']),
});

/**
 * コメント更新
 * PATCH /api/aggregation/comment/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateCommentSchema.parse(body);

    // 現在のユーザー情報
    const currentUser: User = {
      id: validated.userId,
      name: validated.userName,
      role: validated.userRole,
    };

    // コメントを取得
    const comment = await prisma.adjustment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!comment) {
      return Response.json(
        { error: 'コメントが見つかりません' },
        { status: 404 }
      );
    }

    // 権限チェック
    const commentForCheck = {
      ...comment,
      memo: comment.memo || undefined,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt ? comment.updatedAt.toISOString() : undefined,
      deletedAt: comment.deletedAt?.toISOString(),
      deletedBy: comment.deletedBy || undefined,
    };
    if (!canEditComment(commentForCheck, currentUser)) {
      return Response.json(
        { error: '編集権限がありません' },
        { status: 403 }
      );
    }

    // コメントを更新
    const updated = await prisma.adjustment.update({
      where: { id },
      data: {
        memo: validated.memo,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return Response.json({
      success: true,
      comment: updated,
    });
  } catch (error) {
    console.error('Error updating comment:', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: 'バリデーションエラー',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        error: 'コメントの更新に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * コメント削除（論理削除）
 * DELETE /api/aggregation/comment/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = deleteCommentSchema.parse(body);

    // 現在のユーザー情報
    const currentUser: User = {
      id: validated.userId,
      name: validated.userName,
      role: validated.userRole,
    };

    // コメントを取得
    const comment = await prisma.adjustment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!comment) {
      return Response.json(
        { error: 'コメントが見つかりません' },
        { status: 404 }
      );
    }

    // 権限チェック
    const commentForCheck = {
      ...comment,
      memo: comment.memo || undefined,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt ? comment.updatedAt.toISOString() : undefined,
      deletedAt: comment.deletedAt?.toISOString(),
      deletedBy: comment.deletedBy || undefined,
    };
    if (!canDeleteComment(commentForCheck, currentUser)) {
      return Response.json(
        { error: '削除権限がありません' },
        { status: 403 }
      );
    }

    // 論理削除
    const deleted = await prisma.adjustment.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: validated.userId,
        deletedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        deletedUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return Response.json({
      success: true,
      comment: deleted,
    });
  } catch (error) {
    console.error('Error deleting comment:', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: 'バリデーションエラー',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        error: 'コメントの削除に失敗しました',
      },
      { status: 500 }
    );
  }
}

