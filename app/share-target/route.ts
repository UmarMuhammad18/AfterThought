import { NextResponse } from "next/server"

// The service worker (public/sw.js) normally intercepts shared files before
// they reach the server. If it isn't active yet (first launch, dev mode),
// send the user to the import screen instead of failing.
export async function POST(req: Request) {
  return NextResponse.redirect(new URL("/record?shared=0", req.url), 303)
}
