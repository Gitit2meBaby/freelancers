// app/api/contact/route.js
import { NextResponse } from "next/server";
import {
  getContactFormNotification,
  getContactFormAutoReply,
  sendEmail,
  sendEmailWithAttachment,
} from "../../../app/lib/emailTemplates";

// ==================================================
// BOT DETECTION HELPERS
// (mirrors the pattern used in app/api/new-job/route.js)
// ==================================================

/**
 * Detects random alphanumeric strings with no spaces and suspicious
 * capitalisation — the same pattern bots use in jobTitle/productionCompany.
 * Applied here to `name` and `subject`, which must contain human-readable text.
 */
const RANDOM_STRING_RE = /^[A-Za-z0-9]{8,}$/;
const EXCESSIVE_CAPS_RE = /(?:[A-Z][a-z]*){4,}/;

function looksRandom(str) {
  if (!str || !str.trim()) return false;
  const trimmed = str.trim();
  if (/\s/.test(trimmed)) return false; // spaces = almost certainly human
  if (!RANDOM_STRING_RE.test(trimmed)) return false;
  const uppercaseCount = (trimmed.match(/[A-Z]/g) || []).length;
  if (uppercaseCount > 3) return true; // e.g. bfnZfovMjBWwuOmDYCrQe
  if (EXCESSIVE_CAPS_RE.test(trimmed)) return true;
  return false;
}

const SPAM_CHECKED_FIELDS = ["name", "subject"];

/**
 * POST /api/contact
 * Handles contact form submissions.
 * Sends emails to both admin and user via Microsoft Graph API.
 */
export async function POST(request) {
  try {
    const formData = await request.formData();

    // Extract all fields — including the two bot-detection fields the
    // client sends. Previously `honeypot` and `formLoadedAt` were never
    // read here, so all server-side bot checks were silently skipped.
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
      phone: formData.get("phone"),
      honeypot: formData.get("honeypot"), // FIX: was never extracted
      formLoadedAt: formData.get("formLoadedAt"), // FIX: was never extracted
    };

    const cvFile = formData.get("cv");

    // ==================================================
    // BOT DETECTION — runs before validation or any email
    // ==================================================

    // Layer 1: Honeypot — hidden field; bots fill it, humans never see it.
    // ContactForm.jsx renders the field and always submits it as empty string.
    if (data.honeypot && data.honeypot !== "") {
      console.warn("🤖 Bot rejected: honeypot filled (contact form)");
      // Return 200 so the bot doesn't know it was detected
      return NextResponse.json({ success: true, message: "Message received" });
    }

    // Layer 2: Timing check — bots submit in milliseconds, humans take seconds.
    // ContactForm.jsx sets formLoadedAt = Date.now() on mount.
    const loadedAt = parseInt(data.formLoadedAt || "0", 10);
    if (loadedAt > 0) {
      const elapsed = Date.now() - loadedAt;
      if (elapsed < 4000) {
        console.warn(`🤖 Bot rejected: contact form submitted in ${elapsed}ms`);
        return NextResponse.json(
          { success: false, error: "Please try again" },
          { status: 429 },
        );
      }
    }

    // Layer 3: Random string pattern — catches bot-generated values like
    // "bfnZfovMjBWwuOmDYCrQe" in the subject field (seen in Azure logs).
    const spamHits = SPAM_CHECKED_FIELDS.filter((field) =>
      looksRandom(data[field]),
    );
    if (spamHits.length > 0) {
      console.warn(
        "🤖 Bot rejected: random string pattern in contact fields:",
        spamHits,
      );
      return NextResponse.json(
        { success: false, error: "Invalid submission" },
        { status: 400 },
      );
    }

    // ==================================================
    // VALIDATION (unchanged)
    // ==================================================

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      console.error("❌ Invalid email format:", data.email);
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
        { status: 400 },
      );
    }

    if (cvFile && cvFile.size > 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "CV file must be less than 1MB" },
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
    // SEND EMAILS VIA MICROSOFT GRAPH API (unchanged)
    // ==================================================

    let adminEmailSuccess = false;
    let userEmailSuccess = false;

    try {
      const adminEmail = getContactFormNotification(sanitizedData);
      const adminEmailAddress =
        process.env.ADMIN_EMAIL || "info@freelancers.com.au";

      let adminResult;

      if (cvFile) {
        const arrayBuffer = await cvFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
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
        adminResult = await sendEmail(adminEmailAddress, adminEmail);
      }

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
      console.error("  Error object:", error);
    }

    try {
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
    // RETURN RESPONSE (unchanged)
    // ==================================================

    if (!adminEmailSuccess) {
      console.error("❌ CRITICAL: Admin notification failed");
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
