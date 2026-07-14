"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function MaterialQuotationPage() {
  const { id } = useParams();
  const [material, setMaterial] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [materialResult, supplierResult, quoteResult] = await Promise.all([
        supabase.from("raw_materials").select("*").eq("id", id).single(),
        supabase.from("suppliers").select("id,name"),
        supabase.from("supplier_material_quotations").select("*").eq("raw_material_id", id).order("quoted_at", { ascending: false }),
      ]);
      setMaterial(materialResult.data);
      setSuppliers(supplierResult.data ?? []);
      setQuotes(quoteResult.data ?? []);
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  const stats = useMemo(() => {
    const brl = quotes.filter(item => item.currency === "BRL");
    const usd = quotes.filter(item => item.currency === "USD");
    const variation = quotes.length > 1 && Number(quotes[1].unit_price) ? ((Number(quotes[0].unit_price) / Number(quotes[1].unit_price) - 1) * 100) : null;
    return { brl: brl.length ? Math.min(...brl.map(item => Number(item.unit_price))) : null, usd: usd.length ? Math.min(...usd.map(item => Number(item.unit_price))) : null, variation };
  }, [quotes]);

  const money = (value, currency) => Number(value).toLocaleString(currency === "USD" ? "en-US" : "pt-BR", { style: "currency", currency });
  if (loading) return <main className="quotation-page"><p>Carregando histórico...</p></main>;
  if (!material) return <main className="quotation-page"><Link href="/">← Voltar</Link><h1>Matéria-prima não encontrada</h1></main>;

  return <main className="quotation-page">
    <header className="quotation-hero"><div><Link href="/">← Voltar ao Portal PENN</Link><span>Inteligência de suprimentos</span><h1>{material.code}</h1><p>{material.name}</p></div><strong>{quotes.length}<small> cotações registradas</small></strong></header>
    <section className="quotation-kpis"><article><span>Melhor preço BRL</span><strong>{stats.brl == null ? "—" : money(stats.brl,"BRL")}</strong></article><article><span>Melhor preço USD</span><strong>{stats.usd == null ? "—" : money(stats.usd,"USD")}</strong></article><article className={stats.variation > 0 ? "danger" : "success"}><span>Variação da última cotação</span><strong>{stats.variation == null ? "—" : `${stats.variation > 0 ? "+" : ""}${stats.variation.toFixed(1)}%`}</strong></article></section>
    <section className="quotation-history"><header><div><span>Linha do tempo</span><h2>Histórico de cotações</h2></div><small>Os registros são criados ao salvar um item no SRM.</small></header>{quotes.map((quote,index) => <article key={quote.id} className={index===0?"latest":""}><time>{new Date(quote.quoted_at).toLocaleDateString("pt-BR")}</time><div><strong>{suppliers.find(item=>item.id===quote.supplier_id)?.name || "Fornecedor"}</strong><small>{quote.supplier_part_number || "Sem P/N informado"}</small></div><div><strong>{money(quote.unit_price,quote.currency)}</strong><small>Pedido mínimo: {quote.minimum_order ?? "não informado"}</small></div>{index===0&&<span>Mais recente</span>}</article>)}{!quotes.length&&<div className="quotation-empty"><strong>Ainda não há cotações</strong><p>Salve um preço na matéria-prima de um fornecedor para iniciar este histórico.</p></div>}</section>
  </main>;
}
