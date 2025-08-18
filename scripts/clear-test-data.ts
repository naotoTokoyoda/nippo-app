import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearTestData() {
  console.log('🗑️ テストデータの削除を開始します...');
  
  try {
    // 外部キー制約があるため、削除順序に注意
    console.log('📋 作業項目を削除中...');
    await prisma.reportItem.deleteMany({});
    console.log('✅ 作業項目を削除しました');
    
    console.log('📊 日報を削除中...');
    await prisma.report.deleteMany({});
    console.log('✅ 日報を削除しました');
    
    console.log('🔧 工番を削除中...');
    await prisma.workOrder.deleteMany({});
    console.log('✅ 工番を削除しました');
    
    console.log('⚙️ 機械を削除中...');
    await prisma.machine.deleteMany({});
    console.log('✅ 機械を削除しました');
    
    console.log('🏢 客先を削除中...');
    await prisma.customer.deleteMany({});
    console.log('✅ 客先を削除しました');
    
    console.log('📝 作業者を削除中...');
    await prisma.user.deleteMany({});
    console.log('✅ 作業者を削除しました');
    
    console.log('\n🎉 すべてのテストデータを削除しました！');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
if (require.main === module) {
  clearTestData();
}

export { clearTestData };
