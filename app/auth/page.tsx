import type { Metadata } from "next";

import { Auth } from "./auth-page";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <Auth />;
}