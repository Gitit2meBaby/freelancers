// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { executeQuery, VIEWS } from "../../../../app/lib/db";

/**
 * NextAuth Configuration
 * Supports Google OAuth, Email Magic Links, and Username/Password
 */
export const authOptions = {
  providers: [
    // Existing Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),

    // Existing Email Magic Link Provider
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),

    // NEW: Credentials Provider for Username/Password Login
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
          // Validate input
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Email and password are required");
          }

          // Query database for user by email
          const query = `
            SELECT 
              f.FreelancerID,
              f.DisplayName,
              f.Email,
              f.PasswordHash,
              f.IsActive,
              f.Slug
            FROM ${VIEWS.FREELANCERS} f
            WHERE f.Email = @email
              AND f.IsActive = 1
          `;

          const users = await executeQuery(query, { email: credentials.email });

          // User not found or inactive
          if (!users || users.length === 0) {
            throw new Error("Invalid email or password");
          }

          const user = users[0];

          // Verify password
          // TODO: Replace with actual password verification once Paul confirms hash method
          // For now, using bcrypt as the standard
          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.PasswordHash || "" // PasswordHash should exist in DB
          );

          if (!isValidPassword) {
            throw new Error("Invalid email or password");
          }

          // Return user object (will be passed to JWT callback)
          return {
            id: user.FreelancerID.toString(),
            name: user.DisplayName,
            email: user.Email,
            slug: user.Slug,
          };
        } catch (error) {
          console.error("Authorization error:", error);
          // Return null to show error to user
          return null;
        }
      },
    }),
  ],

  // Session configuration
  session: {
    strategy: "jwt", // Use JWT for sessions (no database required)
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // JWT configuration
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Callback functions
  callbacks: {
    /**
     * JWT Callback
     * Runs whenever a JWT is created or updated
     * Add custom properties to the token here
     */
    async jwt({ token, user, account, trigger }) {
      // Initial sign in - user object is available
      if (user) {
        token.id = user.id;
        token.slug = user.slug;
        token.freelancerId = parseInt(user.id);
      }

      // Handle updates from client (e.g., profile updates)
      if (trigger === "update" && user) {
        token.name = user.name;
        token.slug = user.slug;
      }

      return token;
    },

    /**
     * Session Callback
     * Runs whenever a session is checked
     * Add custom properties to the session here
     */
    async session({ session, token }) {
      // Add custom properties to session.user
      if (token && session.user) {
        session.user.id = token.id;
        session.user.slug = token.slug;
        session.user.freelancerId = token.freelancerId;
      }

      return session;
    },

    /**
     * Sign In Callback
     * Controls whether a user is allowed to sign in
     */
    async signIn({ user, account, profile }) {
      // For Google OAuth, check if email exists in database
      if (account?.provider === "google") {
        try {
          const query = `
            SELECT FreelancerID, IsActive, Slug
            FROM ${VIEWS.FREELANCERS}
            WHERE Email = @email
              AND IsActive = 1
          `;

          const users = await executeQuery(query, { email: user.email });

          if (!users || users.length === 0) {
            // User not found - deny sign in
            console.log(
              `Google sign-in denied: Email ${user.email} not found in database`
            );
            return false;
          }

          // Add freelancer data to user object for JWT callback
          user.id = users[0].FreelancerID.toString();
          user.slug = users[0].Slug;

          return true;
        } catch (error) {
          console.error("Sign in error:", error);
          return false;
        }
      }

      // Allow email and credentials sign in (already validated in authorize)
      return true;
    },

    /**
     * Redirect Callback
     * Controls where users are redirected after sign in
     */
    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        return url;
      }

      // Default to base URL
      return baseUrl;
    },
  },

  // Custom pages
  pages: {
    signIn: "/member-login", // Custom login page
    signOut: "/", // Redirect to home after sign out
    error: "/member-login", // Error page (with error code in query)
    // verifyRequest: '/auth/verify', // Email verification page
    // newUser: '/welcome' // New user welcome page
  },

  // Enable debug mode in development
  debug: process.env.NODE_ENV === "development",

  // Events for logging and side effects
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`✅ User signed in: ${user.email}`);
      // TODO: Log sign-in event to database
      // TODO: Send welcome email if isNewUser
    },
    async signOut({ token }) {
      console.log(`👋 User signed out: ${token.email}`);
      // TODO: Log sign-out event
    },
    async createUser({ user }) {
      console.log(`🆕 New user created: ${user.email}`);
      // TODO: Send welcome email
    },
  },
};

// Create the handler
const handler = NextAuth(authOptions);

// Export for both GET and POST
export { handler as GET, handler as POST };

/**
 * IMPORTANT NOTES:
 *
 * 1. PASSWORD HASHING:
 *    - Currently assumes bcrypt hashed passwords
 *    - Paul needs to confirm actual password storage method
 *    - Supported methods: bcrypt, argon2, pbkdf2
 *    - If passwords are plain text (NOT RECOMMENDED), they need to be hashed ASAP
 *
 * 2. GOOGLE OAUTH:
 *    - Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
 *    - Requires authorized redirect URI in Google Console:
 *      https://your-domain.com/api/auth/callback/google
 *
 * 3. EMAIL PROVIDER:
 *    - Currently configured but may not work without SMTP setup
 *    - Alternative: Use magic link emails via Microsoft Graph API
 *
 * 4. DATABASE VIEWS:
 *    - Assumes vwFreelancersListWEB2 has these fields:
 *      - FreelancerID
 *      - DisplayName
 *      - Email
 *      - PasswordHash
 *      - IsActive
 *      - Slug
 *    - If field names differ, update query above
 *
 * 5. SESSION STORAGE:
 *    - Using JWT (no database needed)
 *    - Sessions stored in browser cookies
 *    - Secure for read-only database access
 *
 * 6. TESTING:
 *    - Test credentials login: Use existing freelancer email
 *    - Test Google OAuth: Requires Google credentials
 *    - Test email: Requires SMTP setup
 */
