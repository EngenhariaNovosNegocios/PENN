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
- [Supabase](https://supabase.com/) (banco de dados)
- [Vercel](https://vercel.com/) (hospedagem)

Autenticação ainda não está configurada — isso será feito em etapa futura.

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
3. Copie o arquivo de variáveis de ambiente de exemplo e preencha com as
   credenciais do Supabase (Project Settings → API no painel do Supabase):
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
  lib/          # Configuração de serviços externos (ex.: cliente do Supabase)
docs/           # Documentação do projeto
```

## Deploy

O projeto é publicado automaticamente na [Vercel](https://vercel.com/) a
partir da branch `main`. Cada Pull Request também gera uma URL de preview
própria.

As variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_ANON_KEY`) precisam estar cadastradas em
**Project Settings → Environment Variables** no painel da Vercel, com os
mesmos valores do `.env.local`.

## Como contribuir

Veja o arquivo [CONTRIBUTING.md](./CONTRIBUTING.md) antes de fazer qualquer
alteração.
