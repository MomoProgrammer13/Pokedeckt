# Pokedeckt

Criação e organização de decks de Pokémon TCG. Front-end puro (HTML, CSS e JavaScript, sem build) que consome a API pública [TCGdex](https://tcgdex.dev/) em português.

## Como rodar

Opção 1: abra o `index.html` direto no navegador.

Opção 2 (recomendada): sirva a pasta localmente e acesse http://localhost:5500

```bash
python -m http.server 5500
```

Os decks ficam no `localStorage` do navegador.

## Funcionalidades

- **Meus decks**: criar, editar, duplicar, copiar lista em texto e excluir (com confirmação e "Desfazer").
- **Editor de deck**: busca por nome com filtros de categoria, tipo, coleção e ordenação; adicionar com `+`; ajustar quantidades; contador X/60 com barra de progresso e divisão por categoria.
- **Preços**: valor de mercado de cada carta (Cardmarket em EUR e TCGplayer em USD, vindos da TCGdex), convertido para reais pela cotação do dia ([Frankfurter](https://frankfurter.dev/)). Aparece no detalhe da carta, em cada linha do deck, no valor estimado total do deck e na lista copiada.
- **Explorar cartas**: consulta livre do catálogo com detalhes da carta e opção de adicionar a qualquer deck.
- **Regras e ajuda**: explica as regras de montagem e o uso do site.

## Regras aplicadas

| Regra | Como o sistema aplica |
|---|---|
| Deck com 60 cartas | Botão `+` bloqueado ao chegar em 60; aviso "Faltam N cartas" |
| Máx. 4 cópias com o mesmo nome | Botão `+` fica cinza e explica o motivo ao clicar |
| Energia Básica sem limite | Detectada pelo campo `energyType: "Normal"` da API |
| Pelo menos 1 Pokémon Básico | Aviso no painel do deck |
| Salvar deck incompleto | Pede confirmação e salva como "Rascunho" |

## Princípios de Design de Interação no sistema

- **Visibilidade**: contador 60, barra de progresso, selo "×N" nas cartas já no deck, estado "Alterações não salvas / Tudo salvo".
- **Feedback**: avisos (toasts), destaque da linha alterada, esqueletos de carregamento, spinner ao adicionar.
- **Restrições**: limite de 60 e de 4 cópias; filtro "Tipo" desativado para Treinadores; nome do deck obrigatório.
- **Consistência**: mesmos botões `+`/`−`, cores e ícones em todas as telas; cores fixas para cada tipo.
- **Mapeamento**: `+`/`−` ao lado da quantidade; cartas agrupadas por categoria igual à contagem do topo.
- **Affordance**: cartas com cursor de zoom, botões arredondados, nome do deck com ícone de lápis.
- **Prevenção e recuperação de erros**: confirmação ao excluir, "Desfazer" ao remover, aviso ao sair sem salvar (com "Salvar e sair").

## Estrutura

```
index.html
css/styles.css
js/
  api.js            cliente TCGdex (cache em memória)
  prices.js         preços das cartas e conversão para reais
  storage.js        decks no localStorage
  rules.js          regras de montagem e validação
  ui.js             toasts, modais, confirmações
  icons.js          ícones SVG
  components/       busca de cartas, detalhe da carta
  views/            telas (decks, editor, explorar, regras)
  app.js            roteador por hash
```
