// app/lib/jobEmailTemplates.js

import { sendGraphEmail } from "./graphClient";
const LOGO_URL = "https://teal-heron-370950.hostingersite.com/images/logo.png";

/**
 * Email template wrapper for job submissions
 */
function getJobEmailWrapper(content) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Freelancers Promotions - New Job Submission</title>
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
      max-width: 800px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .email-header {
      background-color: rgb(197 198 159);
      padding: 30px;
      text-align: center;
    }
    .email-header img {
      max-width: 250px;
      height: auto;
      margin-bottom: 15px;
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
      border-bottom: 2px solid #7a8450;
      padding-bottom: 10px;
    }
    .email-body h3 {
      color: #7a8450;
      font-size: 16px;
      margin-top: 30px;
      margin-bottom: 10px;
    }
    .email-body p {
      color: #666;
      margin: 10px 0;
    }
    .info-box {
      background-color: #f5f5f0;
      padding: 20px;
      border-radius: 4px;
      margin: 20px 0;
      border-left: 4px solid #7a8450;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
    }
    .info-table tr {
      border-bottom: 1px solid #e5e5e0;
    }
    .info-table tr:last-child {
      border-bottom: none;
    }
    .info-table td {
      padding: 10px 0;
      vertical-align: top;
    }
    .info-label {
      font-weight: 600;
      color: #2d2d2d;
      width: 200px;
      padding-right: 20px;
    }
    .info-value {
      color: #666;
    }
    .info-value a {
      color: #7a8450;
      text-decoration: none;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
    }
    .status-awarded {
      background-color: #d4edda;
      color: #155724;
    }
    .status-quote {
      background-color: #fff3cd;
      color: #856404;
    }
    .status-development {
      background-color: #d1ecf1;
      color: #0c5460;
    }
    .status-greenlit {
      background-color: #d4edda;
      color: #155724;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: rgb(197 198 159);
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
    }s
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
          <img src="${LOGO_URL}" alt="Freelancers Promotions" class="email-logo" />
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
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * New Job Notification Email
 * Sent to admin when someone submits a new job
 */
export function getNewJobNotification(jobData) {
  const statusBadgeClass =
    {
      Awarded: "status-awarded",
      "Quote Hold": "status-quote",
      "In Development": "status-development",
      Greenlit: "status-greenlit",
    }[jobData.status] || "status-quote";

  const content = `
    <h2>New Job Submission</h2>
    <p>A new job has been submitted through the Freelancers Promotions website.</p>
    
    <div class="info-box">
      <h3>Job Details</h3>
      <table class="info-table">
     <tr>
  <td class="info-label">Job Title:</td>
  <td class="info-value"><strong>${jobData.jobTitle}</strong></td>
</tr>
<tr>
  <td class="info-label">Submitted By:</td>
  <td class="info-value"><a href="mailto:${jobData.submitterEmail}">${jobData.submitterEmail}</a></td>
</tr>
<tr>
  <td class="info-label">Status:</td>
  <td class="info-value"><span class="status-badge ${statusBadgeClass}">${jobData.status}</span></td>
</tr>
        ${
          jobData.dateOfAward
            ? `
        <tr>
          <td class="info-label">Date of Award:</td>
          <td class="info-value">${new Date(
            jobData.dateOfAward,
          ).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}</td>
        </tr>
        `
            : ""
        }
        <tr>
          <td class="info-label">Job Type:</td>
          <td class="info-value">${jobData.jobType}</td>
        </tr>
      </table>
    </div>

    <div class="info-box">
      <h3>Production Company Details</h3>
      <table class="info-table">
        <tr>
          <td class="info-label">Company:</td>
          <td class="info-value">${jobData.productionCompany}</td>
        </tr>
        ${
          jobData.productionManager
            ? `
        <tr>
          <td class="info-label">Production Manager:</td>
          <td class="info-value">${jobData.productionManager}</td>
        </tr>
        `
            : ""
        }
        <tr>
          <td class="info-label">Contact Name:</td>
          <td class="info-value">${jobData.contactName}</td>
        </tr>
        ${
          jobData.contactNumber
            ? `
        <tr>
          <td class="info-label">Contact Number:</td>
          <td class="info-value"><a href="tel:${jobData.contactNumber}">${jobData.contactNumber}</a></td>
        </tr>
        `
            : ""
        }
        <tr>
          <td class="info-label">Contact Email:</td>
          <td class="info-value"><a href="mailto:${jobData.contactEmail}">${
            jobData.contactEmail
          }</a></td>
        </tr>
      </table>
    </div>

    ${
      jobData.directorName || jobData.producerName || jobData.dopName
        ? `
    <div class="info-box">
      <h3>Key Personnel</h3>
      <table class="info-table">
        ${
          jobData.directorName
            ? `
        <tr>
          <td class="info-label">Director:</td>
          <td class="info-value">${jobData.directorName}</td>
        </tr>
        `
            : ""
        }
        ${
          jobData.producerName
            ? `
        <tr>
          <td class="info-label">Producer:</td>
          <td class="info-value">${jobData.producerName}</td>
        </tr>
        `
            : ""
        }
        ${
          jobData.dopName
            ? `
        <tr>
          <td class="info-label">DOP:</td>
          <td class="info-value">${jobData.dopName}</td>
        </tr>
        `
            : ""
        }
      </table>
    </div>
    `
        : ""
    }

    ${
      jobData.jobBreakdown
        ? `
    <div class="info-box">
      <h3>Job Breakdown (Dates)</h3>
      <p style="white-space: pre-wrap; margin: 0; color: #666;">${jobData.jobBreakdown}</p>
    </div>
    `
        : ""
    }

    ${
      jobData.location
        ? `
    <div class="info-box">
      <h3>Location</h3>
      <p style="margin: 0; color: #666;">${jobData.location}</p>
    </div>
    `
        : ""
    }

    ${
      jobData.notes
        ? `
    <div class="info-box">
      <h3>Notes</h3>
      <p style="white-space: pre-wrap; margin: 0; color: #666;">${jobData.notes}</p>
    </div>
    `
        : ""
    }

    ${
      jobData.crewCheck
        ? `
    <div class="info-box">
      <h3>Crew Check</h3>
      <p style="white-space: pre-wrap; margin: 0; color: #666;">${jobData.crewCheck}</p>
    </div>
    `
        : ""
    }

    <div class="info-box" style="background-color: #e7f3ff; border-left-color: #2196F3;">
      <table class="info-table">
        <tr>
          <td class="info-label">Submitted:</td>
          <td class="info-value">${new Date().toLocaleString("en-AU", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "Australia/Melbourne",
          })}</td>
        </tr>
      </table>
    </div>

    <p style="margin-top: 30px;">
      <a href="mailto:${jobData.contactEmail}?subject=Re: ${encodeURIComponent(
        jobData.jobTitle,
      )}" class="button">Contact Production Company</a>
    </p>
  `;

  return {
    subject: `New Job Submission: ${jobData.jobTitle} - ${jobData.productionCompany}`,
    html: getJobEmailWrapper(content),
  };
}

/**
 * Job Submission Confirmation Email
 * Sent to the person who submitted the job
 */
export function getJobSubmissionConfirmation(jobData) {
  const content = `
    <h2>New Job Submission</h2>
    <p>Hi ${jobData.contactName},</p>
    <p>
      Thank you for submitting your job to Freelancers Promotions. 
      We have received your submission and will review it shortly.
    </p>

    <div class="info-box">
      <h3>Your Submission Details</h3>
      <table class="info-table">
        <tr>
          <td class="info-label">Job Title:</td>
          <td class="info-value"><strong>${jobData.jobTitle}</strong></td>
        </tr>
<tr>
  <td class="info-label">Production Company Email:</td>
  <td class="info-value"><a href="mailto:${jobData.contactEmail}">${jobData.contactEmail}</a></td>
</tr>
        <tr>
          <td class="info-label">Job Type:</td>
          <td class="info-value">${jobData.jobType}</td>
        </tr>
        <tr>
          <td class="info-label">Status:</td>
          <td class="info-value">${jobData.status}</td>
        </tr>
      </table>
    </div>

    <h3>What Happens Next?</h3>
    <p>Our team will review your job submission and get back to you as soon as possible.</p>
    <p>If you have any urgent requirements or questions, please don't hesitate to contact us.</p>

    <div style="margin: 30px 0; padding: 20px; background-color: #f5f5f0; border-radius: 4px;">
      <p style="margin: 0;"><strong>Contact Information:</strong></p>
      <p style="margin: 5px 0;">Email: <a href="mailto:info@freelancers.com.au" style="color: #7a8450;">info@freelancers.com.au</a></p>
      <p style="margin: 5px 0;">Phone: +61 3 9682 2722</p>
    </div>

    <p style="font-size: 14px; color: #999; margin-top: 30px;">
      This is an automated confirmation. Please do not reply to this email.
    </p>
  `;

  return {
    subject: `Job Submission Received: ${jobData.jobTitle} - Freelancers Promotions`,
    html: getJobEmailWrapper(content),
  };
}

/**
 * Helper function to send job notification email
 * @param {string} to - Recipient email address
 * @param {Object} emailTemplate - Email template with subject and html
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function sendJobEmail(to, emailTemplate) {
  try {
    const senderEmail =
      process.env.GRAPH_SENDER_EMAIL || "info@freelancers.com.au";

    console.log("📧 Preparing to send job notification email:");
    console.log("From:", senderEmail);
    console.log("To:", to);
    console.log("Subject:", emailTemplate.subject);

    // Send email via Microsoft Graph API
    const result = await sendGraphEmail(
      senderEmail,
      to,
      emailTemplate.subject,
      emailTemplate.html,
    );

    return result;
  } catch (error) {
    console.error("❌ Error sending job email:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
