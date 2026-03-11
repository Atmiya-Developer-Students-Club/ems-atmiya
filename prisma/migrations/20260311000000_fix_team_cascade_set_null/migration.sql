-- DropForeignKey
ALTER TABLE "HackathonTeam" DROP CONSTRAINT "HackathonTeam_problemStatementId_fkey";

-- AddForeignKey
ALTER TABLE "HackathonTeam" ADD CONSTRAINT "HackathonTeam_problemStatementId_fkey" FOREIGN KEY ("problemStatementId") REFERENCES "HackathonProblemStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
