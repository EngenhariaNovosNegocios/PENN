"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import FormModal from "@/components/FormModal";
import { canEditOperations } from "@/lib/accessControl";
import { supabase } from "@/lib/supabaseClient";

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.9"
    >
      <path d="m7 7 10 10M17 7 7 17" />
    </svg>
  );
}

function formatMoney(value, currency) {
  return Number(value).toLocaleString(currency === "USD" ? "en-US" : "pt-BR", {
    style: "currency",
    currency,
  });
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "Data não informada";
}

export default function MaterialQuotationPage() {
  const { id } = useParams();
  const [material, setMaterial] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canDeleteQuotes, setCanDeleteQuotes] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const [materialResult, supplierResult, quoteResult, profileResult] = await Promise.all([
        supabase.from("raw_materials").select("*").eq("id", id).single(),
        supabase.from("suppliers").select("id,name"),
        supabase
          .from("supplier_material_quotations")
          .select("*")
          .eq("raw_material_id", id)
          .order("quoted_at", { ascending: false }),
        userId
          ? supabase.from("user_profiles").select("role").eq("id", userId).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      setMaterial(materialResult.data);
      setSuppliers(supplierResult.data ?? []);
      setQuotes(quoteResult.data ?? []);
      setCanDeleteQuotes(canEditOperations(profileResult.data?.role));
      setLoading(false);
    }

    if (id) load();
  }, [id]);

  const supplierNames = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier.name])),
    [suppliers]
  );

  const stats = useMemo(() => {
    const brl = quotes.filter((item) => item.currency === "BRL");
    const usd = quotes.filter((item) => item.currency === "USD");
    const variation =
      quotes.length > 1 && Number(quotes[1].unit_price)
        ? (Number(quotes[0].unit_price) / Number(quotes[1].unit_price) - 1) * 100
        : null;

    return {
      brl: brl.length ? Math.min(...brl.map((item) => Number(item.unit_price))) : null,
      usd: usd.length ? Math.min(...usd.map((item) => Number(item.unit_price))) : null,
      variation,
    };
  }, [quotes]);

  async function deleteQuote() {
    if (!quoteToDelete || !canDeleteQuotes || deleting) return;

    setDeleting(true);
    setMessage("");
    const { error } = await supabase
      .from("supplier_material_quotations")
      .delete()
      .eq("id", quoteToDelete.id);

    if (error) {
      setMessageTone("error");
      setMessage(`Não foi possível excluir a cotação: ${error.message}`);
      setDeleting(false);
      return;
    }

    setQuotes((current) => current.filter((quote) => quote.id !== quoteToDelete.id));
    setQuoteToDelete(null);
    setDeleting(false);
    setMessageTone("success");
    setMessage("Cotação excluída do histórico.");
  }

  if (loading) {
    return <main className="quotation-page"><p>Carregando histórico...</p></main>;
  }

  if (!material) {
    return (
      <main className="quotation-page">
        <Link href="/">← Voltar</Link>
        <h1>Matéria-prima não encontrada</h1>
      </main>
    );
  }

  return (
    <main className="quotation-page">
      <header className="quotation-hero">
        <div>
          <Link href="/">← Voltar ao Portal PENN</Link>
          <span>Inteligência de suprimentos</span>
          <h1>{material.code}</h1>
          <p>{material.name}</p>
        </div>
        <strong>{quotes.length}<small> cotações registradas</small></strong>
      </header>

      {message && (
        <p className={`quotation-page-message ${messageTone}`} role="status">
          {message}
        </p>
      )}

      <section className="quotation-kpis">
        <article>
          <span>Melhor preço BRL</span>
          <strong>{stats.brl == null ? "—" : formatMoney(stats.brl, "BRL")}</strong>
        </article>
        <article>
          <span>Melhor preço USD</span>
          <strong>{stats.usd == null ? "—" : formatMoney(stats.usd, "USD")}</strong>
        </article>
        <article className={stats.variation > 0 ? "danger" : "success"}>
          <span>Variação da última cotação</span>
          <strong>
            {stats.variation == null
              ? "—"
              : `${stats.variation > 0 ? "+" : ""}${stats.variation.toFixed(1)}%`}
          </strong>
        </article>
      </section>

      <section className="quotation-history">
        <header>
          <div><span>Linha do tempo</span><h2>Histórico de cotações</h2></div>
          <small>Os registros são criados ao salvar um item no SRM.</small>
        </header>

        {quotes.map((quote, index) => (
          <article className={index === 0 ? "latest" : ""} key={quote.id}>
            <time>{formatDate(quote.quoted_at)}</time>
            <div>
              <strong>{supplierNames.get(quote.supplier_id) || "Fornecedor"}</strong>
              <small>{quote.supplier_part_number || "Sem P/N informado"}</small>
            </div>
            <div>
              <strong>{formatMoney(quote.unit_price, quote.currency)}</strong>
              <small>Pedido mínimo: {quote.minimum_order ?? "não informado"}</small>
            </div>
            {index === 0 && <span className="quotation-latest-badge">Mais recente</span>}
            {canDeleteQuotes && index > 0 && (
              <button
                aria-label={`Excluir cotação de ${supplierNames.get(quote.supplier_id) || "fornecedor"}`}
                className="quotation-delete-trigger"
                onClick={() => {
                  setMessage("");
                  setQuoteToDelete(quote);
                }}
                title="Excluir cotação"
                type="button"
              >
                <CloseIcon />
              </button>
            )}
          </article>
        ))}

        {!quotes.length && (
          <div className="quotation-empty">
            <strong>Ainda não há cotações</strong>
            <p>Salve um preço na matéria-prima de um fornecedor para iniciar este histórico.</p>
          </div>
        )}
      </section>

      <FormModal
        closeLabel="Cancelar exclusão da cotação"
        description="Confira os dados antes de remover este registro do histórico."
        eyebrow="Confirmação necessária"
        onClose={() => !deleting && setQuoteToDelete(null)}
        open={Boolean(quoteToDelete)}
        size="small"
        title="Excluir cotação?"
      >
        {quoteToDelete && (
          <section className="quotation-delete-confirm">
            <div>
              <span>Fornecedor</span>
              <strong>{supplierNames.get(quoteToDelete.supplier_id) || "Fornecedor"}</strong>
            </div>
            <div className="quotation-delete-summary">
              <span><small>Valor</small><strong>{formatMoney(quoteToDelete.unit_price, quoteToDelete.currency)}</strong></span>
              <span><small>Data</small><strong>{formatDate(quoteToDelete.quoted_at)}</strong></span>
            </div>
            <p>
              A exclusão remove somente este registro antigo do histórico e não altera as
              condições comerciais atuais do fornecedor. Esta ação não poderá ser desfeita.
            </p>
            <footer className="modal-form-actions">
              <button disabled={deleting} onClick={() => setQuoteToDelete(null)} type="button">Cancelar</button>
              <button className="danger" disabled={deleting} onClick={deleteQuote} type="button">
                {deleting ? "Excluindo..." : "Excluir cotação"}
              </button>
            </footer>
          </section>
        )}
      </FormModal>
    </main>
  );
}
