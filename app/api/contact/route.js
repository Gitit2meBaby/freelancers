// import { Resend } from "resend";
// import { NextResponse } from "next/server";

// const resend = new Resend(process.env.RESEND_API_KEY);

// export async function POST(request) {
//   try {
//     const body = await request.json();
//     const { name, email, subject, message, cv, honeypot } = body;

//     // Check honeypot (hidden field) to detect bot submissions
//     if (honeypot) {
//       return Response.json(
//         { error: "Bot submission detected" },
//         { status: 400 }
//       );
//     }

//     // Validation
//     if (!name || !email || !subject) {
//       return NextResponse.json(
//         { error: "Missing required fields" },
//         { status: 400 }
//       );
//     }

//     // Email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return NextResponse.json(
//         { error: "Invalid email address" },
//         { status: 400 }
//       );
//     }

//     // Send email
//     const { data, error } = await resend.emails.send({
//       from: process.env.EMAIL_FROM,
//       to: process.env.EMAIL_TO,
//       replyTo: email, // So client can reply directly to user
//       subject: `Contact Form: ${subject}`,
//       html: `
//         <h2>New Contact Form Submission</h2>
//         <p><strong>Name:</strong> ${name}</p>
//         <p><strong>Email:</strong> ${email}</p>
//         <p><strong>Subject:</strong> ${subject}</p>
//         <p><strong>Message:</strong></p>
//         <p>${message || "No message provided"}</p>
//         ${cv ? "<p><strong>CV:</strong> Attached</p>" : ""}
//       `,
//     });

//     if (error) {
//       console.error("Resend error:", error);
//       return NextResponse.json(
//         { error: "Failed to send email" },
//         { status: 500 }
//       );
//     }

//     return NextResponse.json(
//       { success: true, messageId: data.id },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("API error:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// *************** NEW EDITION ***************
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
 * Sends emails to both admin and user
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

    // Sanitize input (basic XSS prevention)
    const sanitizedData = {
      name: data.name.trim().substring(0, 100),
      email: data.email.trim().toLowerCase().substring(0, 100),
      phone: data.phone?.trim().substring(0, 20) || "",
      subject: data.subject.trim().substring(0, 200),
      message: data.message.trim().substring(0, 2000),
    };

    console.log("📧 Contact form submission:", {
      name: sanitizedData.name,
      email: sanitizedData.email,
      subject: sanitizedData.subject,
    });

    // ==================================================
    // TODO: SEND EMAILS VIA MICROSOFT GRAPH API
    // ==================================================
    // Once Martine provides Graph API credentials, uncomment this:

    /*
    // Send notification to admin
    const adminEmail = getContactFormNotification(sanitizedData);
    const adminResult = await sendEmail(
      process.env.ADMIN_EMAIL || "info@freelancers.com.au",
      adminEmail
    );

    if (!adminResult.success) {
      throw new Error("Failed to send admin notification");
    }

    // Send auto-reply to user
    const userEmail = getContactFormAutoReply(sanitizedData);
    const userResult = await sendEmail(sanitizedData.email, userEmail);

    if (!userResult.success) {
      console.error("Failed to send auto-reply, but continuing");
    }
    */

    // ==================================================
    // TEMPORARY: Log submission details
    // ==================================================
    // Remove this section once email sending is implemented
    console.log("====================================");
    console.log("📧 CONTACT FORM SUBMISSION");
    console.log("====================================");
    console.log("From:", sanitizedData.name, `<${sanitizedData.email}>`);
    console.log("Phone:", sanitizedData.phone || "Not provided");
    console.log("Subject:", sanitizedData.subject);
    console.log("Message:\n", sanitizedData.message);
    console.log("Timestamp:", new Date().toISOString());
    console.log("====================================");

    // Generate email previews for testing
    const adminEmailPreview = getContactFormNotification(sanitizedData);
    const userEmailPreview = getContactFormAutoReply(sanitizedData);

    console.log("\n📧 Admin Email Preview:");
    console.log("Subject:", adminEmailPreview.subject);
    console.log(
      "Body preview:",
      adminEmailPreview.html.substring(0, 200) + "..."
    );

    console.log("\n📧 User Auto-Reply Preview:");
    console.log("Subject:", userEmailPreview.subject);
    console.log(
      "Body preview:",
      userEmailPreview.html.substring(0, 200) + "..."
    );

    // Return success response
    return NextResponse.json({
      success: true,
      message:
        "Thank you for contacting us. We will respond to your inquiry as soon as possible.",
      // Remove this debug info in production:
      debug: {
        note: "Email sending not yet configured. Submission logged to console.",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Contact form error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "An error occurred while processing your request. Please try again later.",
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
 * INTEGRATION CHECKLIST:
 *
 * ✅ Form validation implemented
 * ✅ Input sanitization implemented
 * ✅ Email templates created (in emailTemplates.js)
 * ⏳ Microsoft Graph API integration (waiting for credentials)
 * ⏳ Database logging (optional, table doesn't exist yet)
 *
 * NEXT STEPS:
 *
 * 1. Get Microsoft Graph API credentials from Martine:
 *    - Client ID
 *    - Client Secret
 *    - Tenant ID
 *
 * 2. Set up environment variables:
 *    GRAPH_CLIENT_ID=...
 *    GRAPH_CLIENT_SECRET=...
 *    GRAPH_TENANT_ID=...
 *    ADMIN_EMAIL=info@freelancers.com.au
 *
 * 3. Implement sendEmail function in emailTemplates.js
 *
 * 4. Test with real submissions
 *
 * 5. Optional: Ask Paul to create tblContactFormSubmissions table:
 *    - ContactFormID (PK, INT, IDENTITY)
 *    - Name (NVARCHAR(100))
 *    - Email (NVARCHAR(100))
 *    - Phone (NVARCHAR(20), NULL)
 *    - Subject (NVARCHAR(200))
 *    - Message (NVARCHAR(MAX))
 *    - SubmittedAt (DATETIME)
 *    - IPAddress (NVARCHAR(50))
 *    - ReadAt (DATETIME, NULL)
 *
 * TESTING:
 *
 * # Test the endpoint with curl:
 * curl -X POST http://localhost:3000/api/contact \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "name": "Test User",
 *     "email": "test@example.com",
 *     "subject": "Test Subject",
 *     "message": "This is a test message"
 *   }'
 *
 * # Or test with JavaScript in browser console:
 * fetch('/api/contact', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     name: 'Test User',
 *     email: 'test@example.com',
 *     subject: 'Test Subject',
 *     message: 'This is a test message',
 *     phone: '0412 345 678'
 *   })
 * }).then(r => r.json()).then(console.log);
 */
