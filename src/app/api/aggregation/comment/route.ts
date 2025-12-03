import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// コメント追加のバリデーションスキーマ
const createCommentSchema = z.object({
  workOrderId: z.string(),
  amount: z.number().int(),
  reason: z.string().max(200),
  memo: z.string().max(500).optional(),
  userId: z.string(), // 本番ではセッションから取得
});

/**
 * 最終決定金額のコメント追加
 * POST /api/aggregation/comment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createCommentSchema.parse(body);

    // ユーザーIDの存在確認
    const userExists = await prisma.user.findUnique({
      where: { id: validated.userId },
    });

    // ユーザーが存在しない場合はシステムユーザーを取得または作成
    let effectiveUserId = validated.userId;
    if (!userExists) {
      const systemUser = await prisma.user.findFirst({
        where: { name: 'システム' },
      });
      
      if (systemUser) {
        effectiveUserId = systemUser.id;
      } else {
        // システムユーザーを作成
        const newSystemUser = await prisma.user.create({
          data: { name: 'システム' },
        });
        effectiveUserId = newSystemUser.id;
      }
    }

    // コメント（Adjustment）を作成
    const comment = await prisma.adjustment.create({
      data: {
        workOrderId: validated.workOrderId,
        type: 'final_decision_change',
        amount: validated.amount,
        reason: validated.reason,
        memo: validated.memo || '',
        createdBy: effectiveUserId,
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
      comment,
    });
  } catch (error) {
    console.error('Error creating comment:', error);

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
        error: 'コメントの追加に失敗しました',
      },
      { status: 500 }
    );
  }
}

