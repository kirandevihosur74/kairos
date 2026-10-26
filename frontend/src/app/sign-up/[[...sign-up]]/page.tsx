import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      {/* cacheComponents: catch-all Clerk pages read the URL, so they render inside Suspense. */}
      <Suspense>
        <SignUp />
      </Suspense>
    </div>
  );
}
