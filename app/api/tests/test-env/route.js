// // app/api/tests/check-env/route.js
// import { NextResponse } from "next/server";

// /**
//  * GET /api/tests/check-env
//  * Diagnostic endpoint to verify environment variables are loaded
//  * SECURITY WARNING: Remove this endpoint after debugging!
//  */
// export async function GET() {
//   const envVars = {
//     GRAPH_TENANT_ID: process.env.GRAPH_TENANT_ID ? "✅ Set" : "❌ Missing",
//     GRAPH_CLIENT_ID: process.env.GRAPH_CLIENT_ID ? "✅ Set" : "❌ Missing",
//     GRAPH_CLIENT_SECRET: process.env.GRAPH_CLIENT_SECRET
//       ? "✅ Set (hidden)"
//       : "❌ Missing",
//     GRAPH_SENDER_EMAIL: process.env.GRAPH_SENDER_EMAIL || "❌ Missing",
//     NODE_ENV: process.env.NODE_ENV,

//     // Show first/last 4 chars of IDs for verification (safe to display)
//     TENANT_ID_PREVIEW: process.env.GRAPH_TENANT_ID
//       ? `${process.env.GRAPH_TENANT_ID.substring(
//           0,
//           4
//         )}...${process.env.GRAPH_TENANT_ID.substring(
//           process.env.GRAPH_TENANT_ID.length - 4
//         )}`
//       : "Not set",
//     CLIENT_ID_PREVIEW: process.env.GRAPH_CLIENT_ID
//       ? `${process.env.GRAPH_CLIENT_ID.substring(
//           0,
//           4
//         )}...${process.env.GRAPH_CLIENT_ID.substring(
//           process.env.GRAPH_CLIENT_ID.length - 4
//         )}`
//       : "Not set",
//   };

//   return NextResponse.json({
//     message: "Environment Variables Check",
//     variables: envVars,
//     allVariablesSet:
//       process.env.GRAPH_TENANT_ID &&
//       process.env.GRAPH_CLIENT_ID &&
//       process.env.GRAPH_CLIENT_SECRET &&
//       process.env.GRAPH_SENDER_EMAIL,
//     warning:
//       "⚠️ DELETE THIS ENDPOINT AFTER DEBUGGING - DO NOT LEAVE IN PRODUCTION",
//   });
// }
