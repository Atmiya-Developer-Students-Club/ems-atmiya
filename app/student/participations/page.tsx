import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MyParticipations } from "@/components/section/student/participations/MyParticipations";
import { Participation, PendingInvitation } from "@/types/hackathon";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";

export default async function ParticipationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    // Find the student record
    const student = await prisma.student.findFirst({
      where: {
        userId: user.id,
      },
      include: {
        user: true,
      },
    });

    if (!student) {
      redirect("/onboarding");
    }

    // Get all hackathon teams the student is a member of
    const teamMemberships = await prisma.hackathonTeamMember.findMany({
      where: {
        studentId: student.id,
      },
      include: {
        team: {
          include: {
            hackathon: {
              select: {
                id: true,
                name: true,
                description: true,
                poster_url: true,
                location: true,
                mode: true,
                start_date: true,
                end_date: true,
                start_time: true,
                end_time: true,
                registration_start_date: true,
                registration_end_date: true,
                registration_limit: true,
                status: true,
                team_size_limit: true,
                tags: true,
                organizer_name: true,
                organizer_contact: true,
                evaluationCriteria: true,
                created_at: true,
                open_submissions: true,
                open_registrations: true,
              },
            },
            members: {
              include: {
                student: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
            invites: {
              include: {
                student: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
            problemStatement: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        team: {
          hackathon: {
            start_date: "desc",
          },
        },
      },
    });

    // Get pending invitations for hackathons where student is not yet a member
    const pendingInvites = await prisma.hackathonTeamInvite.findMany({
      where: {
        studentId: student.id,
        status: "PENDING",
      },
      include: {
        team: {
          include: {
            hackathon: {
              select: {
                id: true,
                name: true,
                description: true,
                poster_url: true,
                location: true,
                mode: true,
                start_date: true,
                end_date: true,
                start_time: true,
                end_time: true,
                registration_start_date: true,
                registration_end_date: true,
                registration_limit: true,
                status: true,
                team_size_limit: true,
                tags: true,
                organizer_name: true,
                organizer_contact: true,
                evaluationCriteria: true,
                created_at: true,
                open_submissions: true,
                open_registrations: true,
              },
            },
          },
        },
      },
      orderBy: {
        team: {
          hackathon: {
            start_date: "desc",
          },
        },
      },
    });

    // Get event registrations for the user
    const eventRegistrations = await prisma.eventRegistration.findMany({
      where: {
        userId: user.id,
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            description: true,
            poster_url: true,
            mode: true,
            address: true,
            start_date: true,
            end_date: true,
            start_time: true,
            end_time: true,
            event_type: true,
            status: true,
            organizer_name: true,
            tags: true,
          },
        },
      },
      orderBy: {
        event: {
          start_date: "desc",
        },
      },
    });

    // Transform the data to include participation status
    const participations = teamMemberships.map((membership) => {
      const team = membership.team;
      const hackathon = team.hackathon; // Determine if current student is team owner/leader
      const isTeamOwner = team.leaderId == student.id;

      return {
        id: hackathon.id,
        hackathon: {
          id: hackathon.id,
          name: hackathon.name,
          description: hackathon.description,
          poster_url: hackathon.poster_url,
          location: hackathon.location,
          mode: hackathon.mode,
          start_date: hackathon.start_date.toISOString(),
          end_date: hackathon.end_date.toISOString(),
          start_time: hackathon.start_time.toISOString(),
          end_time: hackathon.end_time.toISOString(),
          registration_start_date:
            hackathon.registration_start_date?.toISOString(),
          registration_end_date: hackathon.registration_end_date?.toISOString(),
          registration_limit: hackathon.registration_limit,
          status: hackathon.status,
          team_size_limit: hackathon.team_size_limit,
          tags: hackathon.tags,
          organizer_name: hackathon.organizer_name,
          organizer_contact: hackathon.organizer_contact,
          evaluationCriteria: hackathon.evaluationCriteria,
          created_at: hackathon.created_at.toISOString(),
          open_submissions: hackathon.open_submissions,
          open_registrations: hackathon.open_registrations,
        },
        team: {
          id: team.id,
          teamName: team.teamName,
          teamId: team.teamId,
          members: team.members,
          invites: team.invites,
          problemStatement: team.problemStatement,
          disqualified: team.disqualified ?? false,
        },
        isTeamOwner,
        attended: membership.attended,
      };
    });

    // Transform pending invites
    const pendingInvitations = pendingInvites.map((invite) => ({
      id: invite.team.hackathon.id,
      hackathon: {
        id: invite.team.hackathon.id,
        name: invite.team.hackathon.name,
        description: invite.team.hackathon.description,
        poster_url: invite.team.hackathon.poster_url,
        location: invite.team.hackathon.location,
        mode: invite.team.hackathon.mode,
        start_date: invite.team.hackathon.start_date.toISOString(),
        end_date: invite.team.hackathon.end_date.toISOString(),
        start_time: invite.team.hackathon.start_time.toISOString(),
        end_time: invite.team.hackathon.end_time.toISOString(),
        status: invite.team.hackathon.status,
        team_size_limit: invite.team.hackathon.team_size_limit,
        tags: invite.team.hackathon.tags,
        organizer_name: invite.team.hackathon.organizer_name,
        organizer_contact: invite.team.hackathon.organizer_contact,
        created_at: invite.team.hackathon.created_at.toISOString(),
      },
      team: {
        id: invite.team.id,
        teamName: invite.team.teamName,
        teamId: invite.team.teamId,
      },
      inviteId: invite.id,
      status: invite.status,
    }));

    // Transform event registrations
    const transformedEventRegistrations = eventRegistrations.map((reg) => ({
      id: reg.id,
      event: {
        id: reg.event.id,
        name: reg.event.name,
        description: reg.event.description,
        poster_url: reg.event.poster_url,
        mode: reg.event.mode,
        address: reg.event.address,
        start_date: reg.event.start_date.toISOString(),
        end_date: reg.event.end_date?.toISOString() || null,
        start_time: reg.event.start_time.toISOString(),
        end_time: reg.event.end_time?.toISOString() || null,
        event_type: reg.event.event_type,
        status: reg.event.status,
        organizer_name: reg.event.organizer_name,
        tags: reg.event.tags,
      },
      attended: reg.attended,
      createdAt: reg.createdAt.toISOString(),
    }));

    return (
      <ErrorBoundary>
        <MyParticipations
          participations={participations as Participation[]}
          pendingInvitations={pendingInvitations as PendingInvitation[]}
          eventRegistrations={transformedEventRegistrations}
          studentId={student.id}
        />
      </ErrorBoundary>
    );
  } catch (error) {
    console.error("Error fetching participations:", error);
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-muted-foreground">
            Failed to load your hackathon participations. Please try again
            later.
          </p>
        </div>
      </div>
    );
  }
}
