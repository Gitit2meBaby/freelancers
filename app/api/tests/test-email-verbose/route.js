// app/api/tests/test-email-verbose/route.js
import { NextResponse } from "next/server";

/**
 * POST /api/tests/test-email-verbose
 * Ultra-verbose email test that captures EVERYTHING
 */
export async function POST(request) {
  const logs = [];

  function log(message, data = null) {
    const logEntry = {
      time: new Date().toISOString(),
      message,
      ...(data && { data }),
    };
    logs.push(logEntry);
    console.log(`[${logEntry.time}] ${message}`, data || "");
  }

  try {
    const { to } = await request.json();

    if (!to) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing "to" parameter',
          logs,
        },
        { status: 400 },
      );
    }

    const tenantId = process.env.GRAPH_TENANT_ID;
    const clientId = process.env.GRAPH_CLIENT_ID;
    const clientSecret = process.env.GRAPH_CLIENT_SECRET;
    const senderEmail = process.env.GRAPH_SENDER_EMAIL;

    log("Starting email send test", {
      from: senderEmail,
      to: to,
      tenantId: tenantId,
      clientId: clientId,
    });

    // Step 1: Get token
    log("Step 1: Requesting access token");
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    log("Token response received", {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      log("Token request failed", { error: errorText });
      return NextResponse.json(
        {
          success: false,
          step: "Get Access Token",
          error: errorText,
          logs,
        },
        { status: 500 },
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    log("Access token obtained", {
      tokenLength: accessToken.length,
      expiresIn: tokenData.expires_in,
    });

    // Decode token
    try {
      const payload = JSON.parse(
        Buffer.from(accessToken.split(".")[1], "base64").toString(),
      );
      log("Token decoded", {
        appId: payload.appid,
        tenantId: payload.tid,
        roles: payload.roles,
        exp: new Date(payload.exp * 1000).toISOString(),
      });
    } catch (e) {
      log("Could not decode token", { error: e.message });
    }

    // Step 2: Prepare message
    log("Step 2: Preparing email message");

    const message = {
      message: {
        subject: "Test Email - Microsoft Graph API",
        body: {
          contentType: "HTML",
          content: `
            <h1>Test Email</h1>
            <p>This is a test email from the Freelancers Promotions system.</p>
            <p><strong>From:</strong> ${senderEmail}</p>
            <p><strong>To:</strong> ${to}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          `,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
      },
      saveToSentItems: true,
    };

    log("Message prepared", {
      subject: message.message.subject,
      recipientCount: message.message.toRecipients.length,
      contentLength: message.message.body.content.length,
    });

    // Step 3: Send email
    log("Step 3: Sending email to Graph API");
    const sendUrl = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;

    log("Calling endpoint", {
      url: sendUrl,
      method: "POST",
    });

    const sendResponse = await fetch(sendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    log("Send response received", {
      status: sendResponse.status,
      statusText: sendResponse.statusText,
      headers: Object.fromEntries(sendResponse.headers.entries()),
    });

    // CRITICAL: Get the full error response
    const responseText = await sendResponse.text();

    log("Response body received", {
      bodyLength: responseText.length,
      bodyPreview: responseText.substring(0, 500),
    });

    if (!sendResponse.ok) {
      log("Send failed", {
        status: sendResponse.status,
        body: responseText,
      });

      let errorDetails;
      try {
        errorDetails = JSON.parse(responseText);
      } catch {
        errorDetails = { raw: responseText };
      }

      // Check if it's an empty response
      if (!responseText || responseText.trim() === "") {
        log("ERROR: Empty response body from Graph API - this is unusual");
        errorDetails = {
          error: "Empty response",
          note: "Graph API returned no error details. This can happen when the mailbox truly does not exist or is not accessible.",
        };
      }

      return NextResponse.json(
        {
          success: false,
          step: "Send Email",
          statusCode: sendResponse.status,
          statusText: sendResponse.statusText,
          responseHeaders: Object.fromEntries(sendResponse.headers.entries()),
          error: errorDetails,
          logs,
          nextSteps: [
            "1. Check if info@freelancers.com.au is a USER mailbox (not alias/group)",
            "2. Verify the mailbox has Exchange Online license",
            "3. Try creating a shared mailbox: noreply@freelancers.com.au",
            "4. Check Exchange admin center for mailbox status",
          ],
        },
        { status: 500 },
      );
    }

    log("Email sent successfully!");

    return NextResponse.json({
      success: true,
      message: "Email sent successfully!",
      details: {
        from: senderEmail,
        to: to,
        sentAt: new Date().toISOString(),
      },
      logs,
    });
  } catch (error) {
    log("Unexpected error", {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
        logs,
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/tests/test-email-verbose",
    method: "POST",
    body: { to: "your-email@example.com" },
  });
}
