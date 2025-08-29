/**
 * テストデータクリアスクリプト
 * 
 * このスクリプトはデータベースから全てのデータを削除します。
 * 
 * 使用場面:
 * - 開発・テスト環境でのデータリセット
 * - E2Eテスト前の環境初期化
 * - デモ環境の準備
 * 
 * 注意事項:
 * - 本番環境では実行できません
 * - 削除されたデータは復元できません
 * - CI環境以外では10秒の確認待機があります
 * 
 * 実行方法:
 * npm run clear-test-data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearTestData() {
  try {
    // 環境チェック
    const environment = process.env.NODE_ENV;
    if (environment === 'production') {
      console.error('❌ 本番環境ではテストデータクリアは実行できません');
      process.exit(1);
    }

    console.log('🗑️ テストデータをクリアしています...');
    console.log(`📍 実行環境: ${environment || 'development'}`);
    
    // 確認プロンプト（CI環境以外）
    if (!process.env.CI) {
      console.log('⚠️  全てのデータが削除されます。続行しますか？');
      console.log('   続行するには CTRL+C で中断するか、10秒待機してください...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    // 外部キー制約を考慮した順序で削除

    // Adjustmentを削除（WorkOrderに依存）
    const deletedAdjustments = await prisma.adjustment.deleteMany();
    console.log(`✅ 調整履歴を削除しました: ${deletedAdjustments.count}件`);

    // ReportItemを削除（Report、WorkOrder、Customer、Machineに依存）
    const deletedReportItems = await prisma.reportItem.deleteMany();
    console.log(`✅ 作業項目を削除しました: ${deletedReportItems.count}件`);

    // Reportを削除（Userに依存）
    const deletedReports = await prisma.report.deleteMany();
    console.log(`✅ 日報を削除しました: ${deletedReports.count}件`);

    // WorkOrderを削除（Customerに依存）
    const deletedWorkOrders = await prisma.workOrder.deleteMany();
    console.log(`✅ 工番を削除しました: ${deletedWorkOrders.count}件`);

    // Rateを削除（独立テーブル）
    const deletedRates = await prisma.rate.deleteMany();
    console.log(`✅ 単価履歴を削除しました: ${deletedRates.count}件`);

    // Customerを削除
    const deletedCustomers = await prisma.customer.deleteMany();
    console.log(`✅ 顧客を削除しました: ${deletedCustomers.count}件`);

    // Machineを削除
    const deletedMachines = await prisma.machine.deleteMany();
    console.log(`✅ 機械を削除しました: ${deletedMachines.count}件`);

    // Userを削除
    const deletedUsers = await prisma.user.deleteMany();
    console.log(`✅ ユーザーを削除しました: ${deletedUsers.count}件`);

    console.log('🎉 テストデータのクリアが完了しました！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearTestData();
