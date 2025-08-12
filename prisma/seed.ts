import { PrismaClient } from '@prisma/client'
import { WORKER_DATA, CUSTOMER_DATA, MACHINE_DATA, WORK_ORDER_DATA } from '../src/data/testData'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 データベースシードを開始します...')

  // 作業者データの挿入
  console.log('👥 作業者データを挿入中...')
  for (const worker of WORKER_DATA) {
    await prisma.user.upsert({
      where: { id: worker.id },
      update: {},
      create: {
        id: worker.id,
        name: worker.name,
      },
    })
  }

  // 客先データの挿入
  console.log('🏢 客先データを挿入中...')
  for (const customer of CUSTOMER_DATA) {
    await prisma.customer.upsert({
      where: { id: customer.id },
      update: {},
      create: {
        id: customer.id,
        name: customer.name,
        code: customer.code,
      },
    })
  }

  // 機械種類データの挿入
  console.log('🔧 機械種類データを挿入中...')
  for (const machine of MACHINE_DATA) {
    await prisma.machine.upsert({
      where: { id: machine.id },
      update: {},
      create: {
        id: machine.id,
        name: machine.name,
        category: machine.category,
      },
    })
  }

  // 工番データの挿入
  console.log('📋 工番データを挿入中...')
  for (const workOrder of WORK_ORDER_DATA) {
    await prisma.workOrder.upsert({
      where: { id: workOrder.id },
      update: {},
      create: {
        id: workOrder.id,
        frontNumber: workOrder.frontNumber,
        backNumber: workOrder.backNumber,
        description: workOrder.description,
        customerId: workOrder.customerId,
      },
    })
  }

  console.log('✅ データベースシードが完了しました！')
}

main()
  .catch((e) => {
    console.error('❌ シードエラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
