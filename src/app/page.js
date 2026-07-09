import Card from "@/components/Card";

const cards = [
  {
    title: "Projetos",
    description: "Acompanhamento dos projetos em andamento no setor.",
  },
  {
    title: "Produtos",
    description: "Visão geral dos produtos em desenvolvimento.",
  },
  {
    title: "Pendências",
    description: "Itens em aberto que precisam de atenção.",
  },
  {
    title: "Orçamentos",
    description: "Controle dos orçamentos relacionados aos projetos.",
  },
];

export default function Home() {
  return (
    <main>
      <header>
        <h1>Central de Novos Negócios</h1>
        <p>
          Portal interno da Engenharia de Novos Negócios para concentrar
          informações de projetos, produtos, pendências e orçamentos do
          setor.
        </p>
      </header>

      <section className="card-grid">
        {cards.map((card) => (
          <Card key={card.title} title={card.title} description={card.description} />
        ))}
      </section>
    </main>
  );
}
