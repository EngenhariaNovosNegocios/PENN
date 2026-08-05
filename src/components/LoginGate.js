"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setSession(null);
        setLoading(false);
        return;
      }

      setSession(nextSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function syncProfile(user) {
    if (!user?.email) {
      return;
    }

    await supabase.from("user_profiles").upsert(
      {
        id: user.id,
        email: user.email,
        full_name:
          user.user_metadata?.full_name ?? user.email.split("@")[0] ?? "Usuario",
        last_login_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  }

  async function signIn(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(`Nao foi possivel entrar: ${error.message}`);
      setSubmitting(false);
      return;
    }

    await syncProfile(data.user);
    setSession(data.session);
    setSubmitting(false);
  }

  async function requestPasswordReset() {
    if (!email.trim()) {
      setMessage("Informe o e-mail para enviar a recuperacao de senha.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });

    setMessage(
      error
        ? `Nao foi possivel enviar a recuperacao: ${error.message}`
        : "Enviamos as instrucoes de recuperacao para o e-mail informado."
    );
  }

  async function updatePassword(event) {
    event.preventDefault();

    if (newPassword.length < 8) {
      setMessage("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setMessage(`Nao foi possivel atualizar a senha: ${error.message}`);
      setSubmitting(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setRecoveryMode(false);
    setSubmitting(false);
  }

  if (loading) {
    return (
      <main className="login-screen">
        <section className="login-card loading">
          <span className="login-brand-mark">P</span>
          <strong>Carregando acesso...</strong>
        </section>
      </main>
    );
  }

  if (session && !recoveryMode) {
    return children;
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="login-brand">
          <span className="login-brand-mark">P</span>
          <div>
            <strong>PENN</strong>
            <small>Portal Engenharia & Negocios</small>
          </div>
        </div>

        {recoveryMode ? (
          <>
            <div className="login-copy">
              <span>Recuperacao de senha</span>
              <h1>Defina uma nova senha</h1>
              <p>Informe a nova senha para concluir a recuperacao do acesso.</p>
            </div>

            <form className="login-form" onSubmit={updatePassword}>
              <label>
                Nova senha
                <input
                  autoComplete="new-password"
                  minLength="8"
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Minimo de 8 caracteres"
                  required
                  type="password"
                  value={newPassword}
                />
              </label>

              {message && <p className="login-message">{message}</p>}

              <button disabled={submitting} type="submit">
                {submitting ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="login-copy">
              <span>Acesso gerencial</span>
              <h1>Entre para acompanhar as atividades</h1>
              <p>
                Use o usuario cadastrado no Supabase para visualizar produtos,
                pendencias, tarefas de NPI e indicadores operacionais.
              </p>
            </div>

            <form className="login-form" onSubmit={signIn}>
              <label>
                E-mail
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="gerente@empresa.com"
                  required
                  type="email"
                  value={email}
                />
              </label>

              <label>
                Senha
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Sua senha"
                  required
                  type="password"
                  value={password}
                />
              </label>

              {message && <p className="login-message">{message}</p>}

              <button disabled={submitting} type="submit">
                {submitting ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <button
              className="login-reset"
              onClick={requestPasswordReset}
              type="button"
            >
              Recuperar senha
            </button>
          </>
        )}
      </section>
    </main>
  );
}
