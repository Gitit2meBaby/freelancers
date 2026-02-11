// // app/api/tests/test-email-live/route.js
// import { NextResponse } from "next/server";
// import { testGraphConnection, sendGraphEmail } from "../../lib/graphClient";

// /**
//  * GET /api/test-email
//  * Tests Microsoft Graph API connection and credentials
//  */
// export async function GET() {
//   try {
//     console.log("🧪 Testing Graph API connection...");

//     // Test 1: Check environment variables
//     const envCheck = {
//       hasTenantId: !!process.env.GRAPH_TENANT_ID,
//       hasClientId: !!process.env.GRAPH_CLIENT_ID,
//       hasClientSecret: !!process.env.GRAPH_CLIENT_SECRET,
//       hasSenderEmail: !!process.env.GRAPH_SENDER_EMAIL,
//       senderEmail: process.env.GRAPH_SENDER_EMAIL || "NOT SET",
//     };

//     console.log("📋 Environment variables:", envCheck);

//     // Test 2: Try to get access token and verify mailbox
//     const connectionTest = await testGraphConnection();

//     console.log("🔐 Connection test result:", connectionTest);

//     return NextResponse.json({
//       success: connectionTest.success,
//       environment: envCheck,
//       connection: connectionTest,
//       timestamp: new Date().toISOString(),
//     });
//   } catch (error) {
//     console.error("❌ Test endpoint error:", error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message,
//         stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
//       },
//       { status: 500 },
//     );
//   }
// }

// /**
//  * POST /api/test-email
//  * Sends a test email to verify Graph API works end-to-end
//  * Body: { "to": "your-test-email@example.com" }
//  */
// export async function POST(request) {
//   try {
//     const { to } = await request.json();

//     if (!to) {
//       return NextResponse.json(
//         { success: false, error: "Missing 'to' email address" },
//         { status: 400 },
//       );
//     }

//     console.log(`🧪 Sending test email to: ${to}`);

//     const senderEmail =
//       process.env.GRAPH_SENDER_EMAIL || "info@freelancers.com.au";

//     const result = await sendGraphEmail(
//       senderEmail,
//       to,
//       "Test Email from Freelancers Promotions",
//       `
//         <html>
//           <body style="font-family: Arial, sans-serif; padding: 20px;">
//             <h1 style="color: #4CAF50;">✅ Test Email Success!</h1>
//             <p>If you can read this, the Microsoft Graph API is working correctly on your Azure deployment.</p>
//             <hr>
//             <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
//             <p><strong>Sender:</strong> ${senderEmail}</p>
//             <p><strong>Recipient:</strong> ${to}</p>
//           </body>
//         </html>
//       `,
//     );

//     console.log("📧 Email send result:", result);

//     return NextResponse.json({
//       success: result.success,
//       result: result,
//       timestamp: new Date().toISOString(),
//     });
//   } catch (error) {
//     console.error("❌ Test email send error:", error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message,
//         stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
//       },
//       { status: 500 },
//     );
//   }
// }
