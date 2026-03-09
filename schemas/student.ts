import { z } from "zod";

export const studentSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  departmentId: z.string().uuid("Department ID must be a valid UUID").optional(),
  programId: z.string().uuid("Program ID must be a valid UUID").optional(),
  currentSemester: z.coerce.number().int().min(1).max(8, "Semester cannot exceed 8").optional(),
  currentYear: z.coerce.number().int().min(1).max(4, "Year cannot exceed 4").optional(),
  registrationNumber: z.string().min(2).optional(),
  dateOfBirth: z.string().optional(), // ISO string
});

export type StudentSchema = z.infer<typeof studentSchema>;
