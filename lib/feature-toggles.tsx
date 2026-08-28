"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FeatureTogglesContextValue {
  toggles: Record<string, boolean>;
  loading: boolean;
  isEnabled: (key: string) => boolean;
}

const FeatureTogglesContext = createContext<FeatureTogglesContextValue | undefined>(undefined);

export function FeatureTogglesProvider({ children }: { children: ReactNode }) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchToggles = async () => {
      try {
        const { data, error } = await supabase
          .from("feature_toggles")
          .select("key, is_enabled");

        if (error) {
          console.error("Error loading feature toggles:", error.message);
          return;
        }

        const toggleMap: Record<string, boolean> = {};
        data?.forEach((item) => {
          toggleMap[item.key] = item.is_enabled;
        });
        setToggles(toggleMap);
      } catch (err) {
        console.error("Failed to fetch feature toggles:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchToggles();
  }, []);

  const isEnabled = (key: string): boolean => {
    if (loading) return true;

    // Defensively check for resources variations
    if (key === "navbar-show-resources") {
      const val = toggles["navbar-show-resources"] ?? toggles["navbar-show-resources-menu"];
      if (val !== undefined) return val;
    }

    if (toggles[key] === undefined) return true;
    return toggles[key];
  };

  return (
    <FeatureTogglesContext.Provider value={{ toggles, loading, isEnabled }}>
      {children}
    </FeatureTogglesContext.Provider>
  );
}

export function useFeatureToggles() {
  const ctx = useContext(FeatureTogglesContext);
  if (!ctx) {
    return {
      toggles: {},
      loading: false,
      isEnabled: () => true,
    };
  }
  return ctx;
}
