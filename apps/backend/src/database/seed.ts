// apps/backend/src/database/seed.ts
import { AppDataSource } from './data-source';
import { PanelUser } from './entities/panel-user.entity';
import * as bcrypt from 'bcrypt';

async function run() {
  const user = process.env.PANEL_ADMIN_USER;
  const pass = process.env.PANEL_ADMIN_PASS;
  if (!user || !pass) {
    console.error('PANEL_ADMIN_USER and PANEL_ADMIN_PASS must be set');
    process.exit(1);
  }

  await AppDataSource.initialize();
  try {
    const repo = AppDataSource.getRepository(PanelUser);
    const exists = await repo.findOne({ where: { username: user } });
    if (!exists) {
      await repo.save(repo.create({
        username: user,
        passwordHash: await bcrypt.hash(pass, 10),
        role: 'admin',
      }));
      console.log(`Seeded admin: ${user}`);
    } else { console.log('Admin already exists'); }
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
