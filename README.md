# 🤖 Assistente Financeiro com MCP

> **Desafio bootcamp** — Um assistente em português que responde sobre contas, saldos e transações usando o **Model Context Protocol (MCP)**, conectando a **Pluggy** (explicação de conceitos) e a **Plaid** (dados fictícios de sandbox).

---

## 📋 O que é este projeto

Uma aplicação de **chat financeiro** que conecta a uma camada MCP para consultar um banco de teste fictício. O fluxo segue o padrão do desafio:

1. **Pluggy MCP** — explica conceitos financeiros no contexto do Open Finance Brasil (ex: o que é um *Item*).
2. **Plaid MCP (sandbox)** — fornece dados fictícios de contas, saldos e transações.
3. **Chat** — a IA organiza tudo em linguagem simples, com tabelas e dicas.

O cliente já está no chat: você pergunta "qual é o meu saldo?" e recebe a resposta em minutos, sem sair do app.

---

## 🎯 O que o assistente responde

| Pergunta | Dados usados | Origem |
|---|---|---|
| "Qual é o meu saldo?" | Contas e saldos | Plaid (sandbox) |
| "Me mostra as transações do cartão" | Transações recentes | Plaid (sandbox) |
| "Qual é o meu gasto por categoria?" | Padrões de gasto | Plaid (sandbox) |
| "Qual é o saldo do cartão?" | Saldo do cartão (dívida) | Plaid (sandbox) |
| "Explique o que é um Item" | Definição + campos + fontes | Pluggy |

> **Nota importante:** os dados são **fictícios** (banco de teste / sandbox). Não representam sua conta real.

---

## 🏗️ Arquitetura

```
┌──────────────┐     MCP     ┌──────────────────────┐
│   Lovable    │─────────────│  MCP Server (Pluggy)  │
│   (Chat UI)  │             │  /mcp (Streamable)    │
└──────────────┘             └──────────┬───────────┘
                                         │
                                         ▼
┌──────────────┐     MCP     ┌──────────────────────┐
│   Lovable    │─────────────│  MCP Server (Plaid)   │
│   (Chat UI)  │             │  get_accounts,        │
└──────────────┘             │  get_balance,         │
                             │  get_transactions,    │
                             │  get_expense_patterns │
                             └──────────────────────┘
```

No desafio real, o cliente usa o **Lovable** (avaliador de aplicativos criados com IA) para gerar o chat a partir de uma especificação (OpenSpec). Este repositório contém:

- O código que o Lovable geraria (HTML/CSS/JS + um servidor Node.js mock)
- O simulador do MCP (Pluggy + Plaid)
- Documentação completa

---

## 🚀 Como executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) 18+
- npm (vite ou Node built-in)

### Passo a passo

1. Clone o repositório e entre na pasta:
   ```bash
   cd Dio
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor MCP mock:
   ```bash
   npm run mock:mcp
   ```
   Saída esperada:
   ```
   🔌 Mock MCP Server (Pluggy + Plaid)
   MCP: http://localhost:3000/mcp
   Chat: http://localhost:3000/
   ```

4. Abra o chat em seu navegador:
   ```
   http://localhost:3000/
   ```

5. Teste as perguntas:
   - "Qual é o meu saldo?"
   - "Me mostra as transações do cartão"
   - "Qual é o meu gasto por categoria?"
   - "Explique o que é um Item"

---

## ⚙️ Como os MCP Servers são configurados (no desafio real)

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

### Plaid (STDIO, via uvx, com variáveis de ambiente)

```json
{
  "mcpServers": {
    "plaid": {
      "type": "stdio",
      "command": "uvx",
      "args": ["mcp-server-plaid"],
      "env": {
        "PLAID_CLIENT_ID": "<Sua Client ID de Sandbox>",
        "PLAID_SECRET": "<Seu Secret de Sandbox>"
      }
    }
  }
}
```

- Ferramenta: `mcp-server-plaid` (integrada com o uv)
- Credenciais: `Client ID` e `Secret` no [Plaid Developers](https://plaid.com/dashboard/) → **Developers → Keys → Sandbox**
- No Plaid, **valor positivo = saída** (dinheiro que saiu da conta), e **valor negativo = entrada**.

---

## 📄 Especificação para o Lovable (OpenSpec)

O Expert entregou o seguinte prompt ao Lovable para gerar o chat:

> **Fundo:** o usuário quer um assistente financeiro que conecte a Pluggy (explicação) e a Plaid (dados) via MCP, em português, no chat.
>
> **Conecte a Pluggy:** no MCP do agente, adicione um servidor Streamable HTTP com URL `https://mcp.pluggy.ai/mcp`, sem chave. Peça que a IA explique o que é um Item, com as fontes.
>
> **Prepare a Plaid:** no Dashboard da Plaid, copie Client ID e Secret de Sandbox (Developers → Keys). Instale o uv e adicione o servidor `mcp-server-plaid` do tipo STDIO, com caminho do uvx no comando e as duas chaves como variáveis de ambiente.
>
> **Consulte o banco fictício:** crie um Item de teste, leia contas, saldos e transações e peça tabelas com três padrões de gasto. Na Plaid, valor positivo é saída.
>
> **Construa o chat no Lovable:** cole a especificação das páginas 25 a 28 do guia, com o seu nome e o seu cenário no lugar do que aparece desfocado. Mande primeiro no modo chat, para tirar dúvidas, e publique.
>
> **Restrições:** a Plaid é só um laboratório; não representa o Open Finance Brasil em produção (exige consentimento e segurança).
>
> **Cliente:** o app é um chat que responde sobre contas, saldos e transações, em português, com dados fictícios e explicações simples. O usuário está no app: ele pergunta "qual é o meu saldo?" e recebe a resposta.

---

## 🗺️ Roadmap de melhorias

Escolha uma das ideias do desafio para evoluir:

1. **Gastos por categoria, período ou conta** — já está no MVP; expanda com mais períodos.
2. **Valores em reais com conversão declarada** — converter USD para BRL.
3. **Transformar a configuração dos servidores numa skill de agente** — reutilizável.
4. **Webhooks + push/SMS/WhatsApp** — alertar sobre gastos acima do esperado.
5. **Etapa 2: backend com chaves só no servidor** — consistência de chaves, segurança.
6. **Produção real (Open Finance Brasil)** — consentimento do usuário, segurança, tokens.

---

## 📜 Licença

UNLICENSED — uso educacional/bootcamp.
