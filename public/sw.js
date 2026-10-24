// AfterThought service worker.
// - Makes the app installable on phones, tablets and desktops (PWA).
// - Receives audio files shared from other apps (Android share sheet:
//   call recorder / voice memo -> "AfterThought") and hands them to /record.
// Everything else goes straight to the network; no offline caching of pages,
// so users never see stale meeting data.

const SHARE_CACHE = "afterthought-share"

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (event.request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(handleShare(event.request))
  }
})

async function handleShare(request) {
  try {
    const form = await request.formData()
    const file = form.get("audio")
    if (file && typeof file !== "string") {
      const cache = await caches.open(SHARE_CACHE)
      await cache.put(
        "/shared-file",
        new Response(file, {
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "x-filename": encodeURIComponent(file.name || "shared-recording"),
          },
        }),
      )
      return Response.redirect("/record?shared=1", 303)
    }
  } catch (err) {
    console.error("[sw] share failed", err)
  }
  return Response.redirect("/record?shared=0", 303)
}
