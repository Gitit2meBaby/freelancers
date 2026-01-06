// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { executeQuery, VIEWS } from "../../../../app/lib/db";
import {
  hasPassword,
  verifyPassword,
  setInitialPassword,
} from "../../../../app/lib/passwordUtils";

export const authOptions = {
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // Credentials Provider
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "your@email.com",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Email and password are required");
          }

          console.log(`🔐 Login attempt for: ${credentials.email}`);

          // ================================================
          // CORRECTED QUERY - based on Paul's email
          // vwFreelancersListWEB2 contains:
          // - FreelancerID, DisplayName, Email, Slug, BlobIDs, Statuses
          // - NO IsActive column (filtered by "Show On Website = True" in view)
          // - NO PasswordHash column (needs to be added to tblFreelancerWebsiteData)
          // ================================================
          const query = `
            SELECT 
              FreelancerID,
              DisplayName,
              Email,
              Slug
            FROM ${VIEWS.FREELANCERS}
            WHERE Email = @email
          `;

          const users = await executeQuery(query, {
            email: credentials.email.toLowerCase().trim(),
          });

          // ================================================
          // Email not found
          // ================================================
          if (!users || users.length === 0) {
            console.log(`❌ Email not found: ${credentials.email}`);
            throw new Error("Email address not found in our database");
          }

          const user = users[0];
          console.log(
            `✅ Email found: ${user.DisplayName} (ID: ${user.FreelancerID})`
          );

          // ================================================
          // ⚠️ TEMPORARY WORKAROUND ⚠️
          // Until PasswordHash column is added, we'll just log them in
          // This allows you to test the rest of the flow
          // ================================================
          console.log("⚠️ WARNING: PasswordHash column not yet added");
          console.log("⚠️ Allowing login without password verification");
          console.log("⚠️ This is TEMPORARY - add PasswordHash column ASAP!");

          return {
            id: user.FreelancerID.toString(),
            name: user.DisplayName,
            email: user.Email,
            slug: user.Slug,
            isFirstLogin: true, // Treat everyone as first-time until PasswordHash is added
          };

          // ================================================
          // TODO: Once PasswordHash column is added, uncomment this code:
          // ================================================
          /*
          // Get password from tblFreelancerWebsiteData
          const passwordQuery = `
            SELECT PasswordHash
            FROM tblFreelancerWebsiteData
            WHERE FreelancerID = @freelancerId
          `;
          
          const passwordData = await executeQuery(passwordQuery, {
            freelancerId: user.FreelancerID
          });

          const passwordHash = passwordData[0]?.PasswordHash;
          const userHasPassword = hasPassword(passwordHash);

          if (!userHasPassword) {
            // First-time login - set password
            console.log(`🆕 First-time login - setting password`);

            const result = await setInitialPassword(
              user.FreelancerID,
              credentials.password
            );

            if (!result.success) {
              throw new Error("Failed to set password. Please try again.");
            }

            console.log(`✅ Password set - login successful`);

            return {
              id: user.FreelancerID.toString(),
              name: user.DisplayName,
              email: user.Email,
              slug: user.Slug,
              isFirstLogin: true,
            };
          }

          // Verify existing password
          console.log(`🔑 Verifying password`);

          const isValidPassword = await verifyPassword(
            credentials.password,
            passwordHash
          );

          if (!isValidPassword) {
            console.log(`❌ Invalid password`);
            throw new Error("Invalid password");
          }

          console.log(`✅ Login successful`);

          return {
            id: user.FreelancerID.toString(),
            name: user.DisplayName,
            email: user.Email,
            slug: user.Slug,
            isFirstLogin: false,
          };
          */
        } catch (error) {
          console.error("❌ Authorization error:", error.message);
          throw error;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.slug = user.slug;
        token.freelancerId = parseInt(user.id);
        token.isFirstLogin = user.isFirstLogin || false;
      }

      if (trigger === "update" && user) {
        token.name = user.name;
        token.slug = user.slug;
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.slug = token.slug;
        session.user.freelancerId = token.freelancerId;
        session.user.isFirstLogin = token.isFirstLogin;
      }

      return session;
    },

    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          console.log(`🔐 Google sign-in for: ${user.email}`);

          // Correct query without IsActive column
          const query = `
            SELECT FreelancerID, Slug, DisplayName
            FROM ${VIEWS.FREELANCERS}
            WHERE Email = @email
          `;

          const users = await executeQuery(query, { email: user.email });

          if (!users || users.length === 0) {
            console.log(`❌ Google sign-in denied`);
            return false;
          }

          user.id = users[0].FreelancerID.toString();
          user.slug = users[0].Slug;
          user.name = users[0].DisplayName;

          console.log(`✅ Google sign-in successful`);
          return true;
        } catch (error) {
          console.error("❌ Google sign-in error:", error);
          return false;
        }
      }

      return true;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: "/member-login",
    signOut: "/",
    error: "/member-login",
  },

  events: {
    async signIn({ user, account }) {
      const method = account.provider === "google" ? "Google" : "credentials";
      console.log(`✅ ${method} sign-in: ${user.email}`);
    },
    async signOut({ token }) {
      console.log(`👋 Sign-out: ${token.email}`);
    },
  },

  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

/**
 * ================================================
 * NEXT STEPS TO COMPLETE AUTHENTICATION:
 * ================================================
 *
 * 1. Run the migration script to add PasswordHash column:
 *    node scripts/add-password-field-confirmed.js
 *
 * 2. Once PasswordHash is added, uncomment the password verification code above
 *
 * 3. Test the full flow:
 *    - First login: sets password
 *    - Second login: verifies password
 *
 * ================================================
 * CURRENT STATE (TEMPORARY):
 * ================================================
 *
 * - ❌ No password verification (PasswordHash column doesn't exist yet)
 * - ✅ Email verification works
 * - ✅ User can log in if email exists
 * - ⚠️ SECURITY WARNING: Anyone with a valid email can log in!
 *
 * This is TEMPORARY until you add the PasswordHash column.
 *
 * ================================================
 * WHAT PAUL'S VIEW ACTUALLY CONTAINS:
 * ================================================
 *
 * vwFreelancersListWEB2:
 * - FreelancerID ✅
 * - DisplayName ✅
 * - Email ✅
 * - Slug ✅
 * - PhotoBlobID
 * - CVBlobID
 * - PhotoStatusID
 * - CVStatusID
 * - (Filtered by: Show On Website = True)
 *
 * NOT in view:
 * - IsActive ❌ (this was wrong)
 * - PasswordHash ❌ (needs to be added to tblFreelancerWebsiteData)
 */
