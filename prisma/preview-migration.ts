import { 
  WORKER_DATA, 
  CUSTOMER_DATA, 
  MACHINE_DATA, 
  WORK_ORDER_DATA, 
  SAMPLE_REPORTS,
  dataHelpers 
} from '../src/data/testData';

function previewMigration() {
  console.log('🔍 データ移行プレビューを表示します...\n');

  // 1. マスターデータの確認
  console.log('📝 作業者データ:');
  WORKER_DATA.forEach(worker => {
    console.log(`  - ${worker.id}: ${worker.name}`);
  });
  console.log(`  合計: ${WORKER_DATA.length}件\n`);

  console.log('🏢 客先データ:');
  CUSTOMER_DATA.forEach(customer => {
    console.log(`  - ${customer.id}: ${customer.name} (${customer.code})`);
  });
  console.log(`  合計: ${CUSTOMER_DATA.length}件\n`);

  console.log('🔧 機械データ:');
  MACHINE_DATA.forEach(machine => {
    console.log(`  - ${machine.id}: ${machine.name} (${machine.category})`);
  });
  console.log(`  合計: ${MACHINE_DATA.length}件\n`);

  console.log('📋 工番データ:');
  WORK_ORDER_DATA.forEach(workOrder => {
    const customer = CUSTOMER_DATA.find(c => c.id === workOrder.customerId);
    console.log(`  - ${workOrder.id}: ${workOrder.frontNumber}-${workOrder.backNumber} (${customer?.name}) - ${workOrder.description}`);
  });
  console.log(`  合計: ${WORK_ORDER_DATA.length}件\n`);

  // 2. 日報データの確認
  console.log('📊 日報データ:');
  let totalWorkItems = 0;
  SAMPLE_REPORTS.forEach((report, index) => {
    console.log(`  ${index + 1}. ${report.date} - ${report.workerName}`);
    console.log(`     作業項目数: ${report.workItems.length}件`);
    totalWorkItems += report.workItems.length;
    
    report.workItems.forEach((item, itemIndex) => {
      console.log(`     ${itemIndex + 1}. ${item.customerName} - ${item.workNumberFront}-${item.workNumberBack} - ${item.name}`);
      console.log(`         ${item.startTime} - ${item.endTime} (${item.machineType})`);
      
      // データ整合性チェック
      const workerId = dataHelpers.getWorkerId(report.workerName);
      const customerId = dataHelpers.getCustomerId(item.customerName);
      const workOrderId = dataHelpers.getWorkOrderId(item.workNumberFront, item.workNumberBack);
      const machineId = dataHelpers.getMachineId(item.machineType);
      
      if (!workerId) console.log(`        ⚠️  作業者 "${report.workerName}" が見つかりません`);
      if (!customerId) console.log(`        ⚠️  客先 "${item.customerName}" が見つかりません`);
      if (!workOrderId) console.log(`        ⚠️  工番 "${item.workNumberFront}-${item.workNumberBack}" が見つかりません`);
      if (!machineId) console.log(`        ⚠️  機械 "${item.machineType}" が見つかりません`);
    });
    console.log('');
  });

  console.log(`📈 移行予定データ統計:`);
  console.log(`  - 作業者: ${WORKER_DATA.length}件`);
  console.log(`  - 客先: ${CUSTOMER_DATA.length}件`);
  console.log(`  - 機械: ${MACHINE_DATA.length}件`);
  console.log(`  - 工番: ${WORK_ORDER_DATA.length}件`);
  console.log(`  - 日報: ${SAMPLE_REPORTS.length}件`);
  console.log(`  - 作業項目: ${totalWorkItems}件`);

  // 3. データ整合性チェック
  console.log('\n🔍 データ整合性チェック:');
  
  const missingWorkers = new Set<string>();
  const missingCustomers = new Set<string>();
  const missingWorkOrders = new Set<string>();
  const missingMachines = new Set<string>();

  SAMPLE_REPORTS.forEach(report => {
    if (!dataHelpers.getWorkerId(report.workerName)) {
      missingWorkers.add(report.workerName);
    }
    
    report.workItems.forEach(item => {
      if (!dataHelpers.getCustomerId(item.customerName)) {
        missingCustomers.add(item.customerName);
      }
      if (!dataHelpers.getWorkOrderId(item.workNumberFront, item.workNumberBack)) {
        missingWorkOrders.add(`${item.workNumberFront}-${item.workNumberBack}`);
      }
      if (!dataHelpers.getMachineId(item.machineType)) {
        missingMachines.add(item.machineType);
      }
    });
  });

  if (missingWorkers.size > 0) {
    console.log(`  ⚠️  見つからない作業者: ${Array.from(missingWorkers).join(', ')}`);
  }
  if (missingCustomers.size > 0) {
    console.log(`  ⚠️  見つからない客先: ${Array.from(missingCustomers).join(', ')}`);
  }
  if (missingWorkOrders.size > 0) {
    console.log(`  ⚠️  見つからない工番: ${Array.from(missingWorkOrders).join(', ')}`);
  }
  if (missingMachines.size > 0) {
    console.log(`  ⚠️  見つからない機械: ${Array.from(missingMachines).join(', ')}`);
  }

  if (missingWorkers.size === 0 && missingCustomers.size === 0 && 
      missingWorkOrders.size === 0 && missingMachines.size === 0) {
    console.log('  ✅ すべてのデータが整合しています');
  }

  console.log('\n💡 次のステップ:');
  console.log('1. データベース接続を設定 (.env.local)');
  console.log('2. npm run db:push でスキーマをプッシュ');
  console.log('3. npm run db:migrate-data でデータを移行');
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  previewMigration();
}

export { previewMigration };
