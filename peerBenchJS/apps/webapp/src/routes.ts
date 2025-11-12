/**
 * Definitions to handle protected and public routes. Used by
 * the middleware (utils/supabase/middleware.ts). Use path-to-regexp
 * format to define routes.
 */
export const publicRoutes = [
  "/",
  "/forgot-password",
  "/inspect{/*path}",
  "/leaderboard{/*path}",
  "/login",
  "/signup{/*path}",
  "/peers",
  "/profile{/*path}",
  "/prompt-sets{/*path}",
  "/prompts{/*path}",
  "/hashes{/*path}",
  "/compare/share{/*path}", // Allow unauthenticated access to shared comparisons
] as const;
export const protectedRoutes = [
  "/reset-password",
  "/settings{/*path}",
  "/benchmark{/*path}",
  "/dashboard{/*path}",
  "/upload{/*path}",
  "/supporting-documents{/*path}",
  "/compare{/*path}",
] as const;
export const redirectRoutes = [
  { from: "/profile", to: "/login", when: "unauthenticated" },
  { from: "/login", to: "/", when: "authenticated" },
  { from: "/signup{/*path}", to: "/", when: "authenticated" },
  { from: "/forgot-password", to: "/", when: "authenticated" },
] as const;
