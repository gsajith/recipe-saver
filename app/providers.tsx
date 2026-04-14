import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

interface ProvidersProps {
  children: ReactNode;
}

export async function Providers({ children }: ProvidersProps) {
  // @ts-ignore ClerkProvider is an async server component
  return <ClerkProvider>{children}</ClerkProvider>;
}
