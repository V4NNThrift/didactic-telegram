const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create admin user if TELEGRAM_OWNER_ID is set
  const ownerId = process.env.TELEGRAM_OWNER_ID;
  
  if (ownerId) {
    const existingAdmin = await prisma.user.findUnique({
      where: { telegramId: ownerId },
    });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('Admin123!', 12);
      
      await prisma.user.create({
        data: {
          username: 'admin',
          passwordHash,
          telegramId: ownerId,
          telegramChatId: ownerId,
          isAdmin: true,
        },
      });
      
      console.log('Admin user created with username: admin');
    } else {
      console.log('Admin user already exists');
    }
  }

  // Create default settings
  const defaultSettings = [
    { key: 'maintenance_mode', value: 'false', description: 'Enable/disable maintenance mode' },
    { key: 'registration_enabled', value: 'true', description: 'Enable/disable new registrations' },
    { key: 'ai_enabled', value: 'true', description: 'Enable/disable AI features' },
  ];

  for (const setting of defaultSettings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('Default settings created');
  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
