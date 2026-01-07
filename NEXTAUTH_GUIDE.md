# NextAuth.js Authentication Guide - Mystery Message Project

## Table of Contents
1. [What is NextAuth?](#what-is-nextauth)
2. [Project Structure](#project-structure)
3. [How It Works](#how-it-works)
4. [Authentication Flow](#authentication-flow)
5. [File Breakdown](#file-breakdown)
6. [Middleware Protection](#middleware-protection)

---

## What is NextAuth?

**NextAuth.js** is a complete authentication solution for Next.js applications. Think of it as a security guard for your app that:
- Handles user login/logout
- Manages sessions (keeps track of who's logged in)
- Protects routes (like your dashboard)
- Stores user information securely

---

## Project Structure

```
mystrymessage/
├── app/
│   └── api/
│       └── auth/
│           └── [...nextauth]/
│               ├── options.ts      ← Authentication configuration
│               └── route.ts        ← API route handler
├── middleware.ts                   ← Route protection
├── model/
│   └── User.ts                     ← Database user model
└── types/
    └── next-auth.d.ts             ← TypeScript types
```

---

## How It Works

### Simple Analogy
Think of NextAuth like a **nightclub bouncer system**:

1. **User arrives** (visits sign-in page)
2. **Shows ID** (enters email/username and password)
3. **Bouncer checks list** (NextAuth verifies credentials against database)
4. **Gets wristband** (receives JWT token)
5. **Wristband checked at doors** (middleware checks token on protected routes)

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     SIGN-IN FLOW                                 │
└─────────────────────────────────────────────────────────────────┘

1. User visits /sign-in
         ↓
2. Enters email/username + password
         ↓
3. Form submits to NextAuth API
         ↓
4. CredentialsProvider.authorize() runs
         ↓
5. Connects to MongoDB database
         ↓
6. Searches for user by email or username
         ↓
7. Checks if user exists ────────→ ❌ User not found → Error
         ↓
8. Checks if user is verified ───→ ❌ Not verified → Error
         ↓
9. Compares password with bcrypt ─→ ❌ Wrong password → Error
         ↓
10. ✅ All checks passed!
         ↓
11. JWT callback runs (adds custom data to token)
         ↓
12. Session callback runs (adds custom data to session)
         ↓
13. User is logged in with session containing:
    - _id (MongoDB user ID)
    - username
    - isVerified
    - isAcceptingMessages
         ↓
14. Middleware redirects to /dashboard
```

---

## File Breakdown

### 1. `/app/api/auth/[...nextauth]/route.ts`

**Purpose**: Creates the NextAuth API endpoint

```typescript
import NextAuth from "next-auth";
import { authOptions } from "./options";

const handler = NextAuth(authOptions)

export {handler as GET, handler as POST}
```

**What it does**:
- Creates API routes at `/api/auth/*` (signin, signout, session, etc.)
- Handles both GET and POST requests
- Uses configuration from `options.ts`

**Automatically created endpoints**:
- `/api/auth/signin` - Sign in page
- `/api/auth/signout` - Sign out
- `/api/auth/session` - Get current session
- `/api/auth/providers` - List auth providers

---

### 2. `/app/api/auth/[...nextauth]/options.ts`

**Purpose**: Main authentication configuration

#### Providers Section
```typescript
providers: [
    CredentialsProvider({
        id: "credentials",
        name: "Credentials",
        credentials: {
            email: { label: "Email", type: "text" },
            password: { label: "Password", type: "password" }
        },
        async authorize(credentials: any): Promise<any> {
            // Authentication logic here
        }
    })
]
```

**What it does**:
- Uses **Credentials Provider** (custom email/password login)
- Defines what fields the login form needs (email, password)
- `authorize()` function runs when user tries to log in

#### Authorize Function (The Security Check)

```typescript
async authorize(credentials: any): Promise<any> {
    await dbConnect();  // 1. Connect to database

    const user = await UserModel.findOne({
        $or: [
            { email: credentials.identifier },
            { username: credentials.identifier }
        ]
    })  // 2. Find user by email OR username

    if(!user) {
        throw new Error("User not found")  // 3. User doesn't exist
    }

    if(!user.isVerified) {
        throw new Error("Please verify your account first")  // 4. Account not verified
    }

    const isPassCorrect = await bcrypt.compare(
        credentials.password,
        user.password
    )  // 5. Check password with bcrypt

    if(isPassCorrect) {
        return user;  // ✅ Success! Return user object
    } else {
        throw new Error('Incorrect Password')  // ❌ Wrong password
    }
}
```

**Step-by-step**:
1. Connect to MongoDB
2. Search for user by email OR username (flexible login)
3. Check if user exists
4. Check if user's email is verified
5. Use bcrypt to securely compare passwords
6. Return user if all checks pass

#### Session Strategy
```typescript
session: {
    strategy: "jwt"
}
```

**What it does**:
- Uses **JWT (JSON Web Token)** for sessions
- Token is stored in browser cookie
- No server-side session storage needed
- More scalable for production

#### Callbacks (The Data Enrichers)

**JWT Callback** - Runs when token is created:
```typescript
async jwt({token, user}) {
    if(user) {
        token._id = user._id?.toString()
        token.isVerified = user.isVerified
        token.isAcceptingMessages = user.isAcceptingMessages
        token.username = user.username
    }
    return token
}
```

**What it does**:
- Takes user data from database
- Adds it to the JWT token
- This data is stored in the encrypted cookie

**Session Callback** - Runs when session is accessed:
```typescript
async session({session, token}) {
    if(token) {
        session.user._id = token._id
        session.user.isVerified = token.isVerified
        session.user.isAcceptingMessages = token.isAcceptingMessages
        session.user.username = token.username
    }
    return session
}
```

**What it does**:
- Takes data from JWT token
- Adds it to the session object
- Makes it available in your components with `useSession()`

---

### 3. `/types/next-auth.d.ts`

**Purpose**: TypeScript type definitions

```typescript
declare module 'next-auth' {
    interface User {
        _id?: string;
        isVerified?: boolean;
        isAcceptingMessages?: boolean;
        username?: string
    }

    interface Session {
        user: {
            _id?: string;
            isVerified?: boolean;
            isAcceptingMessages?: boolean;
            username?: string
        } & DefaultSession['user']
    }
}
```

**What it does**:
- Extends NextAuth's default types
- Adds custom fields to User and Session
- Gives you TypeScript autocomplete for custom fields

**Without this file**:
```typescript
session.user._id  // ❌ TypeScript error: Property '_id' doesn't exist
```

**With this file**:
```typescript
session.user._id  // ✅ TypeScript knows about _id
```

---

### 4. `/middleware.ts`

**Purpose**: Protects routes based on authentication status

```typescript
export async function middleware(request: NextRequest) {
    const token = await getToken({req: request})
    const url = request.nextUrl

    // Redirect authenticated users away from public pages
    if(token && (
        url.pathname.startsWith('/sign-in') ||
        url.pathname.startsWith('/sign-up') ||
        url.pathname.startsWith('/verify') ||
        url.pathname === '/'
    )) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Redirect unauthenticated users away from protected pages
    if(!token && url.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    return NextResponse.next()
}
```

**What it does**:

| User Status | Tries to visit | What happens |
|------------|----------------|--------------|
| Logged in | `/sign-in` | Redirected to `/dashboard` |
| Logged in | `/sign-up` | Redirected to `/dashboard` |
| Logged in | `/` | Redirected to `/dashboard` |
| Logged out | `/dashboard` | Redirected to `/sign-in` |

**Matcher Configuration**:
```typescript
export const config = {
    matcher: [
        '/sign-in',
        '/sign-up',
        '/',
        '/dashboard/:path*',
        '/verify/:path*'
    ]
}
```

**What it does**:
- Middleware only runs on these specific paths
- `/:path*` means "this path and all subpaths"
- Improves performance by not checking every route

---

### 5. `/model/User.ts`

**Purpose**: MongoDB user schema

```typescript
export interface User extends Document {
    username: string;
    email: string;
    password: string;
    verifyCode: string;
    verifyCodeExpiry: Date;
    isVerified: boolean;
    isAcceptingMessage: boolean;
    messages: Message[]
}
```

**Key fields for authentication**:
- `email` - User's email (unique)
- `username` - User's username (unique)
- `password` - Hashed with bcrypt
- `isVerified` - Must be true to log in
- `verifyCode` - For email verification
- `verifyCodeExpiry` - Verification code expiration

---

## Middleware Protection

### Visual Flow

```
User visits /dashboard
        ↓
Middleware checks for JWT token
        ↓
    ┌───────────┐
    │ Has token?│
    └─────┬─────┘
          │
    ┌─────┴─────┐
    │           │
   YES         NO
    │           │
    ↓           ↓
Allow access  Redirect to /sign-in
```

---

## Using Authentication in Your App

### In Server Components
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export default async function Page() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return <div>Not logged in</div>;
    }

    return <div>Welcome {session.user.username}!</div>;
}
```

### In Client Components
```typescript
'use client'
import { useSession } from "next-auth/react";

export default function Page() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return <div>Loading...</div>;
    }

    if (status === "unauthenticated") {
        return <div>Not logged in</div>;
    }

    return <div>Welcome {session.user.username}!</div>;
}
```

### Sign Out Button
```typescript
'use client'
import { signOut } from "next-auth/react";

export default function SignOutButton() {
    return (
        <button onClick={() => signOut()}>
            Sign Out
        </button>
    );
}
```

---

## Security Features

### 1. Password Hashing with bcrypt
```typescript
const isPassCorrect = await bcrypt.compare(credentials.password, user.password)
```
- Passwords are never stored in plain text
- Uses bcrypt for one-way hashing
- Compare function checks without exposing original password

### 2. JWT Encryption
- Session data stored in encrypted cookie
- Secret key from `NEXTAUTH_SECRET` environment variable
- Prevents tampering with session data

### 3. Verification Check
```typescript
if(!user.isVerified) {
    throw new Error("Please verify your account first")
}
```
- Users must verify email before logging in
- Prevents spam accounts

### 4. Middleware Protection
- Protects routes automatically
- No need to check auth in every page
- Centralized security logic

---

## Environment Variables

Required in your `.env.local` file:

```env
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

- `NEXTAUTH_SECRET`: Used to encrypt JWT tokens (keep this secret!)
- `NEXTAUTH_URL`: Your app's URL

---

## Common Operations

### Check if user is logged in
```typescript
const session = await getServerSession(authOptions);
const isLoggedIn = !!session;
```

### Get current user's ID
```typescript
const session = await getServerSession(authOptions);
const userId = session?.user._id;
```

### Check if user is verified
```typescript
const session = await getServerSession(authOptions);
const isVerified = session?.user.isVerified;
```

---

## Troubleshooting

### User redirected to home unexpectedly
- Check middleware logic
- Ensure parentheses are correct in conditions
- Check `matcher` config includes the route

### "User not found" error
- Verify user exists in database
- Check that email/username is correct
- Ensure database connection is working

### "Please verify your account" error
- User's `isVerified` field is `false`
- Need to verify email first

### Session is null
- Check if JWT secret is set
- Ensure user successfully logged in
- Try clearing cookies and logging in again

---

## Summary

**NextAuth in this project**:
1. Uses **Credentials Provider** for email/password login
2. Stores sessions in **JWT tokens** (cookies)
3. Protects routes with **middleware**
4. Adds custom user data to sessions (username, isVerified, etc.)
5. Requires **email verification** before login
6. Uses **bcrypt** for password security

**Data Flow**:
```
Login Form → NextAuth API → authorize() → Database Check
→ JWT Callback → Session Callback → Session Available in App
```

---

## Quick Reference

| Task | Code |
|------|------|
| Get session (server) | `await getServerSession(authOptions)` |
| Get session (client) | `const { data: session } = useSession()` |
| Sign out | `signOut()` |
| Sign in | `signIn('credentials', { ... })` |
| Check if logged in | `!!session` |
| Get user ID | `session?.user._id` |
| Get username | `session?.user.username` |

---

*This authentication setup provides a secure, scalable foundation for your Mystery Message application!*
