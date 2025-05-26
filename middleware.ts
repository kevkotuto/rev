import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Si l'utilisateur n'est pas connecté et essaie d'accéder au dashboard
    if (!req.nextauth.token && req.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Si l'utilisateur n'est pas connecté et essaie d'accéder aux autres routes protégées
    if (!req.nextauth.token && (
      req.nextUrl.pathname.startsWith('/clients') ||
      req.nextUrl.pathname.startsWith('/projects') ||
      req.nextUrl.pathname.startsWith('/providers') ||
      req.nextUrl.pathname.startsWith('/invoices') ||
      req.nextUrl.pathname.startsWith('/expenses') ||
      req.nextUrl.pathname.startsWith('/profile') ||
      req.nextUrl.pathname.startsWith('/settings') ||
      req.nextUrl.pathname.startsWith('/files') ||
      req.nextUrl.pathname.startsWith('/emails') ||
      req.nextUrl.pathname.startsWith('/statistics') ||
      req.nextUrl.pathname.startsWith('/calendar') ||
      req.nextUrl.pathname.startsWith('/finance')
    )) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Si l'utilisateur est connecté et essaie d'accéder à la page d'accueil
    if (req.nextauth.token && req.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Autoriser l'accès à la page d'accueil même sans token
        if (req.nextUrl.pathname === '/') {
          return true
        }
        
        // Pour les routes protégées, vérifier le token
        if (req.nextUrl.pathname.startsWith('/dashboard') ||
            req.nextUrl.pathname.startsWith('/clients') ||
            req.nextUrl.pathname.startsWith('/projects') ||
            req.nextUrl.pathname.startsWith('/providers') ||
            req.nextUrl.pathname.startsWith('/invoices') ||
            req.nextUrl.pathname.startsWith('/expenses') ||
            req.nextUrl.pathname.startsWith('/profile') ||
            req.nextUrl.pathname.startsWith('/settings') ||
            req.nextUrl.pathname.startsWith('/files') ||
            req.nextUrl.pathname.startsWith('/emails') ||
            req.nextUrl.pathname.startsWith('/statistics') ||
            req.nextUrl.pathname.startsWith('/calendar') ||
            req.nextUrl.pathname.startsWith('/finance')) {
          return !!token
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - payment pages (success/cancel)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|uploads|payment).*)",
  ],
} 