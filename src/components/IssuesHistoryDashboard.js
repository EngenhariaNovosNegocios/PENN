"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function IssuesHistoryDashboard() {
  const [issues,setIssues]=useState([]); const [products,setProducts]=useState([]); const [search,setSearch]=useState("");
  useEffect(()=>{const load=()=>Promise.all([supabase.from("product_issues").select("*").not("resolved_at","is",null).order("resolved_at",{ascending:false}),supabase.from("products").select("id,code,name")]).then(([i,p])=>{setIssues(i.data??[]);setProducts(p.data??[]);});load();window.addEventListener("penn:issues-changed",load);return()=>window.removeEventListener("penn:issues-changed",load);},[]);
  const visible=issues.filter(issue=>{const product=products.find(p=>p.id===issue.product_id);return `${issue.description} ${issue.resolution_note} ${product?.code} ${product?.name}`.toLowerCase().includes(search.toLowerCase());});
  return <main className="history-page"><section className="history-hero"><span>Memória operacional</span><h1>Histórico de pendências resolvidas</h1><p>Consulte problemas anteriores, suas soluções e o contexto de cada produto.</p><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar produto, pendência ou solução..."/></section><section className="history-list">{visible.map(issue=>{const product=products.find(p=>p.id===issue.product_id);return <article key={issue.id}><span className="resolved-check">✓</span><div><small>{product?.code||issue.product_code} · {product?.name||"Produto"}</small><strong>{issue.description}</strong><p>{issue.resolution_note}</p></div><time>{new Date(issue.resolved_at).toLocaleString("pt-BR")}</time></article>})}{visible.length===0&&<div className="issues-empty"><strong>Nenhum registro encontrado</strong><span>As pendências resolvidas aparecerão nesta página.</span></div>}</section></main>;
}
