import type { Metadata } from "next";

import { Journey } from "./journey-page";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <Journey />;
}