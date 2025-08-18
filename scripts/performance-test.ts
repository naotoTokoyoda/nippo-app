import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// パフォーマンステストの設定
const TEST_CONFIG = {
  iterations: 10,
  filters: [
    { month: '2024-01' },
    { month: '2024-01', workerName: '橋本正朗' },
    { month: '2024-01', customerName: '株式会社テスト' },
    { month: '2024-01', machineType: 'MILLAC 1052 VII' },
    { month: '2024-01', workNumberFront: 'ABC123' },
  ]
};

// クエリ実行時間を測定する関数
async function measureQueryTime(queryFn: () => Promise<any>, description: string) {
  const startTime = Date.now();
  const result = await queryFn();
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  return {
    description,
    duration,
    resultCount: Array.isArray(result) ? result.length : 0,
  };
}

// 最適化前のクエリ（重複クエリ版）
async function oldQuery(filterParams: any) {
  const { month, workerName, customerName, workNumberFront, workNumberBack, machineType } = filterParams;
  
  // 日付フィルターの設定
  let dateFilter = {};
  if (month) {
    const [year, monthNum] = month.split('-');
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0);
    
    dateFilter = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };
  }

  // 作業者フィルターの設定
  let workerFilter = {};
  if (workerName) {
    workerFilter = {
      worker: {
        name: workerName,
      },
    };
  }

  // レポートデータを取得
  const reports = await prisma.report.findMany({
    where: {
      ...dateFilter,
      ...workerFilter,
    },
    include: {
      worker: true,
      reportItems: {
        include: {
          customer: true,
          workOrder: true,
          machine: true,
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  // フィルタリングされたレポートアイテムを取得
  const filteredReportItems = await prisma.reportItem.findMany({
    where: {
      report: {
        ...dateFilter,
        ...workerFilter,
      },
      ...(customerName && {
        customer: {
          name: {
            contains: customerName,
            mode: 'insensitive',
          },
        },
      }),
      ...(workNumberFront && {
        workOrder: {
          frontNumber: workNumberFront,
        },
      }),
      ...(workNumberBack && {
        workOrder: {
          backNumber: {
            contains: workNumberBack,
            mode: 'insensitive',
          },
        },
      }),
      ...(machineType && {
        machine: {
          category: machineType,
        },
      }),
    },
    include: {
      report: {
        include: {
          worker: true,
        },
      },
      customer: true,
      workOrder: true,
      machine: true,
    },
    orderBy: {
      report: {
        date: 'desc',
      },
    },
  });

  return filteredReportItems;
}

// 最適化後のクエリ（単一クエリ版）
async function newQuery(filterParams: any) {
  const { month, workerName, customerName, workNumberFront, workNumberBack, machineType } = filterParams;
  
  // 日付フィルターの設定
  let dateFilter = {};
  if (month) {
    const [year, monthNum] = month.split('-');
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0);
    
    dateFilter = {
      report: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    };
  }

  // 作業者フィルターの設定
  let workerFilter = {};
  if (workerName) {
    workerFilter = {
      report: {
        worker: {
          name: workerName,
        },
      },
    };
  }

  // 単一の最適化されたクエリでデータを取得
  const reportItems = await prisma.reportItem.findMany({
    where: {
      ...dateFilter,
      ...workerFilter,
      ...(customerName && {
        customer: {
          name: {
            contains: customerName,
            mode: 'insensitive',
          },
        },
      }),
      ...(workNumberFront && {
        workOrder: {
          frontNumber: workNumberFront,
        },
      }),
      ...(workNumberBack && {
        workOrder: {
          backNumber: {
            contains: workNumberBack,
            mode: 'insensitive',
          },
        },
      }),
      ...(machineType && {
        machine: {
          category: machineType,
        },
      }),
    },
    select: {
      id: true,
      reportId: true,
      startTime: true,
      endTime: true,
      workStatus: true,
      remarks: true,
      report: {
        select: {
          date: true,
          worker: {
            select: {
              name: true,
            },
          },
        },
      },
      customer: {
        select: {
          name: true,
        },
      },
      workOrder: {
        select: {
          frontNumber: true,
          backNumber: true,
          description: true,
        },
      },
      machine: {
        select: {
          category: true,
        },
      },
    },
    orderBy: {
      report: {
        date: 'desc',
      },
    },
  });

  return reportItems;
}

// パフォーマンステスト実行
async function runPerformanceTest() {
  console.log('🚀 パフォーマンステストを開始します...\n');
  
  const results = {
    old: [] as any[],
    new: [] as any[],
  };
  
  for (const filter of TEST_CONFIG.filters) {
    console.log(`📊 フィルター条件: ${JSON.stringify(filter)}`);
    
    // 古いクエリのテスト
    const oldResults = [];
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
      const result = await measureQueryTime(
        () => oldQuery(filter),
        `古いクエリ (${i + 1}/${TEST_CONFIG.iterations})`
      );
      oldResults.push(result);
    }
    
    // 新しいクエリのテスト
    const newResults = [];
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
      const result = await measureQueryTime(
        () => newQuery(filter),
        `新しいクエリ (${i + 1}/${TEST_CONFIG.iterations})`
      );
      newResults.push(result);
    }
    
    // 結果を集計
    const oldAvg = oldResults.reduce((sum, r) => sum + r.duration, 0) / oldResults.length;
    const newAvg = newResults.reduce((sum, r) => sum + r.duration, 0) / newResults.length;
    const improvement = ((oldAvg - newAvg) / oldAvg * 100).toFixed(1);
    
    console.log(`  古いクエリ平均: ${oldAvg.toFixed(0)}ms`);
    console.log(`  新しいクエリ平均: ${newAvg.toFixed(0)}ms`);
    console.log(`  改善率: ${improvement}%\n`);
    
    results.old.push({ filter, avg: oldAvg, results: oldResults });
    results.new.push({ filter, avg: newAvg, results: newResults });
  }
  
  // 全体の統計
  const totalOldAvg = results.old.reduce((sum, r) => sum + r.avg, 0) / results.old.length;
  const totalNewAvg = results.new.reduce((sum, r) => sum + r.avg, 0) / results.new.length;
  const totalImprovement = ((totalOldAvg - totalNewAvg) / totalOldAvg * 100).toFixed(1);
  
  console.log('📈 全体統計:');
  console.log(`  古いクエリ全体平均: ${totalOldAvg.toFixed(0)}ms`);
  console.log(`  新しいクエリ全体平均: ${totalNewAvg.toFixed(0)}ms`);
  console.log(`  全体改善率: ${totalImprovement}%`);
  
  return results;
}

// スクリプト実行
if (require.main === module) {
  runPerformanceTest()
    .then(() => {
      console.log('\n✅ パフォーマンステストが完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラーが発生しました:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

export { runPerformanceTest };
