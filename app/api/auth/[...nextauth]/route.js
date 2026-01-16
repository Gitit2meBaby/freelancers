// app/api/auth/[...nextauth]/route.js - PRODUCTION READY
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  executeQuery,
  VIEWS,
  TABLES,
  STATUS_CODES,
} from "../../../../app/lib/db";
import { getBlobUrl } from "../../../../app/lib/azureBlob";
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

    // Credentials Provider (Email + Password)
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

          // Step 1: Check if email exists in vwFreelancersListWEB2
          const query = `
            SELECT 
              FreelancerID,
              DisplayName,
              Email,
              Slug,
              PhotoBlobID,
              PhotoStatusID
            FROM ${VIEWS.FREELANCERS}
            WHERE Email = @email
          `;

          const users = await executeQuery(query, {
            email: credentials.email.toLowerCase().trim(),
          });

          if (!users || users.length === 0) {
            throw new Error("Email address not found in our database");
          }

          const user = users[0];

          // Step 2: Get PasswordHash from tblFreelancerWebsiteData
          const passwordQuery = `
            SELECT PasswordHash
            FROM ${TABLES.FREELANCER_WEBSITE_DATA}
            WHERE FreelancerID = @freelancerId
          `;

          const passwordData = await executeQuery(passwordQuery, {
            freelancerId: user.FreelancerID,
          });

          if (passwordData.length === 0) {
            throw new Error("User data not found");
          }

          const passwordHash = passwordData[0].PasswordHash;
          const userHasPassword = hasPassword(passwordHash);

          // Step 3a: First-time login - set password
          if (!userHasPassword) {
            const result = await setInitialPassword(
              user.FreelancerID,
              credentials.password
            );

            if (!result.success) {
              throw new Error("Failed to set password. Please try again.");
            }

            return {
              id: user.FreelancerID.toString(),
              name: user.DisplayName,
              email: user.Email,
              slug: user.Slug,
              photoBlobId: user.PhotoBlobID,
              photoStatusId: user.PhotoStatusID,
              isFirstLogin: true,
            };
          }

          // Step 3b: Returning user - verify password
          const isValidPassword = await verifyPassword(
            credentials.password,
            passwordHash
          );

          if (!isValidPassword) {
            throw new Error("Invalid password");
          }

          return {
            id: user.FreelancerID.toString(),
            name: user.DisplayName,
            email: user.Email,
            slug: user.Slug,
            photoBlobId: user.PhotoBlobID,
            photoStatusId: user.PhotoStatusID,
            isFirstLogin: false,
          };
        } catch (error) {
          console.error("Authorization error:", error.message);
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
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.slug = user.slug;
        token.freelancerId = parseInt(user.id);
        token.isFirstLogin = user.isFirstLogin || false;
        token.photoBlobId = user.photoBlobId;
        token.photoStatusId = user.photoStatusId;
      }

      // Session update trigger (e.g., after profile photo update)
      if (trigger === "update" && user) {
        token.name = user.name;
        token.slug = user.slug;

        // Allow updating photo info on session update
        if (user.photoBlobId !== undefined) {
          token.photoBlobId = user.photoBlobId;
        }
        if (user.photoStatusId !== undefined) {
          token.photoStatusId = user.photoStatusId;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.slug = token.slug;
        session.user.freelancerId = token.freelancerId;
        session.user.isFirstLogin = token.isFirstLogin;

        // Add profile image URL to session
        if (
          token.photoBlobId &&
          token.photoStatusId === STATUS_CODES.VERIFIED
        ) {
          session.user.image = getBlobUrl(token.photoBlobId);
        } else {
          session.user.image = null;
        }

        const adminEmails = [
          "info@freelancers.com.au",
          "accounts@freelancers.com.au",
          "dan@officeexperts.com.au",
          "paul.misfud@officeexperts.com.au",
        ];
        session.user.isAdmin = adminEmails.includes(session.user.email);
      }

      return session;
    },

    async signIn({ user, account }) {
      // Google OAuth sign-in
      if (account?.provider === "google") {
        try {
          // Check if user exists in database
          const query = `
            SELECT 
              FreelancerID, 
              Slug, 
              DisplayName,
              PhotoBlobID,
              PhotoStatusID
            FROM ${VIEWS.FREELANCERS}
            WHERE Email = @email
          `;

          const users = await executeQuery(query, { email: user.email });

          if (!users || users.length === 0) {
            return false; // User not in database - deny access
          }

          // User exists - populate session data
          user.id = users[0].FreelancerID.toString();
          user.slug = users[0].Slug;
          user.name = users[0].DisplayName;
          user.photoBlobId = users[0].PhotoBlobID;
          user.photoStatusId = users[0].PhotoStatusID;

          return true;
        } catch (error) {
          console.error("Google sign-in error:", error);
          return false;
        }
      }

      // Credentials sign-in (handled by authorize function)
      return true;
    },

    async redirect({ url, baseUrl }) {
      // Redirect to the URL if it's relative
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      // Redirect to the URL if it's on the same origin
      if (new URL(url).origin === baseUrl) return url;

      // Otherwise redirect to base URL
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
      const method =
        account.provider === "google" ? "Google" : "Email/Password";
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
 * HOW THIS AUTHENTICATION SYSTEM WORKS
 * ================================================
 *
 * EMAIL/PASSWORD LOGIN:
 * 1. User enters email + password
 * 2. Check if email exists in vwFreelancersListWEB2 (verified freelancers)
 * 3. Check if PasswordHash exists in tblFreelancerWebsiteData:
 *    - NO HASH: First login → Set password, allow access
 *    - HAS HASH: Verify password → Allow/deny access
 *
 * GOOGLE OAUTH LOGIN:
 * 1. User clicks "Sign in with Google"
 * 2. Google handles authentication
 * 3. Check if email exists in vwFreelancersListWEB2
 *    - YES: Allow access (no password needed)
 *    - NO: Deny access (not a verified freelancer)
 *
 * NOTE: Google OAuth users bypass password system entirely.
 * They can ONLY sign in via Google, not email/password.
 *
 * ================================================
 * SESSION DATA STRUCTURE
 * ================================================
 *
 * session.user = {
 *   id: "1152",
 *   email: "user@example.com",
 *   name: "Display Name",
 *   slug: "user-slug",
 *   freelancerId: 1152,
 *   isFirstLogin: false,
 *   image: "https://...blob.core.windows.net/photo-123?sas-token"
 * }
 *
 * ================================================
 */
