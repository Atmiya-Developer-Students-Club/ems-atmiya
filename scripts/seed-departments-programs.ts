/**
 * Seed departments and programs from the Atmiya CSV data.
 *
 * Usage: bunx tsx scripts/seed-departments-programs.ts
 *
 * This script will:
 * 1. Check for students referencing existing departments/programs
 * 2. Delete all existing programs and departments (cascades)
 * 3. Insert the new departments and programs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------- DATA ----------

const departments: { name: string; faculty: string }[] = [
  { name: "Civil Engineering", faculty: "FACULTY OF ENGINEERING & TECHNOLOGY" },
  { name: "Computer Engineering", faculty: "FACULTY OF ENGINEERING & TECHNOLOGY" },
  { name: "Electrical Engineering", faculty: "FACULTY OF ENGINEERING & TECHNOLOGY" },
  { name: "Mechanical Engineering", faculty: "FACULTY OF ENGINEERING & TECHNOLOGY" },
  { name: "Information Technology", faculty: "FACULTY OF ENGINEERING & TECHNOLOGY" },
  { name: "Automobile engineering", faculty: "FACULTY OF ENGINEERING & TECHNOLOGY" },
  { name: "Computer Science", faculty: "FACULTY OF ENGINEERING & TECHNOLOGY" },
  { name: "Electronics & Communication", faculty: "FACULTY OF ENGINEERING & TECHNOLOGY" },
  { name: "Biotechnology", faculty: "FACULTY OF SCIENCE" },
  { name: "Microbiology", faculty: "FACULTY OF SCIENCE" },
  { name: "Chemistry", faculty: "FACULTY OF SCIENCE" },
  { name: "Industrial Chemistry", faculty: "FACULTY OF SCIENCE" },
  { name: "Information Technology", faculty: "FACULTY OF SCIENCE" },
  { name: "Mathematics", faculty: "FACULTY OF SCIENCE" },
  { name: "Computer Application", faculty: "FACULTY OF SCIENCE" },
  { name: "Computer Science", faculty: "FACULTY OF SCIENCE" },
  { name: "Medical Laboratory Technology", faculty: "FACULTY OF SCIENCE" },
  { name: "IT & CA", faculty: "FACULTY OF SCIENCE" },
  { name: "Physics", faculty: "FACULTY OF SCIENCE" },
  { name: "Bussiness Administration", faculty: "FACULTY OF BUSINESS & COMMERCE" },
  { name: "Commerce", faculty: "FACULTY OF BUSINESS & COMMERCE" },
  { name: "Management", faculty: "FACULTY OF BUSINESS & COMMERCE" },
  { name: "Pharmacy", faculty: "FACULTY OF HEALTH SCIENCES" },
  { name: "Arts", faculty: "FACULTY OF HUMANITIES & SOCIAL SCIENCES" },
  { name: "English", faculty: "FACULTY OF HUMANITIES & SOCIAL SCIENCES" },
  { name: "CDVE", faculty: "FACULTY OF TRANSFORMATIVE EDUCATION" },
  { name: "IKS", faculty: "FACULTY OF TRANSFORMATIVE EDUCATION" },
  { name: "SD", faculty: "FACULTY OF TRANSFORMATIVE EDUCATION" },
  { name: "Economics", faculty: "FACULTY OF LIBERAL STUDIES" },
  { name: "Sociology", faculty: "FACULTY OF LIBERAL STUDIES" },
  { name: "Psychology", faculty: "FACULTY OF LIBERAL STUDIES" },
  { name: "Political Science", faculty: "FACULTY OF LIBERAL STUDIES" },
  { name: "Philosophy", faculty: "FACULTY OF LIBERAL STUDIES" },
  { name: "Communication", faculty: "FACULTY OF LIBERAL STUDIES" },
  { name: "Indian Knowledge System", faculty: "FACULTY OF LIBERAL STUDIES" },
];

const programs: { program: string; department: string }[] = [
  { program: "Diploma", department: "Automobile engineering" },
  { program: "Diploma", department: "Civil Engineering" },
  { program: "Under Graduate", department: "Civil Engineering" },
  { program: "Post Graduate", department: "Civil Engineering" },
  { program: "Ph.D", department: "Civil Engineering" },
  { program: "Diploma", department: "Computer Engineering" },
  { program: "Under Graduate", department: "Computer Engineering" },
  { program: "Post Graduate", department: "Computer Engineering" },
  { program: "Ph.D", department: "Computer Engineering" },
  { program: "Diploma", department: "Mechanical Engineering" },
  { program: "Under Graduate", department: "Mechanical Engineering" },
  { program: "Post Graduate", department: "Mechanical Engineering" },
  { program: "Ph.D", department: "Mechanical Engineering" },
  { program: "Diploma", department: "Electrical Engineering" },
  { program: "Under Graduate", department: "Electrical Engineering" },
  { program: "Post Graduate", department: "Electrical Engineering" },
  { program: "Ph.D", department: "Electrical Engineering" },
  { program: "Ph.D", department: "Electronics & Communication" },
  { program: "Under Graduate", department: "Biotechnology" },
  { program: "Post Graduate", department: "Biotechnology" },
  { program: "Ph.D", department: "Biotechnology" },
  { program: "Under Graduate", department: "Microbiology" },
  { program: "Post Graduate", department: "Microbiology" },
  { program: "Ph.D", department: "Microbiology" },
  { program: "Under Graduate", department: "Chemistry" },
  { program: "Post Graduate", department: "Chemistry" },
  { program: "Ph.D", department: "Chemistry" },
  { program: "Under Graduate", department: "Mathematics" },
  { program: "Post Graduate", department: "Mathematics" },
  { program: "Ph.D", department: "Mathematics" },
  { program: "Under Graduate", department: "Industrial Chemistry" },
  { program: "Post Graduate", department: "Industrial Chemistry" },
  { program: "Ph.D", department: "Industrial Chemistry" },
  { program: "Under Graduate", department: "Physics" },
  { program: "Ph.D", department: "Physics" },
  { program: "Under Graduate", department: "Computer Science" },
  { program: "Post Graduate", department: "Computer Science" },
  { program: "Ph.D", department: "Computer Science" },
  { program: "Post Graduate (Diploma)", department: "Medical Laboratory Technology" },
  { program: "Under Graduate", department: "Bussiness Administration" },
  { program: "Post Graduate", department: "Bussiness Administration" },
  { program: "Ph.D", department: "Management" },
  { program: "Under Graduate", department: "Commerce" },
  { program: "Post Graduate", department: "Commerce" },
  { program: "Ph.D", department: "Commerce" },
  { program: "Integrated MBA", department: "Bussiness Administration" },
  { program: "Under Graduate", department: "Pharmacy" },
  { program: "Post Graduate", department: "Pharmacy" },
  { program: "Ph.D", department: "Pharmacy" },
  { program: "Under Graduate", department: "English" },
  { program: "Post Graduate", department: "English" },
  { program: "Ph.D", department: "English" },
];

// ---------- MAIN ----------

async function main() {
  // Note: Some department names appear under two faculties in the CSV
  // (e.g. "Information Technology", "Computer Science"). We'll deduplicate
  // by keeping the first occurrence, since the DB schema has unique department rows.
  const deptMap = new Map<string, string>();
  for (const d of departments) {
    if (!deptMap.has(d.name)) {
      deptMap.set(d.name, d.faculty);
    }
  }

  // Check for students tied to existing departments/programs
  const studentsWithDept = await prisma.student.count({
    where: { departmentId: { not: null } },
  });
  const studentsWithProg = await prisma.student.count({
    where: { programId: { not: null } },
  });

  if (studentsWithDept > 0 || studentsWithProg > 0) {
    console.log(
      `⚠️  Found ${studentsWithDept} students with departmentId and ${studentsWithProg} with programId.`
    );
    console.log("   Their department/program references will be cleared before re-seeding.");

    // Clear student references so we can delete old departments/programs
    await prisma.student.updateMany({
      where: { departmentId: { not: null } },
      data: { departmentId: null, programId: null },
    });
    console.log("   ✅ Cleared student department/program references.");
  }

  // Delete existing programs and departments
  const deletedPrograms = await prisma.program.deleteMany();
  const deletedDepts = await prisma.department.deleteMany();
  console.log(
    `🗑️  Deleted ${deletedDepts.count} departments and ${deletedPrograms.count} programs.`
  );

  // Insert departments
  const createdDepts = new Map<string, string>(); // name → id
  for (const [name, faculty] of deptMap) {
    const dept = await prisma.department.create({
      data: { name, faculty },
    });
    createdDepts.set(name, dept.id);
  }
  console.log(`✅ Created ${createdDepts.size} departments.`);

  // Insert programs
  let programCount = 0;
  const missingDepts: string[] = [];

  for (const p of programs) {
    const deptId = createdDepts.get(p.department);
    if (!deptId) {
      missingDepts.push(p.department);
      continue;
    }
    await prisma.program.create({
      data: { name: p.program, departmentId: deptId },
    });
    programCount++;
  }

  console.log(`✅ Created ${programCount} programs.`);

  if (missingDepts.length > 0) {
    console.log(
      `⚠️  Skipped programs for missing departments: ${[...new Set(missingDepts)].join(", ")}`
    );
  }

  // Summary
  console.log("\n--- Summary ---");
  const allDepts = await prisma.department.findMany({
    include: { programs: true },
    orderBy: { faculty: "asc" },
  });
  for (const d of allDepts) {
    console.log(`  ${d.faculty} → ${d.name} (${d.programs.length} programs)`);
    for (const p of d.programs) {
      console.log(`      - ${p.name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
