import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function previewMigration() {
  console.log('🔍 データ移行プレビューを表示します...\n');

  console.log('📈 現在のデータベース状態:');
  console.log('データベースに接続して現在の状態を確認します...\n');

  // データベース接続テスト
  prisma.$connect()
    .then(async () => {
      try {
        const userCount = await prisma.user.count();
        const customerCount = await prisma.customer.count();
        const machineCount = await prisma.machine.count();
        const workOrderCount = await prisma.workOrder.count();
        const reportCount = await prisma.report.count();
        const reportItemCount = await prisma.reportItem.count();

        console.log(`📝 作業者: ${userCount}件`);
        console.log(`🏢 客先: ${customerCount}件`);
        console.log(`🔧 機械: ${machineCount}件`);
        console.log(`📋 工番: ${workOrderCount}件`);
        console.log(`📊 日報: ${reportCount}件`);
        console.log(`📋 日報項目: ${reportItemCount}件`);

        if (userCount === 0 && customerCount === 0 && machineCount === 0 && workOrderCount === 0) {
          console.log('\n⚠️  データベースにマスターデータが存在しません。');
          console.log('まず、マスターデータ（作業者、客先、機械、工番）を追加してください。');
        } else {
          console.log('\n✅ データベースにマスターデータが存在します。');
          console.log('スプレッドシートデータのインポートが可能です。');
        }

        console.log('\n💡 次のステップ:');
        console.log('1. データ移行ツール (/data-migration) にアクセス');
        console.log('2. CSVファイルをアップロードまたはデータを直接入力');
        console.log('3. データをインポート');

      } catch (error: unknown) {
        console.error('❌ データベース接続エラー:', error);
        console.log('\n💡 解決方法:');
        console.log('1. .env.localファイルを作成し、DATABASE_URLを設定してください');
        console.log('2. npm run db:push でスキーマをプッシュしてください');
      } finally {
        await prisma.$disconnect();
      }
    })
    .catch((error: unknown) => {
      console.error('❌ データベース接続エラー:', error);
      console.log('\n💡 解決方法:');
      console.log('1. .env.localファイルを作成し、DATABASE_URLを設定してください');
      console.log('2. npm run db:push でスキーマをプッシュしてください');
    });
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  previewMigration();
}

export { previewMigration };
