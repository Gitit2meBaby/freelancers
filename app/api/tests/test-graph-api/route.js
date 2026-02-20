// // app/api/test-graph-api/route.js
// // Diagnostic endpoint to test Microsoft Graph API setup

// import { NextResponse } from "next/server";

// /**
//  * GET /api/test-graph-api
//  * Comprehensive diagnostic test for Microsoft Graph API
//  */
// export async function GET() {
//   const results = {
//     timestamp: new Date().toISOString(),
//     tests: [],
//     overallSuccess: false,
//   };

//   console.log("🔍 ========================================");
//   console.log("🔍 GRAPH API DIAGNOSTIC TEST STARTED");
//   console.log("🔍 ========================================\n");

//   // Test 1: Environment Variables
//   console.log("Test 1: Checking environment variables...");
//   const envTest = {
//     name: "Environment Variables",
//     passed: false,
//     details: {},
//   };

//   const requiredVars = [
//     "GRAPH_TENANT_ID",
//     "GRAPH_CLIENT_ID",
//     "GRAPH_CLIENT_SECRET",
//     "GRAPH_SENDER_EMAIL",
//   ];

//   const missingVars = [];
//   requiredVars.forEach((varName) => {
//     const value = process.env[varName];
//     if (!value) {
//       missingVars.push(varName);
//       envTest.details[varName] = "❌ MISSING";
//     } else {
//       const displayValue =
//         varName === "GRAPH_CLIENT_SECRET"
//           ? `${value.substring(0, 10)}...${value.slice(-5)}`
//           : value;
//       envTest.details[varName] = `✅ ${displayValue}`;
//     }
//   });

//   envTest.passed = missingVars.length === 0;
//   if (!envTest.passed) {
//     envTest.error = `Missing variables: ${missingVars.join(", ")}`;
//   }
//   results.tests.push(envTest);
//   console.log(`✅ Test 1: ${envTest.passed ? "PASSED" : "FAILED"}\n`);

//   if (!envTest.passed) {
//     results.overallSuccess = false;
//     return NextResponse.json(results);
//   }

//   // Test 2: Sender Email Validation
//   console.log("Test 2: Validating sender email domain...");
//   const emailTest = {
//     name: "Sender Email Domain",
//     passed: false,
//     details: {},
//   };

//   const senderEmail = process.env.GRAPH_SENDER_EMAIL;
//   const externalDomains = [
//     "@gmail.com",
//     "@outlook.com",
//     "@hotmail.com",
//     "@yahoo.com",
//     "@live.com",
//   ];
//   const hasExternalDomain = externalDomains.some((domain) =>
//     senderEmail.includes(domain),
//   );

//   if (hasExternalDomain) {
//     emailTest.passed = false;
//     emailTest.error = `Using external domain: ${senderEmail}. Must use Microsoft 365 tenant domain.`;
//   } else {
//     emailTest.passed = true;
//     emailTest.details.senderEmail = senderEmail;
//     emailTest.details.domain = senderEmail.split("@")[1];
//   }
//   results.tests.push(emailTest);
//   console.log(`✅ Test 2: ${emailTest.passed ? "PASSED" : "FAILED"}\n`);

//   if (!emailTest.passed) {
//     results.overallSuccess = false;
//     return NextResponse.json(results);
//   }

//   // Test 3: Get Access Token
//   console.log("Test 3: Acquiring access token...");
//   const tokenTest = {
//     name: "Access Token Acquisition",
//     passed: false,
//     details: {},
//   };

//   try {
//     const tokenEndpoint = `https://login.microsoftonline.com/${process.env.GRAPH_TENANT_ID}/oauth2/v2.0/token`;

//     const params = new URLSearchParams({
//       client_id: process.env.GRAPH_CLIENT_ID,
//       client_secret: process.env.GRAPH_CLIENT_SECRET,
//       scope: "https://graph.microsoft.com/.default",
//       grant_type: "client_credentials",
//     });

//     console.log("Token endpoint:", tokenEndpoint);
//     console.log("Requesting token...");

//     const tokenResponse = await fetch(tokenEndpoint, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded",
//       },
//       body: params.toString(),
//     });

//     console.log("Token response status:", tokenResponse.status);

//     if (!tokenResponse.ok) {
//       const errorText = await tokenResponse.text();
//       console.error("Token error response:", errorText);
//       tokenTest.passed = false;
//       tokenTest.error = `${tokenResponse.status}: ${errorText}`;
//       tokenTest.details.httpStatus = tokenResponse.status;
//       tokenTest.details.errorBody = errorText;
//     } else {
//       const tokenData = await tokenResponse.json();
//       const accessToken = tokenData.access_token;

//       // Decode token to inspect claims
//       const payload = JSON.parse(
//         Buffer.from(accessToken.split(".")[1], "base64").toString(),
//       );

//       tokenTest.passed = true;
//       tokenTest.details.tokenLength = accessToken.length;
//       tokenTest.details.tokenPreview = `${accessToken.substring(0, 50)}...`;
//       tokenTest.details.claims = {
//         issuer: payload.iss,
//         audience: payload.aud,
//         appId: payload.appid,
//         tenantId: payload.tid,
//         roles: payload.roles || [],
//       };

//       // Check for Mail.Send permission
//       if (!payload.roles || !payload.roles.includes("Mail.Send")) {
//         tokenTest.warning =
//           "⚠️ Token does not include Mail.Send role - admin consent may not be granted!";
//       }

//       // Store token for next test
//       tokenTest.accessToken = accessToken;
//     }
//   } catch (error) {
//     tokenTest.passed = false;
//     tokenTest.error = error.message;
//     tokenTest.details.exception = error.toString();
//   }

//   results.tests.push(tokenTest);
//   console.log(`✅ Test 3: ${tokenTest.passed ? "PASSED" : "FAILED"}\n`);

//   if (!tokenTest.passed) {
//     results.overallSuccess = false;
//     return NextResponse.json(results);
//   }

//   // Test 4: Verify Sender Mailbox
//   console.log("Test 4: Verifying sender mailbox...");
//   const mailboxTest = {
//     name: "Sender Mailbox Verification",
//     passed: false,
//     details: {},
//   };

//   try {
//     const accessToken = tokenTest.accessToken;
//     const mailboxUrl = `https://graph.microsoft.com/v1.0/users/${process.env.GRAPH_SENDER_EMAIL}`;

//     console.log("Checking mailbox:", mailboxUrl);

//     const mailboxResponse = await fetch(mailboxUrl, {
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//       },
//     });

//     console.log("Mailbox response status:", mailboxResponse.status);

//     if (!mailboxResponse.ok) {
//       const errorText = await mailboxResponse.text();
//       console.error("Mailbox error response:", errorText);
//       mailboxTest.passed = false;
//       mailboxTest.error = `${mailboxResponse.status}: ${errorText}`;
//       mailboxTest.details.httpStatus = mailboxResponse.status;

//       if (mailboxResponse.status === 404) {
//         mailboxTest.diagnosis =
//           "Mailbox not found. Ensure the sender email exists in your Microsoft 365 tenant and has an Exchange Online license.";
//       } else if (mailboxResponse.status === 401) {
//         mailboxTest.diagnosis =
//           "Authentication failed. Admin consent may not be granted for Mail.Send permission.";
//       }
//     } else {
//       const userData = await mailboxResponse.json();
//       mailboxTest.passed = true;
//       mailboxTest.details = {
//         displayName: userData.displayName,
//         email: userData.mail || userData.userPrincipalName,
//         accountEnabled: userData.accountEnabled,
//         userType: userData.userType,
//       };

//       if (!userData.accountEnabled) {
//         mailboxTest.warning =
//           "⚠️ Account is disabled - cannot send email from disabled accounts";
//       }
//     }
//   } catch (error) {
//     mailboxTest.passed = false;
//     mailboxTest.error = error.message;
//   }

//   results.tests.push(mailboxTest);
//   console.log(`✅ Test 4: ${mailboxTest.passed ? "PASSED" : "FAILED"}\n`);

//   if (!mailboxTest.passed) {
//     results.overallSuccess = false;
//     return NextResponse.json(results);
//   }

//   // Test 5: Test Email Send (Dry Run)
//   console.log("Test 5: Testing email send endpoint (dry run)...");
//   const sendTest = {
//     name: "Email Send Endpoint Test",
//     passed: false,
//     details: {},
//   };

//   try {
//     const accessToken = tokenTest.accessToken;
//     const sendUrl = `https://graph.microsoft.com/v1.0/users/${process.env.GRAPH_SENDER_EMAIL}/sendMail`;

//     // Prepare a test message (won't actually send - we'll just test the endpoint structure)
//     const testMessage = {
//       message: {
//         subject: "Test Email - Diagnostic",
//         body: {
//           contentType: "HTML",
//           content: "<h1>Test</h1>",
//         },
//         toRecipients: [
//           {
//             emailAddress: {
//               address: process.env.GRAPH_SENDER_EMAIL, // Send to self
//             },
//           },
//         ],
//       },
//       saveToSentItems: false, // Don't save during test
//     };

//     console.log("Testing send endpoint:", sendUrl);
//     console.log(
//       "Message structure:",
//       JSON.stringify(testMessage, null, 2).substring(0, 200) + "...",
//     );

//     // We'll do a test call with minimal content
//     const sendResponse = await fetch(sendUrl, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(testMessage),
//     });

//     console.log("Send response status:", sendResponse.status);

//     if (!sendResponse.ok) {
//       const errorText = await sendResponse.text();
//       console.error("Send error response:", errorText);
//       sendTest.passed = false;
//       sendTest.error = `${sendResponse.status}: ${errorText}`;
//       sendTest.details.httpStatus = sendResponse.status;

//       if (sendResponse.status === 401) {
//         sendTest.diagnosis =
//           "401 Unauthorized - Most likely causes: 1) Admin consent not granted for Mail.Send, 2) Permissions not propagated yet (wait 10 min), 3) Sender mailbox lacks Exchange license";
//       } else if (sendResponse.status === 403) {
//         sendTest.diagnosis =
//           "403 Forbidden - App has no permission to send email from this mailbox";
//       }
//     } else {
//       sendTest.passed = true;
//       sendTest.details.message =
//         "Successfully sent test email (to self for safety)";
//       sendTest.details.note =
//         "This was a real email send test - check sender mailbox inbox";
//     }
//   } catch (error) {
//     sendTest.passed = false;
//     sendTest.error = error.message;
//   }

//   results.tests.push(sendTest);
//   console.log(`✅ Test 5: ${sendTest.passed ? "PASSED" : "FAILED"}\n`);

//   // Overall result
//   results.overallSuccess = results.tests.every((test) => test.passed);

//   console.log("🎯 ========================================");
//   console.log(
//     `🎯 DIAGNOSTIC ${results.overallSuccess ? "COMPLETE - ALL TESTS PASSED ✅" : "FAILED ❌"}`,
//   );
//   console.log("🎯 ========================================\n");

//   if (results.overallSuccess) {
//     console.log(
//       "✅ All tests passed! Your Microsoft Graph API setup is working correctly.",
//     );
//     console.log("✅ You should now be able to send emails without issues.\n");
//   } else {
//     console.log("❌ Some tests failed. See results for details.");
//     console.log("❌ Common fixes:");
//     console.log("   1. Grant admin consent in Azure Portal");
//     console.log("   2. Ensure sender email has Exchange Online license");
//     console.log("   3. Wait 10 minutes after granting consent");
//     console.log("   4. Verify all environment variables are correct\n");
//   }

//   return NextResponse.json(results, {
//     status: results.overallSuccess ? 200 : 500,
//   });
// }
