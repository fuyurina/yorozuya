import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      if (req.nextUrl.pathname === "/login") {
        return true;
      }
      return !!token;
    },
  },
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - login
     * - api (semua API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)

     */
    '/((?!login|api|_next/static|_next/image|favicon.ico).*)'
  ]
} 