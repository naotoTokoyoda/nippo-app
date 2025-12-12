/**
 * 認証システム用のユーザー設定スクリプト
 * superAdmin: 最高責任者（常世田直人のみ）
 * admin: 管理者個人アカウント
 * manager: 工場共有端末用アカウント
 * member: 作業者（PIN認証で日報入力）
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// パスワードのハッシュ化
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// 型定義
interface AuthUser {
  name: string;
  email: string;
  password: string;
}

interface MemberUser {
  name: string;
  pin: string;
  isTrainee?: boolean;
}

// ユーザー設定データ
const userConfigs: {
  superAdmin: AuthUser[];
  admin: AuthUser[];
  manager: AuthUser[];
  member: MemberUser[];
} = {
  // superAdmin（最高責任者 - 常世田直人のみ）
  superAdmin: [
    {
      name: '常世田直人',
      email: 'admin@nippo.local',
      password: 'admin123',
    },
  ],
  // admin（管理者個人アカウント）
  admin: [
    // 現状は superAdmin のみ
  ],
  // manager（工場共有端末用アカウント）
  manager: [
    { name: '新工場', email: 'shinkojo@nippo.local', password: 'shinkojo2024' },
    { name: '旧工場', email: 'kyukojo@nippo.local', password: 'kyukojo2024' },
  ],
  // member（作業者 - PIN認証で日報入力）
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

  // SuperAdmin ユーザーの設定（最高責任者）
  console.log('🔱 Super Admin ユーザーの設定...');
  for (const config of userConfigs.superAdmin) {
    const hashedPassword = await hashPassword(config.password);
    
    const user = await prisma.user.upsert({
      where: { email: config.email },
      update: {
        name: config.name,
        role: 'superAdmin',
        password: hashedPassword,
        pin: '0000',
      },
      create: {
        name: config.name,
        email: config.email,
        password: hashedPassword,
        role: 'superAdmin',
        pin: '0000',
      },
    });
    
    console.log(`  ✅ ${user.name} (${user.email}) - role: superAdmin`);
  }

  // Admin ユーザーの設定
  console.log('\n👑 Admin ユーザーの設定...');
  for (const config of userConfigs.admin) {
    const hashedPassword = await hashPassword(config.password);
    
    const user = await prisma.user.upsert({
      where: { email: config.email },
      update: {
        name: config.name,
        role: 'admin',
        password: hashedPassword,
        pin: '0000',
      },
      create: {
        name: config.name,
        email: config.email,
        password: hashedPassword,
        role: 'admin',
        pin: '0000',
      },
    });
    
    console.log(`  ✅ ${user.name} (${user.email}) - role: admin`);
  }
  if (userConfigs.admin.length === 0) {
    console.log('  （現在 Admin ユーザーはいません）');
  }

  // Manager ユーザーの設定（工場アカウント）
  console.log('\n🏭 Manager ユーザーの設定（工場アカウント）...');
  for (const config of userConfigs.manager) {
    const hashedPassword = await hashPassword(config.password);
    
    const user = await prisma.user.upsert({
      where: { email: config.email },
      update: {
        name: config.name,
        role: 'manager',
        password: hashedPassword,
        pin: '0000',
      },
      create: {
        name: config.name,
        email: config.email,
        password: hashedPassword,
        role: 'manager',
        pin: '0000',
      },
    });
    
    console.log(`  ✅ ${user.name} (${user.email}) - role: manager`);
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
    where: {
      OR: [
        { role: 'superAdmin' },
        { role: 'admin' },
        { role: 'manager' },
        { role: 'member' },
      ],
    },
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
  console.log('  SuperAdmin: admin@nippo.local / admin123（常世田直人）');
  console.log('  新工場:     shinkojo@nippo.local / shinkojo2024');
  console.log('  旧工場:     kyukojo@nippo.local / kyukojo2024');
  console.log('  作業者PIN:  全員 1234（テスト用）');
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
