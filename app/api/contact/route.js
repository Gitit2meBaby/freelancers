// app/api/contact/route.js
import { NextResponse } from "next/server";
import {
  getContactFormNotification,
  getContactFormAutoReply,
  sendEmail,
  sendEmailWithAttachment,
} from "../../../app/lib/emailTemplates";

/**
 * POST /api/contact
 * Handles contact form submissions
 * Sends emails to both admin and user via Microsoft Graph API
 */
export async function POST(request) {
  try {
    // Parse form data (CHANGED FROM request.json())
    const formData = await request.formData();

    // Extract fields
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
      phone: formData.get("phone"),
    };

    // Get CV file if present
    const cvFile = formData.get("cv");

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

    // Check honeypot field (bot detection)
    if (data.honeypot && data.honeypot !== "") {
      return NextResponse.json({
        success: true,
        message: "Message received",
      });
    }

    // Validate CV file size if present
    if (cvFile && cvFile.size > 1024 * 1024) {
      // 1MB limit
      return NextResponse.json(
        {
          success: false,
          error: "CV file must be less than 1MB",
        },
        { status: 400 },
      );
    }

    // Sanitize input
    const sanitizedData = {
      name: data.name.trim().substring(0, 100),
      email: data.email.trim().toLowerCase().substring(0, 100),
      phone: data.phone?.trim().substring(0, 20) || "",
      subject: data.subject.trim().substring(0, 200),
      message: data.message.trim().substring(0, 2000),
    };

    // ==================================================
    // SEND EMAILS VIA MICROSOFT GRAPH API
    // ==================================================

    let adminEmailSuccess = false;
    let userEmailSuccess = false;

    try {
      // 1. Send notification to admin (WITH ATTACHMENT if CV present)
      const adminEmail = getContactFormNotification(sanitizedData);
      const adminEmailAddress =
        process.env.ADMIN_EMAIL || "info@freelancers.com.au";

      let adminResult;

      if (cvFile) {
        console.log("📎 CV file detected:", cvFile.name, cvFile.size, "bytes");

        // Convert File to Buffer for attachment
        const arrayBuffer = await cvFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log("📎 Buffer created, size:", buffer.length, "bytes");

        adminResult = await sendEmailWithAttachment(
          adminEmailAddress,
          adminEmail,
          {
            filename: cvFile.name,
            content: buffer,
            contentType: cvFile.type,
          },
        );
      } else {
        console.log("📧 No CV file, sending regular email");
        adminResult = await sendEmail(adminEmailAddress, adminEmail);
      }

      console.log("📧 Admin email result:", adminResult); // ADD THIS LINE

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
      console.error("  Error object:", error); // ADD THIS LINE
    }

    try {
      // 2. Send auto-reply to user (NO ATTACHMENT)
      const userEmail = getContactFormAutoReply(sanitizedData);
      const userResult = await sendEmail(sanitizedData.email, userEmail);

      if (userResult.success) {
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
    return NextResponse.json({
      success: true,
      message:
        "Thank you for contacting us. We have received your message and will respond as soon as possible.",
      details: {
        adminEmailSent: adminEmailSuccess,
        autoReplySent: userEmailSuccess,
        cvAttached: !!cvFile,
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
        ...(process.env.NODE_ENV !== "production" && {
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
