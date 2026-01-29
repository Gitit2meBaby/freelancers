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
  console.log("🔷 ========================================");
  console.log("🔷 NEW JOB SUBMISSION START");
  console.log("🔷 Timestamp:", new Date().toISOString());
  console.log("🔷 ========================================");

  try {
    // Parse form data
    console.log("📥 Parsing request body...");
    const data = await request.json();
    console.log("✅ Request parsed successfully");
    console.log("📊 Raw data fields:", Object.keys(data));

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
    console.log("✅ All required fields present");

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
    console.log("✅ Email format valid");

    // Validate status value
    const validStatuses = [
      "Awarded",
      "Quote Hold",
      "In Development",
      "Greenlit",
    ];
    if (!validStatuses.includes(data.status)) {
      console.error("❌ Invalid status:", data.status);
      console.log("Valid statuses:", validStatuses);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid job status",
        },
        { status: 400 },
      );
    }
    console.log("✅ Status valid:", data.status);

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
      console.log("Valid job types:", validJobTypes);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid job type",
        },
        { status: 400 },
      );
    }
    console.log("✅ Job type valid:", data.jobType);

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

    console.log("📋 Sanitized job submission data:");
    console.log("  Job Title:", sanitizedData.jobTitle);
    console.log("  Status:", sanitizedData.status);
    console.log(
      "  Date of Award:",
      sanitizedData.dateOfAward || "(not provided)",
    );
    console.log("  Job Type:", sanitizedData.jobType);
    console.log("  Production Company:", sanitizedData.productionCompany);
    console.log(
      "  Production Manager:",
      sanitizedData.productionManager || "(not provided)",
    );
    console.log("  Contact Name:", sanitizedData.contactName);
    console.log(
      "  Contact Number:",
      sanitizedData.contactNumber || "(not provided)",
    );
    console.log("  Contact Email:", sanitizedData.contactEmail);
    console.log("  Director:", sanitizedData.directorName || "(not provided)");
    console.log("  Producer:", sanitizedData.producerName || "(not provided)");
    console.log("  DOP:", sanitizedData.dopName || "(not provided)");
    console.log(
      "  Job Breakdown length:",
      sanitizedData.jobBreakdown.length,
      "chars",
    );
    console.log("  Location:", sanitizedData.location || "(not provided)");
    console.log("  Notes length:", sanitizedData.notes.length, "chars");
    console.log(
      "  Crew Check length:",
      sanitizedData.crewCheck.length,
      "chars",
    );

    // Check environment variables
    console.log("🔧 Environment check:");
    console.log(
      "  GRAPH_TENANT_ID:",
      process.env.GRAPH_TENANT_ID ? "✅ SET" : "❌ MISSING",
    );
    console.log(
      "  GRAPH_CLIENT_ID:",
      process.env.GRAPH_CLIENT_ID ? "✅ SET" : "❌ MISSING",
    );
    console.log(
      "  GRAPH_CLIENT_SECRET:",
      process.env.GRAPH_CLIENT_SECRET ? "✅ SET" : "❌ MISSING",
    );
    console.log(
      "  GRAPH_SENDER_EMAIL:",
      process.env.GRAPH_SENDER_EMAIL || "❌ NOT SET",
    );
    console.log(
      "  ADMIN_EMAIL:",
      process.env.ADMIN_EMAIL || "Using default: info@freelancers.com.au",
    );

    // ==================================================
    // SEND EMAILS VIA MICROSOFT GRAPH API
    // ==================================================

    let adminEmailSuccess = false;
    let confirmationEmailSuccess = false;

    try {
      // 1. Send notification to admin
      console.log("📤 ========================================");
      console.log("📤 SENDING ADMIN NOTIFICATION");
      console.log("📤 ========================================");

      const adminEmail = getNewJobNotification(sanitizedData);
      const adminEmailAddress =
        process.env.ADMIN_EMAIL || "info@freelancers.com.au";

      console.log("📬 Admin email address:", adminEmailAddress);
      console.log("📝 Email subject:", adminEmail.subject);

      const adminResult = await sendJobEmail(adminEmailAddress, adminEmail);

      console.log("📊 Admin email result:", {
        success: adminResult.success,
        hasError: !!adminResult.error,
        errorMessage: adminResult.error || "none",
      });

      if (adminResult.success) {
        console.log("✅ Admin notification sent successfully");
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
      console.log("📤 ========================================");
      console.log("📤 SENDING SUBMITTER CONFIRMATION");
      console.log("📤 ========================================");

      const confirmationEmail = getJobSubmissionConfirmation(sanitizedData);

      console.log("📬 Submitter email address:", sanitizedData.contactEmail);
      console.log("📝 Email subject:", confirmationEmail.subject);

      const confirmationResult = await sendJobEmail(
        sanitizedData.contactEmail,
        confirmationEmail,
      );

      console.log("📊 Confirmation email result:", {
        success: confirmationResult.success,
        hasError: !!confirmationResult.error,
        errorMessage: confirmationResult.error || "none",
      });

      if (confirmationResult.success) {
        console.log("✅ Confirmation email sent successfully");
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

    console.log("📊 ========================================");
    console.log("📊 FINAL RESULTS");
    console.log("📊 ========================================");
    console.log("  Admin email sent:", adminEmailSuccess ? "✅" : "❌");
    console.log(
      "  Confirmation email sent:",
      confirmationEmailSuccess ? "✅" : "❌",
    );

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
    console.log("✅ ========================================");
    console.log("✅ JOB SUBMISSION SUCCESSFUL");
    console.log("✅ ========================================");

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
        ...(process.env.NODE_ENV === "development" && {
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
