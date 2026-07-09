import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default async function ExemploPage() {
  const { data: avisos, error } = await supabase
    .from("avisos")
    .select("id, titulo, mensagem, criado_em")
    .order("criado_em", { ascending: false });

  return (
    <main>
      <header>
        <h1>Exemplo de integração com Supabase</h1>
        <p>
          Esta página busca dados reais da tabela <code>avisos</code> no
          Supabase. É só um exemplo de referência para o time — mostra como
          ler dados do banco neste projeto.
        </p>
      </header>

      {error && <p>Erro ao buscar dados: {error.message}</p>}

      {!error && avisos?.length === 0 && (
        <p>Nenhum aviso cadastrado ainda.</p>
      )}

      <section className="card-grid">
        {avisos?.map((aviso) => (
          <div className="card" key={aviso.id}>
            <h2>{aviso.titulo}</h2>
            <p>{aviso.mensagem}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
