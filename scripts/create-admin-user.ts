/**
 * 管理者ユーザー（常世田直人）を作成するスクリプト
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('管理者ユーザーを作成しています...');

  // 常世田直人さんが既に存在するか確認
  const existingUser = await prisma.user.findFirst({
    where: { name: '常世田直人' },
  });

  if (existingUser) {
    console.log(`既に存在します: ${existingUser.name} (ID: ${existingUser.id}, Role: ${existingUser.role})`);
    
    // roleがadminでない場合は更新
    if (existingUser.role !== 'admin') {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: 'admin' },
      });
      console.log(`✓ roleを'admin'に更新しました`);
    }
    
    console.log(`\n管理者ユーザーID: ${existingUser.id}`);
  } else {
    // 新規作成
    const adminUser = await prisma.user.create({
      data: {
        name: '常世田直人',
        role: 'admin',
      },
    });
    console.log(`✓ 管理者ユーザーを作成しました: ${adminUser.name} (ID: ${adminUser.id})`);
    console.log(`\n管理者ユーザーID: ${adminUser.id}`);
  }

  // 全ユーザーを表示
  console.log('\n現在のユーザー一覧:');
  const allUsers = await prisma.user.findMany();
  allUsers.forEach(user => {
    console.log(`- ${user.name} (ID: ${user.id}, Role: ${user.role})`);
  });

  console.log('\n完了しました！');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

