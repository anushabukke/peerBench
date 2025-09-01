import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";
    const type = searchParams.get("type");
    const error = searchParams.get("error");
    const errorCode = searchParams.get("error_code");
    const errorDescription = searchParams.get("error_description");

    console.log("Auth callback - code:", code, "type:", type, "next:", next);
    console.log("Auth callback - error:", error, "errorCode:", errorCode, "errorDescription:", errorDescription);

    // If there's an error, redirect to forgot password with error details
    if (error) {
      console.error("Auth callback received error:", { error, errorCode, errorDescription });
      return NextResponse.redirect(`${origin}/forgot-password?error=${error}&error_code=${errorCode}&error_description=${errorDescription}`);
    }

    if (code) {
      const supabase = await createClient();
      
      // Check if this is a password reset by looking at the next parameter
      if (next === "/reset-password") {
        // This is a password reset flow
        console.log("Processing password recovery based on next parameter...");
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (!exchangeError) {
          console.log("Password recovery successful, redirecting to reset page");
          return NextResponse.redirect(`${origin}/reset-password`);
        } else {
          console.error("Password recovery error:", exchangeError);
          return NextResponse.redirect(`${origin}/forgot-password?error=auth_failed`);
        }
      } else if (type === "recovery") {
        // This is a password reset flow (fallback)
        console.log("Processing password recovery based on next parameter...");
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (!exchangeError) {
          console.log("Password recovery successful, redirecting to reset page");
          return NextResponse.redirect(`${origin}/reset-password`);
        } else {
          console.error("Password recovery error:", exchangeError);
          return NextResponse.redirect(`${origin}/forgot-password?error=auth_failed`);
        }
      } else {
        // Regular auth callback (signup, signin)
        console.log("Processing regular auth callback...");
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (!exchangeError) {
          return NextResponse.redirect(`${origin}${next}`);
        } else {
          console.error("Regular auth error:", exchangeError);
          return NextResponse.redirect(`${origin}/login?error=auth_failed`);
        }
      }
    }

    console.log("No code provided, redirecting to login");
    return NextResponse.redirect(`${origin}/login`);
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(`${origin}/login?error=callback_error`);
  }
}
