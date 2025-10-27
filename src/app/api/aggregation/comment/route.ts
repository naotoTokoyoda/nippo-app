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

    // コメント（Adjustment）を作成
    const comment = await prisma.adjustment.create({
      data: {
        workOrderId: validated.workOrderId,
        type: 'final_decision_change',
        amount: validated.amount,
        reason: validated.reason,
        memo: validated.memo || '',
        createdBy: validated.userId,
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
          details: error.errors,
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

