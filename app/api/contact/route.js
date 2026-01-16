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
  try {
    // Parse form data
    const data = await request.json();

    // Validate required fields
    const requiredFields = ["name", "email", "subject", "message"];
    const missingFields = requiredFields.filter((field) => !data[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email address",
        },
        { status: 400 }
      );
    }

    // Check honeypot field (bot detection)
    if (data.honeypot && data.honeypot !== "") {
      console.log("🤖 Bot submission detected via honeypot");
      // Return success to not reveal the honeypot mechanism
      return NextResponse.json({
        success: true,
        message: "Message received",
      });
    }

    // Sanitize input (basic XSS prevention)
    const sanitizedData = {
      name: data.name.trim().substring(0, 100),
      email: data.email.trim().toLowerCase().substring(0, 100),
      phone: data.phone?.trim().substring(0, 20) || "",
      subject: data.subject.trim().substring(0, 200),
      message: data.message.trim().substring(0, 2000),
    };

    console.log("📧 Contact form submission received:");
    console.log("Name:", sanitizedData.name);
    console.log("Email:", sanitizedData.email);
    console.log("Subject:", sanitizedData.subject);

    // ==================================================
    // SEND EMAILS VIA MICROSOFT GRAPH API
    // ==================================================

    let adminEmailSuccess = false;
    let userEmailSuccess = false;

    try {
      // 1. Send notification to admin
      console.log("📤 Sending notification to admin...");
      const adminEmail = getContactFormNotification(sanitizedData);
      const adminEmailAddress =
        process.env.ADMIN_EMAIL || "info@freelancers.com.au";

      const adminResult = await sendEmail(adminEmailAddress, adminEmail);

      if (adminResult.success) {
        console.log("✅ Admin notification sent successfully");
        adminEmailSuccess = true;
      } else {
        console.error(
          "❌ Failed to send admin notification:",
          adminResult.error
        );
      }
    } catch (error) {
      console.error("❌ Error sending admin email:", error);
    }

    try {
      // 2. Send auto-reply to user
      console.log("📤 Sending auto-reply to user...");
      const userEmail = getContactFormAutoReply(sanitizedData);

      const userResult = await sendEmail(sanitizedData.email, userEmail);

      if (userResult.success) {
        console.log("✅ Auto-reply sent successfully");
        userEmailSuccess = true;
      } else {
        console.error("❌ Failed to send auto-reply:", userResult.error);
      }
    } catch (error) {
      console.error("❌ Error sending user email:", error);
    }

    // ==================================================
    // RETURN RESPONSE
    // ==================================================

    // If admin email failed, this is critical - return error
    if (!adminEmailSuccess) {
      console.error("❌ Critical: Admin notification failed");
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
        { status: 500 }
      );
    }

    // Admin email succeeded - return success even if auto-reply failed
    console.log("✅ Contact form submission processed successfully");

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
    console.error("❌ Contact form error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "An error occurred while processing your request. Please try again later or contact us directly at info@freelancers.com.au",
        // Only include details in development
        ...(process.env.NODE_ENV === "development" && {
          details: error.message,
        }),
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/contact
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

/**
 * TESTING THE CONTACT FORM:
 *
 * 1. Test from the website:
 *    - Go to https://freelancers.com.au/contact-us
 *    - Fill out and submit the form
 *    - Check console logs
 *    - Check email inbox (info@freelancers.com.au and your test email)
 *
 * 2. Test with curl:
 *    curl -X POST https://freelancers.com.au/api/contact \
 *      -H "Content-Type: application/json" \
 *      -d '{
 *        "name": "Test User",
 *        "email": "test@example.com",
 *        "subject": "Test Subject",
 *        "message": "This is a test message"
 *      }'
 *
 * 3. Test with JavaScript (browser console):
 *    fetch('/api/contact', {
 *      method: 'POST',
 *      headers: { 'Content-Type': 'application/json' },
 *      body: JSON.stringify({
 *        name: 'Test User',
 *        email: 'test@example.com',
 *        subject: 'Test Subject',
 *        message: 'This is a test message',
 *        phone: '0412 345 678'
 *      })
 *    }).then(r => r.json()).then(console.log);
 *
 * TROUBLESHOOTING:
 *
 * If emails are not being sent:
 *
 * 1. Check environment variables are set correctly:
 *    - GRAPH_TENANT_ID
 *    - GRAPH_CLIENT_ID
 *    - GRAPH_CLIENT_SECRET
 *    - GRAPH_SENDER_EMAIL (should be info@freelancers.com.au)
 *    - ADMIN_EMAIL (optional, defaults to info@freelancers.com.au)
 *
 * 2. Verify Azure AD app registration:
 *    - Mail.Send permission is granted
 *    - Admin consent is provided
 *    - Client secret is not expired
 *
 * 3. Check sender mailbox exists:
 *    - info@freelancers.com.au must exist as a mailbox
 *    - The app must have permissions to send from this mailbox
 *
 * 4. Review application logs:
 *    - Look for error messages in console
 *    - Check Azure AD sign-in logs for auth failures
 *
 * 5. Test Graph API connection:
 *    - Create test endpoint (see graphClient.js comments)
 *    - Call GET /api/test-email to verify connection
 *    - Call POST /api/test-email to send test email
 */
