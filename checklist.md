# Migration Meeting Guide (FOR ME)

## Pre-Meeting Prep

- [ ] Have Azure portal ready in browser tab
- [ ] Have Google Cloud Console ready in browser tab
- [ ] Have my email ready to copy/paste: `[YOUR EMAIL HERE]`
- [ ] Have notepad ready for domain registrar info
- [ ] Test screenshare before call

---

## Meeting Flow (30-40 mins)

### 1. INTRODUCTION (2 mins)

**Say:**

- "Thanks for meeting. Today we need to set up access so I can deploy the new site"
- "I'll need temporary access to Azure, Microsoft 365, and Google Cloud"
- "I'm sending you a reference document in chat now - you can keep this for later"

**Action:** Send them the .txt reference document

---

### 2. AZURE WEB APP HOSTING (8 mins)

**Say:**

- "First, we need to set up hosting on Azure Static Web Apps"
- "Can you open https://portal.azure.com and sign in?"

**Guide them through:**

1. Click **Subscriptions** (left menu)
2. Click their subscription name
3. Click **Access control (IAM)**
4. Click **+ Add** → **Add role assignment**
5. Select **Contributor** role
6. Click **Next** → **+ Select members**
7. Enter my email: `[YOUR EMAIL]`
8. Click **Select** → **Review + assign**

**Confirm:** "Great, I should receive an email notification shortly"

---

### 3. MICROSOFT 365 EMAIL (GRAPH API) (10 mins)

**Say:**

- "Next, I need access to set up automated emails - contact form, password resets, etc."
- "This requires access to Microsoft Entra ID"

**Guide them through:**

1. In Azure portal, click **Microsoft Entra ID**
2. Click **Users** → **+ New user** → **Invite external user**
3. Enter my email: `[YOUR EMAIL]` and name
4. Click **Invite**
5. Go back, click **Roles and administrators**
6. Search for "Cloud Application Administrator"
7. Click on it → **+ Add assignments**
8. Select my email → Click **Add**

**Confirm:** "Perfect. I'll set up the Graph API app and will need you to do one final approval click later - I'll email you when ready"

**Ask:** "What email should system notifications come from? Like noreply@freelancers.com.au or info@freelancers.com.au?"

**Note their answer:** **********\_\_\_**********

---

### 4. GOOGLE CLOUD (OAUTH) (8 mins)

**Say:**

- "Last technical bit - setting up Google login for freelancers"
- "Can you open https://console.cloud.google.com?"

**Guide them through:**

1. Click **project dropdown** at top → **New Project**
2. Name: "Freelancers Promotions Website"
3. Click **Create**
4. Wait for it to be created (might take 30 seconds)
5. Once ready, click **IAM & Admin** → **IAM**
6. Click **+ Grant Access**
7. Enter my email: `[YOUR EMAIL]`
8. Role: **Editor** (NOT Owner)
9. Click **Save**

**Confirm:** "Excellent, that's the main technical setup done"

---

### 5. DOMAIN & DNS (5 mins)

**Say:**

- "For the actual migration, we'll need to update DNS records"
- "Do you know where your domain is registered?"

**If they know:**

- Note down registrar: **********\_\_\_**********
- Ask: "Can you give me temporary access, or would you prefer to add the records yourself?"
- Note their preference: **********\_\_\_**********

**If they don't know:**

- "No worries, we can investigate this together before migration day"
- "I can help you find out - usually there's a WHOIS lookup we can do"

---

### 6. COSTS & HOSTING (5 mins)

**Say:**

- "Quick chat about costs. The new hosting is Azure Static Web Apps"
- "Standard tier is $13.44 AUD per month, so about $161 per year"
- "Plus Azure Blob Storage for images - roughly $5 per month, $60 per year"
- "Total: around $220-230 per year for hosting"

**Explain:**

- "This is actually cheaper than most WordPress hosting"
- "You're currently paying for WordPress hosting - you can cancel that once we're live"
- "No more Elementor plugins or WordPress licenses needed"
- "Everything is custom-built and much faster"

**Ask:** "Does this fit within your budget?"

**Note their response:** **********\_\_\_**********

---

### 7. LOGIN APPROACH (3 mins)

**Say:**

- "For freelancer logins - we're doing a 'set password on first visit' approach"
- "When someone tries to log in for the first time, they'll be prompted to create a new password"
- "Alternatively, they can just use 'Sign in with Google' if they have a Google account"
- "This means no mass email needed, and it's more secure"

**Confirm:** "Does this approach sound good to you?"

---

### 8. WRAP UP (2 mins)

**Say:**

- "That's everything I need for now"
- "I'll get started on the setup this week"
- "I'll send you a test URL in 2-3 days so you can review before we go live"
- "Any questions?"

**Send follow-up email after meeting with:**

- Summary of access granted
- Timeline for test URL
- Next steps

---

## NOTES SECTION

**Domain Registrar Info:**

**System Email Address:**

**DNS Management Preference:**

**Budget Approved:** YES / NO

**Migration Date Preference:**

**Other Notes:**

---

## POST-MEETING ACTIONS

- [ ] Confirm email invitations received
- [ ] Test Azure subscription access
- [ ] Test Microsoft 365 access
- [ ] Test Google Cloud access
- [ ] Send summary email to client
- [ ] Start Azure Static Web App setup
- [ ] Create Graph API app registration
- [ ] Configure Google OAuth

---

## TROUBLESHOOTING

**If they can't find Subscriptions:**

- "Try clicking 'All services' and search for Subscriptions"

**If they don't have a subscription:**

- "You might need to create one first, or check if it's under a different account"

**If they're not Global Admin:**

- "We might need to get the IT admin or account owner involved for these permissions"

**If they're concerned about access:**

- Reassure: "This is all temporary, typically removed within a week"
- "You can revoke access anytime"
- "I only see website-related stuff, not your emails or personal data"

**If costs are a concern:**

- "This is actually competitive with quality WordPress hosting"
- "The performance and security benefits are significant"
- "Happy to look at the free tier for initial testing if you prefer"

# BONUS: How to Add a New Email Address to Microsoft 365

## IF CLIENT ASKS: "How do I add noreply@ or system@ email?"

---

## OPTION 1: SHARED MAILBOX (RECOMMENDED - FREE)

**Best for:** noreply@, system@, no-reply@ addresses that don't need a full license

**Say to client:**
"We can create a shared mailbox - it's free and perfect for system emails. You don't need to buy another license."

**Guide them through:**

1. Go to **admin.microsoft.com** (Microsoft 365 Admin Center)
2. Click **Teams & groups** → **Shared mailboxes** in left menu
3. Click **+ Add a shared mailbox**
4. Enter name: "System Notifications" or "No Reply"
5. Enter email: `noreply@freelancers.com.au` (or whatever they choose)
6. Click **Add**
7. Once created, click on the mailbox name
8. Click **Members** tab
9. Add yourself and them as members (so you can send from it)

**Advantages:**

- ✅ Free (no license needed)
- ✅ Perfect for automated system emails
- ✅ Can have multiple people access it if needed
- ✅ 50GB storage included

---

## OPTION 2: EMAIL ALIAS (EASIEST - FREE)

**Best for:** If they want to use their existing mailbox (like info@)

**Say to client:**
"Actually, the easiest option is to just use your existing info@freelancers.com.au email. We can add 'noreply@' as an alias if you want emails to appear to come from that address."

**Guide them through:**

1. Go to **admin.microsoft.com**
2. Click **Users** → **Active users**
3. Click on the user who has info@freelancers.com.au
4. Under **Username and email** section, click **Manage username and email**
5. Click **+ Add an alias**
6. Enter: `noreply` (just the part before @)
7. Select `@freelancers.com.au` from dropdown
8. Check the box "Set as primary email address" if they want emails to show from noreply@
9. Click **Save changes**

**Advantages:**

- ✅ Free (uses existing license)
- ✅ Takes 30 seconds
- ✅ No new mailbox to manage
- ✅ All emails arrive in their existing inbox

---

## OPTION 3: JUST USE EXISTING EMAIL (SIMPLEST)

**Say to client:**
"The simplest option is to just use info@freelancers.com.au for system emails. That way everything comes from one recognizable address."

**No setup needed:**

- Uses their existing Microsoft 365 mailbox
- Nothing to configure
- Just give me the credentials for Graph API

**Advantages:**

- ✅ Zero setup time
- ✅ No confusion about multiple addresses
- ✅ Consistent branding

---

## MY RECOMMENDATION TO CLIENT

**If they're unsure, say:**

"I'd recommend Option 2 - add 'noreply@' as an alias to your existing info@ mailbox. That way:

- System emails come from noreply@ (looks professional)
- But all replies go to your existing inbox
- Zero extra cost or management
- Takes 30 seconds to set up"

---

## WHAT I NEED FROM THEM (ONCE DECIDED)

**For Graph API configuration, I need:**

1. **The email address** they chose (e.g., noreply@freelancers.com.au)
2. **User Principal Name** of the mailbox owner (usually just the email)
3. **They'll need to grant admin consent** when I request Graph API permissions (one click, I'll guide them)

**I DON'T need:**

- Their actual password
- Access to their mailbox
- To read any emails

**Graph API handles everything securely through OAuth tokens.**

---

## ADD THIS TO MY MEETING NOTES

**When they ask about email:**

Write down:

- Option chosen: Shared Mailbox / Alias / Existing
- Email address: **********\_\_\_**********
- Setup completed: YES / NO (if no, note to follow up)

**If they need help setting it up:**

- "I can guide you through this now if you have 2 minutes, or we can do it on a quick follow-up call"
- Keep meeting moving if they prefer to do it later
