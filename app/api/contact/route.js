// app/api/contact/route.js
import { NextResponse } from "next/server";
import {
  getContactFormNotification,
  getContactFormAutoReply,
  sendEmail,
} from "../../../app/lib/emailTemplates";

/**
 * POST /api/contact
 * Handles contact form submissions
 * Sends emails to both admin and user via Microsoft Graph API
 */
export async function POST(request) {
  console.log("🔷 ========================================");
  console.log("🔷 CONTACT FORM SUBMISSION START");
  console.log("🔷 Timestamp:", new Date().toISOString());
  console.log("🔷 ========================================");

  try {
    // Parse form data
    console.log("📥 Parsing request body...");
    const data = await request.json();
    console.log("✅ Request parsed successfully");
    console.log("📊 Raw data fields:", Object.keys(data));

    // Validate required fields
    const requiredFields = ["name", "email", "subject", "message"];
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
    if (!emailRegex.test(data.email)) {
      console.error("❌ Invalid email format:", data.email);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email address",
        },
        { status: 400 },
      );
    }
    console.log("✅ Email format valid");

    // Check honeypot field (bot detection)
    if (data.honeypot && data.honeypot !== "") {
      console.log("🤖 Bot submission detected via honeypot");
      return NextResponse.json({
        success: true,
        message: "Message received",
      });
    }
    console.log("✅ Honeypot check passed");

    // Sanitize input
    const sanitizedData = {
      name: data.name.trim().substring(0, 100),
      email: data.email.trim().toLowerCase().substring(0, 100),
      phone: data.phone?.trim().substring(0, 20) || "",
      subject: data.subject.trim().substring(0, 200),
      message: data.message.trim().substring(0, 2000),
    };

    console.log("📧 Sanitized submission data:");
    console.log("  Name:", sanitizedData.name);
    console.log("  Email:", sanitizedData.email);
    console.log("  Phone:", sanitizedData.phone || "(not provided)");
    console.log("  Subject:", sanitizedData.subject);
    console.log("  Message length:", sanitizedData.message.length, "chars");

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
    let userEmailSuccess = false;

    try {
      // 1. Send notification to admin
      console.log("📤 ========================================");
      console.log("📤 SENDING ADMIN NOTIFICATION");
      console.log("📤 ========================================");

      const adminEmail = getContactFormNotification(sanitizedData);
      const adminEmailAddress =
        process.env.ADMIN_EMAIL || "info@freelancers.com.au";

      console.log("📬 Admin email address:", adminEmailAddress);
      console.log("📝 Email subject:", adminEmail.subject);

      const adminResult = await sendEmail(adminEmailAddress, adminEmail);

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
      // 2. Send auto-reply to user
      console.log("📤 ========================================");
      console.log("📤 SENDING USER AUTO-REPLY");
      console.log("📤 ========================================");

      const userEmail = getContactFormAutoReply(sanitizedData);

      console.log("📬 User email address:", sanitizedData.email);
      console.log("📝 Email subject:", userEmail.subject);

      const userResult = await sendEmail(sanitizedData.email, userEmail);

      console.log("📊 User email result:", {
        success: userResult.success,
        hasError: !!userResult.error,
        errorMessage: userResult.error || "none",
      });

      if (userResult.success) {
        console.log("✅ Auto-reply sent successfully");
        userEmailSuccess = true;
      } else {
        console.error("❌ Failed to send auto-reply");
        console.error("Error details:", userResult.error);
      }
    } catch (error) {
      console.error("❌ Exception sending user email:");
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
    console.log("  User auto-reply sent:", userEmailSuccess ? "✅" : "❌");

    // If admin email failed, this is critical - return error
    if (!adminEmailSuccess) {
      console.error(
        "❌ CRITICAL: Admin notification failed - returning error to user",
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to send your message. Please try again or contact us directly at info@freelancers.com.au",
          details: {
            adminEmailSent: false,
            autoReplySent: userEmailSuccess,
          },
        },
        { status: 500 },
      );
    }

    // Admin email succeeded
    console.log("✅ ========================================");
    console.log("✅ CONTACT FORM SUBMISSION SUCCESSFUL");
    console.log("✅ ========================================");

    return NextResponse.json({
      success: true,
      message:
        "Thank you for contacting us. We have received your message and will respond as soon as possible.",
      details: {
        adminEmailSent: adminEmailSuccess,
        autoReplySent: userEmailSuccess,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ ========================================");
    console.error("❌ CONTACT FORM CRITICAL ERROR");
    console.error("❌ ========================================");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    return NextResponse.json(
      {
        success: false,
        error:
          "An error occurred while processing your request. Please try again later or contact us directly at info@freelancers.com.au",
        ...(process.env.NODE_ENV === "development" && {
          details: error.message,
        }),
      },
      { status: 500 },
    );
  }
}

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
