# Como contribuir

Regras simples para trabalharmos juntos sem conflitos.

## Branches

- **Nunca altere a branch `main` diretamente.**
- Para cada tarefa, crie uma branch nova a partir da `main`. Exemplo:
  ```
  git checkout main
  git pull
  git checkout -b minha-tarefa
  ```
- Use um nome curto e descritivo para a branch (ex.: `pagina-inicial`,
  `ajuste-readme`).

## Pull Requests

- Antes de juntar qualquer alteração à `main`, abra um Pull Request (PR).
- Peça para a outra pessoa revisar o PR antes de fazer o merge.
- Só faça o merge depois que o PR for aprovado.

## Commits

- Faça commits pequenos e claros, cada um com uma alteração específica.
- Escreva mensagens de commit que expliquem o que foi feito. Exemplo:
  ```
  git commit -m "Adiciona card de Orçamentos na página inicial"
  ```

## Dados sensíveis

- **Nunca** suba senhas, tokens, chaves de API ou dados reais da empresa
  para o repositório.
- Use o arquivo `.env.example` como referência de variáveis de ambiente,
  mas coloque valores reais apenas no seu `.env.local`, que não é
  versionado (já está no `.gitignore`).
- Em caso de dúvida se algo é sensível, pergunte antes de subir.
