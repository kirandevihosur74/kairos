import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      {/* cacheComponents: catch-all Clerk pages read the URL, so they render inside Suspense. */}
      <Suspense>
        <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" fallbackRedirectUrl="/" />
      </Suspense>
    </div>
  );
}
