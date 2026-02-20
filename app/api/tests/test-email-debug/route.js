// // app/api/tests/test-email-debug/route.js
// import { NextResponse } from "next/server";

// /**
//  * GET /api/tests/test-email-debug
//  * Detailed diagnostic that shows exact Graph API errors
//  */
// export async function GET() {
//   try {
//     const tenantId = process.env.GRAPH_TENANT_ID;
//     const clientId = process.env.GRAPH_CLIENT_ID;
//     const clientSecret = process.env.GRAPH_CLIENT_SECRET;
//     const senderEmail = process.env.GRAPH_SENDER_EMAIL;

//     console.log("=== GRAPH API DEBUG ===");
//     console.log("Tenant ID:", tenantId);
//     console.log("Client ID:", clientId);
//     console.log("Sender Email:", senderEmail);

//     // Step 1: Get access token
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
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: params.toString(),
//     });

//     if (!tokenResponse.ok) {
//       const errorText = await tokenResponse.text();
//       console.error("❌ Token request failed:", errorText);
//       return NextResponse.json(
//         {
//           step: "1. Get Access Token",
//           success: false,
//           error: "Failed to get access token",
//           statusCode: tokenResponse.status,
//           details: errorText,
//         },
//         { status: 500 },
//       );
//     }

//     const tokenData = await tokenResponse.json();
//     console.log("✅ Access token obtained");

//     // Step 2: Try to access the mailbox
//     console.log("\n2️⃣ Checking mailbox access...");
//     const mailboxUrl = `https://graph.microsoft.com/v1.0/users/${senderEmail}`;

//     const mailboxResponse = await fetch(mailboxUrl, {
//       headers: {
//         Authorization: `Bearer ${tokenData.access_token}`,
//       },
//     });

//     const mailboxResponseText = await mailboxResponse.text();

//     if (!mailboxResponse.ok) {
//       console.error("❌ Mailbox access failed");
//       console.error("Status:", mailboxResponse.status);
//       console.error("Response:", mailboxResponseText);

//       let errorDetails;
//       try {
//         errorDetails = JSON.parse(mailboxResponseText);
//       } catch (e) {
//         errorDetails = mailboxResponseText;
//       }

//       return NextResponse.json(
//         {
//           step: "2. Check Mailbox Access",
//           success: false,
//           statusCode: mailboxResponse.status,
//           senderEmail: senderEmail,
//           error: errorDetails,
//           possibleCauses: [
//             "Mailbox doesn't exist in this tenant",
//             "App needs User.Read.All permission to check mailboxes",
//             "Email address is incorrect or is an alias/group, not a mailbox",
//           ],
//           nextSteps: [
//             "1. Verify info@freelancers.com.au exists as a user mailbox (not just an alias)",
//             "2. Add User.Read.All permission in Azure AD (optional, for diagnostics)",
//             "3. Try sending an email directly - Mail.Send might work even if User.Read fails",
//           ],
//         },
//         { status: 500 },
//       );
//     }

//     const mailboxData = JSON.parse(mailboxResponseText);
//     console.log("✅ Mailbox access successful");
//     console.log("Mailbox data:", mailboxData);

//     return NextResponse.json({
//       success: true,
//       message: "All checks passed! Email system is ready.",
//       mailbox: {
//         email: mailboxData.mail || mailboxData.userPrincipalName,
//         displayName: mailboxData.displayName,
//         id: mailboxData.id,
//       },
//       nextStep: "Try sending a test email with POST /api/tests/test-email",
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
//  * POST /api/tests/test-email-debug
//  * Actually try to SEND an email (the real test)
//  */
// export async function POST(request) {
//   try {
//     const { to } = await request.json();

//     if (!to) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: 'Please provide "to" email address in request body',
//           example: { to: "your-email@example.com" },
//         },
//         { status: 400 },
//       );
//     }

//     const tenantId = process.env.GRAPH_TENANT_ID;
//     const clientId = process.env.GRAPH_CLIENT_ID;
//     const clientSecret = process.env.GRAPH_CLIENT_SECRET;
//     const senderEmail = process.env.GRAPH_SENDER_EMAIL;

//     console.log("=== SENDING TEST EMAIL ===");
//     console.log("From:", senderEmail);
//     console.log("To:", to);

//     // Get access token
//     const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
//     const params = new URLSearchParams({
//       client_id: clientId,
//       client_secret: clientSecret,
//       scope: "https://graph.microsoft.com/.default",
//       grant_type: "client_credentials",
//     });

//     const tokenResponse = await fetch(tokenEndpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: params.toString(),
//     });

//     if (!tokenResponse.ok) {
//       const error = await tokenResponse.text();
//       return NextResponse.json(
//         {
//           success: false,
//           error: "Failed to get token",
//           details: error,
//         },
//         { status: 500 },
//       );
//     }

//     const tokenData = await tokenResponse.json();

//     // Prepare email
//     const message = {
//       message: {
//         subject: "Test Email from Freelancers Promotions",
//         body: {
//           contentType: "HTML",
//           content: `
//             <h1>✅ Email System Working!</h1>
//             <p>This is a test email from the Freelancers Promotions contact form system.</p>
//             <p><strong>Sent from:</strong> ${senderEmail}</p>
//             <p><strong>Sent to:</strong> ${to}</p>
//             <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
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

//     // Send email
//     const sendUrl = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;

//     const sendResponse = await fetch(sendUrl, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${tokenData.access_token}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(message),
//     });

//     if (!sendResponse.ok) {
//       const errorText = await sendResponse.text();
//       console.error("❌ Send failed:", errorText);

//       let errorDetails;
//       try {
//         errorDetails = JSON.parse(errorText);
//       } catch (e) {
//         errorDetails = errorText;
//       }

//       return NextResponse.json(
//         {
//           success: false,
//           error: "Failed to send email",
//           statusCode: sendResponse.status,
//           details: errorDetails,
//           from: senderEmail,
//           to: to,
//         },
//         { status: 500 },
//       );
//     }

//     console.log("✅ Email sent successfully!");

//     return NextResponse.json({
//       success: true,
//       message: `Email sent successfully from ${senderEmail} to ${to}`,
//       checkInbox: `Check ${to} inbox (including spam folder)`,
//     });
//   } catch (error) {
//     console.error("❌ Error:", error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message,
//       },
//       { status: 500 },
//     );
//   }
// }
