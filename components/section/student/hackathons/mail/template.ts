export const template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Hackathon Team Invitation</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
      color: #111827;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    }
    .header {
      background: linear-gradient(135deg, #0090ff 0%, #0071e2 100%);
      padding: 32px 24px 70px;
      text-align: center;
      position: relative;
    }
    .header::after {
      content: "";
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 40px;
      background-image: url("data:image/svg+xml,%3Csvg ... %3E"); /* keep wave SVG */
      background-size: cover;
    }
    .logo-text {
      color: white;
      font-size: 34px;
      font-weight: 800;
      margin: 0;
    }
    .badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.25);
      color: white;
      font-size: 13px;
      padding: 6px 16px;
      border-radius: 50px;
      margin-top: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 30px 32px 40px;
      text-align: center;
      margin-top: -15px;
    }
    h1 {
      font-size: 26px;
      margin: 10px 0 16px;
      font-weight: 700;
      color: #111827;
    }
    p { font-size: 16px; color: #4b5563; }
    .hackathon-card {
      text-align: left;
      margin: 24px 0;
      background: #f9fafb;
      padding: 20px 24px;
      border-radius: 14px;
      border: 1px solid #e5e7eb;
    }
    .hackathon-card h2 {
      margin: 0 0 12px;
      font-size: 20px;
      font-weight: 700;
      color: #111827;
    }
    .detail {
      margin: 8px 0;
      font-size: 15px;
    }
    .detail strong {
      color: #111827;
    }
    .button {
      background: linear-gradient(135deg, #30a46c 0%, #2a9862 100%);
      color: white;
      padding: 14px 34px;
      border-radius: 50px;
      text-decoration: none;
      font-weight: 600;
      display: inline-block;
      margin-top: 25px;
      font-size: 15px;
    }
    .steps {
      text-align: left;
      margin-top: 30px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 14px;
      border: 1px solid #e5e7eb;
      font-size: 15px;
      line-height: 1.7;
    }
    .steps ol {
      margin: 0;
      padding-left: 20px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 22px 20px;
      text-align: center;
      border-top: 1px solid #f0f0f0;
    }
    .footer p {
      font-size: 13px;
      color: #6b7280;
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo-text">ADSC</div>
      <div class="badge">HACKATHON TEAM INVITATION</div>
    </div>

    <!-- Main Content -->
    <div class="content">
      <h1>🚀 You’re Invited to Join a Hackathon Team!</h1>
      <p>Dear <strong>{{name}}</strong>,</p>
      <p>You’ve been invited to join a team for the upcoming hackathon at Atmiya University. Since you’re not yet registered in our Event Management System (EMS), please follow the steps below to get started and respond to your invitation.</p>

      <div class="hackathon-card">
        <h2>{{HACKATHON_NAME}}</h2>
        <p class="detail"><strong>Registration Opens:</strong> {{REGISTRATION_DATE}}</p>
        <p class="detail"><strong>Hackathon Date:</strong> {{HACKATHON_DATE}}</p>
      </div>

      <div >
          <p class="button"><a class="" href="https://events-adsc-atmiya.vercel.app/hackathons/{{HACKATHON_ID}}" target="_blank">View Hackathon Details</a></p>
      <p class="button"><a class="" href="https://events-adsc-atmiya.vercel.app/register" target="_blank">Register Now</a></p>
      </div>

      <!-- Step-by-Step Guide -->
      <div class="steps">
        <h3>👉 How to Register & Respond to Your Invitation:</h3>
        <ol>
          <li>Go to <a href="https://events-adsc-atmiya.vercel.app/register" target="_blank">EMS Sign Up</a> page.</li>
          <li>Create your account using your email, name, and password.</li>
          <li>Check your inbox (or spam folder) and verify your email.</li>
          <li>Log in to EMS using your new credentials.</li>
          <li>Go to <strong>My Participations</strong> in your dashboard.</li>
          <li>Find your hackathon invitation for <strong>{{HACKATHON_NAME}}</strong>.</li>
          <li>Click <strong>Accept</strong> to confirm your participation or <strong>Decline</strong> if you cannot join.</li>
        </ol>
      </div>

      <p style="margin-top:20px;">We’re thrilled to have you on board. Let’s build something amazing together!<br>— ADSC Team</p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>© 2025 ADSC Event Management System. All rights reserved.</p>
      <p>This email was sent to {{email}}</p>
    </div>
  </div>
</body>
</html>
`;

interface HackathonEmailData {
  hackathonName: string;
  registrationStartDate: Date;
  registrationEndDate: Date;
  hackathonStartDate: Date;
  hackathonEndDate: Date;
  hackathonId: string;
  name: string;
  email: string;
}

export function generateHackathonInvitationEmail(data: HackathonEmailData) {
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  };

  const emailHtml = template
    .replace("{{HACKATHON_NAME}}", data.hackathonName)
    .replace("{{REGISTRATION_DATE}}", `${data.registrationStartDate.toLocaleDateString("en-IN", dateOptions)} - ${data.registrationEndDate.toLocaleDateString("en-IN", dateOptions)}`)
    .replace("{{HACKATHON_DATE}}", `${data.hackathonStartDate.toLocaleDateString("en-IN", dateOptions)} - ${data.hackathonEndDate.toLocaleDateString("en-IN", dateOptions)}`)
    .replace("{{HACKATHON_ID}}", data.hackathonId)
    .replace("{{name}}", data.name)
    .replace("{{email}}", data.email);

  return emailHtml;
}
