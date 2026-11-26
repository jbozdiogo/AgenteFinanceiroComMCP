/**
 * app.js — Lógica do Assistente Financeiro
 *
 * Fluxo:
 *   1. O usuário clinque em uma pergunta ou digite uma.
 *   2. O app envia a pergunta para o servidor MCP mock (localhost:3000).
 *   3. O servidor retorna dados estruturados (contas, saldos, transações, gastos).
 *   4. O chat exibe a resposta formatada (tabelas, cards, explicações).
 *   5. A cada resposta, o app mostra qual a "ferramenta" (tool) que foi usada.
 */

(function () {
  'use strict';

  const MCP_URL = 'http://localhost:3000/mcp';
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatContainer = document.getElementById('chatContainer');
  const connectionStatus = document.getElementById('connectionStatus');
  const suggestions = document.querySelectorAll('.suggestion');

  // ---------- Estado ----------
  let isConnected = false;
  let connecting = false;

  // ---------- Utils ----------
  function formatCurrency(value) {
    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function addMessage(text, type, options) {
    const isBot = type === 'bot';
    const msg = document.createElement('div');
    msg.classList.add('message', `message--${isBot ? 'bot' : 'user'}`);

    const avatar = document.createElement('div');
    avatar.className = 'message__avatar';
    avatar.textContent = isBot ? '🤖' : '👤';
    msg.appendChild(avatar);

    const content = document.createElement('div');
    content.className = 'message__content';

    if (isBot) {
      // Tag de tipo
      const tag = document.createElement('span');
      tag.className = `tag tag--${options?.tagType || 'info'}`;
      tag.textContent = options?.tagLabel || 'Assistente';
      content.appendChild(tag);

      // Cabeçalho do card (se houver)
      if (options?.header) {
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card__header';
        cardHeader.innerHTML = `<span class="card-title">${escapeHtml(options.header)}</span>`;
        content.appendChild(cardHeader);
      }

      // Corpo
      if (typeof text === 'string') {
        content.innerHTML += `<p>${escapeHtml(text)}</p>`;
      }
    } else {
      // Usuário
      content.innerHTML += `<p>${escapeHtml(text)}</p>`;
    }

    msg.appendChild(content);
    chatContainer.appendChild(msg);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return msg;
  }

  function addTable(rows, columns, options) {
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach(row => {
      const tr = document.createElement('tr');
      columns.forEach(col => {
        const td = document.createElement('td');
        td.textContent = row[col] ?? '';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
  }

  function addCard(title, bodyHtml, options) {
    const card = document.createElement('div');
    card.className = 'card';

    if (title) {
      const header = document.createElement('div');
      header.className = 'card__header';
      header.innerHTML = `<span class="card-title">${escapeHtml(title)}</span>`;
      card.appendChild(header);
    }

    if (bodyHtml) {
      const body = document.createElement('div');
      body.className = 'card__body';
      body.innerHTML = bodyHtml;
      card.appendChild(body);
    }

    return card;
  }

  // ---------- Conexão com o MCP ----------
  function updateConnection(connectingNow) {
    connecting = connectingNow;
    if (connectingNow) {
      connectionStatus.innerHTML = `
        <span class="dot connecting"></span>
        <span class="status-text">Conectando ao MCP server…</span>
      `;
    } else if (isConnected) {
      connectionStatus.innerHTML = `
        <span class="dot connected"></span>
        <span class="status-text">Pronto — servidor MCP ativo</span>
      `;
    } else {
      connectionStatus.innerHTML = `
        <span class="dot"></span>
        <span class="status-text">Não conectado — o servidor MCP não está rodando</span>
      `;
    }
  }

  async function callMcpTool(toolName, args) {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args || {}
      }
    };

    const response = await fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'Erro no MCP server');
    }
    return result.result;
  }

  // ---------- Renderização de respostas ----------
  function renderMcpResponse(data) {
    const text = data.content ? data.content[0]?.text : '';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      addMessage(text, 'bot', { tagType: 'info', tagLabel: 'Resposta bruta' });
      return;
    }

    if (!parsed.success) {
      addMessage(parsed.error || 'Erro desconhecido.', 'bot', {
        tagType: 'danger',
        tagLabel: 'Erro'
      });
      return;
    }

    const tool = parsed.tool;

    switch (tool) {
      case 'pluggy_explain_item':
        showItemExplanation(parsed);
        break;

      case 'get_accounts':
        showAccounts(parsed);
        break;

      case 'get_balance':
        showBalance(parsed);
        break;

      case 'get_transactions':
        showTransactions(parsed);
        break;

      case 'get_expense_patterns':
        showExpensePatterns(parsed);
        break;

      default:
        addMessage(`Ferramenta inválida: ${tool}`, 'bot', {
          tagType: 'warning',
          tagLabel: 'Aviso'
        });
        break;
    }
  }

  // --- Pluggy: explain item ---
  function showItemExplanation(parsed) {
    const { explanation, fields, sources, note, example_item } = parsed;

    // Card explicativo
    const bodyHtml = `
      <p>${explanation}</p>
      <p class="muted">Cada Item representa uma conta ou ativo financeiro vinculado a um cliente.</p>
    `;

    // Tabela dos campos
    const tableRows = fields.map(f => ({
      Campo: f.split(':')[0]?.trim() || '',
      Descrição: f.split(':')[1]?.trim() || f
    }));
    const table = addTable(tableRows, ['Campo', 'Descrição'], { header: 'Campos do Item (no Pluggy)' });

    const example = example_item ?
      addCard('Exemplo de Item', `
        <p><strong>Nome:</strong> ${example_item.name}</p>
        <p><strong>Tipo:</strong> ${example_item.type}</p>
        <p><strong>Mask:</strong> ${example_item.mask}</p>
        <p><strong>Saldo:</strong> ${formatCurrency(example_item.balance)}</p>
      `) : null;

    addMessage('', 'bot', { header: 'O que é um Item? (fonte: Pluggy)', tagType: 'info', tagLabel: 'Pluggy' });
    chatContainer.appendChild(addCard(null, bodyHtml));
    chatContainer.appendChild(table);
    if (example) chatContainer.appendChild(example);

    // Fontes
    if (sources?.length) {
      const sourcesList = document.createElement('ul');
      sources.forEach(s => {
        const li = document.createElement('li');
        li.textContent = s;
        sourcesList.appendChild(li);
      });
      const srcDiv = document.createElement('div');
      srcDiv.className = 'card';
      srcDiv.appendChild(sourcesList);
      chatContainer.appendChild(srcDiv);
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // --- Accounts ---
  function showAccounts(parsed) {
    const accounts = parsed.accounts;
    const rows = accounts.map(a => ({
      Conta: a.name,
      Tipo: a.type,
      Mask: a.mask,
      Saldo: formatCurrency(a.balance),
      Nickname: a.nickname || ''
    }));

    addMessage('', 'bot', { header: 'Contas Bancárias', tagType: 'success', tagLabel: 'Plaid' });
    chatContainer.appendChild(addTable(rows, ['Conta', 'Tipo', 'Mask', 'Saldo', 'Nickname']));
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // --- Balance ---
  function showBalance(parsed) {
    const acc = parsed.account;
    const isCredit = acc.type === 'credit';

    let bodyHtml = `
      <p><strong>Conta:</strong> ${acc.name} <span class="muted">(mask: ${acc.mask})</span></p>
      <p><strong>Tipo:</strong> ${acc.type}</p>
      <p><strong>Não disponível:</strong> ${formatCurrency(acc.balance)}</p>
      <p><strong>Saldo disponível:</strong> ${formatCurrency(acc.available_balance)}</p>
    `;

    if (isCredit) {
      bodyHtml += `
        <div style="background:#fef3c7;border:1px solid var(--warning);border-radius:var(--radius-sm);padding:10px 12px;margin-top:8px;">
          <p style="margin:0;font-size:0.88rem;">⚠️ <strong>Este é um cartão de crédito.</strong> O saldo positivo indica valor <strong>DEVIDO</strong> ao banco (dívida). Em contas debitadas (corrente/poupança), saldo positivo é o que você possui.</p>
        </div>
      `;
    } else {
      bodyHtml += `
        <p class="muted">Conta de depósito/poupança: saldo positivo é o valor que você possui.</p>
      `;
    }

    const card = addCard('Saldo da Conta', bodyHtml);
    addMessage('', 'bot', { header: 'Seu Saldo', tagType: 'success', tagLabel: 'Plaid' });
    chatContainer.appendChild(card);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // --- Transactions ---
  function showTransactions(parsed) {
    const txs = parsed.transactions;
    if (!txs || txs.length === 0) {
      addMessage('Nenhuma transação encontrada para esta conta.', 'bot', { tagType: 'warning', tagLabel: 'Sem dados' });
      return;
    }

    const rows = txs.map(t => ({
      Data: new Date(t.date).toLocaleDateString('pt-BR'),
      Descrição: t.name,
      Categoria: (t.category || []).join(', ') || '-',
      Valor: formatCurrency(t.amount)
    }));

    addMessage('', 'bot', { header: 'Transações Recentes', tagType: 'success', tagLabel: 'Plaid' });
    chatContainer.appendChild(addTable(rows, ['Data', 'Descrição', 'Categoria', 'Valor']));
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // --- Expense patterns ---
  function showExpensePatterns(parsed) {
    const { title, description, summary, table_3_patterns } = parsed;

    // Resumo
    const summaryHtml = `
      <p><strong>Total gasto:</strong> ${formatCurrency(summary.total_spent)}</p>
      <p><strong>Média diária:</strong> ${formatCurrency(summary.avg_daily)}</p>
      <p class="muted">Período: janeiro/2024 (dados fictícios)</p>
    `;
    chatContainer.appendChild(addCard('Resumo dos Gastos', summaryHtml));

    // 3 padrões principais
    addMessage('', 'bot', { header: 'Padrões de Gasto', tagType: 'info', tagLabel: 'Análise' });
    const tableRows = table_3_patterns.map(p => ({
      'Padrão': p.pattern,
      'Faixa mensal': p.monthly_range,
      'Média mensal': formatCurrency(p.monthly_avg),
      '% do gasto': `${p.percentage}%`,
      'Dica': p.advice
    }));
    chatContainer.appendChild(addTable(tableRows, ['Padrão', 'Faixa mensal', 'Média mensal', '% do gasto', 'Dica']));

    // Dicas detalhadas
    const tipsContainer = document.createElement('div');
    tipsContainer.style.marginTop = '12px';
    table_3_patterns.forEach(p => {
      const tip = document.createElement('div');
      tip.className = 'card';
      tip.innerHTML = `
        <div class="card__header"><span class="card-title">${escapeHtml(p.pattern)}</span></div>
        <div class="card__body">
          <p><strong>Faixa:</strong> ${p.monthly_range} | <strong>Média:</strong> ${formatCurrency(p.monthly_avg)} | <strong>%:</strong> ${p.percentage}%</p>
          <p class="muted">${p.advice}</p>
        </div>
      `;
      tipsContainer.appendChild(tip);
    });
    chatContainer.appendChild(tipsContainer);

    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // ---------- Enviar mensagem ----------
  async function sendMessage(question) {
    const text = question.trim();
    if (!text) return;

    // Limpa sugestões
    suggestions.forEach(s => s.style.display = 'none');

    // Mensagem do usuário
    addMessage(text, 'user');
    chatInput.value = '';

    // Indica conexão
    if (!isConnected) {
      updateConnection(true);
      setTimeout(() => {
        isConnected = true;
        updateConnection(false);
      }, 800);
    }

    // Marca como "enviando"
    const botMsg = addMessage('', 'bot', { tagType: 'info', tagLabel: 'Assistente' });
    const status = document.createElement('div');
    status.style.cssText = 'font-size:0.8rem;color:var(--text-muted);margin-top:6px;';
    status.textContent = 'Consultando o servidor MCP…';
    botMsg.appendChild(status);

    try {
      const result = await callMcpTool('get_accounts');
      renderMcpResponse(result);
    } catch (err) {
      const errorText = `❌ Erro ao conectar ao servidor MCP: ${err.message}\n\n` +
        `Verifique se o servidor está rodando:\n` +
        `  npm run mock:mcp\n\n` +
        `Então recarregue a página e tente novamente.`;
      addMessage(errorText, 'bot', {
        tagType: 'danger',
        tagLabel: 'Erro'
      });
    }
  }

  // ---------- Event listeners ----------
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage(chatInput.value);
  });

  suggestions.forEach(s => {
    s.addEventListener('click', () => {
      const q = s.dataset.question;
      sendMessage(q);
    });
  });

  // Enter para enviar
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput.value);
    }
  });

  // ---------- Inicialização ----------
  // Tenta conectar imediatamente
  updateConnection(true);
  setTimeout(() => {
    isConnected = true;
    updateConnection(false);
  }, 1200);

})();
