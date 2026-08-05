"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      await acceptSession(data.session);
      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setSession(null);
        setLoading(false);
        return;
      }

      await acceptSession(nextSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function isAuthorizedEmail(userEmail) {
    const { data, error } = await supabase.rpc("is_authorized_user", {
      user_email: userEmail.trim().toLowerCase(),
    });

    if (error) {
      setMessage(
        "Nao foi possivel validar o acesso. Execute o SQL atualizado no Supabase."
      );
      return false;
    }

    return Boolean(data);
  }

  async function syncProfile(user) {
    if (!user?.email) {
      return false;
    }

    const normalizedEmail = user.email.toLowerCase();
    const { data: authorizedUser } = await supabase
      .from("authorized_users")
      .select("full_name, email, area, role")
      .eq("email", normalizedEmail)
      .eq("active", true)
      .maybeSingle();

    if (!authorizedUser) {
      return false;
    }

    await supabase.from("user_profiles").upsert(
      {
        id: user.id,
        email: normalizedEmail,
        full_name:
          authorizedUser.full_name ??
          user.user_metadata?.full_name ??
          normalizedEmail.split("@")[0] ??
          "Usuario",
        area: authorizedUser.area,
        role: authorizedUser.role,
        last_login_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    return true;
  }

  async function acceptSession(nextSession) {
    if (!nextSession) {
      setSession(null);
      return;
    }

    const isAllowed = await syncProfile(nextSession.user);

    if (!isAllowed) {
      await supabase.auth.signOut();
      setSession(null);
      setMessage("Este e-mail nao esta cadastrado para acessar o portal.");
      return;
    }

    setSession(nextSession);
  }

  async function signIn(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const isAllowed = await isAuthorizedEmail(normalizedEmail);

    if (!isAllowed) {
      setMessage("Este e-mail ainda nao foi cadastrado no sistema.");
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setMessage(`Nao foi possivel entrar: ${error.message}`);
      setSubmitting(false);
      return;
    }

    await acceptSession(data.session);
    setSubmitting(false);
  }

  async function signUp(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const isAllowed = await isAuthorizedEmail(normalizedEmail);

    if (!isAllowed) {
      setMessage(
        "Este e-mail ainda nao foi cadastrado por alguem autorizado no sistema."
      );
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      setMessage(`Nao foi possivel criar o acesso: ${error.message}`);
      setSubmitting(false);
      return;
    }

    if (data.session) {
      await acceptSession(data.session);
      setSubmitting(false);
      return;
    }

    setMessage(
      "Acesso criado. Se a confirmacao por e-mail estiver ativa, confirme antes de entrar."
    );
    setMode("login");
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
              <span>Acesso interno</span>
              <h1>Entre no Portal PENN</h1>
              <p>
                Use seu e-mail cadastrado para acessar os produtos, pendencias,
                tarefas e indicadores da aplicacao.
              </p>
            </div>

            <nav className="login-mode-tabs" aria-label="Modo de acesso">
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => {
                  setMode("login");
                  setMessage("");
                }}
                type="button"
              >
                Entrar
              </button>
              <button
                className={mode === "signup" ? "active" : ""}
                onClick={() => {
                  setMode("signup");
                  setMessage("");
                }}
                type="button"
              >
                Criar primeiro acesso
              </button>
            </nav>

            <form
              className="login-form"
              onSubmit={mode === "login" ? signIn : signUp}
            >
              {mode === "signup" && (
                <label>
                  Nome completo
                  <input
                    autoComplete="name"
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Seu nome"
                    required
                    value={fullName}
                  />
                </label>
              )}

              <label>
                E-mail
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nome@empresa.com"
                  required
                  type="email"
                  value={email}
                />
              </label>

              <label>
                Senha
                <input
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    mode === "signup" ? "Minimo de 8 caracteres" : "Sua senha"
                  }
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                  type="password"
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  value={password}
                />
              </label>

              {message && <p className="login-message">{message}</p>}

              <button disabled={submitting} type="submit">
                {submitting
                  ? mode === "signup"
                    ? "Criando..."
                    : "Entrando..."
                  : mode === "signup"
                    ? "Criar acesso"
                    : "Entrar"}
              </button>
            </form>

            {mode === "login" && (
              <button
                className="login-reset"
                onClick={requestPasswordReset}
                type="button"
              >
                Recuperar senha
              </button>
            )}
          </>
        )}
      </section>
    </main>
  );
}
