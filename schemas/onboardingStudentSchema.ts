import { z } from "zod";


export const onboardingStudentSchema = z.discriminatedUnion("studentType", [
  z.object({
    studentType: z.literal("atmiya"),
    departmentId: z.string({ required_error: "Department ID is required" }).min(1, "Department ID is required"),
    programId: z.string({ required_error: "Program ID is required" }).min(1, "Program ID is required"),
    currentSemester: z.coerce
      .number({
        required_error: "Current semester is required",
        invalid_type_error: "Current semester must be a number"
      })
      .positive("Semester must be a positive number")
      .int("Semester must be an integer")
      .min(1, "Semester must be at least 1")
      .max(8, "Semester cannot exceed 8"),
    currentYear: z.coerce
      .number({
        required_error: "Current year is required",
        invalid_type_error: "Current year must be a number"
      })
      .positive("Year must be a positive number")
      .int("Year must be an integer")
      .min(1, "Year must be at least 1")
      .max(4, "Year cannot exceed 4"),
    registrationNumber: z.string({ required_error: "Registration number is required" }).min(1, "Registration number is required"),
    universityName: z.string().optional(),
  }),
  z.object({
    studentType: z.literal("other"),
    currentSemester: z.coerce
      .number({
        required_error: "Current semester is required",
        invalid_type_error: "Current semester must be a number"
      })
      .positive("Semester must be a positive number")
      .int("Semester must be an integer")
      .min(1, "Semester must be at least 1")
      .max(8, "Semester cannot exceed 8"),
    currentYear: z.coerce
      .number({
        required_error: "Current year is required",
        invalid_type_error: "Current year must be a number"
      })
      .positive("Year must be a positive number")
      .int("Year must be an integer")
      .min(1, "Year must be at least 1")
      .max(4, "Year cannot exceed 4"),
    universityName: z.string({ required_error: "University name is required" }).min(1, "University name is required"),
    departmentId: z.string().optional(),
    programId: z.string().optional(),
    registrationNumber: z.string().optional(),
  })
]);

export type OnboardingStudentSchema = z.infer<typeof onboardingStudentSchema>;
