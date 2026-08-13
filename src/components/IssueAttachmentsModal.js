"use client";

import { useEffect, useState } from "react";
import FormModal from "@/components/FormModal";
import { supabase } from "@/lib/supabaseClient";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = new Set([
  "csv",
  "doc",
  "docx",
  "jpeg",
  "jpg",
  "pdf",
  "png",
  "txt",
  "webp",
  "xls",
  "xlsx",
  "zip",
]);

function AttachmentIcon({ name }) {
  const paths = {
    attachment: (
      <path d="m20.5 11.5-8.9 8.9a6 6 0 0 1-8.5-8.5l9.6-9.6a4 4 0 0 1 5.7 5.7l-9.6 9.6a2 2 0 0 1-2.8-2.8l8.9-8.9" />
    ),
    download: (
      <>
        <path d="M12 3v12M7 10l5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" />
        <path d="M10 11v6M14 11v6" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4M7 9l5-5 5 5" />
        <path d="M5 20h14" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  );
}

function formatFileSize(value) {
  const bytes = Number(value ?? 0);
  if (!bytes) return "Tamanho não informado";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtension(fileName) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export async function uploadIssueFile(issueId, file) {
  const extension = fileExtension(file.name);
  if (!ACCEPTED_EXTENSIONS.has(extension)) {
    throw new Error("Formato não aceito. Use imagem, PDF, Office, CSV, TXT ou ZIP.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("O arquivo deve ter no máximo 15 MB.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (userError || !userId) {
    throw new Error("Sua sessão expirou. Entre novamente para anexar o arquivo.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `issues/${userId}/${issueId}/${crypto.randomUUID()}-${safeName}`;
  const { error: storageError } = await supabase.storage
    .from("product-files")
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (storageError) {
    throw new Error(`Não foi possível enviar o arquivo: ${storageError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("product-files")
    .getPublicUrl(storagePath);
  const { data, error } = await supabase
    .from("product_issue_attachments")
    .insert({
      issue_id: issueId,
      file_name: file.name,
      file_type: file.type || extension.toUpperCase(),
      file_size: file.size,
      storage_path: storagePath,
      public_url: urlData.publicUrl,
      uploaded_by: userId,
    })
    .select(
      "id, issue_id, file_name, file_type, file_size, storage_path, public_url, uploaded_by, created_at"
    )
    .single();

  if (error) {
    await supabase.storage.from("product-files").remove([storagePath]);
    throw new Error(`Não foi possível registrar o anexo: ${error.message}`);
  }

  return data;
}

export default function IssueAttachmentsModal({
  issue,
  onClose,
  canUpload = true,
  canDelete = false,
}) {
  const [attachments, setAttachments] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!issue?.id) {
      setAttachments([]);
      setFile(null);
      setMessage("");
      return;
    }

    let active = true;

    async function loadAttachments() {
      setLoading(true);
      setMessage("");
      const { data, error } = await supabase
        .from("product_issue_attachments")
        .select(
          "id, issue_id, file_name, file_type, file_size, storage_path, public_url, uploaded_by, created_at"
        )
        .eq("issue_id", issue.id)
        .order("created_at", { ascending: false });

      if (!active) return;

      setLoading(false);
      if (error) {
        setMessage(`Não foi possível carregar os anexos: ${error.message}`);
        return;
      }
      setAttachments(data ?? []);
    }

    loadAttachments();
    return () => {
      active = false;
    };
  }, [issue?.id]);

  async function uploadAttachment(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!issue?.id || !file || !canUpload) return;

    setUploading(true);
    setMessage("");
    let data;
    try {
      data = await uploadIssueFile(issue.id, file);
    } catch (error) {
      setMessage(error.message);
      setUploading(false);
      return;
    }

    setAttachments((current) => [data, ...current]);
    setFile(null);
    formElement.reset();
    setUploading(false);
    setMessage("Arquivo anexado com sucesso.");
    window.dispatchEvent(
      new CustomEvent("penn:issue-attachments-changed", {
        detail: { issueId: issue.id },
      })
    );
  }

  async function deleteAttachment(attachment) {
    if (!canDelete || deletingId) return;
    setDeletingId(attachment.id);
    setMessage("");

    const { error } = await supabase
      .from("product_issue_attachments")
      .delete()
      .eq("id", attachment.id);

    if (error) {
      setMessage(`Não foi possível remover o anexo: ${error.message}`);
      setDeletingId(null);
      return;
    }

    await supabase.storage.from("product-files").remove([attachment.storage_path]);
    setAttachments((current) =>
      current.filter((item) => item.id !== attachment.id)
    );
    setDeletingId(null);
    setMessage("Anexo removido.");
    window.dispatchEvent(
      new CustomEvent("penn:issue-attachments-changed", {
        detail: { issueId: issue.id },
      })
    );
  }

  return (
    <FormModal
      closeLabel="Fechar anexos da pendência"
      description={issue ? `${issue.product_code} · ${issue.description}` : ""}
      eyebrow="Evidências e documentos"
      onClose={onClose}
      open={Boolean(issue)}
      size="large"
      title="Anexos da pendência"
    >
      <section className="issue-attachments-panel">
        {canUpload && (
          <form className="issue-attachment-upload" onSubmit={uploadAttachment}>
            <label>
              <span>Selecionar arquivo</span>
              <input
                accept=".csv,.doc,.docx,.jpeg,.jpg,.pdf,.png,.txt,.webp,.xls,.xlsx,.zip,image/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                required
                type="file"
              />
              <small>Imagens, PDF, Office, CSV, TXT ou ZIP · até 15 MB</small>
            </label>
            <button disabled={uploading || !file} type="submit">
              <AttachmentIcon name="upload" />
              {uploading ? "Enviando..." : "Anexar arquivo"}
            </button>
          </form>
        )}

        {message && (
          <p
            className={`issue-attachment-message ${
              message.includes("sucesso") || message === "Anexo removido."
                ? "success"
                : ""
            }`}
          >
            {message}
          </p>
        )}

        <div className="issue-attachment-list">
          <header>
            <div>
              <strong>Arquivos vinculados</strong>
              <span>Continuam disponíveis após a resolução da pendência.</span>
            </div>
            <b>{attachments.length}</b>
          </header>

          {loading && <p className="issue-attachment-empty">Carregando anexos...</p>}
          {!loading && attachments.length === 0 && (
            <div className="issue-attachment-empty">
              <span><AttachmentIcon name="attachment" /></span>
              <strong>Nenhum arquivo anexado</strong>
              <small>Adicione evidências, fotos ou documentos desta pendência.</small>
            </div>
          )}
          {!loading && attachments.map((attachment) => (
            <article key={attachment.id}>
              <span className="issue-attachment-file-icon">
                <AttachmentIcon name="attachment" />
              </span>
              <div>
                <strong title={attachment.file_name}>{attachment.file_name}</strong>
                <small>
                  {formatFileSize(attachment.file_size)} · {new Date(attachment.created_at).toLocaleString("pt-BR")}
                </small>
              </div>
              <a href={attachment.public_url} rel="noreferrer" target="_blank">
                <AttachmentIcon name="download" />
                Abrir
              </a>
              {canDelete && (
                <button
                  aria-label={`Remover ${attachment.file_name}`}
                  className="issue-attachment-delete"
                  disabled={deletingId === attachment.id}
                  onClick={() => deleteAttachment(attachment)}
                  type="button"
                >
                  <AttachmentIcon name="trash" />
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </FormModal>
  );
}
