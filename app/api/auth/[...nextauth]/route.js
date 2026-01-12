// app/api/auth/[...nextauth]/route.js - UPDATED WITH PROFILE IMAGE
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { executeQuery, VIEWS, STATUS_CODES } from "../../../../app/lib/db";
import { getBlobUrl } from "../../../../app/lib/azureBlob";

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

          // Query including PhotoBlobID and PhotoStatusID
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

          // Email not found
          if (!users || users.length === 0) {
            throw new Error("Email address not found in our database");
          }

          const user = users[0];

          // TEMPORARY: Allow login without password verification
          return {
            id: user.FreelancerID.toString(),
            name: user.DisplayName,
            email: user.Email,
            slug: user.Slug,
            photoBlobId: user.PhotoBlobID,
            photoStatusId: user.PhotoStatusID,
            isFirstLogin: true,
          };

          // TODO: Uncomment when PasswordHash is added
          /*
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
          */
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
      if (user) {
        token.id = user.id;
        token.slug = user.slug;
        token.freelancerId = parseInt(user.id);
        token.isFirstLogin = user.isFirstLogin || false;
        token.photoBlobId = user.photoBlobId;
        token.photoStatusId = user.photoStatusId;
      }

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

        // CRITICAL: Add profile image URL to session
        if (
          token.photoBlobId &&
          token.photoStatusId === STATUS_CODES.VERIFIED
        ) {
          session.user.image = getBlobUrl(token.photoBlobId);
        } else {
          session.user.image = null;
        }
      }

      return session;
    },

    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          // Query including PhotoBlobID and PhotoStatusID for Google sign-in too
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
            return false;
          }

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
