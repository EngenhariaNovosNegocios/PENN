"use client";

import { useEffect, useMemo, useState } from "react";
import FormModal from "@/components/FormModal";
import { supabase } from "@/lib/supabaseClient";

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const emptySuggestion = {
  area: "interface",
  title: "",
  description: "",
};

function sanitizeFileName(name) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
}

function AttachmentIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
      <path d="M21.4 11.6 12 21a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 1 1-2.8-2.8l8.5-8.5" />
    </svg>
  );
}

export default function ImprovementSuggestionModal({
  appVersion,
  onClose,
  open,
  pageContext,
}) {
  const [form, setForm] = useState(emptySuggestion);
  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const previews = useMemo(
    () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [images]
  );

  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews]
  );

  function resetAndClose() {
    if (saving) return;
    setForm(emptySuggestion);
    setImages([]);
    setMessage("");
    setSubmitted(false);
    setSaving(false);
    onClose?.();
  }

  function addImages(event) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";

    const invalid = selected.find(
      (file) => !file.type.startsWith("image/") || file.size > MAX_IMAGE_SIZE
    );
    if (invalid) {
      setMessage("Envie somente imagens de até 8 MB cada.");
      return;
    }

    const unique = selected.filter(
      (file) => !images.some((item) => item.name === file.name && item.size === file.size)
    );
    if (images.length + unique.length > MAX_IMAGES) {
      setMessage(`É possível anexar até ${MAX_IMAGES} imagens por sugestão.`);
      return;
    }
    setMessage("");
    setImages([...images, ...unique]);
  }

  async function submitSuggestion(event) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      setMessage("Não foi possível identificar o usuário conectado.");
      setSaving(false);
      return;
    }

    const email = user.email?.trim().toLowerCase() || "";
    const { data: account } = await supabase
      .from("authorized_users")
      .select("full_name")
      .eq("email", email)
      .maybeSingle();

    const { data: suggestion, error: suggestionError } = await supabase
      .from("improvement_suggestions")
      .insert({
        submitted_by: user.id,
        submitter_name:
          account?.full_name || user.user_metadata?.full_name || email.split("@")[0] || "Usuário PENN",
        submitter_email: email,
        area: form.area,
        title: form.title.trim(),
        description: form.description.trim(),
        page_context: pageContext || null,
        app_version: appVersion,
      })
      .select("id")
      .single();

    if (suggestionError) {
      setMessage(`Não foi possível enviar a sugestão: ${suggestionError.message}`);
      setSaving(false);
      return;
    }

    const uploaded = [];
    let attachmentWarning = "";

    for (const file of images) {
      const storagePath = `improvements/${user.id}/${suggestion.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("product-files")
        .upload(storagePath, file, { contentType: file.type });

      if (uploadError) {
        attachmentWarning = " A sugestão foi salva, mas uma ou mais imagens não puderam ser anexadas.";
        continue;
      }

      const { data: publicData } = supabase.storage.from("product-files").getPublicUrl(storagePath);
      uploaded.push({
        suggestion_id: suggestion.id,
        file_name: file.name,
        storage_path: storagePath,
        public_url: publicData.publicUrl,
      });
    }

    if (uploaded.length) {
      const { error: attachmentError } = await supabase
        .from("improvement_suggestion_attachments")
        .insert(uploaded);
      if (attachmentError) {
        await supabase.storage
          .from("product-files")
          .remove(uploaded.map((item) => item.storage_path));
        attachmentWarning = " A sugestão foi salva, mas os anexos precisam ser reenviados.";
      }
    }

    setSaving(false);
    setSubmitted(true);
    setImages([]);
    setForm(emptySuggestion);
    setMessage(`Sugestão enviada para análise.${attachmentWarning}`);
  }

  return (
    <FormModal
      closeLabel="Fechar melhorias"
      description="Conte o que pode tornar o PENN mais simples, seguro ou eficiente. Você pode anexar imagens para mostrar o contexto."
      eyebrow="Evolução contínua"
      onClose={resetAndClose}
      open={open}
      size="large"
      title="Sugerir uma melhoria"
    >
      {submitted ? (
        <section className="improvement-success">
          <span>✓</span>
          <div>
            <strong>Obrigado por ajudar a melhorar o PENN.</strong>
            <p>{message}</p>
          </div>
          <button onClick={resetAndClose} type="button">Fechar</button>
        </section>
      ) : (
        <form className="modal-form improvement-form" onSubmit={submitSuggestion}>
          <label className="wide">
            Área da sugestão
            <select value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })}>
              <option value="interface">Interface e usabilidade</option>
              <option value="processo">Processos e fluxo de trabalho</option>
              <option value="dados">Dados e relatórios</option>
              <option value="integracao">Integrações</option>
              <option value="outro">Outro</option>
            </select>
          </label>
          <label className="wide">
            Resumo da melhoria
            <input autoFocus maxLength="140" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex.: Facilitar a comparação entre fornecedores" />
          </label>
          <label className="wide">
            Como deveria funcionar?
            <textarea minLength="10" required rows="5" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descreva o problema atual, a mudança sugerida e o resultado esperado." />
          </label>

          <section className="improvement-attachments wide">
            <header>
              <div><strong>Imagens de apoio</strong><small>PNG, JPG ou WEBP · até 5 arquivos de 8 MB</small></div>
              <label>
                <AttachmentIcon />
                Anexar imagens
                <input accept="image/*" multiple onChange={addImages} type="file" />
              </label>
            </header>
            {previews.length ? (
              <div className="improvement-preview-grid">
                {previews.map(({ file, url }) => (
                  <figure key={`${file.name}-${file.size}`}>
                    <img alt={`Prévia de ${file.name}`} src={url} />
                    <figcaption title={file.name}>{file.name}</figcaption>
                    <button aria-label={`Remover ${file.name}`} onClick={() => setImages((current) => current.filter((item) => item !== file))} type="button">×</button>
                  </figure>
                ))}
              </div>
            ) : (
              <p>Nenhuma imagem selecionada. O anexo é opcional.</p>
            )}
          </section>

          {message && <p className="improvement-message wide">{message}</p>}
          <footer className="modal-form-actions">
            <button disabled={saving} onClick={resetAndClose} type="button">Cancelar</button>
            <button disabled={saving} type="submit">{saving ? "Enviando..." : "Enviar sugestão"}</button>
          </footer>
        </form>
      )}
    </FormModal>
  );
}
