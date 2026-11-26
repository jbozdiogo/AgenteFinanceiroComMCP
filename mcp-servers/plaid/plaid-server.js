require('dotenv').config();

const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

// Credenciais do Sandbox do Plaid
// Em produção, estas variáveis vêm de um arquivo .env ou do sistema operacional
const clientId = process.env.PLAID_CLIENT_ID || '6b0889bffab2a5000eccef38';
const secret = process.env.PLAID_SECRET || '59a6daab0493448debccae80515378';

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': clientId,
      'PLAID-SECRET': secret,
      'Plaid-Version': '2020-09-14'
    }
  }
});

const plaidClient = new PlaidApi(configuration);

/**
 * Plaid MCP Server — fornece contas, saldos e transações para o chat financeiro.
 * Usa o banco de dados de teste do Plaid (sandbox).
 */
async function main() {
  // TODO: Implementar a lógica de transformação dos dados do Plaid em formato MCP
  // e expor como ferramentas (tools) para o chat.
  console.log('🔌 Servidor Plaid MCP inicializando...');
  console.log(`   Client ID: ${clientId.slice(0, 8)}...`);
  console.log(`   Ambiente: sandbox`);
  console.log(`   Porta: ${process.env.PORT || 3001}`);
}

main().catch(err => {
  console.error('❌ Erro ao iniciar:', err.message);
  process.exit(1);
});
