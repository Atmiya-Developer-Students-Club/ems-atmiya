import { createClient } from "@supabase/supabase-js";

// Load env manually
const fs = await import("fs");
const envContent = fs.readFileSync(".env", "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=["']?(.+?)["']?$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function test() {
  const email = "parkerpant29@gmail.com";

  // Find user by email via admin API
  console.log("1. Looking up user by email:", email);
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) { console.error("listUsers failed:", listErr); return; }
  const targetUser = users.find(u => u.email === email);
  if (!targetUser) { console.error("User not found in Supabase auth"); return; }

  const userId = targetUser.id;
  console.log("2. Found user:", userId);
  console.log("   app_metadata:", JSON.stringify(targetUser.app_metadata, null, 2));
  console.log("   user_metadata:", JSON.stringify(targetUser.user_metadata, null, 2));

  // Check Prisma
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const dbUser = await prisma.user.findFirst({ where: { supabaseId: userId } });
  console.log("3. Prisma User record:", dbUser ? JSON.stringify({ id: dbUser.id, email: dbUser.email, phone: dbUser.phone, role: dbUser.role }, null, 2) : "NOT FOUND");
  const student = await prisma.student.findFirst({ where: { userId } });
  console.log("4. Prisma Student record:", student ? "EXISTS" : "NOT FOUND");
  await prisma.$disconnect();
}

test().catch((e) => console.error("Caught error:", e));
