# Portal Engenharia de Novos Negócios

## Objetivo

Aplicação web interna do setor de Engenharia de Novos Negócios, criada para
concentrar as informações do setor. Nesta primeira etapa, o projeto contém
apenas a estrutura inicial e uma página de início. No futuro, deve passar a
apoiar o acompanhamento de:

- Projetos
- Produtos
- Pendências
- Orçamentos

## Tecnologias usadas

- [Next.js](https://nextjs.org/) (React)
- JavaScript
- CSS puro (sem bibliotecas de estilo)

Nenhum banco de dados ou autenticação está configurado ainda — isso será
feito em etapas futuras.

## Pré-requisitos

- [Node.js](https://nodejs.org/) versão 20.9 ou superior (inclui o `npm`)
- [Git](https://git-scm.com/)

Para verificar se já tem o Node instalado, rode no terminal:

```
node -v
npm -v
```

## Como instalar

1. Clone o repositório:
   ```
   git clone <url-do-repositorio>
   cd PENN
   ```
2. Instale as dependências:
   ```
   npm install
   ```
3. (Opcional por enquanto) Copie o arquivo de variáveis de ambiente de exemplo:
   ```
   cp .env.example .env.local
   ```

## Como rodar localmente

```
npm run dev
```

Depois abra [http://localhost:3000](http://localhost:3000) no navegador. A
página inicial "Central de Novos Negócios" deve aparecer.

Para parar o servidor, use `Ctrl + C` no terminal.

## Estrutura de pastas

```
src/
  app/          # Páginas da aplicação (Next.js App Router)
  components/   # Componentes reutilizáveis de interface
docs/           # Documentação do projeto
```

## Como contribuir

Veja o arquivo [CONTRIBUTING.md](./CONTRIBUTING.md) antes de fazer qualquer
alteração.
