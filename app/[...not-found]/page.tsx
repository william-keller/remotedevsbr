import { notFound } from "next/navigation";

// Delegates to app/not-found.tsx so unmatched routes answer with a real HTTP
// 404 instead of a 200 soft 404, which search engines index.
export default function CatchAllNotFound() {
  notFound();
}
