/**
 * Fix an existing user account to have proper Master role setup.
 * 
 * Usage: bunx tsx scripts/fix-master-account.ts <email>
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: bunx tsx scripts/fix-master-account.ts <email>");
    process.exit(1);
  }

  // Find the user in Prisma
  const user = await prisma.user.findFirst({
    where: { email },
    include: { masters: true, students: true },
  });

  if (!user) {
    console.error(`User with email "${email}" not found in database.`);
    process.exit(1);
  }

  console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email})`);
  console.log(`  Prisma role: ${user.role}`);
  console.log(`  Has Master record: ${!!user.masters}`);
  console.log(`  Has Student record: ${!!user.students}`);

  // Update Prisma role to MASTER
  if (user.role !== "MASTER") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "MASTER" },
    });
    console.log("  ✓ Updated Prisma role to MASTER");
  }

  // Create Master record if missing
  if (!user.masters) {
    await prisma.master.create({
      data: { userId: user.supabaseId },
    });
    console.log("  ✓ Created Master record");
  }

  // Update Supabase app_metadata
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await supabase.auth.admin.updateUserById(user.supabaseId, {
    app_metadata: {
      role: "MASTER",
      onboarding_complete: true,
    },
  });

  if (error) {
    console.error("  ✗ Failed to update Supabase metadata:", error.message);
    process.exit(1);
  }

  console.log("  ✓ Updated Supabase app_metadata (role: MASTER, onboarding_complete: true)");
  console.log("\nDone! You may need to log out and log back in for changes to take effect.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());


// Usage Example
// bunx tsx scripts/fix-master-account.ts sachinchauhan.py@gmail.com