"use client";

import { Provider } from "jotai";
import { SWRConfig } from "swr";
import { ThemeProvider } from "./ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { logFiglet } from "@/utils/other/art";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    logFiglet('E M S');
  }, []);

  return (
    <Provider>
      <SWRConfig value={{
        shouldRetryOnError: true,
        errorRetryCount: 3,
        errorRetryInterval: 2000,
      }}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </SWRConfig>
    </Provider>
  );
}
