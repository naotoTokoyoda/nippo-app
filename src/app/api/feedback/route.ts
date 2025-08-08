import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import FeedbackEmail from '@/emails/FeedbackEmail';
import { FeedbackData, FeedbackResponse } from '@/types/feedback';

// Resendインスタンスの初期化
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // リクエストボディの解析
    const body = await request.json();
    const { type, message, email, priority } = body;

    // 必須項目の検証
    if (!type || !message) {
      return NextResponse.json<FeedbackResponse>(
        { 
          success: false, 
          message: 'フィードバックの種類とメッセージは必須です',
          error: 'Missing required fields: type, message'
        },
        { status: 400 }
      );
    }

    // 自動収集情報の追加
    const userAgent = request.headers.get('user-agent') || undefined;
    const url = request.headers.get('referer') || request.url;
    const timestamp = new Date().toISOString();
    
    // アプリバージョンの取得（package.jsonから）
    const packageJson = await import('../../../../package.json');
    const appVersion = packageJson.version || 'unknown';

    // フィードバックデータの構築
    const feedbackData: FeedbackData = {
      type,
      message,
      email: email || undefined,
      priority: priority || undefined,
      userAgent,
      url,
      timestamp,
      appVersion,
    };

    // メール送信先の設定（環境変数から取得）
    const recipientEmail = process.env.FEEDBACK_RECIPIENT_EMAIL;
    if (!recipientEmail) {
      console.error('FEEDBACK_RECIPIENT_EMAIL environment variable is not set');
      return NextResponse.json<FeedbackResponse>(
        { 
          success: false, 
          message: 'サーバー設定エラーが発生しました',
          error: 'Recipient email not configured'
        },
        { status: 500 }
      );
    }

    // Resendを使用してメール送信
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
      to: [recipientEmail],
      subject: `【日報アプリ】${type === 'bug' ? 'バグ報告' : type === 'feature' ? '機能要望' : type === 'improvement' ? '改善提案' : type === 'ui' ? 'UI改善' : type === 'performance' ? 'パフォーマンス' : 'フィードバック'}`,
      react: FeedbackEmail({ feedback: feedbackData }),
      // 返信先をユーザーのメールアドレスに設定（提供されている場合）
      replyTo: email || undefined,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json<FeedbackResponse>(
        { 
          success: false, 
          message: 'メールの送信に失敗しました',
          error: error.message || 'Email sending failed'
        },
        { status: 500 }
      );
    }

    // 成功レスポンス
    console.log('Feedback email sent successfully:', data?.id);
    return NextResponse.json<FeedbackResponse>(
      { 
        success: true, 
        message: 'フィードバックを送信しました。ありがとうございます！'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json<FeedbackResponse>(
      { 
        success: false, 
        message: 'サーバーエラーが発生しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// プリフライトリクエスト対応
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
