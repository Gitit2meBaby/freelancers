// // app/api/tests/test-email-direct/route.js
// import { NextResponse } from "next/server";

// /**
//  * POST /api/tests/test-email-direct
//  *
//  * Directly attempts to SEND email without checking mailbox first
//  * This is the real test - Mail.Send permission is separate from User.Read
//  *
//  * Usage:
//  * POST http://localhost:3000/api/tests/test-email-direct
//  * Body: { "to": "info@freelancers.com.au" }
//  */
// export async function POST(request) {
//   try {
//     const { to } = await request.json();

//     if (!to) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: 'Please provide "to" email address in request body',
//           example: { to: "info@freelancers.com.au" },
//         },
//         { status: 400 },
//       );
//     }

//     const tenantId = process.env.GRAPH_TENANT_ID;
//     const clientId = process.env.GRAPH_CLIENT_ID;
//     const clientSecret = process.env.GRAPH_CLIENT_SECRET;
//     const senderEmail = process.env.GRAPH_SENDER_EMAIL;

//     console.log("🔍 ========================================");
//     console.log("🔍 DIRECT EMAIL SEND TEST");
//     console.log("🔍 ========================================");
//     console.log("📤 From:", senderEmail);
//     console.log("📥 To:", to);
//     console.log("🔑 Tenant ID:", tenantId);
//     console.log("🔑 Client ID:", clientId);

//     // Step 1: Get Access Token
//     console.log("\n1️⃣ Getting access token...");
//     const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

//     const params = new URLSearchParams({
//       client_id: clientId,
//       client_secret: clientSecret,
//       scope: "https://graph.microsoft.com/.default",
//       grant_type: "client_credentials",
//     });

//     const tokenResponse = await fetch(tokenEndpoint, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded",
//       },
//       body: params.toString(),
//     });

//     if (!tokenResponse.ok) {
//       const errorText = await tokenResponse.text();
//       console.error("❌ Token request failed");
//       console.error("Status:", tokenResponse.status);
//       console.error("Response:", errorText);

//       let errorDetails;
//       try {
//         errorDetails = JSON.parse(errorText);
//       } catch {
//         errorDetails = { raw: errorText };
//       }

//       return NextResponse.json(
//         {
//           step: "Get Access Token",
//           success: false,
//           statusCode: tokenResponse.status,
//           error: errorDetails,
//           diagnosis: "Failed to authenticate with Azure AD",
//           possibleCauses: [
//             "Invalid GRAPH_TENANT_ID, GRAPH_CLIENT_ID, or GRAPH_CLIENT_SECRET",
//             "Client secret expired",
//             "App not found in tenant",
//           ],
//         },
//         { status: 500 },
//       );
//     }

//     const tokenData = await tokenResponse.json();
//     const accessToken = tokenData.access_token;

//     console.log("✅ Access token obtained");
//     console.log("🔍 Token length:", accessToken.length);

//     // Decode token to inspect permissions
//     try {
//       const payload = JSON.parse(
//         Buffer.from(accessToken.split(".")[1], "base64").toString(),
//       );
//       console.log("🔍 Token claims:");
//       console.log("   - Roles:", payload.roles?.join(", ") || "NONE");
//       console.log("   - App ID:", payload.appid);
//       console.log("   - Tenant ID:", payload.tid);

//       if (!payload.roles || !payload.roles.includes("Mail.Send")) {
//         console.warn("⚠️  WARNING: Mail.Send role not in token!");
//         console.warn("⚠️  This means admin consent was not granted properly");
//       }
//     } catch (decodeError) {
//       console.warn("⚠️  Could not decode token");
//     }

//     // Step 2: Prepare Email Message
//     console.log("\n2️⃣ Preparing email message...");

//     const message = {
//       message: {
//         subject: "✅ Test Email - Freelancers Promotions System",
//         body: {
//           contentType: "HTML",
//           content: `
// <!DOCTYPE html>
// <html>
// <head>
//   <style>
//     body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//     .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//     .header { background: #7a8450; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
//     .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
//     .success { color: #28a745; font-weight: bold; }
//     .info { background: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 15px 0; }
//   </style>
// </head>
// <body>
//   <div class="container">
//     <div class="header">
//       <h1>✅ Email System Test</h1>
//     </div>
//     <div class="content">
//       <h2 class="success">Success! Email system is working.</h2>

//       <div class="info">
//         <strong>Test Details:</strong><br>
//         📤 <strong>From:</strong> ${senderEmail}<br>
//         📥 <strong>To:</strong> ${to}<br>
//         🕐 <strong>Sent:</strong> ${new Date().toLocaleString("en-AU", {
//           timeZone: "Australia/Melbourne",
//           dateStyle: "full",
//           timeStyle: "long",
//         })}<br>
//         🌐 <strong>System:</strong> Freelancers Promotions Contact Form
//       </div>

//       <p>
//         This test email confirms that the Microsoft Graph API integration
//         is working correctly and the system can send emails.
//       </p>

//       <h3>What This Means:</h3>
//       <ul>
//         <li>✅ Azure AD authentication successful</li>
//         <li>✅ Mail.Send permission granted and working</li>
//         <li>✅ Sender mailbox is functional</li>
//         <li>✅ Contact form emails will now work</li>
//       </ul>

//       <p style="color: #666; font-size: 14px; margin-top: 30px;">
//         <em>This is an automated test email from the Freelancers Promotions
//         website. No action is required.</em>
//       </p>
//     </div>
//   </div>
// </body>
// </html>
//           `,
//         },
//         toRecipients: [
//           {
//             emailAddress: {
//               address: to,
//             },
//           },
//         ],
//       },
//       saveToSentItems: true,
//     };

//     console.log("✅ Email message prepared");
//     console.log("📋 Subject:", message.message.subject);
//     console.log("📏 HTML content length:", message.message.body.content.length);

//     // Step 3: Send Email
//     console.log("\n3️⃣ Sending email via Graph API...");
//     const sendUrl = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;
//     console.log("🔗 Endpoint:", sendUrl);

//     const sendResponse = await fetch(sendUrl, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(message),
//     });

//     console.log("📊 Response status:", sendResponse.status);

//     if (!sendResponse.ok) {
//       const errorText = await sendResponse.text();
//       console.error("❌ ========================================");
//       console.error("❌ EMAIL SEND FAILED");
//       console.error("❌ ========================================");
//       console.error("Status:", sendResponse.status);
//       console.error("Response:", errorText);

//       let errorDetails;
//       try {
//         errorDetails = JSON.parse(errorText);
//       } catch {
//         errorDetails = { raw: errorText };
//       }

//       // Provide specific diagnosis based on status code
//       let diagnosis = "";
//       let possibleCauses = [];
//       let actionSteps = [];

//       if (sendResponse.status === 401) {
//         diagnosis = "Authentication/Authorization Failed";
//         possibleCauses = [
//           "Admin consent not granted for Mail.Send permission",
//           "Mail.Send permission not added to app registration",
//           "Permissions not propagated yet (wait 10 minutes after granting)",
//           "Token doesn't include Mail.Send role (check token claims above)",
//         ];
//         actionSteps = [
//           "1. Go to Azure Portal → App registrations → Your app",
//           "2. Navigate to 'API permissions'",
//           "3. Click 'Grant admin consent for [Organization]'",
//           "4. Wait 10 minutes for permissions to propagate",
//           "5. Restart your application",
//           "6. Run this test again",
//         ];
//       } else if (sendResponse.status === 403) {
//         diagnosis =
//           "Forbidden - App lacks permission to send from this mailbox";
//         possibleCauses = [
//           "Mail.Send permission added but admin consent not granted",
//           "Using wrong permission type (should be Application, not Delegated)",
//         ];
//         actionSteps = [
//           "1. Check API permissions shows 'Application' not 'Delegated'",
//           "2. Grant admin consent",
//           "3. Wait 10 minutes",
//         ];
//       } else if (sendResponse.status === 404) {
//         diagnosis = "Sender mailbox not found";
//         possibleCauses = [
//           `Mailbox '${senderEmail}' doesn't exist in tenant`,
//           "Email is an alias or distribution list, not a mailbox",
//           "Email lacks Exchange Online license",
//         ];
//         actionSteps = [
//           "1. Verify the email exists in Microsoft 365 Admin Center",
//           "2. Check it's a USER mailbox (not just an email alias)",
//           "3. Ensure user has Exchange Online license",
//           "4. Or create a shared mailbox (no license needed)",
//         ];
//       } else if (sendResponse.status === 400) {
//         diagnosis = "Bad Request - Invalid email message format";
//         possibleCauses = [
//           "Malformed email message",
//           "Invalid recipient email address",
//           "Missing required fields",
//         ];
//         actionSteps = [
//           "Check the message structure in logs above",
//           "Verify recipient email is valid",
//         ];
//       }

//       return NextResponse.json(
//         {
//           step: "Send Email",
//           success: false,
//           statusCode: sendResponse.status,
//           error: errorDetails,
//           from: senderEmail,
//           to: to,
//           diagnosis: diagnosis,
//           possibleCauses: possibleCauses,
//           actionSteps: actionSteps,
//         },
//         { status: 500 },
//       );
//     }

//     console.log("✅ ========================================");
//     console.log("✅ EMAIL SENT SUCCESSFULLY!");
//     console.log("✅ ========================================");
//     console.log(`📧 Email sent from ${senderEmail} to ${to}`);
//     console.log(`📬 Check inbox at ${to} (including spam folder)`);

//     return NextResponse.json({
//       success: true,
//       message: `✅ Email sent successfully!`,
//       details: {
//         from: senderEmail,
//         to: to,
//         subject: message.message.subject,
//         sentAt: new Date().toISOString(),
//       },
//       nextSteps: [
//         `Check inbox at ${to} (including spam folder)`,
//         "If email received, your contact form will work!",
//         "The 404 error on mailbox check can be ignored - Mail.Send works separately",
//       ],
//     });
//   } catch (error) {
//     console.error("❌ Unexpected error:", error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message,
//         stack: error.stack,
//       },
//       { status: 500 },
//     );
//   }
// }

// /**
//  * GET /api/tests/test-email-direct
//  * Show usage instructions
//  */
// export async function GET() {
//   return NextResponse.json({
//     endpoint: "/api/tests/test-email-direct",
//     method: "POST",
//     description:
//       "Directly tests email sending without checking mailbox existence first",
//     usage: {
//       method: "POST",
//       body: {
//         to: "info@freelancers.com.au",
//       },
//     },
//     example: `
// curl -X POST http://localhost:3000/api/tests/test-email-direct \\
//   -H "Content-Type: application/json" \\
//   -d '{"to":"info@freelancers.com.au"}'
//     `,
//     note: "The 404 error when checking mailbox can be ignored. Mail.Send permission works independently of User.Read permission.",
//   });
// }
