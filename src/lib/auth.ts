// ============================================================
// CoopManager - NextAuth Configuration
// ============================================================

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { validateCredentials, getUserPermissions } from '@/lib/services/user.service';
import { createAuditLog } from '@/lib/services/audit.service';
import { AUDIT_ACTIONS, MODULES, SESSION_MAX_AGE_HOURS } from '@/lib/constants';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      roles: string[];
      permissions: string[];
    };
  }
  interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    permissions: string[];
  }
}

declare module 'next-auth' {
  interface JWT {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    permissions: string[];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          const user = await validateCredentials(email, password);
          if (!user) return null;
          if (!user.isActive) return null;

          const permissions = await getUserPermissions(user.id);
          const roles = user.userRoles.map((ur: { role: { code: string } }) => ur.role.code);

          await createAuditLog({
            userId: user.id,
            action: AUDIT_ACTIONS.LOGIN,
            module: MODULES.AUTH,
            details: `Inicio de sesión exitoso`,
          });

          return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles,
            permissions,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Error de autenticación';
          throw new Error(message);
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_HOURS * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.email = user.email as string;
        token.firstName = (user as { firstName: string }).firstName;
        token.lastName = (user as { lastName: string }).lastName;
        token.roles = (user as { roles: string[] }).roles;
        token.permissions = (user as { permissions: string[] }).permissions;
      }
      return token;
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session.user = {
        id: token.id as string,
        email: token.email as string,
        firstName: token.firstName as string,
        lastName: token.lastName as string,
        roles: token.roles as string[],
        permissions: token.permissions as string[],
        emailVerified: null,
      } as any;
      return session;
    },
  },
});
