// app/lib/graphClient.js

/**
 * Get access token for Microsoft Graph API
 * Uses client credentials flow (app-only authentication)
 */
export async function getAccessToken() {
  const tenantId = process.env.GRAPH_TENANT_ID;
  const clientId = process.env.GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "Missing Microsoft Graph credentials. Check GRAPH_TENANT_ID, GRAPH_CLIENT_ID, and GRAPH_CLIENT_SECRET in environment variables.",
    );
  }

  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token request failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Error getting access token:", error);
    throw error;
  }
}

/**
 * Helper function to send email with attachment via Microsoft Graph API
 * @param {string} to - Recipient email address
 * @param {Object} emailTemplate - Email template with subject and html
 * @param {Object} attachment - Attachment object { filename, content (Buffer), contentType }
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */

/**
 * Send email via Microsoft Graph API
 * @param {string} from - Sender email address (must be a mailbox the app has access to)
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - Email HTML content
 * @param {string} textContent - Email plain text content (optional)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendGraphEmail(
  from,
  to,
  subject,
  htmlContent,
  textContent = null,
) {
  try {
    console.log(`📧 Sending email via Microsoft Graph API`);
    console.log(`From: ${from}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);

    // Get access token
    const accessToken = await getAccessToken();

    // Prepare email message
    const message = {
      message: {
        subject: subject,
        body: {
          contentType: "HTML",
          content: htmlContent,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
        bccRecipients: [
          {
            emailAddress: {
              address: "dan@officeexperts.com.au", // You get a copy
            },
          },
        ],
      },
      saveToSentItems: true,
    };

    // Send email using the sender's mailbox
    const sendUrl = `https://graph.microsoft.com/v1.0/users/${from}/sendMail`;

    const response = await fetch(sendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Graph API error: ${response.status} - ${errorText}`);
      throw new Error(
        `Failed to send email: ${response.status} - ${errorText}`,
      );
    }

    console.log(`✅ Email sent successfully to ${to}`);

    return {
      success: true,
      message: "Email sent successfully",
    };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send email with attachment via Microsoft Graph API
 * @param {string} from - Sender email address
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - Email HTML content
 * @param {Object} attachment - { filename: string, content: Buffer, contentType: string }
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendGraphEmailWithAttachment(
  from,
  to,
  subject,
  htmlContent,
  attachment,
) {
  try {
    console.log(`📧 Sending email with attachment via Microsoft Graph API`);
    console.log(`From: ${from}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(
      `Attachment: ${attachment.filename} (${attachment.content.length} bytes)`,
    );

    // Get access token
    const accessToken = await getAccessToken();

    // Convert buffer to base64
    const base64Content = attachment.content.toString("base64");

    // Prepare email message with attachment
    const message = {
      message: {
        subject: subject,
        body: {
          contentType: "HTML",
          content: htmlContent,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
        bccRecipients: [
          {
            emailAddress: {
              address: "dan@officeexperts.com.au", // You get a copy
            },
          },
        ],
        attachments: [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: attachment.filename,
            contentType: attachment.contentType,
            contentBytes: base64Content,
          },
        ],
      },
      saveToSentItems: true,
    };

    // Send email using the sender's mailbox
    const sendUrl = `https://graph.microsoft.com/v1.0/users/${from}/sendMail`;

    const response = await fetch(sendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Graph API error: ${response.status} - ${errorText}`);
      throw new Error(
        `Failed to send email: ${response.status} - ${errorText}`,
      );
    }

    console.log(`✅ Email with attachment sent successfully to ${to}`);

    return {
      success: true,
      message: "Email sent successfully with attachment",
    };
  } catch (error) {
    console.error("❌ Error sending email with attachment:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send email to multiple recipients
 * @param {string} from - Sender email address
 * @param {string[]} recipients - Array of recipient email addresses
 * @param {string} subject - Email subject
 * @param {string} htmlContent - Email HTML content
 * @returns {Promise<{success: boolean, sent: number, failed: number}>}
 */
export async function sendBulkEmail(from, recipients, subject, htmlContent) {
  const results = {
    success: true,
    sent: 0,
    failed: 0,
    errors: [],
  };

  for (const recipient of recipients) {
    try {
      const result = await sendGraphEmail(
        from,
        recipient,
        subject,
        htmlContent,
      );

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push({
          recipient,
          error: result.error,
        });
      }

      // Add small delay between emails to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      results.failed++;
      results.errors.push({
        recipient,
        error: error.message,
      });
    }
  }

  results.success = results.failed === 0;

  return results;
}

/**
 * Test the Graph API connection
 * Useful for verifying credentials are correct
 */
export async function testGraphConnection() {
  try {
    const accessToken = await getAccessToken();

    // Try to get the sender mailbox info
    const senderEmail =
      process.env.GRAPH_SENDER_EMAIL || "info@freelancers.com.au";
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${senderEmail}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to verify mailbox: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      message: "Graph API connection successful",
      mailbox: {
        email: data.mail || data.userPrincipalName,
        displayName: data.displayName,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * ENVIRONMENT VARIABLES REQUIRED:
 *
 * GRAPH_TENANT_ID=your-tenant-id
 * GRAPH_CLIENT_ID=your-client-id
 * GRAPH_CLIENT_SECRET=your-client-secret
 * GRAPH_SENDER_EMAIL=info@freelancers.com.au
 *
 * SETUP STEPS:
 *
 * 1. Go to Azure Portal (https://portal.azure.com)
 * 2. Navigate to "Azure Active Directory" → "App registrations"
 * 3. Click "New registration"
 *    - Name: "Freelancers Website Email"
 *    - Supported account types: "Accounts in this organizational directory only"
 *    - Redirect URI: Not needed for this flow
 * 4. After creation, note the "Application (client) ID" → GRAPH_CLIENT_ID
 * 5. Note the "Directory (tenant) ID" → GRAPH_TENANT_ID
 * 6. Go to "Certificates & secrets" → "New client secret"
 *    - Description: "Website email sending"
 *    - Expires: Choose appropriate duration
 *    - Copy the VALUE (not the ID) → GRAPH_CLIENT_SECRET
 * 7. Go to "API permissions"
 *    - Click "Add a permission" → "Microsoft Graph" → "Application permissions"
 *    - Add "Mail.Send" permission
 *    - Click "Grant admin consent" (requires admin)
 * 8. Ensure the sender email (info@freelancers.com.au) exists as a mailbox
 * 9. Add all credentials to your .env.local file
 *
 * TESTING:
 *
 * Create a test endpoint at app/api/test-email/route.js:
 *
 * import { testGraphConnection, sendGraphEmail } from '@/app/lib/graphClient';
 *
 * export async function GET() {
 *   const connectionTest = await testGraphConnection();
 *   return Response.json(connectionTest);
 * }
 *
 * export async function POST(request) {
 *   const { to } = await request.json();
 *   const result = await sendGraphEmail(
 *     process.env.GRAPH_SENDER_EMAIL,
 *     to,
 *     'Test Email',
 *     '<h1>This is a test email</h1><p>If you can read this, the Graph API is working!</p>'
 *   );
 *   return Response.json(result);
 * }
 */
