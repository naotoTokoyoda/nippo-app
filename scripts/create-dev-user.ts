/**
 * 開発用ユーザーを作成するスクリプト
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('開発用ユーザーを確認・作成しています...');

  // 既存のユーザーを確認
  const existingUsers = await prisma.user.findMany();
  console.log(`既存ユーザー数: ${existingUsers.length}`);

  if (existingUsers.length > 0) {
    console.log('\n既存のユーザー:');
    existingUsers.forEach(user => {
      console.log(`- ${user.name} (ID: ${user.id}, Role: ${user.role})`);
    });

    // 最初のユーザーにroleが設定されていない場合は更新
    for (const user of existingUsers) {
      if (!user.role || user.role === '') {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'admin' },
        });
        console.log(`\n✓ ${user.name}のroleを'admin'に更新しました`);
      }
    }
  } else {
    // ユーザーが存在しない場合は作成
    const devUser = await prisma.user.create({
      data: {
        name: '開発用管理者',
        role: 'admin',
      },
    });
    console.log(`\n✓ 開発用ユーザーを作成しました: ${devUser.name} (ID: ${devUser.id})`);
  }

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

