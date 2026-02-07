// app/api/new-job/route.js
import { NextResponse } from "next/server";
import {
  getNewJobNotification,
  getJobSubmissionConfirmation,
  sendJobEmail,
} from "../../lib/jobEmailTemplates";

/**
 * POST /api/new-job
 * Handles new job form submissions
 * Sends notification to admin and confirmation to submitter
 */
export async function POST(request) {
  try {
    // Parse form data
    const data = await request.json();

    // Validate required fields
    const requiredFields = [
      "jobTitle",
      "status",
      "jobType",
      "productionCompany",
      "contactName",
      "contactEmail",
    ];

    const missingFields = requiredFields.filter((field) => !data[field]);

    if (missingFields.length > 0) {
      console.error("❌ Missing fields:", missingFields);
      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.contactEmail)) {
      console.error("❌ Invalid email format:", data.contactEmail);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email address",
        },
        { status: 400 },
      );
    }

    // Validate status value
    const validStatuses = [
      "Awarded",
      "Quote Hold",
      "In Development",
      "Greenlit",
    ];
    if (!validStatuses.includes(data.status)) {
      console.error("❌ Invalid status:", data.status);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid job status",
        },
        { status: 400 },
      );
    }

    // Validate job type
    const validJobTypes = [
      "Documentary",
      "Feature Film",
      "TV Series",
      "Music Video",
      "Online Content",
      "Promotional",
      "Stills",
      "TV Commercial",
      "Stills and Motion",
    ];
    if (!validJobTypes.includes(data.jobType)) {
      console.error("❌ Invalid job type:", data.jobType);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid job type",
        },
        { status: 400 },
      );
    }

    // Sanitize input
    const sanitizedData = {
      jobTitle: data.jobTitle.trim().substring(0, 200),
      status: data.status,
      dateOfAward: data.dateOfAward || null,
      jobType: data.jobType,
      productionCompany: data.productionCompany.trim().substring(0, 200),
      productionManager: data.productionManager?.trim().substring(0, 100) || "",
      contactName: data.contactName.trim().substring(0, 100),
      contactNumber: data.contactNumber?.trim().substring(0, 20) || "",
      contactEmail: data.contactEmail.trim().toLowerCase().substring(0, 100),
      directorName: data.directorName?.trim().substring(0, 100) || "",
      producerName: data.producerName?.trim().substring(0, 100) || "",
      dopName: data.dopName?.trim().substring(0, 100) || "",
      jobBreakdown: data.jobBreakdown?.trim().substring(0, 2000) || "",
      location: data.location?.trim().substring(0, 200) || "",
      notes: data.notes?.trim().substring(0, 2000) || "",
      crewCheck: data.crewCheck?.trim().substring(0, 2000) || "",
    };

    // ==================================================
    // SEND EMAILS VIA MICROSOFT GRAPH API
    // ==================================================

    let adminEmailSuccess = false;
    let confirmationEmailSuccess = false;

    try {
      // 1. Send notification to admin

      const adminEmail = getNewJobNotification(sanitizedData);
      const adminEmailAddress =
        process.env.ADMIN_EMAIL || "info@freelancers.com.au";

      const adminResult = await sendJobEmail(adminEmailAddress, adminEmail);

      if (adminResult.success) {
        adminEmailSuccess = true;
      } else {
        console.error("❌ Failed to send admin notification");
        console.error("Error details:", adminResult.error);
      }
    } catch (error) {
      console.error("❌ Exception sending admin email:");
      console.error("  Message:", error.message);
      console.error("  Stack:", error.stack);
    }

    try {
      // 2. Send confirmation to submitter
      const confirmationEmail = getJobSubmissionConfirmation(sanitizedData);

      const confirmationResult = await sendJobEmail(
        sanitizedData.contactEmail,
        confirmationEmail,
      );

      if (confirmationResult.success) {
        confirmationEmailSuccess = true;
      } else {
        console.error("❌ Failed to send confirmation email");
        console.error("Error details:", confirmationResult.error);
      }
    } catch (error) {
      console.error("❌ Exception sending confirmation email:");
      console.error("  Message:", error.message);
      console.error("  Stack:", error.stack);
    }

    // ==================================================
    // RETURN RESPONSE
    // ==================================================

    // If admin email failed, this is critical - return error
    if (!adminEmailSuccess) {
      console.error(
        "❌ CRITICAL: Admin notification failed - returning error to user",
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to submit your job. Please try again or contact us directly at info@freelancers.com.au",
          details: {
            adminEmailSent: false,
            confirmationSent: confirmationEmailSuccess,
          },
        },
        { status: 500 },
      );
    }

    // Admin email succeeded
    return NextResponse.json({
      success: true,
      message:
        "Thank you for submitting your job. We have received your submission and will get back to you shortly.",
      details: {
        adminEmailSent: adminEmailSuccess,
        confirmationSent: confirmationEmailSuccess,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ ========================================");
    console.error("❌ NEW JOB SUBMISSION CRITICAL ERROR");
    console.error("❌ ========================================");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    return NextResponse.json(
      {
        success: false,
        error:
          "An error occurred while processing your submission. Please try again later or contact us directly at info@freelancers.com.au",
        ...(process.env.NODE_ENV === "production" && {
          details: error.message,
        }),
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/new-job
 * CORS preflight handler
 */
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
