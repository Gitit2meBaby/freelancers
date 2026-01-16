// /api/tests/test-email/route.js
import { NextResponse } from "next/server";
import { testGraphConnection, sendGraphEmail } from "../../../lib/graphClient";

/**
 * GET /api/tests/test-email
 * Tests the Microsoft Graph API connection
 * Returns connection status and mailbox information
 *
 * USAGE:
 * curl https://freelancers.com.au/api/tests/test-email
 * or visit in browser
 */
export async function GET() {
  try {
    console.log("🧪 Testing Graph API connection...");

    const result = await testGraphConnection();

    if (result.success) {
      console.log("✅ Graph API connection successful");
      return NextResponse.json({
        success: true,
        message: "Microsoft Graph API is configured correctly",
        mailbox: result.mailbox,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error("❌ Graph API connection failed:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          help: "Check your GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, and GRAPH_SENDER_EMAIL environment variables",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tests/test-email
 * Sends a test email via Microsoft Graph API
 * Requires { "to": "recipient@example.com" } in request body
 *
 * USAGE:
 * curl -X POST https://freelancers.com.au/api/test-email \
 *   -H "Content-Type: application/json" \
 *   -d '{"to":"your-email@example.com"}'
 */
export async function POST(request) {
  try {
    const { to } = await request.json();

    if (!to) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing "to" field in request body',
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email address",
        },
        { status: 400 }
      );
    }

    console.log(`🧪 Sending test email to ${to}...`);

    const senderEmail =
      process.env.GRAPH_SENDER_EMAIL || "info@freelancers.com.au";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #7a8450;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .success {
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .info {
      background-color: #e7f3ff;
      border-left: 4px solid #2196F3;
      padding: 15px;
      margin: 20px 0;
    }
    .timestamp {
      color: #666;
      font-size: 14px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎬 Freelancers Promotions</h1>
    <p>Microsoft Graph API Test Email</p>
  </div>
  <div class="content">
    <div class="success">
      <h2>✅ Email System Working!</h2>
      <p>If you can read this email, your Microsoft Graph API integration is working correctly.</p>
    </div>
    
    <div class="info">
      <h3>Configuration Details:</h3>
      <ul>
        <li><strong>Sender:</strong> ${senderEmail}</li>
        <li><strong>Recipient:</strong> ${to}</li>
        <li><strong>Method:</strong> Microsoft Graph API</li>
        <li><strong>Environment:</strong> ${
          process.env.NODE_ENV || "production"
        }</li>
      </ul>
    </div>
    
    <h3>Next Steps:</h3>
    <ol>
      <li>Verify this email arrived in your inbox</li>
      <li>Check that sender is info@freelancers.com.au</li>
      <li>Test the contact form at <a href="https://freelancers.com.au/contact-us">https://freelancers.com.au/contact-us</a></li>
    </ol>
    
    <p>If you received this email, your email system is ready for production! 🚀</p>
    
    <div class="timestamp">
      <strong>Sent:</strong> ${new Date().toLocaleString("en-AU", {
        dateStyle: "full",
        timeStyle: "long",
        timeZone: "Australia/Melbourne",
      })}
    </div>
  </div>
</body>
</html>
    `;

    const result = await sendGraphEmail(
      senderEmail,
      to,
      "Test Email - Freelancers Promotions",
      htmlContent
    );

    if (result.success) {
      console.log(`✅ Test email sent successfully to ${to}`);
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${to}`,
        details: {
          from: senderEmail,
          to: to,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      console.error(`❌ Failed to send test email:`, result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Test email error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * TESTING CHECKLIST:
 *
 * 1. Test Connection (GET)
 *    ✓ Visit: https://freelancers.com.au/api/test-email
 *    ✓ Should return success with mailbox info
 *    ✓ If fails, check environment variables
 *
 * 2. Test Email Sending (POST)
 *    ✓ Use curl or browser fetch to POST with your email
 *    ✓ Check inbox for test email
 *    ✓ Verify sender is info@freelancers.com.au
 *
 * 3. Test Contact Form
 *    ✓ Go to https://freelancers.com.au/contact-us
 *    ✓ Fill out form with valid data
 *    ✓ Submit and verify two emails:
 *      - Admin notification to info@freelancers.com.au
 *      - Auto-reply to your test email
 *
 * SECURITY NOTE:
 * Consider removing or protecting this endpoint in production
 * to prevent abuse or information disclosure.
 *
 * Options:
 * 1. Delete this file after testing
 * 2. Add authentication check
 * 3. Add IP whitelist
 * 4. Disable in production via environment variable
 */
