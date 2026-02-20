// // app/api/test-my-profile/route.js
// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth/next";
// import { authOptions } from "../../auth/[...nextauth]/route";
// import { executeQuery, VIEWS, TABLES } from "../../../lib/db";

// /**
//  * GET /api/test-my-profile
//  * Shows the current user's profile data directly from the database
//  * Includes both verified and unverified data
//  */
// export async function GET() {
//   try {
//     // Check authentication
//     const session = await getServerSession(authOptions);

//     if (!session || !session.user?.id) {
//       return NextResponse.json(
//         { success: false, error: "Not logged in" },
//         { status: 401 }
//       );
//     }

//     const freelancerId = parseInt(session.user.id);

//     console.log(`🔍 Checking profile data for FreelancerID: ${freelancerId}`);

//     // Get main profile data (from view - only shows what's on website)
//     const viewQuery = `
//       SELECT
//         FreelancerID,
//         Slug,
//         DisplayName,
//         FreelancerBio,
//         PhotoBlobID,
//         PhotoStatusID,
//         CVBlobID,
//         CVStatusID
//       FROM ${VIEWS.FREELANCERS}
//       WHERE FreelancerID = @freelancerId
//     `;

//     const viewData = await executeQuery(viewQuery, { freelancerId });

//     // Get ALL data from the actual table (including unverified)
//     const tableQuery = `
//       SELECT
//         FreelancerID,
//         DisplayName,
//         FreelancerBio,
//         PhotoBlobID,
//         PhotoStatusID,
//         CVBlobID,
//         CVStatusID
//       FROM ${TABLES.FREELANCER_WEBSITE_DATA}
//       WHERE FreelancerID = @freelancerId
//     `;

//     let tableData;
//     try {
//       tableData = await executeQuery(tableQuery, { freelancerId });
//     } catch (error) {
//       // If we don't have SELECT permission on table, that's OK
//       tableData = null;
//       console.log("ℹ️ No SELECT permission on table (using view only)");
//     }

//     // Get links
//     const linksQuery = `
//       SELECT
//         FreelancerWebsiteDataLinkID,
//         LinkName,
//         LinkURL
//       FROM ${VIEWS.FREELANCER_LINKS}
//       WHERE FreelancerID = @freelancerId
//     `;

//     const links = await executeQuery(linksQuery, { freelancerId });

//     // Status code meanings
//     const statusMeanings = {
//       0: "None",
//       1: "To Be Verified",
//       2: "Verified",
//       3: "Rejected",
//     };

//     return NextResponse.json({
//       success: true,
//       session: {
//         freelancerId: session.user.id,
//         name: session.user.name,
//         email: session.user.email,
//         slug: session.user.slug,
//       },
//       viewData: {
//         description: "Data from VIEW (what shows on website)",
//         data: viewData[0] || null,
//         photoStatus:
//           viewData[0]?.PhotoStatusID !== undefined
//             ? `${viewData[0].PhotoStatusID} = ${
//                 statusMeanings[viewData[0].PhotoStatusID]
//               }`
//             : "N/A",
//         cvStatus:
//           viewData[0]?.CVStatusID !== undefined
//             ? `${viewData[0].CVStatusID} = ${
//                 statusMeanings[viewData[0].CVStatusID]
//               }`
//             : "N/A",
//       },
//       tableData: tableData
//         ? {
//             description: "Data from TABLE (raw database, includes unverified)",
//             data: tableData[0] || null,
//             photoStatus:
//               tableData[0]?.PhotoStatusID !== undefined
//                 ? `${tableData[0].PhotoStatusID} = ${
//                     statusMeanings[tableData[0].PhotoStatusID]
//                   }`
//                 : "N/A",
//             cvStatus:
//               tableData[0]?.CVStatusID !== undefined
//                 ? `${tableData[0].CVStatusID} = ${
//                     statusMeanings[tableData[0].CVStatusID]
//                   }`
//                 : "N/A",
//           }
//         : {
//             description: "No SELECT permission on table",
//             data: null,
//           },
//       links: {
//         description: "Social media links",
//         count: links.length,
//         data: links.map((l) => ({
//           id: l.FreelancerWebsiteDataLinkID,
//           name: l.LinkName,
//           url: l.LinkURL || "(empty)",
//         })),
//       },
//       statusCodeReference: {
//         0: "None",
//         1: "To Be Verified (your recent changes)",
//         2: "Verified (shows on website)",
//         3: "Rejected (admin rejected)",
//       },
//     });
//   } catch (error) {
//     console.error("❌ Error:", error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message,
//       },
//       { status: 500 }
//     );
//   }
// }
