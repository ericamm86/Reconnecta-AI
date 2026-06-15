import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { createLocalSession, supabase } from "../lib/supabase";

const redirectTo = window.location.origin;
const passwordRecoveryRedirectTo = `${window.location.origin}/reset-password`;
const localSessionKey = "reconnect-local-session";

function isEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isPasswordStrong(password) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function validateSignUp({ name, email, password }) {
  if (!name?.trim()) throw new Error("Informe seu nome.");
  if (!isEmailValid(email || "")) throw new Error("Informe um e-mail valido.");
  if (!isPasswordStrong(password || "")) throw new Error("A senha deve ter no minimo 8 caracteres, com letras e numeros.");
}

function validateSignIn({ email, password }) {
  if (!isEmailValid(email || "")) throw new Error("Informe um e-mail valido.");
  if (!password) throw new Error("Informe sua senha.");
}

function validateEmailOnly(email) {
  if (!isEmailValid(email || "")) throw new Error("Informe um e-mail valido.");
}

function validateNewPassword(password) {
  if (!isPasswordStrong(password || "")) throw new Error("A senha deve ter no minimo 8 caracteres, com letras e numeros.");
}

function getStoredLocalSession() {
  if (supabase) return null;
  const stored = window.localStorage.getItem(localSessionKey);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    window.localStorage.removeItem(localSessionKey);
    return null;
  }
}

function hasRecoveryMarker() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  return window.location.pathname === "/reset-password" || hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery";
}

export function useAuth(onToast) {
  const [session, setSession] = useState(getStoredLocalSession);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [passwordRecovery, setPasswordRecovery] = useState(hasRecoveryMarker);

  const bootstrap = useCallback(async () => {
    try {
      await api.bootstrapProfile();
    } catch {
      onToast?.("Sessao ativa. Perfil sera sincronizado quando a API estiver disponivel.");
    }
  }, [onToast]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) bootstrap();
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
        return;
      }
      if (session) bootstrap();
    });

    return () => data.subscription.unsubscribe();
  }, [bootstrap]);

  function startLocalSession(form) {
    const localSession = createLocalSession({
      name: form.name?.trim() || form.email.split("@")[0],
      email: form.email.trim()
    });
    window.localStorage.setItem(localSessionKey, JSON.stringify(localSession));
    setSession(localSession);
    onToast?.("Acesso autorizado.");
  }

  async function signInWithPassword(formOrEmail, maybePassword) {
    const form =
      typeof formOrEmail === "object"
        ? formOrEmail
        : { name: "", email: formOrEmail, password: maybePassword };
    validateSignIn(form);

    if (!supabase) {
      startLocalSession(form);
      return;
    }

    const result = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    if (result.error) throw result.error;
  }

  async function signUpWithPassword(form) {
    validateSignUp(form);

    if (!supabase) {
      startLocalSession(form);
      return;
    }

    const result = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { name: form.name },
        emailRedirectTo: redirectTo
      }
    });
    if (result.error) throw result.error;

    if (result.data.user) {
      const { error: profileError } = await supabase.from("user_profiles").upsert({
        id: result.data.user.id,
        email: form.email,
        display_name: form.name,
        is_public: false,
        onboarding_step: "profile",
        updated_at: new Date().toISOString()
      });
      if (profileError) throw profileError;
    }

    onToast?.("Cadastro iniciado. Confirme seu email para entrar.");
  }

  async function signInWithOAuth(provider) {
    if (!supabase) {
      onToast?.("Conectores sociais exigem Supabase configurado.");
      return;
    }

    const scopes =
      provider === "google"
        ? "email profile https://www.googleapis.com/auth/contacts.readonly"
        : "email name";

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        scopes,
        queryParams: provider === "google" ? { access_type: "offline", prompt: "consent" } : undefined
      }
    });
    if (error) throw error;
  }

  async function requestPasswordReset(email) {
    validateEmailOnly(email);

    if (!supabase) {
      onToast?.("Recuperacao de senha exige Supabase configurado.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: passwordRecoveryRedirectTo });
    if (error) throw error;
    onToast?.("Enviamos um e-mail para redefinir sua senha.");
  }

  async function updatePassword(password) {
    validateNewPassword(password);

    if (!supabase) {
      onToast?.("Recuperacao de senha exige Supabase configurado.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setPasswordRecovery(false);
    onToast?.("Senha atualizada. Acesso liberado.");
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    window.localStorage.removeItem(localSessionKey);
    setSession(null);
    setPasswordRecovery(false);
  }

  return {
    session,
    loading,
    passwordRecovery,
    signInWithPassword,
    signUpWithPassword,
    signInWithOAuth,
    requestPasswordReset,
    updatePassword,
    signOut
  };
}
