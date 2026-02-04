// test-mailbox-send.cjs - Test if the app can send from a specific mailbox
// This will tell us exactly what's wrong with the mailbox permissions

require("dotenv").config({ path: ".env.local" });

const TENANT_ID = process.env.GRAPH_TENANT_ID;
const CLIENT_ID = process.env.GRAPH_CLIENT_ID;
const CLIENT_SECRET = process.env.GRAPH_CLIENT_SECRET;
const SENDER_EMAIL =
  process.env.GRAPH_SENDER_EMAIL || "info@freelancers.com.au";

console.log("\n🔍 ========================================");
console.log("🔍 MAILBOX SEND PERMISSION TEST");
console.log("🔍 ========================================\n");

console.log(`Testing: ${SENDER_EMAIL}\n`);

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ Missing environment variables!");
  process.exit(1);
}

async function getAccessToken() {
  const tokenEndpoint = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token failed: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function checkMailbox(token) {
  console.log("Step 1: Checking if mailbox exists...");

  const userEndpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(SENDER_EMAIL)}`;

  try {
    const response = await fetch(userEndpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const user = await response.json();
      console.log("✅ Mailbox exists!");
      console.log(`   Display Name: ${user.displayName}`);
      console.log(`   UPN: ${user.userPrincipalName}`);
      console.log(`   Mail: ${user.mail}`);
      console.log(`   Mail Enabled: ${user.mailEnabled || "N/A"}`);
      return true;
    } else {
      const error = await response.text();
      console.error("❌ Mailbox check failed");
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${error}`);

      if (response.status === 404) {
        console.error("\n💡 The mailbox does not exist in this tenant!");
        console.error("   Solutions:");
        console.error("   1. Create the mailbox in Microsoft 365 admin center");
        console.error("   2. OR use a different email address that exists");
      }

      return false;
    }
  } catch (error) {
    console.error("❌ Error checking mailbox:", error.message);
    return false;
  }
}

async function testSendMail(token) {
  console.log("\nStep 2: Testing send permission...");

  const sendEndpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(SENDER_EMAIL)}/sendMail`;

  const testMessage = {
    message: {
      subject: "Test Email - Permission Check",
      body: {
        contentType: "Text",
        content: "This is a test email to verify Graph API send permissions.",
      },
      toRecipients: [
        {
          emailAddress: {
            address: "dan@officeexperts.com.au", // Send to self
          },
        },
      ],
    },
    saveToSentItems: false, // Don't save to sent items for test
  };

  try {
    console.log(`📍 Sending to: ${sendEndpoint}`);

    const response = await fetch(sendEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testMessage),
    });

    console.log(`📊 Response status: ${response.status}`);

    if (response.status === 202 || response.status === 200) {
      console.log("✅ ✅ ✅ EMAIL SENT SUCCESSFULLY! ✅ ✅ ✅");
      console.log(`\nCheck the inbox for ${SENDER_EMAIL}`);
      console.log("Your Microsoft Graph API is configured correctly!");
      return true;
    }

    const errorText = await response.text();
    console.error("❌ Send failed");
    console.error(`   Status: ${response.status}`);
    console.error(`   Response: ${errorText}`);

    try {
      const errorJson = JSON.parse(errorText);
      const errorCode = errorJson.error?.code;
      const errorMessage = errorJson.error?.message;

      console.error("\n🔍 Error Analysis:");
      console.error(`   Code: ${errorCode}`);
      console.error(`   Message: ${errorMessage}`);

      // Provide specific troubleshooting
      if (errorCode === "ErrorAccessDenied") {
        console.error("\n💡 ErrorAccessDenied Solutions:");
        console.error(
          "   1. Verify the mailbox has a valid Exchange Online license",
        );
        console.error(
          "   2. Wait 15-30 minutes after assigning license (provisioning delay)",
        );
        console.error("   3. Check if mailbox is enabled for online services");
        console.error(
          `   4. Try running: Get-Mailbox ${SENDER_EMAIL} in Exchange Online PowerShell`,
        );
      } else if (errorCode === "MailboxNotEnabledForRESTAPI") {
        console.error("\n💡 MailboxNotEnabledForRESTAPI Solutions:");
        console.error("   1. The mailbox exists but lacks proper licensing");
        console.error(
          "   2. Assign a Microsoft 365 license (E1, E3, E5, Business Basic, etc.)",
        );
        console.error("   3. Wait 15-30 minutes for license provisioning");
        console.error(
          "   4. The mailbox might be on-premises (hybrid setup issue)",
        );
      } else if (errorCode === "ErrorItemNotFound") {
        console.error("\n💡 ErrorItemNotFound Solutions:");
        console.error("   1. The email address doesn't exist in this tenant");
        console.error("   2. Check for typos in GRAPH_SENDER_EMAIL");
        console.error("   3. Verify tenant ID is correct");
      } else if (errorCode === "Forbidden" || response.status === 403) {
        console.error("\n💡 Forbidden/403 Solutions:");
        console.error("   1. Application permissions not granted correctly");
        console.error(
          "   2. Go to Azure Portal → App Registration → API Permissions",
        );
        console.error(
          '   3. Ensure Mail.Send is "Application" permission (not Delegated)',
        );
        console.error('   4. Click "Grant admin consent" button');
      } else {
        console.error("\n💡 General troubleshooting:");
        console.error(
          "   1. Check the mailbox license in Microsoft 365 admin center",
        );
        console.error("   2. Verify the mailbox is not disabled");
        console.error("   3. Check if there are any mail flow restrictions");
      }
    } catch (parseError) {
      // Raw text error
    }

    return false;
  } catch (error) {
    console.error("❌ Exception during send test:", error.message);
    return false;
  }
}

async function checkLicensing(token) {
  console.log("\nStep 3: Checking mailbox licensing...");

  const licensesEndpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(SENDER_EMAIL)}/licenseDetails`;

  try {
    const response = await fetch(licensesEndpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      const licenses = data.value;

      if (licenses.length === 0) {
        console.error("❌ NO LICENSES ASSIGNED!");
        console.error("\n💡 This is likely your problem!");
        console.error(
          "   The mailbox needs a Microsoft 365 license to send email.",
        );
        console.error("   Assign a license in Microsoft 365 admin center:");
        console.error("   - Business Basic");
        console.error("   - Business Standard");
        console.error("   - E1, E3, or E5");
        return false;
      }

      console.log(`✅ Found ${licenses.length} license(s):`);
      licenses.forEach((license, i) => {
        console.log(`   ${i + 1}. ${license.skuPartNumber}`);
      });

      // Check for Exchange Online
      const hasExchange = licenses.some(
        (l) =>
          l.skuPartNumber.includes("EXCHANGE") ||
          l.skuPartNumber.includes("BUSINESS") ||
          l.skuPartNumber.includes("ENTERPRISE"),
      );

      if (hasExchange) {
        console.log("✅ Has Exchange Online capability");
      } else {
        console.log(
          "⚠️  No obvious Exchange license found - might be included in suite",
        );
      }

      return true;
    } else {
      console.log(
        "⚠️  Could not check licenses (might need User.Read.All permission)",
      );
      return null;
    }
  } catch (error) {
    console.log("⚠️  Could not check licenses:", error.message);
    return null;
  }
}

async function runDiagnostic() {
  try {
    // Get token
    console.log("🔐 Getting access token...");
    const token = await getAccessToken();
    console.log("✅ Token acquired\n");

    // Check mailbox exists
    const mailboxExists = await checkMailbox(token);
    if (!mailboxExists) {
      console.log("\n❌ Cannot proceed - mailbox does not exist");
      process.exit(1);
    }

    // Check licensing
    await checkLicensing(token);

    // Test send
    const canSend = await testSendMail(token);

    // Final verdict
    console.log("\n========================================");
    if (canSend) {
      console.log("✅ ✅ ✅ SUCCESS ✅ ✅ ✅");
      console.log("Your Graph API configuration is working!");
    } else {
      console.log("❌ ❌ ❌ FAILED ❌ ❌ ❌");
      console.log("Fix the issues above and try again.");
    }
    console.log("========================================\n");
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  }
}

runDiagnostic();
