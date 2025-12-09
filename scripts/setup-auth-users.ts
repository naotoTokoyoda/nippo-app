/**
 * 認証システム用のユーザー設定スクリプト
 * admin/manager ユーザーにemail/passwordを設定し、
 * 全ユーザーにPINを設定します。
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// パスワードのハッシュ化
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// ユーザー設定データ
const userConfigs = {
  // admin（日報入力しない）
  admin: [
    {
      name: '常世田直人',
      email: 'admin@nippo.local',
      password: 'admin123',
      pin: null, // adminはPIN不要
    },
  ],
  // manager（日報入力もする）
  manager: [
    { name: '根本', email: 'nemoto@nippo.local', password: 'test1234', pin: '1234' },
    { name: '橋本正朗', email: 'hashimoto@nippo.local', password: 'test1234', pin: '1234' },
    { name: '金谷', email: 'kanaya@nippo.local', password: 'test1234', pin: '1234' },
    { name: '清水', email: 'shimizu@nippo.local', password: 'test1234', pin: '1234' },
    { name: '常世田悠莉', email: 'yuri@nippo.local', password: 'test1234', pin: '1234' },
  ],
  // member（日報入力のみ）
  member: [
    { name: '常世田博', pin: '1234' },
    { name: '野城喜幸', pin: '1234' },
    { name: '三好耕平', pin: '1234' },
    { name: '高梨純一', pin: '1234' },
    { name: '（トン）シーワイ チャナラット', pin: '1234', isTrainee: true },
    { name: '（ポーン）テートシームアン タナーポーン', pin: '1234', isTrainee: true },
    { name: '（コー）ジャンペンペーン パッタウィ', pin: '1234', isTrainee: true },
  ],
};

async function main() {
  console.log('🔐 認証システム用ユーザー設定を開始します...\n');

  // Admin ユーザーの設定
  console.log('👑 Admin ユーザーの設定...');
  for (const config of userConfigs.admin) {
    const hashedPassword = await hashPassword(config.password);
    
    const user = await prisma.user.upsert({
      where: { email: config.email },
      update: {
        role: 'admin',
        password: hashedPassword,
        pin: config.pin || '0000',
      },
      create: {
        name: config.name,
        email: config.email,
        password: hashedPassword,
        role: 'admin',
        pin: config.pin || '0000',
      },
    });
    
    console.log(`  ✅ ${user.name} (${user.email}) - role: admin`);
  }

  // Manager ユーザーの設定
  console.log('\n👔 Manager ユーザーの設定...');
  for (const config of userConfigs.manager) {
    const hashedPassword = await hashPassword(config.password);
    
    // 名前で既存ユーザーを検索
    const existingUser = await prisma.user.findFirst({
      where: { name: config.name },
    });

    if (existingUser) {
      // 既存ユーザーを更新
      const user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email: config.email,
          password: hashedPassword,
          role: 'manager',
          pin: config.pin,
        },
      });
      console.log(`  ✅ ${user.name} (${user.email}) - role: manager, PIN: ${config.pin}`);
    } else {
      // 新規作成
      const user = await prisma.user.create({
        data: {
          name: config.name,
          email: config.email,
          password: hashedPassword,
          role: 'manager',
          pin: config.pin,
        },
      });
      console.log(`  ✅ ${user.name} (${user.email}) - role: manager, PIN: ${config.pin} (新規作成)`);
    }
  }

  // Member ユーザーの設定
  console.log('\n👷 Member ユーザーの設定...');
  for (const config of userConfigs.member) {
    // 名前で既存ユーザーを検索
    const existingUser = await prisma.user.findFirst({
      where: { name: config.name },
    });

    if (existingUser) {
      // 既存ユーザーを更新
      const user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: 'member',
          pin: config.pin,
          isTrainee: config.isTrainee || false,
        },
      });
      console.log(`  ✅ ${user.name} - role: member, PIN: ${config.pin}${config.isTrainee ? ' (実習生)' : ''}`);
    } else {
      // 新規作成
      const user = await prisma.user.create({
        data: {
          name: config.name,
          role: 'member',
          pin: config.pin,
          isTrainee: config.isTrainee || false,
        },
      });
      console.log(`  ✅ ${user.name} - role: member, PIN: ${config.pin}${config.isTrainee ? ' (実習生)' : ''} (新規作成)`);
    }
  }

  // 設定完了後の確認
  console.log('\n📊 設定完了後のユーザー一覧:');
  const allUsers = await prisma.user.findMany({
    orderBy: [
      { role: 'asc' },
      { name: 'asc' },
    ],
  });

  console.log('\n┌──────────────────────────────────────┬──────────┬─────────────────────────┬──────┐');
  console.log('│ 名前                                 │ Role     │ Email                   │ PIN  │');
  console.log('├──────────────────────────────────────┼──────────┼─────────────────────────┼──────┤');
  
  for (const user of allUsers) {
    const name = user.name.padEnd(36);
    const role = user.role.padEnd(8);
    const email = (user.email || '-').padEnd(23);
    const pin = user.pin || '-';
    console.log(`│ ${name} │ ${role} │ ${email} │ ${pin} │`);
  }
  
  console.log('└──────────────────────────────────────┴──────────┴─────────────────────────┴──────┘');

  console.log('\n✨ 認証システム用ユーザー設定が完了しました！');
  console.log('\n📝 ログイン情報:');
  console.log('  Admin:   admin@nippo.local / admin123');
  console.log('  Manager: nemoto@nippo.local / test1234');
  console.log('  PIN:     全員 1234（テスト用）');
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

