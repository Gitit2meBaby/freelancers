// app/lib/emailTemplates.js

import { sendGraphEmail } from "./graphClient";

/**
 * Email Templates Library
 * Provides HTML email templates for various user notifications
 */

/**
 * Base email template wrapper
 * Provides consistent styling and structure
 */
function getEmailWrapper(content, preheader = "") {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Freelancers Promotions</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #2d2d2d;
      background-color: #f5f5f0;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .email-header {
      background-color: #7a8450;
      padding: 30px;
      text-align: center;
    }
    .email-header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 400;
    }
    .email-body {
      padding: 40px 30px;
    }
    .email-body h2 {
      color: #2d2d2d;
      font-size: 20px;
      margin-top: 0;
    }
    .email-body p {
      color: #666;
      margin: 15px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #7a8450;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
      font-weight: 600;
    }
    .button:hover {
      background-color: #6a7440;
    }
    .email-footer {
      background-color: #f5f5f0;
      padding: 30px;
      text-align: center;
      font-size: 14px;
      color: #999;
    }
    .email-footer a {
      color: #7a8450;
      text-decoration: none;
    }
    .divider {
      border-top: 1px solid #e5e5e0;
      margin: 30px 0;
    }
    .preheader {
      display: none;
      max-width: 0;
      max-height: 0;
      overflow: hidden;
      opacity: 0;
    }
  </style>
</head>
<body>
  ${preheader ? `<div class="preheader">${preheader}</div>` : ""}
  <div class="email-container">
    <div class="email-header">
      <h1>Freelancers Promotions</h1>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <p>
        <strong>Freelancers Promotions</strong><br>
        Melbourne's primary portal to employment on screen productions<br>
        <a href="mailto:info@freelancers.com.au">info@freelancers.com.au</a>
      </p>
      <p style="margin-top: 20px;">
        <a href="https://freelancers.com.au">Visit Website</a> | 
        <a href="https://freelancers.com.au/crew-directory">Crew Directory</a> | 
        <a href="https://freelancers.com.au/contact-us">Contact Us</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Password Change Notification Email
 * Sent when a user successfully changes their password
 */
export function getPasswordChangeEmail(user) {
  const content = `
    <h2>Password Successfully Changed</h2>
    <p>Hello ${user.name},</p>
    <p>
      This email confirms that your password for Freelancers Promotions 
      was successfully changed on <strong>${new Date().toLocaleString("en-AU", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Australia/Melbourne",
      })}</strong>.
    </p>
    <p>
      If you made this change, no further action is required.
    </p>
    <div class="divider"></div>
    <p style="color: #dc2626;">
      <strong>⚠️ Did not authorize this change?</strong><br>
      If you did not request this password change, please contact us 
      immediately to secure your account.
    </p>
    <a href="mailto:info@freelancers.com.au" class="button">Contact Support</a>
    <p style="font-size: 14px; color: #999; margin-top: 30px;">
      For security, we recommend:
    </p>
    <ul style="color: #666; font-size: 14px;">
      <li>Using a strong, unique password</li>
      <li>Not sharing your password with anyone</li>
      <li>Changing your password regularly</li>
    </ul>
  `;

  return {
    subject: "Your Password Has Been Changed - Freelancers Promotions",
    html: getEmailWrapper(content, "Your password was successfully changed"),
  };
}

/**
 * Google Sign-In Welcome Email
 * Sent when a user successfully links their Google account
 */
export function getGoogleSignInEmail(user) {
  const content = `
    <h2>Welcome to Google Sign-In! 🎉</h2>
    <p>Hello ${user.name},</p>
    <p>
      You have successfully linked your Google account to Freelancers Promotions. 
      You can now sign in quickly and securely using your Google account.
    </p>
    <div class="divider"></div>
    <h3>What's Next?</h3>
    <p>
      You can now sign in to your account in two ways:
    </p>
    <ul>
      <li>Using your Google account (fastest)</li>
      <li>Using your email and password (traditional method)</li>
    </ul>
    <a href="https://freelancers.com.au/member-login" class="button">Sign In Now</a>
    <div class="divider"></div>
    <p style="font-size: 14px; color: #999;">
      <strong>Privacy Note:</strong> We only use your Google account for 
      authentication. We do not access any other Google services or data.
    </p>
  `;

  return {
    subject: "Google Sign-In Activated - Freelancers Promotions",
    html: getEmailWrapper(content, "You can now sign in with Google"),
  };
}

/**
 * Contact Form Submission Notification
 * Sent to admin when someone submits the contact form
 */
export function getContactFormNotification(submission) {
  const content = `
    <h2>New Contact Form Submission</h2>
    <p>You have received a new message through the Freelancers Promotions website.</p>
    
    <div style="background-color: #f5f5f0; padding: 20px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Name:</strong> ${submission.name}</p>
      <p style="margin: 5px 0;"><strong>Email:</strong> 
        <a href="mailto:${submission.email}">${submission.email}</a>
      </p>
      ${
        submission.phone
          ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${submission.phone}</p>`
          : ""
      }
      <p style="margin: 5px 0;"><strong>Subject:</strong> ${
        submission.subject
      }</p>
      <p style="margin: 5px 0;"><strong>Submitted:</strong> 
        ${new Date().toLocaleString("en-AU", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "Australia/Melbourne",
        })}
      </p>
    </div>

    <h3>Message:</h3>
    <div style="background-color: #ffffff; border-left: 4px solid #7a8450; padding: 15px; margin: 20px 0;">
      <p style="white-space: pre-wrap;">${submission.message}</p>
    </div>

    <a href="mailto:${submission.email}?subject=Re: ${encodeURIComponent(
    submission.subject
  )}" class="button">Reply to ${submission.name}</a>
  `;

  return {
    subject: `New Contact Form: ${submission.subject}`,
    html: getEmailWrapper(content, `New message from ${submission.name}`),
  };
}

/**
 * Contact Form Auto-Reply
 * Sent to user after they submit the contact form
 */
export function getContactFormAutoReply(submission) {
  const content = `
    <h2>Thank You for Contacting Us</h2>
    <p>Hello ${submission.name},</p>
    <p>
      Thank you for reaching out to Freelancers Promotions. 
      We have received your message and will respond as soon as possible.
    </p>
    
    <div class="divider"></div>
    
    <h3>Your Message:</h3>
    <div style="background-color: #f5f5f0; padding: 20px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Subject:</strong> ${submission.subject}</p>
      <p style="margin: 15px 0; white-space: pre-wrap;">${submission.message}</p>
    </div>

    <p>
      Our typical response time is 1-2 business days. If your inquiry is urgent, 
      please feel free to call us directly.
    </p>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #999;">
      <strong>Contact Information:</strong><br>
      Email: <a href="mailto:info@freelancers.com.au">info@freelancers.com.au</a><br>
      Address: PO Box 5010, South Melbourne, Vic 3205
    </p>
  `;

  return {
    subject: "We Received Your Message - Freelancers Promotions",
    html: getEmailWrapper(
      content,
      "Thank you for contacting Freelancers Promotions"
    ),
  };
}

/**
 * Password Reset Email
 * Sent when a user requests a password reset
 */
export function getPasswordResetEmail(user, resetToken) {
  const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

  const content = `
    <h2>Reset Your Password</h2>
    <p>Hello ${user.name},</p>
    <p>
      You recently requested to reset your password for your Freelancers Promotions account. 
      Click the button below to reset it.
    </p>
    
    <a href="${resetLink}" class="button">Reset Password</a>

    <p style="font-size: 14px; color: #999; margin-top: 30px;">
      Or copy and paste this link into your browser:<br>
      <a href="${resetLink}" style="color: #7a8450; word-break: break-all;">${resetLink}</a>
    </p>

    <div class="divider"></div>

    <p style="color: #dc2626;">
      <strong>⚠️ Important Security Information:</strong>
    </p>
    <ul style="color: #666; font-size: 14px;">
      <li>This link will expire in 1 hour</li>
      <li>If you did not request a password reset, ignore this email</li>
      <li>Your password will not change until you access the link above</li>
    </ul>

    <p style="font-size: 14px; color: #999; margin-top: 20px;">
      If you continue to have problems signing in, contact us at 
      <a href="mailto:info@freelancers.com.au">info@freelancers.com.au</a>
    </p>
  `;

  return {
    subject: "Reset Your Password - Freelancers Promotions",
    html: getEmailWrapper(content, "Reset your password"),
  };
}

/**
 * Welcome Email for New Users
 * Sent when a new freelancer account is created
 */
export function getWelcomeEmail(user) {
  const content = `
    <h2>Welcome to Freelancers Promotions! 🎬</h2>
    <p>Hello ${user.name},</p>
    <p>
      Welcome to Melbourne's primary portal to employment on screen productions. 
      We're excited to have you join our community of experienced film technicians.
    </p>

    <a href="https://freelancers.com.au/member-login" class="button">Complete Your Profile</a>

    <div class="divider"></div>

    <h3>Getting Started</h3>
    <p>Here's what you can do next:</p>
    <ul>
      <li><strong>Complete Your Profile:</strong> Add your bio, photo, and CV</li>
      <li><strong>Add Your Skills:</strong> List your departments and specializations</li>
      <li><strong>Connect Your Links:</strong> Link your IMDB, website, and social media</li>
      <li><strong>Stay Updated:</strong> Check out our latest news and opportunities</li>
    </ul>

    <div class="divider"></div>

    <h3>Important Links</h3>
    <p style="font-size: 14px;">
      <a href="https://freelancers.com.au/crew-directory">Browse Crew Directory</a><br>
      <a href="https://freelancers.com.au/screen-services">Screen Services</a><br>
      <a href="https://freelancers.com.au/booking-guidelines">Booking Guidelines</a><br>
      <a href="https://freelancers.com.au/about-us">About Us</a>
    </p>

    <p>
      If you have any questions, don't hesitate to reach out to us at 
      <a href="mailto:info@freelancers.com.au">info@freelancers.com.au</a>
    </p>
  `;

  return {
    subject: "Welcome to Freelancers Promotions! 🎬",
    html: getEmailWrapper(content, "Welcome to Freelancers Promotions"),
  };
}

/**
 * Profile Update Confirmation
 * Sent when a user updates their profile
 */
export function getProfileUpdateEmail(user, updatedFields) {
  const fieldsList = updatedFields.join(", ");

  const content = `
    <h2>Profile Updated Successfully</h2>
    <p>Hello ${user.name},</p>
    <p>
      Your Freelancers Promotions profile was successfully updated on 
      <strong>${new Date().toLocaleString("en-AU", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Australia/Melbourne",
      })}</strong>.
    </p>

    <div style="background-color: #f5f5f0; padding: 20px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Updated fields:</strong> ${fieldsList}</p>
    </div>

    ${
      updatedFields.includes("photo") || updatedFields.includes("cv")
        ? `
    <p style="color: #7a8450;">
      <strong>Note:</strong> Your uploaded files are pending verification by our team. 
      They will be visible on your public profile once approved.
    </p>
    `
        : ""
    }

    <a href="https://freelancers.com.au/my-account/${
      user.slug
    }" class="button">View Your Profile</a>

    <p style="font-size: 14px; color: #999; margin-top: 30px;">
      If you did not make these changes, please contact us immediately.
    </p>
  `;

  return {
    subject: "Profile Updated - Freelancers Promotions",
    html: getEmailWrapper(content, "Your profile has been updated"),
  };
}

/**
 * Helper function to send email via Microsoft Graph API
 * @param {string} to - Recipient email address
 * @param {Object} emailTemplate - Email template with subject and html
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function sendEmail(to, emailTemplate) {
  try {
    const senderEmail =
      process.env.GRAPH_SENDER_EMAIL || "info@freelancers.com.au";

    console.log("📧 Preparing to send email:");
    console.log("From:", senderEmail);
    console.log("To:", to);
    console.log("Subject:", emailTemplate.subject);

    // Send email via Microsoft Graph API
    const result = await sendGraphEmail(
      senderEmail,
      to,
      emailTemplate.subject,
      emailTemplate.html
    );

    return result;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * USAGE EXAMPLES:
 *
 * // Password change notification
 * const email = getPasswordChangeEmail({ name: "John Doe" });
 * await sendEmail("john@example.com", email);
 *
 * // Contact form submission
 * const contactEmail = getContactFormNotification({
 *   name: "Jane Smith",
 *   email: "jane@example.com",
 *   subject: "Inquiry about services",
 *   message: "I would like to know more...",
 *   phone: "0412 345 678"
 * });
 * await sendEmail("info@freelancers.com.au", contactEmail);
 *
 * // Password reset
 * const resetEmail = getPasswordResetEmail(
 *   { name: "John Doe" },
 *   "abc123token456"
 * );
 * await sendEmail("john@example.com", resetEmail);
 */
