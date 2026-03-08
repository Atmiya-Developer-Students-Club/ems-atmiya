import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Validates that a user's role in Supabase matches their role in the database
 * This prevents role escalation
 */
export async function validateUserRole(userId: string): Promise<{
  isValid: boolean;
  supabaseRole?: string;
  databaseRole?: string;
  error?: string;
  autoFixed?: boolean;
}> {
  try {
    const supabase = await createClient();

    // Get user from Supabase
    const { data: { user }, error: supabaseError } = await supabase.auth.getUser();

    if (supabaseError || !user || user.id !== userId) {
      return { isValid: false, error: "User not found in Supabase" };
    }

    const supabaseRole = user.app_metadata?.role;

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: { role: true }
    });

    if (!dbUser) {
      return { isValid: false, error: "User not found in database" };
    }

    const databaseRole = dbUser.role;

    // Handle case where both roles are undefined (new user or data inconsistency)
    if (!supabaseRole && !databaseRole) {
      return {
        isValid: false,
        error: "No role assigned to user",
        supabaseRole: undefined,
        databaseRole: undefined
      };
    }

    // Compare roles
    const isValid = supabaseRole === databaseRole;

    // If there's a mismatch, attempt to auto-fix it
    let autoFixed = false;
    if (!isValid && databaseRole) {
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            role: databaseRole,
          },
        });

        if (!updateError) {
          autoFixed = true;
          console.log(`Auto-fixed role mismatch for user ${userId}: ${supabaseRole} -> ${databaseRole}`);
        } else {
          console.error(`Failed to auto-fix role mismatch for user ${userId}:`, updateError);
        }
      } catch (syncError) {
        console.error(`Error during auto-fix for user ${userId}:`, syncError);
      }
    }

    return {
      isValid: isValid || autoFixed,
      supabaseRole,
      databaseRole,
      error: (isValid || autoFixed) ? undefined : "Role mismatch detected",
      autoFixed
    };

  } catch (error) {
    console.error("Error validating user role:", error);
    return { isValid: false, error: "Internal error during role validation" };
  }
}

/**
 * Forces a user's Supabase role to match their database role
 * This should be called when a role mismatch is detected
 */
export async function syncUserRole(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: { role: true }
    });

    if (!dbUser) {
      return { success: false, error: "User not found in database" };
    }

    // Update Supabase user metadata to match database role
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        role: dbUser.role,
      },
    });

    if (updateError) {
      console.error("Error syncing user role:", updateError);
      return { success: false, error: "Failed to sync role" };
    }

    return { success: true };

  } catch (error) {
    console.error("Error syncing user role:", error);
    return { success: false, error: "Internal error during role sync" };
  }
}

/**
 * Validates that a user has the required role for an operation
 */
export async function requireRole(
  userId: string,
  requiredRoles: string[]
): Promise<{
  hasAccess: boolean;
  userRole?: string;
  error?: string;
}> {
  try {
    const roleValidation = await validateUserRole(userId);

    if (!roleValidation.isValid) {
      // Attempt to sync the role
      const syncResult = await syncUserRole(userId);
      if (!syncResult.success) {
        return {
          hasAccess: false,
          error: `Role validation failed: ${roleValidation.error}`
        };
      }

      // Re-validate after sync
      const reValidation = await validateUserRole(userId);
      if (!reValidation.isValid) {
        return {
          hasAccess: false,
          error: "Role sync failed"
        };
      }
    }

    const userRole = roleValidation.databaseRole;
    const hasAccess = userRole && requiredRoles.includes(userRole);

    return {
      hasAccess: hasAccess || false,
      userRole,
      error: hasAccess ? undefined : "Insufficient permissions"
    };

  } catch (error) {
    console.error("Error checking role requirements:", error);
    return { hasAccess: false, error: "Internal error during role check" };
  }
}
