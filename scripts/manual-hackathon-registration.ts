import { PrismaClient } from "@prisma/client";
import { QRCodeService } from "../lib/qr-code";
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
    select: {
      id: true,
      name: true,
      start_date: true,
      team_size_limit: true,
      problemStatements: { select: { id: true, code: true, title: true } },
    },
  });

  if (hackathons.length === 0) {
    console.log("No hackathons found.");
    process.exit(0);
  }

  console.log("\n--- Hackathons ---");
  hackathons.forEach((h, i) => {
    console.log(
      `  [${i + 1}] ${h.name} (${h.start_date.toLocaleDateString()})`
    );
  });

  const choice = await ask("\nSelect hackathon number: ");
  const index = parseInt(choice, 10) - 1;

  if (isNaN(index) || index < 0 || index >= hackathons.length) {
    console.error("Invalid selection.");
    process.exit(1);
  }

  return hackathons[index];
}

async function selectProblemStatement(
  problemStatements: { id: string; code: string; title: string }[]
) {
  if (problemStatements.length === 0) {
    console.log("No problem statements found for this hackathon.");
    return null;
  }

  console.log("\n--- Problem Statements ---");
  problemStatements.forEach((ps, i) => {
    console.log(`  [${i + 1}] ${ps.code} - ${ps.title}`);
  });

  const choice = await ask("\nSelect problem statement number: ");
  const index = parseInt(choice, 10) - 1;

  if (isNaN(index) || index < 0 || index >= problemStatements.length) {
    console.error("Invalid selection.");
    process.exit(1);
  }

  return problemStatements[index];
}

async function findStudentByEmail(email: string) {
  const user = await prisma.user.findFirst({
    where: { email, role: "STUDENT" },
    include: { students: true },
  });

  if (!user || !user.students) {
    return null;
  }

  return { user, student: user.students };
}

async function generateNextTeamId(hackathonId: string): Promise<string> {
  const lastTeam = await prisma.hackathonTeam.findFirst({
    where: { hackathonId, teamId: { not: null } },
    orderBy: { teamId: "desc" },
    select: { teamId: true },
  });

  const nextNum = lastTeam?.teamId
    ? parseInt(lastTeam.teamId.replace("TM", ""), 10) + 1
    : 1;

  return `TM${String(nextNum).padStart(3, "0")}`;
}

async function selectExistingTeam(hackathonId: string) {
  const teams = await prisma.hackathonTeam.findMany({
    where: { hackathonId },
    orderBy: { teamId: "asc" },
    include: {
      members: {
        include: {
          student: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
        },
      },
      leader: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      },
    },
  });

  if (teams.length === 0) {
    console.log("No teams found for this hackathon.");
    return null;
  }

  console.log("\n--- Existing Teams ---");
  teams.forEach((t, i) => {
    const leaderName = t.leader
      ? `${t.leader.user.firstName} ${t.leader.user.lastName}`
      : "N/A";
    console.log(
      `  [${i + 1}] ${t.teamId || "N/A"} - ${t.teamName} (Leader: ${leaderName}, Members: ${t.members.length})`
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

async function addMembersToExistingTeam() {
  // 1. Select hackathon
  const hackathon = await selectHackathon();
  console.log(`\nSelected: ${hackathon.name}`);

  // 2. Select existing team
  const team = await selectExistingTeam(hackathon.id);
  if (!team) {
    process.exit(0);
  }

  console.log(`\nTeam: ${team.teamId} - ${team.teamName}`);
  console.log("Current members:");
  team.members.forEach((m, i) => {
    const isLeader = m.studentId === team.leaderId;
    console.log(
      `  ${i + 1}. ${m.student.user.firstName} ${m.student.user.lastName} (${m.student.user.email})${isLeader ? " [Leader]" : ""}`
    );
  });

  // 3. Collect new member emails
  const maxSize = hackathon.team_size_limit || 5;
  const spotsLeft = maxSize - team.members.length;

  if (spotsLeft <= 0) {
    console.log(`\nTeam is already full (${maxSize}/${maxSize}).`);
    process.exit(0);
  }

  const existingStudentIds = new Set(team.members.map((m) => m.studentId));
  const memberEmails: string[] = [];

  console.log(
    `\nAdd members (${spotsLeft} spot(s) remaining). Enter empty email to finish.\n`
  );

  while (memberEmails.length < spotsLeft) {
    const email = await ask(
      `New member ${memberEmails.length + 1} email (or press Enter to finish): `
    );
    if (!email) break;

    if (memberEmails.includes(email)) {
      console.log("  -> Skipped: Duplicate email.");
      continue;
    }

    const memberData = await findStudentByEmail(email);
    if (!memberData) {
      console.log(`  -> Skipped: No student found with email ${email}`);
      continue;
    }

    if (existingStudentIds.has(memberData.student.id)) {
      console.log("  -> Skipped: Already a member of this team.");
      continue;
    }

    const existingMembership = await prisma.hackathonTeamMember.findFirst({
      where: {
        studentId: memberData.student.id,
        team: { hackathonId: hackathon.id },
      },
      include: { team: { select: { teamName: true } } },
    });

    if (existingMembership) {
      console.log(
        `  -> Skipped: ${email} is already in team "${existingMembership.team.teamName}".`
      );
      continue;
    }

    console.log(
      `  -> Added: ${memberData.user.firstName} ${memberData.user.lastName}`
    );
    memberEmails.push(email);
  }

  if (memberEmails.length === 0) {
    console.log("No members to add.");
    process.exit(0);
  }

  // 4. Confirmation
  console.log(`\n=== Add Members Summary ===`);
  console.log(`Team: ${team.teamId} - ${team.teamName}`);
  console.log(`New members to add: ${memberEmails.length}`);
  memberEmails.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));

  const confirm = await ask("\nProceed? (y/n): ");
  if (confirm.toLowerCase() !== "y") {
    console.log("Cancelled.");
    process.exit(0);
  }

  // 5. Add members + generate QR codes
  try {
    const memberStudents: NonNullable<Awaited<ReturnType<typeof findStudentByEmail>>>[] = [];
    for (const email of memberEmails) {
      const data = await findStudentByEmail(email);
      if (data) memberStudents.push(data);
    }

    await prisma.$transaction(async (tx) => {
      for (const m of memberStudents) {
        await tx.hackathonTeamMember.create({
          data: { teamId: team.id, studentId: m.student.id },
        });
      }
    });

    console.log(`\n${memberStudents.length} member(s) added successfully!`);

    console.log("\nGenerating QR codes...");
    for (const m of memberStudents) {
      try {
        const { qrCode, qrCodeData } =
          await QRCodeService.generateTeamMemberQRCode(
            m.student.id,
            team.id,
            hackathon.id
          );

        await prisma.hackathonTeamMember.update({
          where: {
            teamId_studentId: { teamId: team.id, studentId: m.student.id },
          },
          data: { qrCode, qrCodeData },
        });

        console.log(
          `  QR generated for ${m.user.firstName} ${m.user.lastName}`
        );
      } catch (qrError) {
        console.error(
          `  Failed to generate QR for ${m.user.email}:`,
          qrError
        );
      }
    }

    console.log("\nDone!");
  } catch (error) {
    console.error("\nFailed to add members:", error);
    process.exit(1);
  }
}

async function createNewTeam() {
  // 1. Select hackathon
  const hackathon = await selectHackathon();
  console.log(`\nSelected: ${hackathon.name}`);

  // 2. Select problem statement
  const problemStatement = await selectProblemStatement(
    hackathon.problemStatements
  );
  if (problemStatement) {
    console.log(`Problem Statement: ${problemStatement.code} - ${problemStatement.title}`);
  }

  // 3. Get team details
  const teamName = await ask("\nEnter team name: ");
  if (!teamName) {
    console.error("Team name is required.");
    process.exit(1);
  }

  const mentor = await ask("Enter mentor name: ");
  if (!mentor) {
    console.error("Mentor name is required.");
    process.exit(1);
  }

  const mentorMail = await ask("Enter mentor email: ");
  if (!mentorMail) {
    console.error("Mentor email is required.");
    process.exit(1);
  }

  // 4. Get team leader email
  const leaderEmail = await ask("\nEnter team leader email: ");
  const leaderData = await findStudentByEmail(leaderEmail);

  if (!leaderData) {
    console.error(`No student found with email: ${leaderEmail}`);
    process.exit(1);
  }

  // Check if leader is already in a team for this hackathon
  const existingLeaderMembership = await prisma.hackathonTeamMember.findFirst({
    where: {
      studentId: leaderData.student.id,
      team: { hackathonId: hackathon.id },
    },
    include: { team: { select: { teamName: true } } },
  });

  if (existingLeaderMembership) {
    console.error(
      `Leader ${leaderEmail} is already in team "${existingLeaderMembership.team.teamName}" for this hackathon.`
    );
    process.exit(1);
  }

  console.log(
    `Leader: ${leaderData.user.firstName} ${leaderData.user.lastName} (${leaderEmail})`
  );

  // 5. Get team members
  const memberEmails: string[] = [];
  const maxSize = hackathon.team_size_limit || 5;

  console.log(
    `\nAdd team members (max ${maxSize - 1} more, leader counts as 1). Enter empty email to finish.\n`
  );

  while (memberEmails.length < maxSize - 1) {
    const email = await ask(
      `Member ${memberEmails.length + 1} email (or press Enter to finish): `
    );
    if (!email) break;

    if (email === leaderEmail) {
      console.log("  -> Skipped: This is the team leader.");
      continue;
    }

    if (memberEmails.includes(email)) {
      console.log("  -> Skipped: Duplicate email.");
      continue;
    }

    const memberData = await findStudentByEmail(email);
    if (!memberData) {
      console.log(`  -> Skipped: No student found with email ${email}`);
      continue;
    }

    // Check if member is already in a team for this hackathon
    const existingMembership = await prisma.hackathonTeamMember.findFirst({
      where: {
        studentId: memberData.student.id,
        team: { hackathonId: hackathon.id },
      },
      include: { team: { select: { teamName: true } } },
    });

    if (existingMembership) {
      console.log(
        `  -> Skipped: ${email} is already in team "${existingMembership.team.teamName}".`
      );
      continue;
    }

    console.log(
      `  -> Added: ${memberData.user.firstName} ${memberData.user.lastName}`
    );
    memberEmails.push(email);
  }

  // 6. Confirmation
  console.log("\n=== Registration Summary ===");
  console.log(`Hackathon:         ${hackathon.name}`);
  console.log(`Team Name:         ${teamName}`);
  console.log(`Mentor:            ${mentor} (${mentorMail})`);
  console.log(
    `Problem Statement: ${problemStatement ? `${problemStatement.code} - ${problemStatement.title}` : "None"}`
  );
  console.log(
    `Leader:            ${leaderData.user.firstName} ${leaderData.user.lastName} (${leaderEmail})`
  );
  console.log(`Members:           ${memberEmails.length} additional member(s)`);
  memberEmails.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));

  const confirm = await ask("\nProceed with registration? (y/n): ");
  if (confirm.toLowerCase() !== "y") {
    console.log("Registration cancelled.");
    process.exit(0);
  }

  // 7. Create team + members in a transaction
  try {
    const newTeamId = await generateNextTeamId(hackathon.id);

    // Resolve all member student records
    const memberStudents: NonNullable<Awaited<ReturnType<typeof findStudentByEmail>>>[] = [];
    for (const email of memberEmails) {
      const data = await findStudentByEmail(email);
      if (data) memberStudents.push(data);
    }

    const team = await prisma.$transaction(async (tx) => {
      // Create team with leader as first member
      const createdTeam = await tx.hackathonTeam.create({
        data: {
          teamName,
          hackathonId: hackathon.id,
          problemStatementId: problemStatement?.id ?? null,
          mentor,
          mentor_mail: mentorMail,
          leaderId: leaderData.student.id,
          teamId: newTeamId,
          members: {
            create: [
              { studentId: leaderData.student.id },
              ...memberStudents.map((m) => ({ studentId: m.student.id })),
            ],
          },
        },
      });

      return createdTeam;
    });

    console.log(`\nTeam created successfully!`);
    console.log(`  Team ID:       ${team.teamId}`);
    console.log(`  Database ID:   ${team.id}`);

    // 8. Generate QR codes for all members
    console.log("\nGenerating QR codes...");

    const allStudentIds = [
      leaderData.student.id,
      ...memberStudents.map((m) => m.student.id),
    ];

    for (const studentId of allStudentIds) {
      try {
        const { qrCode, qrCodeData } =
          await QRCodeService.generateTeamMemberQRCode(
            studentId,
            team.id,
            hackathon.id
          );

        await prisma.hackathonTeamMember.update({
          where: {
            teamId_studentId: { teamId: team.id, studentId },
          },
          data: { qrCode, qrCodeData },
        });

        const member = allStudentIds.indexOf(studentId) === 0 ? "Leader" : "Member";
        console.log(`  QR generated for ${member} (${studentId})`);
      } catch (qrError) {
        console.error(`  Failed to generate QR for ${studentId}:`, qrError);
      }
    }

    console.log("\nRegistration complete!");
  } catch (error) {
    console.error("\nFailed to create team:", error);
    process.exit(1);
  }
}

async function main() {
  console.log("=== Manual Hackathon Team Registration ===\n");
  console.log("  [1] Create a new team");
  console.log("  [2] Add members to an existing team");

  const choice = await ask("\nSelect option: ");

  if (choice === "1") {
    await createNewTeam();
  } else if (choice === "2") {
    await addMembersToExistingTeam();
  } else {
    console.error("Invalid option.");
    process.exit(1);
  }

  rl.close();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  rl.close();
  await prisma.$disconnect();
  process.exit(1);
});
