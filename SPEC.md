# OpenSpec — Especificação para o Chat Financeiro

## 1. Visão Geral

- **Nome:** Assistente Financeiro com MCP
- **Cliente-alvo:** Usuário que consulta contas, saldos e transações via chat, em português
- **Dados:** fictícios (sandbox) — banco de teste, não produção
- **Fluxo:** Usuário pergunta → IA consulta MCP → responde com dados organizados

## 2. Contexto

O desafio exige conectar um assistente de chat a dois MCP servers:
- **Pluggy:** Streamable HTTP (sem chave), explica conceitos (o que é um Item)
- **Plaid:** STDIO via uvx, dados fictícios de sandbox

O resultado é um app de chat (publicado no Lovable ou similar) que o cliente já usa.

## 3. Critérios de Aceitação

### Funcionais
1. O chat exibe mensagens de boas-vindas e sugestões de perguntas
2. O usuário pode digitar ou clicar em uma sugestão
3. O app conecta ao MCP server (pluggy-mock) e consulta ferramentas
4. O bot responde com:
   - Explicação de "Item" (fonte: Pluggy)
   - Lista de contas com saldos
   - Tabelas de transações
   - Padrões de gasto em 3 categorias
5. O app avisa que os dados são fictícios
6. O app mostra quando o saldo do cartão é dívida (valor negativo invertido)

### Não Funcionais
- Dados fictícios são claramente indicados
- Nenhuma chave, token ou senha está versionada ou exposta em print
- O código é limpo, organizado e legível
- O app é responsivo (funciona em mobile)

## 4. Solução Proposta

### Componentes
- `src/index.html`: interface de chat
- `src/style.css`: estilos (visual de app financeiro)
- `src/app.js`: lógica de conexão MCP e renderização
- `mcp-servers/pluggy-mock/server.js`: servidor HTTP mock (Pluggy + Plaid)
- `data/plaid-fake-data.json`: dados fictícios (contas, transações, gastos)

### Fluxo de Dados
```
Usuário pergunta → app envia POST /mcp → MCP mock retorna JSON-RPC 2.0
→ app renderiza em chat (tabelas, cards, explicações)
```

### Ferramentas MCP
- `pluggy_explain_item` — explica o que é um Item (fonte: Pluggy)
- `get_accounts` — lista contas
- `get_balance` — saldo de uma conta (aplica inversão para débito)
- `get_transactions` — transações de uma conta
- `get_expense_patterns` — 3 padrões de gasto

## 5. Decisões de Design

- **Visual:** app financeiro moderno, temas claros, cartões e tabelas
- **Idioma:** português (pt-BR)
- **Configuração:** MCP server mock via HTTP (estável, não requer uvx)
- **Segurança:** nenhuma chave de API armazenada localmente (usando dados mockados)

## 6. Risco e Mitigação

- **Risco:** conexão falha se o servidor não estiver rodando
  - **Mitigação:** mensagem clara de erro com instruções de execução
- **Risco:** dados fictícios passarem despercebidos
  - **Mitigação:** badge "Dados fictícios" no cabeçalho e aviso no rodapé
- **Risco:** saldo do cartão invertido (dívida)
  - **Mitigação:** condição display exibe aviso visual claramente

## 7. Próximos Passos

1. Publicar no Lovable (use o prompt OpenSpec abaixo)
2. Configurar MCP servers reais no Codex (Pluggy + Plaid)
3. Subir ao GitHub (repo público)
4. Melhorar com uma das ideias de evolução (webhooks, backend, conversão, etc.)

---

## 📜 Prompt OpenSpec para o Lovable

```text
Fundo: o usuário quer um assistente financeiro que conecte a Pluggy (explicação)
e a Plaid (dados) via MCP, em português, no chat.

Conecte a Pluggy:
- No MCP do agente (Codex), adicione um servidor Streamable HTTP com URL
  https://mcp.pluggy.ai/mcp, SEM chave.
- Peça que a IA explique o que é um Item, com as fontes.

Prepare a Plaid:
- No Dashboard da Plaid (Developers → Keys), copie Client ID e Secret de Sandbox.
- Instale o uv e adicione o servidor mcp-server-plaid, do tipo STDIO,
  com caminho do uvx no comando e as duas chaves como variáveis de ambiente.

Consulte o banco fictício:
- Crie um Item de teste, leia contas, saldos e transações.
- Peça tabelas com três padrões de gasto.
- Na Plaid, valor positivo é saída.

Construa o chat no Lovable:
- Cole a especificação abaixo, com o seu nome e cenário no lugar do desfocado.
- Mande primeiro no modo chat, para tirar dúvidas, e publique.

Especificação:
- Título: Assistente Financeiro com MCP
- Cliente: um usuário que consulta contas, saldos e transações via chat, em português.
- Dados: fictícios (sandbox), não produção.
- Chat deve ter:
  * Boas-vindas + sugestões de perguntas
  * Resposta ao "qual é o meu saldo?"
  * Tabela de transações
  * Padrões de gasto em 3 categorias
  * Explicação de "Item" (fonte: Pluggy)
  * Badge comunicando que os dados são fictícios
- Dados de exemplo:
  * Conta corrente: Café da Manhã, saldo R$ 2.450,00
  * Cartão de crédito: Supercards, saldo devedor R$ 1.234,56
  * Poupança ideal: R$ 5.600,00
  * Carteira investimento: R$ 8.900,00
- Restrição: a Plaid é só um laboratório; não representa o Open Finance Brasil em produção.

Cliente: chat financeiro — o usuário está no app e pergunta sobre saldo, transações ou gastos.
```
