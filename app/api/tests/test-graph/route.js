import { NextResponse } from "next/server";

export async function GET() {
  console.log("🧪 Testing Microsoft Graph API credentials...");

  const tenantId = process.env.GRAPH_TENANT_ID;
  const clientId = process.env.GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET;

  console.log(
    "Tenant ID:",
    tenantId ? `${tenantId.substring(0, 8)}...` : "MISSING",
  );
  console.log(
    "Client ID:",
    clientId ? `${clientId.substring(0, 8)}...` : "MISSING",
  );
  console.log(
    "Client Secret:",
    clientSecret ? `${clientSecret.substring(0, 8)}...` : "MISSING",
  );

  if (!tenantId || !clientId || !clientSecret) {
    return NextResponse.json({
      success: false,
      error: "Missing credentials",
      details: {
        hasTenantId: !!tenantId,
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
      },
    });
  }

  try {
    // Try to get an access token
    console.log("🔐 Attempting to get access token...");

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const data = await response.json();

    console.log("Token response status:", response.status);
    console.log("Token response:", response.ok ? "SUCCESS" : data);

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: "Failed to get access token",
        status: response.status,
        details: data,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Successfully authenticated with Microsoft Graph!",
      tokenPreview: data.access_token.substring(0, 50) + "...",
    });
  } catch (error) {
    console.error("❌ Test error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
