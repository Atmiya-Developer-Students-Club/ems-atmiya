import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillTeamIds() {
  try {
    console.log('Starting to backfill team IDs...');

    // Get all distinct hackathon IDs that have teams without a teamId
    const hackathonIds = await prisma.hackathonTeam.findMany({
      where: { teamId: null },
      select: { hackathonId: true },
      distinct: ['hackathonId'],
    });

    console.log(`Found ${hackathonIds.length} hackathon(s) with teams missing teamId.`);

    for (const { hackathonId } of hackathonIds) {
      // Find the highest existing teamId for this hackathon
      const lastTeam = await prisma.hackathonTeam.findFirst({
        where: { hackathonId, teamId: { not: null } },
        orderBy: { teamId: 'desc' },
        select: { teamId: true },
      });

      let nextNum = lastTeam?.teamId
        ? parseInt(lastTeam.teamId.replace('TM', ''), 10) + 1
        : 1;

      // Get all teams without a teamId for this hackathon, ordered by creation
      const teamsWithoutId = await prisma.hackathonTeam.findMany({
        where: { hackathonId, teamId: null },
        orderBy: { id: 'asc' },
        select: { id: true, teamName: true },
      });

      console.log(`\nHackathon ${hackathonId}: ${teamsWithoutId.length} team(s) need IDs (starting at TM${String(nextNum).padStart(3, '0')})`);

      for (const team of teamsWithoutId) {
        const newTeamId = `TM${String(nextNum).padStart(3, '0')}`;
        await prisma.hackathonTeam.update({
          where: { id: team.id },
          data: { teamId: newTeamId },
        });
        console.log(`  ${team.teamName} → ${newTeamId}`);
        nextNum++;
      }
    }

    console.log('\nBackfill complete!');
  } catch (error) {
    console.error('Error backfilling team IDs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backfillTeamIds();
