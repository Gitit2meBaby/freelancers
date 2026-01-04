## To ask AI

How does the Ip whitelisting work for other users?

How do I push changes to the DB and blob if I have only read only credentials, and how do I allow authenticated users to make changes to the database?

## To ask Paul

Some of the bios are coming up short in my return compared to when I look at the original website.

Any idea what is happening with

Authentication table adding to DB, How are current passwords stored?

password reset link?

Do they have microsoft 365 for business? (for email options)

## To ask Martine

Sign up to Vercel

Sign up to sendGrid or Resend

Current Domain Provider, Need DNS Records

What happens with the password reset link?

Where is the longform guidelines link?

Ask for Google Verification code

Does she have Google Search console and Google analytics?

Happy with the placeholder image, or no image at all?

## TODO

Create password reset link

Test Portals for members

Create authentication, Google OAuth? where are the passwords stored?

Create email API with credentials. Azure credentials or new email provider?

See about creating dynamic pdf's with the crew directory? also freelancers list?

# Domain Registrar

For Vercel hosting:
Type: A
Name: @
Value: 76.76.21.21 (Vercel's IP)

Type: CNAME
Name: www
Value: cname.vercel-dns.com

For Azure email verification (same DNS panel):
Type: TXT
Name: @
Value: azure-verification=abc123...

Type: TXT
Name: @
Value: v=spf1 include:spf.azurecomm.net ~all

Type: CNAME
Name: selector1.\_domainkey
Value: selector1-freelancers-com-au.\_domainkey.azurecomm.net

```

All in the **same DNS management interface**.

---

## How It Works

1. **Browser requests** `freelancers.com.au`
2. **DNS lookup** → "Where is this hosted?" → Vercel servers (A/CNAME records)
3. **Vercel** serves your Next.js app
4. **Email sent** from contact form
5. **Azure checks** DNS → "Is this domain verified?" → Finds TXT/SPF/DKIM records → ✅ Verified

---

## Vercel's Role

Vercel only needs you to:
1. Add `freelancers.com.au` in Vercel dashboard
2. Vercel tells you which DNS records to add (A/CNAME)
3. You add those to domain registrar
4. Done - Vercel handles hosting

Vercel **never touches** your email DNS records.

---

## Practical Example

**Where the client manages `freelancers.com.au` DNS:**
```

Example: GoDaddy DNS Management Panel
├─ A Record → 76.76.21.21 (Vercel hosting)
├─ CNAME www → cname.vercel-dns.com (Vercel hosting)
├─ TXT @ → azure-verification=... (Azure email)
├─ TXT @ → v=spf1 include:... (Azure email)
└─ CNAME selector1.\_domainkey → ... (Azure email)

# Authentication Setup Process

Set Up Google OAuth
3.1 Create Google Cloud Project

Go to Google Cloud Console
https://console.cloud.google.com/
Create new project: "Freelancers Promotions"
Enable Google+ API

3.2 Create OAuth Credentials

Navigate to: APIs & Services → Credentials
Click: Create Credentials → OAuth client ID
Application type: Web application
Name: "Freelancers Website"

3.3 Configure Authorized URIs
Authorized JavaScript origins:
http://localhost:3000
https://freelancers.com.au
Authorized redirect URIs:
http://localhost:3000/api/auth/callback/google
https://freelancers.com.au/api/auth/callback/google
3.4 Save Credentials
Copy the Client ID and Client Secret to .env.local:
envGOOGLE_CLIENT_ID="123456789-xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxx"
