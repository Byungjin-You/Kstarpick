import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDatabase } from '../../../utils/mongodb';
import bcryptjs from 'bcryptjs';

// Export auth options configuration
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          console.log('[NextAuth] Authorize called with:', credentials?.email);
          
          // Connect to MongoDB using the same method as login API
          const { db } = await connectToDatabase();
          console.log('[NextAuth] MongoDB connected');
          
          // Find user
          const user = await db.collection('users').findOne({ 
            email: credentials.email 
          });
          
          if (!user) {
            console.log('[NextAuth] User not found');
            return null;
          }
          
          console.log('[NextAuth] User found:', user.email);
          
          // Check password
          const isValid = await bcryptjs.compare(credentials.password, user.password);
          
          if (!isValid) {
            console.log('[NextAuth] Invalid password');
            return null;
          }
          
          console.log('[NextAuth] Password valid, returning user');
          
          // Return user object for session
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role
          };
          
        } catch (error) {
          console.error('[NextAuth] Authorization error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: false,
  secret: process.env.NEXTAUTH_SECRET || 'kstarpick-nextauth-secret-2025',
};

export default NextAuth(authOptions); 