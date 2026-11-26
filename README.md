# 🤖 Assistente Financeiro com MCP

> **Desafio bootcamp** — Um assistente em português que responde sobre contas, saldos e transações usando o **Model Context Protocol (MCP)**, conectando a **Pluggy** (explicação de conceitos) e a **Plaid** (dados reais de sandbox).

---

## 📋 O que é este projeto

Uma aplicação de **chat financeiro** que conecta a uma camada MCP para consultar contas, saldos e transações de um banco de teste. O cliente já está no chat: você pergunta "qual é o meu saldo?" e recebe a resposta em minutos, sem sair do app.

- **Pluggy** — explica conceitos do Open Finance Brasil (o que é um Item, etc.)
- **Plaid** — fornece dados reais de contas, saldos e transações (banco de teste/sandbox)
- **Chat** — a IA organiza tudo em linguagem simples, com tabelas e dicas

---

## 🏗️ Arquitetura
┌──────────────┐     MCP     ┌─────────────────────────┐
│   Lovable    │─────────────│  MCP Server (Pluggy)    │
│   (Chat UI)  │             │  /mcp (Streamable HTTP) │
└──────────────┘             └─────────────────────────┘
       ▲
       │  (frontend + dados)
       ▼
┌──────────────┐     MCP     ┌─────────────────────────┐
│   Lovable    │─────────────│  MCP Server (Plaid)     │
│   (Chat UI)  │             │  get_accounts,          │
└──────────────┘             │  get_balance,           │
                             │  get_transactions,      │
                             │  get_expense_patterns   │

- **Pluggy** — explica conceitos do Open Finance Brasil (o que é um Item, etc.)
- **Plaid** — fornece dados reais de contas, saldos e transações (banco de teste/sandbox)
- **Chat** — a IA organiza tudo em linguagem simples, com tabelas e dicas

---

## 🏁 Estado do projeto (entrega)

| Item | Status | Link |
|---|---|---|
| **2. Lovable** | ✅ Publicado | https://papo-do-meu-dinheiro.lovable.app |
| **3. Plaid** | ✅ Configurado | Client ID + Secret de Sandbox |
| **4. Publicação** | ✅ Repositório atualizado | https://github.com/jbozdiogo/AgenteFinanceiroComMCP |

---

## 🎯 O que o assistente responde

| Pergunta | Dados usados | Origem |
|---|---|---|
| "Qual é o meu saldo?" | Contas e saldos | Plaid (sandbox) |
| "Me mostra as transações do cartão" | Transações recentes | Plaid (sandbox) |
| "Qual é o meu gasto por categoria?" | Padrões de gasto | Plaid (sandbox) |
| "Qual é o saldo do cartão?" | Saldo do cartão (dívida) | Plaid (sandbox) |
| "Explique o que é um Item" | Definição + campos + fontes | Pluggy |

> **Nota importante:** os dados atuais são de banco de teste (sandbox). Não representam sua conta real.

---


## 🚀 Como rodar localmente

### Pré-requisitos
- Node.js 18+
- npm

### Passo a passo

1. Clone o repositório e entre na pasta:
   ```bash
   cd AgenteFinanceiroComMCP
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure o servidor MCP do Plaid:
   ```bash
   cp .env.example .env
   ```
   Edite `.env` com o seu Client ID e Secret de Sandbox do Plaid (Developers → Keys → Sandbox).

4. Inicie o servidor MCP do Plaid:
   ```bash
   cd mcp-servers/plaid
   npm install
   npm start
   ```

5. Abra o chat na URL do Lovable:
   ```
   https://papo-do-meu-dinheiro.lovable.app
   ```

---

## ⚙️ Como os MCP Servers são configurados

### Pluggy (Streamable HTTP, sem chave)

No **Codex** (ou outro agente com suporte MCP), adicione este servidor:

```json
{
  "mcpServers": {
    "pluggy": {
      "type": "streamableHttp",
      "url": "https://mcp.pluggy.ai/mcp",
      "description": "Integração brasileira: explica conceitos do Open Finance Brasil (Pluggy)"
    }
  }
}
```

- Endpoint: `https://mcp.pluggy.ai/mcp`
- Método: `GET` para conexão (SSE), `POST` para chamadas de ferramentas (JSON-RPC 2.0)
- Sem chave de autenticação no desafio

### Plaid (STDIO, via Node.js, com variáveis de ambiente)

O servidor `mcp-servers/plaid/plaid-server.js` usa o SDK oficial do Plaid e as variáveis de ambiente:

```json
{
  "mcpServers": {
    "plaid": {
      "type": "stdio",
      "command": "node",
      "args": ["C:/Users/SEU_USUARIO/Documents/GitHub/AgenteFinanceiroComMCP/mcp-servers/plaid/plaid-server.js"],
      "env": {
        "PLAID_CLIENT_ID": "SEU_CLIENT_ID_DE_SANDBOX",
        "PLAID_SECRET": "SEU_SECRET_DE_SANDBOX"
      }
    }
  }
}
```

- Ferramenta: `mcp-servers/plaid/plaid-server.js` (Node.js + npm `plaid`)
- Credenciais: `Client ID` e `Secret` no [Plaid Developers](https://plaid.com/dashboard/) → **Developers → Keys → Sandbox**
- Configuração de exemplo: `mcp-servers/plaid/config.json`
- No Plaid, **valor positivo = saída** (dinheiro que saiu da conta), e **valor negativo = entrada**.

---

## 📄 Especificação para o Lovable (OpenSpec)

O prompt enviado ao Lovable para gerar o chat:

> **Fundo:** o usuário quer um assistente financeiro que conecte a Pluggy (explicação) e a Plaid (dados reais) via MCP, em português, no chat.
>
> **Conecte a Pluggy:** no MCP do agente, adicione um servidor Streamable HTTP com URL `https://mcp.pluggy.ai/mcp`, sem chave. Peça que a IA explique o que é um Item, com as fontes.
>
> **Prepare a Plaid:** no Dashboard da Plaid, copie Client ID e Secret de Sandbox (Developers → Keys). Instale o Node.js ou o `uv` e adicione o servidor `plaid-server.js` do tipo STDIO, com o caminho do `node` no comando e as duas chaves como variáveis de ambiente.
>
> **Consulte o banco fictício/real:** leia contas, saldos e transações e peça tabelas com três padrões de gasto. Na Plaid, valor positivo é saída.
>
> **Construa o chat no Lovable:** mande no modo chat, para tirar dúvidas, e publique.
>
> **Restrição:** a Plaid é só um laboratório; não representa o Open Finance Brasil em produção (exige consentimento e segurança).
>
> **Cliente:** o app é um chat que responde sobre contas, saldos e transações, em português, com dados reais de sandbox e explicações simples. O usuário está no app: ele pergunta "qual é o meu saldo?" e recebe a resposta.

**App publicada:**
- URL do Lovable: https://papo-do-meu-dinheiro.lovable.app

---

## 📜 Licença

UNLICENSED — uso educacional/bootcamp.
