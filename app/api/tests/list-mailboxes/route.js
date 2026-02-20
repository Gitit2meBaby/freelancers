// // app/api/tests/list-mailboxes/route.js
// import { NextResponse } from "next/server";

// /**
//  * GET /api/tests/list-mailboxes
//  * Lists all available mailboxes in the tenant
//  * Requires User.Read.All permission
//  */
// export async function GET() {
//   try {
//     const tenantId = process.env.GRAPH_TENANT_ID;
//     const clientId = process.env.GRAPH_CLIENT_ID;
//     const clientSecret = process.env.GRAPH_CLIENT_SECRET;

//     console.log("=== LISTING MAILBOXES ===");

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
//           error: "Failed to get access token",
//           details: error,
//         },
//         { status: 500 }
//       );
//     }

//     const tokenData = await tokenResponse.json();

//     // List all users
//     const usersUrl =
//       "https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,accountEnabled&$top=50";

//     const usersResponse = await fetch(usersUrl, {
//       headers: {
//         Authorization: `Bearer ${tokenData.access_token}`,
//       },
//     });

//     if (!usersResponse.ok) {
//       const errorText = await usersResponse.text();

//       let errorDetails;
//       try {
//         errorDetails = JSON.parse(errorText);
//       } catch (e) {
//         errorDetails = errorText;
//       }

//       // Check if it's a permissions error
//       if (usersResponse.status === 403) {
//         return NextResponse.json(
//           {
//             success: false,
//             error: "Missing User.Read.All permission",
//             statusCode: 403,
//             details: errorDetails,
//             instructions: [
//               "1. Go to Azure Portal → App registrations → Your app",
//               "2. Click 'API permissions'",
//               "3. Add permission → Microsoft Graph → Application permissions",
//               "4. Search for 'User.Read.All' and add it",
//               "5. Click 'Grant admin consent'",
//               "6. Wait 2-3 minutes and try again",
//             ],
//           },
//           { status: 403 }
//         );
//       }

//       return NextResponse.json(
//         {
//           success: false,
//           error: "Failed to list users",
//           statusCode: usersResponse.status,
//           details: errorDetails,
//         },
//         { status: 500 }
//       );
//     }

//     const usersData = await usersResponse.json();

//     // Format the results
//     const mailboxes = usersData.value.map((user) => ({
//       displayName: user.displayName,
//       email: user.mail || user.userPrincipalName,
//       userPrincipalName: user.userPrincipalName,
//       enabled: user.accountEnabled,
//       id: user.id,
//     }));

//     console.log(`✅ Found ${mailboxes.length} mailboxes`);

//     return NextResponse.json({
//       success: true,
//       message: `Found ${mailboxes.length} mailboxes in the tenant`,
//       mailboxes: mailboxes,
//       instructions: [
//         "Pick one of these emails to use as GRAPH_SENDER_EMAIL",
//         "The 'email' field is what you should use",
//         "Make sure 'enabled' is true",
//       ],
//       note: "If you don't see the expected mailboxes, they might not exist as user accounts in Azure AD",
//     });
//   } catch (error) {
//     console.error("❌ Error:", error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message,
//         stack: error.stack,
//       },
//       { status: 500 }
//     );
//   }
// }
