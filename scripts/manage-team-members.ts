import { PrismaClient } from "@prisma/client";
import * as readline from "readline";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function selectHackathon() {
  const hackathons = await prisma.hackathon.findMany({
    orderBy: { start_date: "desc" },
    select: { id: true, name: true, start_date: true },
  });

  if (hackathons.length === 0) {
    console.log("No hackathons found.");
    process.exit(0);
  }

  console.log("\n--- Hackathons ---");
  hackathons.forEach((h, i) => {
    console.log(`  [${i + 1}] ${h.name} (${h.start_date.toLocaleDateString()})`);
  });

  const choice = await ask("\nSelect hackathon number: ");
  const index = parseInt(choice, 10) - 1;

  if (isNaN(index) || index < 0 || index >= hackathons.length) {
    console.error("Invalid selection.");
    process.exit(1);
  }

  return hackathons[index];
}

async function selectTeam(hackathonId: string) {
  const teams = await prisma.hackathonTeam.findMany({
    where: { hackathonId },
    orderBy: { teamId: "asc" },
    select: {
      id: true,
      teamName: true,
      teamId: true,
      leader: {
        select: { user: { select: { firstName: true, lastName: true } } },
      },
      _count: { select: { members: true } },
    },
  });

  if (teams.length === 0) {
    console.log("No teams found for this hackathon.");
    process.exit(0);
  }

  console.log("\n--- Teams ---");
  teams.forEach((t, i) => {
    const leaderName = t.leader
      ? `${t.leader.user.firstName} ${t.leader.user.lastName ?? ""}`.trim()
      : "No leader";
    console.log(
      `  [${i + 1}] ${t.teamId ?? "N/A"} - ${t.teamName} | Leader: ${leaderName} | Members: ${t._count.members}`
    );
  });

  const choice = await ask("\nSelect team number: ");
  const index = parseInt(choice, 10) - 1;

  if (isNaN(index) || index < 0 || index >= teams.length) {
    console.error("Invalid selection.");
    process.exit(1);
  }

  return teams[index];
}

async function showMembers(teamId: string) {
  const members = await prisma.hackathonTeamMember.findMany({
    where: { teamId },
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  if (members.length === 0) {
    console.log("\n  No members in this team.");
  } else {
    console.log("\n--- Current Members ---");
    members.forEach((m, i) => {
      const name = `${m.student.user.firstName} ${m.student.user.lastName ?? ""}`.trim();
      console.log(
        `  [${i + 1}] ${name} | ${m.student.user.email} | Reg: ${m.student.registrationNumber ?? "N/A"} | Attended: ${m.attended}`
      );
    });
  }

  return members;
}

async function findStudent(identifier: string) {
  // Search by email or registration number
  const student = await prisma.student.findFirst({
    where: {
      OR: [
        { user: { email: identifier } },
        { registrationNumber: identifier },
      ],
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return student;
}

async function addMember(teamId: string) {
  const identifier = await ask(
    "Enter student email or registration number: "
  );

  const student = await findStudent(identifier);
  if (!student) {
    console.log(`  ✗ No student found with "${identifier}".`);
    return;
  }

  const name = `${student.user.firstName} ${student.user.lastName ?? ""}`.trim();

  // Check if already a member
  const existing = await prisma.hackathonTeamMember.findUnique({
    where: { teamId_studentId: { teamId, studentId: student.id } },
  });

  if (existing) {
    console.log(`  ✗ ${name} is already a member of this team.`);
    return;
  }

  const confirm = await ask(`  Add "${name}" (${student.user.email}) to the team? (y/n): `);
  if (confirm.toLowerCase() !== "y") {
    console.log("  Cancelled.");
    return;
  }

  await prisma.hackathonTeamMember.create({
    data: { teamId, studentId: student.id },
  });

  console.log(`  ✓ ${name} added to the team.`);
}

async function removeMember(teamId: string) {
  const members = await showMembers(teamId);
  if (members.length === 0) return;

  const choice = await ask("\nSelect member number to remove: ");
  const index = parseInt(choice, 10) - 1;

  if (isNaN(index) || index < 0 || index >= members.length) {
    console.error("  Invalid selection.");
    return;
  }

  const member = members[index];
  const name = `${member.student.user.firstName} ${member.student.user.lastName ?? ""}`.trim();

  // Check if this student is the team leader
  const team = await prisma.hackathonTeam.findUnique({
    where: { id: teamId },
    select: { leaderId: true },
  });

  if (team?.leaderId === member.studentId) {
    const confirmLeader = await ask(
      `  ⚠ ${name} is the team leader. Removing them will also unset them as leader. Continue? (y/n): `
    );
    if (confirmLeader.toLowerCase() !== "y") {
      console.log("  Cancelled.");
      return;
    }

    await prisma.hackathonTeam.update({
      where: { id: teamId },
      data: { leaderId: null },
    });
  }

  const confirm = await ask(`  Remove "${name}" (${member.student.user.email}) from the team? (y/n): `);
  if (confirm.toLowerCase() !== "y") {
    console.log("  Cancelled.");
    return;
  }

  await prisma.hackathonTeamMember.delete({
    where: { id: member.id },
  });

  console.log(`  ✓ ${name} removed from the team.`);
}

async function main() {
  console.log("=== Manage Hackathon Team Members ===\n");

  const hackathon = await selectHackathon();
  console.log(`\nSelected: ${hackathon.name}`);

  const team = await selectTeam(hackathon.id);
  console.log(`\nSelected: ${team.teamId ?? "N/A"} - ${team.teamName}`);

  let running = true;
  while (running) {
    await showMembers(team.id);

    console.log("\n--- Actions ---");
    console.log("  [1] Add member");
    console.log("  [2] Remove member");
    console.log("  [3] Change team");
    console.log("  [4] Exit");

    const action = await ask("\nSelect action: ");

    switch (action) {
      case "1":
        await addMember(team.id);
        break;
      case "2":
        await removeMember(team.id);
        break;
      case "3": {
        const newTeam = await selectTeam(hackathon.id);
        Object.assign(team, newTeam);
        console.log(`\nSwitched to: ${team.teamId ?? "N/A"} - ${team.teamName}`);
        break;
      }
      case "4":
        running = false;
        break;
      default:
        console.log("  Invalid action.");
    }
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => {
    rl.close();
    prisma.$disconnect();
  });
