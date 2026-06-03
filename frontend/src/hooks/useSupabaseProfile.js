import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const fallbackProfile = {
  displayName: "",
  isPublic: false,
  onboardingStep: "insights"
};

export function useSupabaseProfile(session, onToast) {
  const [profile, setProfile] = useState(fallbackProfile);
  const [loading, setLoading] = useState(Boolean(supabase && session));

  const loadProfile = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      setProfile({
        ...fallbackProfile,
        displayName: session?.user?.user_metadata?.name || session?.user?.email || ""
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("user_profiles")
      .select("display_name, avatar_url, is_public, onboarding_step")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      onToast?.("Perfil Supabase indisponivel; usando modo local.");
      setProfile(fallbackProfile);
    } else {
      setProfile({
        displayName: data?.display_name || session.user.email,
        avatarUrl: data?.avatar_url || "",
        isPublic: Boolean(data?.is_public),
        onboardingStep: data?.onboarding_step || "profile"
      });
    }
    setLoading(false);
  }, [onToast, session]);

  useEffect(() => {
    const timer = setTimeout(loadProfile, 0);
    return () => clearTimeout(timer);
  }, [loadProfile]);

  async function updateProfile(nextProfile) {
    setProfile((current) => ({ ...current, ...nextProfile }));
    if (!supabase || !session?.user?.id) return;

    const { error } = await supabase.from("user_profiles").upsert({
      id: session.user.id,
      email: session.user.email,
      display_name: nextProfile.displayName,
      avatar_url: nextProfile.avatarUrl,
      is_public: nextProfile.isPublic,
      onboarding_step: nextProfile.onboardingStep,
      updated_at: new Date().toISOString()
    });

    if (error) onToast?.(error.message);
  }

  return { profile, loading, updateProfile, reload: loadProfile };
}
