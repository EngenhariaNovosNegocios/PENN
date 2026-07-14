"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const TYPES = {
  products: { label: "Produtos", required: ["code", "name"], fields: ["code", "name", "category", "ncm", "owner", "status", "characteristics"] },
  materials: { label: "Matérias-primas", required: ["code", "name"], fields: ["code", "name", "unit_type"] },
  structure: { label: "Estrutura", required: ["product_code", "material_code", "quantity"], fields: ["product_code", "material_code", "description", "quantity"] },
};

const ALIASES = {
  code: ["codigo", "código", "codigo_produto", "código_produto", "cod_produto", "sku"],
  name: ["nome", "nome_produto", "produto", "descricao", "descrição"],
  category: ["categoria", "grupo", "familia", "família"], ncm: ["ncm"],
  owner: ["responsavel", "responsável", "owner"], status: ["status", "situacao", "situação"],
  characteristics: ["caracteristicas", "características", "observacoes", "observações"],
  unit_type: ["unidade", "un", "unit_type", "tipo_unidade"],
  product_code: ["codigo_produto", "código_produto", "produto", "product_code"],
  material_code: ["codigo_materia_prima", "código_matéria_prima", "materia_prima", "matéria_prima", "material_code"],
  description: ["descricao", "descrição", "nome_item", "item"], quantity: ["quantidade", "qtd", "quantity"],
};

const normalize = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const cleanCode = value => String(value ?? "").trim().toUpperCase();
const productStatus = value => ({ ativo:"ativo", manutencao:"manutencao", em_manutencao:"manutencao", avaliacao:"avaliacao", em_avaliacao:"avaliacao", pausado:"pausado" }[normalize(value)] || "ativo");
const batches = (items, size=200) => Array.from({length:Math.ceil(items.length/size)},(_,index)=>items.slice(index*size,(index+1)*size));

function parseCsv(text) {
  const first = text.split(/\r?\n/, 1)[0] || "";
  const delimiter = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ";" : ",";
  const rows = []; let row = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[i + 1] === "\n") i += 1; row.push(cell); if (row.some(value => value.trim())) rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  row.push(cell); if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

function mapHeaders(headers, type) {
  const normalized = headers.map(normalize);
  return Object.fromEntries(TYPES[type].fields.map(field => {
    const aliases = [field, ...(ALIASES[field] || [])].map(normalize);
    return [field, normalized.findIndex(header => aliases.includes(header))];
  }));
}

export default function SpreadsheetImport({ onImported }) {
  const [type, setType] = useState("products");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(false);

  const validRows = useMemo(() => rows.filter(row => !row.errors.length), [rows]);
  const duplicateRows = useMemo(() => rows.filter(row => row.errors.length > 0 && row.errors.every(error => error === "código duplicado no arquivo")), [rows]);
  const blockingRows = useMemo(() => rows.filter(row => row.errors.length > 0 && !(ignoreDuplicates && row.errors.every(error => error === "código duplicado no arquivo"))), [rows, ignoreDuplicates]);

  async function readFile(file) {
    setMessage(""); setRows([]); setErrors([]); setIgnoreDuplicates(false); setFileName(file?.name || "");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { setErrors(["Salve a aba do Excel como CSV UTF-8 antes de importar."]); return; }
    const matrix = parseCsv(await file.text());
    if (matrix.length < 2) { setErrors(["O arquivo não contém linhas para importar."]); return; }
    const mapping = mapHeaders(matrix[0], type);
    const missing = TYPES[type].required.filter(field => mapping[field] < 0);
    if (missing.length) { setErrors([`Colunas obrigatórias não encontradas: ${missing.join(", ")}.`]); return; }
    const seen = new Set();
    const parsed = matrix.slice(1).map((cells, index) => {
      const data = Object.fromEntries(TYPES[type].fields.map(field => [field, mapping[field] < 0 ? "" : String(cells[mapping[field]] ?? "").trim()]));
      const lineErrors = [];
      TYPES[type].required.forEach(field => { if (!data[field]) lineErrors.push(`${field} obrigatório`); });
      const key = type === "structure" ? `${cleanCode(data.product_code)}|${cleanCode(data.material_code)}` : cleanCode(data.code);
      if (seen.has(key)) lineErrors.push("código duplicado no arquivo"); else seen.add(key);
      if (type === "products" && data.code && !/^550\.100\.000\.\d{4,}$/.test(data.code)) lineErrors.push("código fora do padrão 550.100.000.xxxx");
      if (type === "materials" && data.unit_type && !["UN","PC","KIT","CX","KG","M","L","H"].includes(data.unit_type.toUpperCase())) lineErrors.push("unidade inválida");
      if (type === "structure" && (!Number(data.quantity.replace(",", ".")) || Number(data.quantity.replace(",", ".")) <= 0)) lineErrors.push("quantidade inválida");
      return { line: index + 2, data, errors: lineErrors };
    });
    if (type !== "structure") {
      const table = type === "products" ? "products" : "raw_materials";
      const codes = parsed.filter(row=>row.data.code).map(row=>cleanCode(row.data.code));
      const { data: existing, error } = codes.length ? await supabase.from(table).select("code").in("code", codes) : { data: [], error: null };
      if (error) { setErrors([`Não foi possível conferir os códigos existentes: ${error.message}`]); return; }
      const existingCodes = new Set((existing ?? []).map(item=>cleanCode(item.code)));
      parsed.forEach(row => { row.action = existingCodes.has(cleanCode(row.data.code)) ? "Atualizar" : "Criar"; });
    } else parsed.forEach(row => { row.action = "Criar"; });
    setRows(parsed);
  }

  async function importData() {
    if (!validRows.length || blockingRows.length > 0 || !window.confirm(`Confirmar a importação de ${validRows.length} registro(s)${ignoreDuplicates && duplicateRows.length ? ` e ignorar ${duplicateRows.length} duplicado(s)` : ""}?`)) return;
    setBusy(true); setMessage(""); setErrors([]);
    try {
      if (type === "products") {
        const { data: currentProducts, error: currentError } = await supabase.from("products").select("code,category,ncm,owner,status,characteristics");
        if (currentError) throw currentError;
        const currentByCode = new Map((currentProducts??[]).map(item=>[cleanCode(item.code),item]));
        const payload = validRows.map(({ data }) => { const current=currentByCode.get(cleanCode(data.code))||{}; return { code: cleanCode(data.code), name: data.name, category: data.category || current.category || null, ncm: data.ncm || current.ncm || null, owner: data.owner || current.owner || null, status: data.status ? productStatus(data.status) : current.status || "ativo", characteristics: data.characteristics || current.characteristics || null }; });
        const categories = [...new Set(payload.map(item => item.category).filter(Boolean))].map(name => ({ name }));
        if (categories.length) { const { error } = await supabase.from("product_categories").upsert(categories, { onConflict: "name", ignoreDuplicates: true }); if (error) throw error; }
        for (const batch of batches(payload)) { const { error } = await supabase.from("products").upsert(batch, { onConflict: "code" }); if (error) throw error; }
      } else if (type === "materials") {
        const { data: currentMaterials, error: currentError } = await supabase.from("raw_materials").select("code,unit_type,is_provisional");
        if (currentError) throw currentError;
        const currentByCode = new Map((currentMaterials??[]).map(item=>[cleanCode(item.code),item]));
        const payload = validRows.map(({ data }) => { const current=currentByCode.get(cleanCode(data.code))||{}; return { code: cleanCode(data.code), name: data.name, unit_type: (data.unit_type || current.unit_type || "UN").toUpperCase(), is_provisional: current.is_provisional ?? false }; });
        for (const batch of batches(payload)) { const { error } = await supabase.from("raw_materials").upsert(batch, { onConflict: "code" }); if (error) throw error; }
      } else {
        const [productsResult, materialsResult] = await Promise.all([supabase.from("products").select("id,code"), supabase.from("raw_materials").select("id,code,name")]);
        if (productsResult.error) throw productsResult.error; if (materialsResult.error) throw materialsResult.error;
        const unresolved = []; const payload = [];
        validRows.forEach(({ line, data }) => { const product = productsResult.data.find(item => cleanCode(item.code) === cleanCode(data.product_code)); const material = materialsResult.data.find(item => cleanCode(item.code) === cleanCode(data.material_code)); if (!product || !material) unresolved.push(`Linha ${line}: produto ou matéria-prima não encontrado.`); else payload.push({ product_id: product.id, material_code: material.code, description: data.description || material.name, quantity: Number(String(data.quantity).replace(",", ".")) }); });
        if (unresolved.length) { setErrors(unresolved); setBusy(false); return; }
        for (const batch of batches(payload)) { const { error } = await supabase.from("product_structure_items").insert(batch); if (error) throw error; }
      }
      setMessage(`${validRows.length} registro(s) importados com sucesso.${ignoreDuplicates && duplicateRows.length ? ` ${duplicateRows.length} duplicado(s) foram desconsiderados.` : ""}`); setRows([]); setFileName(""); onImported?.();
    } catch (error) { setErrors([error.message || "Não foi possível concluir a importação."]); }
    setBusy(false);
  }

  return <section className="spreadsheet-import panel">
    <header><div><span>Importação assistida</span><h2>Carregar dados por planilha</h2><p>Exporte cada aba do Excel como CSV UTF-8. Nada será gravado antes da confirmação.</p></div><div className="import-safety"><strong>Prévia segura</strong><small>Validação de códigos e duplicidades</small></div></header>
    <nav>{Object.entries(TYPES).map(([key,config]) => <button className={type===key?"active":""} key={key} onClick={()=>{setType(key);setRows([]);setErrors([]);setIgnoreDuplicates(false);setFileName("")}} type="button">{config.label}</button>)}</nav>
    <div className="import-drop"><label><strong>Selecionar arquivo CSV</strong><span>{fileName || "Arraste ou escolha o arquivo exportado do Excel"}</span><input accept=".csv,text/csv" type="file" onChange={event=>readFile(event.target.files?.[0])}/></label><aside><strong>Colunas esperadas</strong><code>{TYPES[type].fields.join(" · ")}</code></aside></div>
    {errors.length>0&&<div className="import-errors"><strong>Importação bloqueada</strong>{errors.slice(0,8).map((error,index)=><span key={index}>{error}</span>)}{errors.length>8&&<small>+ {errors.length-8} outros erros</small>}</div>}
    {message&&<p className="import-success">{message}</p>}
    {rows.length>0&&<>{duplicateRows.length>0&&<label className="ignore-duplicates"><input checked={ignoreDuplicates} onChange={event=>setIgnoreDuplicates(event.target.checked)} type="checkbox"/><span><strong>Desconsiderar itens duplicados</strong><small>Ignorar {duplicateRows.length} ocorrência(s) repetida(s) e importar somente a primeira de cada código.</small></span></label>}<div className="import-summary"><article><strong>{rows.length}</strong><span>linhas lidas</span></article><article className="success"><strong>{validRows.length}</strong><span>prontas</span></article><article className={blockingRows.length?"danger":"ignored"}><strong>{ignoreDuplicates?blockingRows.length:rows.length-validRows.length}</strong><span>{ignoreDuplicates?"erros bloqueantes":"com erro"}</span></article><button disabled={busy||!validRows.length||blockingRows.length>0} onClick={importData}>{busy?"Importando...":`Confirmar ${validRows.length} registro(s)`}</button></div><div className="import-preview"><table><thead><tr><th>Linha</th><th>Ação</th>{TYPES[type].fields.map(field=><th key={field}>{field}</th>)}<th>Validação</th></tr></thead><tbody>{rows.slice(0,100).map(row=>{const ignored=ignoreDuplicates&&row.errors.length>0&&row.errors.every(error=>error==="código duplicado no arquivo");return <tr className={ignored?"ignored":row.errors.length?"invalid":""} key={row.line}><td>{row.line}</td><td><b className={`import-action ${(ignored?"ignorar":row.action)?.toLowerCase()}`}>{ignored?"Ignorar":row.action}</b></td>{TYPES[type].fields.map(field=><td key={field}>{row.data[field]||"—"}</td>)}<td>{ignored?"Será desconsiderado":row.errors.length?row.errors.join("; "):"Pronto"}</td></tr>})}</tbody></table></div></>}
  </section>;
}
