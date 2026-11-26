/**
 * pluggy-mcp-mock/server.js
 *
 * Simulador do MCP (Model Context Protocol) - Pluggy (Streamable HTTP)
 * Endpoint padrão: /mcp
 * Serviço: explica o que é um "Item" (conta/ativo) e retorna contas, saldos
 * e transações de um banco de teste (dados fictícios, sandbox).
 *
 * Como usar:
 *   npm install
 *   npm start
 *   # Acesse http://localhost:3000/mcp para testar
 *
 * Este simulador emula a resposta que a IA (Codex/Lovable) receberia do
 * servidor MCP real do Pluggy, permitindo testar o fluxo completo do
 * desafio sem precisar de chaves de API reais.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'plaid-fake-data.json');

// Carrega os dados fictícios do sandbox
let fakeData = { accounts: [], transactions: [], expense_patterns: {} };
try {
  fakeData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
} catch (err) {
  console.error('❌ Erro ao carregar dados:', err.message);
  process.exit(1);
}

// ------------------ Handlers de "ferramentas" (tools) ------------------
// No protocolo MCP, a IA chama "tools" para obter dados. Cada tool aqui
// simula uma consulta ao banco de dados fictício.

/** 1. Explica o que é um "Item" (conta/ativo) — origem: Pluggy */
function toolExplainItem() {
  const { pluggy_info } = fakeData;
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        tool: 'pluggy_explain_item',
        title: 'O que é um Item?',
        explanation: pluggy_info.what_is_item,
        fields: pluggy_info.item_fields,
        sources: pluggy_info.sources,
        note: 'Um "Item" no Open Finance Brasil é a representação de uma conta ou ativo financeiro vinculado a um cliente. No Pluggy, cada Item tem um item_id único e contém metadados da conta.',
        example_item: fakeData.accounts[0]
      })
    }]
  };
}

/** 2. Lista todas as contas (contas) */
function toolGetAccounts() {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        tool: 'get_accounts',
        message: 'Contas bancárias do cliente (banco de teste, dados fictícios)',
        accounts: fakeData.accounts
      })
    }]
  };
}

/** 3. Obtém o saldo (balance) de uma conta específica */
function toolGetBalance(args) {
  const accountId = args?.account_id;
  const account = fakeData.accounts.find(a => a.id === accountId);
  if (!account) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: `Conta não encontrada: ${accountId}`,
          available_accounts: fakeData.accounts.map(a => ({ id: a.id, name: a.name, mask: a.mask }))
        })
      }]
    };
  }

  // Inverso para contas de débito/crédito: saldo positivo pode indicar dívida
  // (cartão de crédito) — explicado no chat UI
  const isCredit = account.type === 'credit';
  const balanceLabel = isCredit ? 'dívidas (devedor)' : 'saldo (credor)';

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        tool: 'get_balance',
        account: {
          id: account.id,
          name: account.name,
          type: account.type,
          subtype: account.subtype,
          mask: account.mask,
          nickname: account.nickname,
          currency: account.currency,
          balance: account.balance,
          available_balance: account.available_balance,
          balance_label: balanceLabel
        },
        note: isCredit
          ? 'Cartão de crédito: saldo positivo indica valor DEVIDO ao banco (dívida). Em contas correntes/poupança, saldo positivo é o que você tem.'
          : 'Conta de depósito/poupança: saldo positivo é o valor que você possui.'
      })
    }]
  };
}

/** 4. Obtém transações de uma conta */
function toolGetTransactions(args) {
  const accountId = args?.account_id;
  const limit = args?.n || 10;
  const account = fakeData.accounts.find(a => a.id === accountId);
  if (!account) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: `Conta não encontrada: ${accountId}`,
          available_accounts: fakeData.accounts.map(a => a.id)
        })
      }]
    };
  }

  const tx = fakeData.transactions.filter(t => t.account_id === accountId).slice(0, limit);
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        tool: 'get_transactions',
        account_id: accountId,
        transactions: tx
      })
    }]
  };
}

/** 5. Mostra padrões de gasto (3 padrões principais) */
function toolGetExpensePatterns() {
  const patterns = fakeData.expense_patterns;
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        tool: 'get_expense_patterns',
        title: patterns.title,
        description: patterns.description,
        summary: patterns.summary,
        table_3_patterns: patterns.table_3_patterns
      })
    }]
  };
}

// ---------------- Mapeamento de tools ----------------
const TOOLS = {
  'pluggy_explain_item': toolExplainItem,
  'get_accounts': toolGetAccounts,
  'get_balance': toolGetBalance,
  'get_transactions': toolGetTransactions,
  'get_expense_patterns': toolGetExpensePatterns
};

// ------------------ Servidor HTTP ------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname, searchParams } = url;

  // 1. Página principal (index.html do chat) — DEVE vir antes do health check
  if ((pathname === '/' || pathname === '/index.html') && req.method === 'GET') {
    const indexPath = path.join(__dirname, '..', '..', 'src', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // 2. Health check
  if (pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'pluggy-mcp-mock',
      version: '1.0.0',
      endpoint: '/mcp',
      help: 'Use POST em /mcp com método MCP (JSON-RPC 2.0) para chamar tools.'
    }));
    return;
  }

  // 3. Endpoint MCP (Streamable HTTP)
  if (pathname === '/mcp') {
    if (req.method === 'GET') {
      // SSE stream (Streamable HTTP)
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      res.write('event: connected\ndata: {"jsonrpc":"2.0","method":"notifications/initialized","params":{}}\n\n');
      res.write(':keepalive\n\n');
      setInterval(() => {
        res.write(':keepalive\n\n');
      }, 15000).unref();
      return;
    }

    if (req.method === 'POST') {
      // Chamada a uma tool (JSON-RPC 2.0)
      let body = '';
      for await (const chunk of req) body += chunk;

      try {
        const rpc = JSON.parse(body);
        if (rpc.method === 'tools/call') {
          const tool = TOOLS[rpc.params?.name];
          if (!tool) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              id: rpc.id,
              result: {
                content: [{ type: 'text', text: `Ferramenta "${rpc.params?.name}" não encontrada.` }],
                isError: true
              }
            }));
            return;
          }
          const result = await tool(rpc.params?.arguments);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: rpc.id,
            result
          }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: rpc.id,
            result: { content: [{ type: 'text', text: 'Método MCP não suportado nesta simulação.' }] }
          }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { message: err.message } }));
      }
      return;
    }

    res.writeHead(405);
    res.end();
    return;
  }

  // 3. Página principal (index.html do chat)
  if ((pathname === '/' || pathname === '/index.html') && req.method === 'GET') {
    const indexPath = path.join(__dirname, '..', '..', 'src', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // 4. Arquivos estáticos (CSS, JS)
  // path.join trata pathname começando com "/" como absoluto, então removemos o "/"
  // O dirname do server.js está em mcp-servers/pluggy-mock/, então dois ".."
  // levam a Dio/, e o caminho /src/... já inclui a pasta src.
  const cleanPathname = pathname.replace(/^\/+/, '');
  const srcPath = path.join(__dirname, '..', '..', cleanPathname);

  if (req.method === 'GET' && fs.existsSync(srcPath)) {
    const ext = path.extname(srcPath).toLowerCase();
    const mime = { '.css': 'text/css', '.js': 'application/javascript' }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(fs.readFileSync(srcPath));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// Inicia o servidor
server.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   🔌 Mock MCP Server (Pluggy + Plaid)      ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  URL: http://localhost:${PORT}/              ║`);
  console.log(`║  MCP: http://localhost:${PORT}/mcp           ║`);
  console.log(`║  Chat: http://localhost:${PORT}/             ║`);
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  Métodos disponíveis (tools):                ║');
  console.log('║   • pluggy_explain_item   — O que é um Item ║');
  console.log('║   • get_accounts          — Lista contas    ║');
  console.log('║   • get_balance           — Saldo da conta  ║');
  console.log('║   • get_transactions      — Transações      ║');
  console.log('║   • get_expense_patterns  — Padrões de gasto║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('💡 Dados são FICTÍCIOS (sandbox). Não são reais.');
});
