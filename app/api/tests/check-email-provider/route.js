// app/api/tests/check-email-provider/route.js
import { NextResponse } from "next/server";

/**
 * GET /api/tests/check-email-provider
 * Checks MX records to determine where freelancers.com.au emails are hosted
 */
export async function GET() {
  try {
    const domain = "freelancers.com.au";

    console.log(`🔍 Checking email provider for ${domain}...`);

    // Use Google's DNS-over-HTTPS API to check MX records
    const dnsUrl = `https://dns.google/resolve?name=${domain}&type=MX`;

    const response = await fetch(dnsUrl);

    if (!response.ok) {
      throw new Error(`DNS lookup failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.Answer || data.Answer.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No MX records found",
        message: "The domain might not have email configured",
      });
    }

    // Parse MX records
    const mxRecords = data.Answer.filter((record) => record.type === 15) // MX record type
      .map((record) => {
        const parts = record.data.split(" ");
        return {
          priority: parseInt(parts[0]),
          mailServer: parts[1],
        };
      })
      .sort((a, b) => a.priority - b.priority);

    // Determine provider based on mail server
    let provider = "Unknown";
    let providerDetails = {};
    const primaryMailServer = mxRecords[0]?.mailServer.toLowerCase() || "";

    if (
      primaryMailServer.includes("outlook.com") ||
      primaryMailServer.includes("microsoft.com") ||
      primaryMailServer.includes("protection.outlook.com")
    ) {
      provider = "Microsoft 365 / Exchange Online";
      providerDetails = {
        type: "Microsoft 365",
        graphApiCompatible: true,
        notes: [
          "✅ Emails are hosted on Microsoft 365",
          "✅ You can use Microsoft Graph API",
          "❌ BUT: Your Azure AD tenant doesn't have mailboxes set up",
          "📋 Action needed: Link your Azure AD to Microsoft 365 mailboxes",
        ],
        nextSteps: [
          "1. Go to Microsoft 365 Admin Center (admin.microsoft.com)",
          "2. Verify your subscription includes Exchange Online",
          "3. Check if mailboxes exist under Users > Active Users",
          "4. If no mailboxes exist, you need to create them or upgrade your license",
        ],
      };
    } else if (
      primaryMailServer.includes("google.com") ||
      primaryMailServer.includes("googlemail.com")
    ) {
      provider = "Google Workspace (Gmail)";
      providerDetails = {
        type: "Google Workspace",
        graphApiCompatible: false,
        notes: [
          "❌ Emails are hosted on Google, not Microsoft",
          "❌ Cannot use Microsoft Graph API for sending emails",
          "✅ You need to use Gmail API or SMTP instead",
        ],
        nextSteps: [
          "Option 1: Use Gmail API (requires Google Cloud setup)",
          "Option 2: Use SMTP with app password",
          "Option 3: Use SendGrid/similar service",
        ],
      };
    } else if (primaryMailServer.includes("mailgun.org")) {
      provider = "Mailgun";
      providerDetails = {
        type: "Mailgun",
        graphApiCompatible: false,
        notes: ["Using Mailgun email service"],
      };
    } else if (primaryMailServer.includes("sendgrid.net")) {
      provider = "SendGrid";
      providerDetails = {
        type: "SendGrid",
        graphApiCompatible: false,
        notes: ["Using SendGrid email service"],
      };
    }

    return NextResponse.json({
      success: true,
      domain: domain,
      provider: provider,
      mxRecords: mxRecords,
      details: providerDetails,
      conclusion:
        provider === "Microsoft 365 / Exchange Online"
          ? "Your emails ARE on Microsoft - but your Azure AD isn't connected to mailboxes yet"
          : `Your emails are hosted on ${provider} - Microsoft Graph won't work`,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        fallback:
          "You can also check MX records at: https://mxtoolbox.com/SuperTool.aspx?action=mx%3afreelancers.com.au",
      },
      { status: 500 }
    );
  }
}
