import { PrismaClient, Role, Position, PlayerStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user (auto-approved)
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hockey.local' },
    update: { isApproved: true },
    create: {
      email: 'admin@hockey.local',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isApproved: true,
      approvedAt: new Date(),
    },
  });
  console.log('Created admin user:', admin.email);

  // Create two teams
  const teamA = await prisma.team.upsert({
    where: { name: 'Ice Wolves' },
    update: {},
    create: {
      name: 'Ice Wolves',
      shortName: 'ICW',
      primaryColor: '#1e40af',
      secondaryColor: '#ffffff',
    },
  });

  const teamB = await prisma.team.upsert({
    where: { name: 'Frost Bears' },
    update: {},
    create: {
      name: 'Frost Bears',
      shortName: 'FRB',
      primaryColor: '#dc2626',
      secondaryColor: '#000000',
    },
  });
  console.log('Created teams:', teamA.name, teamB.name);

  // Create coach users (auto-approved)
  const coachAPassword = await bcrypt.hash('coach123', 12);
  const coachA = await prisma.user.upsert({
    where: { email: 'coach.wolves@hockey.local' },
    update: { isApproved: true },
    create: {
      email: 'coach.wolves@hockey.local',
      passwordHash: coachAPassword,
      role: Role.COACH,
      isApproved: true,
      approvedAt: new Date(),
    },
  });

  const coachBPassword = await bcrypt.hash('coach123', 12);
  const coachB = await prisma.user.upsert({
    where: { email: 'coach.bears@hockey.local' },
    update: { isApproved: true },
    create: {
      email: 'coach.bears@hockey.local',
      passwordHash: coachBPassword,
      role: Role.COACH,
      isApproved: true,
      approvedAt: new Date(),
    },
  });

  // Assign coaches to teams
  await prisma.teamCoach.upsert({
    where: { userId_teamId: { userId: coachA.id, teamId: teamA.id } },
    update: {},
    create: { userId: coachA.id, teamId: teamA.id, isHeadCoach: true },
  });

  await prisma.teamCoach.upsert({
    where: { userId_teamId: { userId: coachB.id, teamId: teamB.id } },
    update: {},
    create: { userId: coachB.id, teamId: teamB.id, isHeadCoach: true },
  });
  console.log('Created coaches and assigned to teams');

  // Create sample players
  const playerData = [
    { firstName: 'Alex', lastName: 'Johnson', position: Position.CENTER, jerseyNumber: 91 },
    { firstName: 'Mike', lastName: 'Smith', position: Position.LEFT_WING, jerseyNumber: 17 },
    { firstName: 'Chris', lastName: 'Davis', position: Position.RIGHT_WING, jerseyNumber: 22 },
    { firstName: 'Jake', lastName: 'Wilson', position: Position.DEFENSE, jerseyNumber: 4 },
    { firstName: 'Ryan', lastName: 'Brown', position: Position.DEFENSE, jerseyNumber: 6 },
    { firstName: 'Tom', lastName: 'Miller', position: Position.GOALIE, jerseyNumber: 30 },
    { firstName: 'Eric', lastName: 'Taylor', position: Position.CENTER, jerseyNumber: 19 },
    { firstName: 'Dan', lastName: 'Anderson', position: Position.LEFT_WING, jerseyNumber: 11 },
    { firstName: 'Sam', lastName: 'Thomas', position: Position.RIGHT_WING, jerseyNumber: 28 },
    { firstName: 'Nick', lastName: 'Jackson', position: Position.DEFENSE, jerseyNumber: 44 },
    { firstName: 'Ben', lastName: 'White', position: Position.DEFENSE, jerseyNumber: 55 },
    { firstName: 'Matt', lastName: 'Harris', position: Position.GOALIE, jerseyNumber: 35 },
  ];

  const players = [];
  for (const data of playerData) {
    const player = await prisma.player.create({
      data: {
        ...data,
        status: PlayerStatus.ACTIVE,
      },
    });
    players.push(player);
  }
  console.log('Created', players.length, 'players');

  // Assign players to teams (some to both teams)
  // First 8 players to Team A
  for (let i = 0; i < 8; i++) {
    await prisma.teamPlayer.create({
      data: { playerId: players[i].id, teamId: teamA.id },
    });
  }

  // Players 4-12 to Team B (overlapping players 4-8)
  for (let i = 4; i < 12; i++) {
    await prisma.teamPlayer.create({
      data: { playerId: players[i].id, teamId: teamB.id },
    });
  }
  console.log('Assigned players to teams (with shared players)');

  // Create sample games
  const now = new Date();
  const games = [
    {
      teamId: teamA.id,
      opponent: 'Thunder Hawks',
      location: 'Home Arena',
      startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000),
      isHome: true,
    },
    {
      teamId: teamB.id,
      opponent: 'Storm Eagles',
      location: 'Away Arena',
      startTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000),
      isHome: false,
    },
  ];

  for (const game of games) {
    await prisma.game.create({ data: game });
  }
  console.log('Created sample games');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
