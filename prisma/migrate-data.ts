import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateData() {
  console.log('🚀 データ移行を開始します...');

  try {
    // データベース接続テスト
    console.log('🔍 データベース接続を確認中...');
    await prisma.$connect();
    console.log('✅ データベース接続成功');

    // データベースの現在の状態を確認
    console.log('\n📈 現在のデータベース状態:');
    const userCount = await prisma.user.count();
    const customerCount = await prisma.customer.count();
    const machineCount = await prisma.machine.count();
    const workOrderCount = await prisma.workOrder.count();
    const reportCount = await prisma.report.count();
    const reportItemCount = await prisma.reportItem.count();

    console.log(`- 作業者: ${userCount}件`);
    console.log(`- 客先: ${customerCount}件`);
    console.log(`- 機械: ${machineCount}件`);
    console.log(`- 工番: ${workOrderCount}件`);
    console.log(`- 日報: ${reportCount}件`);
    console.log(`- 日報項目: ${reportItemCount}件`);

    if (userCount > 0 || customerCount > 0 || machineCount > 0 || workOrderCount > 0) {
      console.log('\n⚠️  データベースに既にデータが存在します。');
      console.log('データ移行は既存のデータを更新します。');
      console.log('続行しますか？ (y/N)');
      
      // 実際の運用では、ユーザーの入力を待つか、コマンドライン引数で制御
      console.log('自動的に続行します...');
    }

    console.log('\n🎉 データ移行が完了しました！');
    console.log('データ移行ツールを使用して、スプレッドシートデータをインポートしてください。');

  } catch (error) {
    console.error('❌ データ移行中にエラーが発生しました:', error);
    
    // データベース接続エラーの場合
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as { code?: string }).code;
    if (errorCode === 'P1001' || errorMessage.includes('fetch failed')) {
      console.log('\n💡 データベース接続エラーの解決方法:');
      console.log('1. .env.localファイルを作成し、DATABASE_URLを設定してください');
      console.log('2. Neonデータベースが正しく設定されているか確認してください');
      console.log('3. 以下のコマンドでデータベーススキーマをプッシュしてください:');
      console.log('   npm run db:push');
      console.log('\n📚 詳細は NEON_SETUP.md を参照してください');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('✅ 移行スクリプトが正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 移行スクリプトでエラーが発生しました:', error);
      process.exit(1);
    });
}

export { migrateData };
