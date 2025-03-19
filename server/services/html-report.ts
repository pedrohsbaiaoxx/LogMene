import puppeteer from 'puppeteer';
import { FreightRequestWithQuote } from '@shared/schema';
import { formatISODateToDisplay } from '../../client/src/lib/utils';

/**
 * Gera um relatório de fretes em formato HTML e converte para PDF
 * @param clientName Nome do cliente para o título do relatório
 * @param requests Lista de solicitações de frete do cliente
 * @param startDate Data inicial do período (opcional)
 * @param endDate Data final do período (opcional)
 * @returns Buffer com o PDF gerado
 */
export async function generateClientFreightReport(
  clientName: string,
  requests: FreightRequestWithQuote[],
  startDate?: Date,
  endDate?: Date
): Promise<Buffer> {
  // Filtrar as solicitações pelo período, se fornecido
  let filteredRequests = [...requests];
  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    filteredRequests = requests.filter(request => {
      if (!request.createdAt) return false;
      const createdAt = new Date(request.createdAt);
      return createdAt >= start && createdAt <= end;
    });
  }
  
  // Calcular valores totais
  const totalFreights = filteredRequests.length;
  const totalValue = filteredRequests.reduce((sum, request) => {
    return sum + (request.quote?.value || 0);
  }, 0);
  const completedFreights = filteredRequests.filter(req => req.status === 'completed').length;
  
  // Criar conteúdo do relatório HTML
  const reportTitle = startDate && endDate
    ? `Relatório de Fretes - ${clientName} (${formatISODateToDisplay(startDate.toISOString())} a ${formatISODateToDisplay(endDate.toISOString())})`
    : `Relatório de Fretes - ${clientName}`;

  // Criar linhas da tabela
  const tableRows = filteredRequests.map(request => `
    <tr>
      <td>${request.id}</td>
      <td>${translateStatus(request.status)}</td>
      <td>${request.originCity}/${request.originState}</td>
      <td>${request.destinationCity}/${request.destinationState}</td>
      <td>${formatISODateToDisplay(request.pickupDate)}</td>
      <td>${formatISODateToDisplay(request.deliveryDate)}</td>
      <td>R$ ${(request.quote?.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      <td>${request.completedAt ? formatISODateToDisplay(
        request.completedAt instanceof Date 
          ? request.completedAt.toISOString() 
          : typeof request.completedAt === 'string'
            ? request.completedAt
            : new Date(request.completedAt).toISOString()
        ) : '-'}</td>
    </tr>
  `).join('');

  // Criar o HTML completo
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${reportTitle}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        h1 {
          color: #2563eb;
          font-size: 24px;
          margin-bottom: 10px;
        }
        h2 {
          color: #4b5563;
          font-size: 18px;
          margin-top: 20px;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .summary {
          margin-top: 20px;
          padding: 15px;
          background-color: #f3f4f6;
          border-radius: 5px;
        }
        .summary ul {
          list-style-type: none;
          padding-left: 0;
        }
        .summary li {
          margin-bottom: 5px;
        }
        .generation-date {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 20px;
        }
        .total-value {
          font-weight: bold;
          color: #2563eb;
        }
      </style>
    </head>
    <body>
      <h1>${reportTitle}</h1>
      <div class="generation-date">
        Data de geração: ${formatISODateToDisplay(new Date().toISOString())}
      </div>
      
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Origem</th>
            <th>Destino</th>
            <th>Data Envio</th>
            <th>Data Entrega</th>
            <th>Valor (R$)</th>
            <th>Data Conclusão</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <div class="summary">
        <h2>Resumo</h2>
        <ul>
          <li>Total de fretes: ${totalFreights}</li>
          <li>Fretes concluídos: ${completedFreights}</li>
          <li class="total-value">Valor total: R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</li>
        </ul>
      </div>
    </body>
    </html>
  `;

  // Gerar PDF usando Puppeteer
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(html);
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

/**
 * Traduz os status para português
 */
function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    'pending': 'Pendente',
    'quoted': 'Cotado',
    'accepted': 'Em andamento',
    'rejected': 'Rejeitado',
    'completed': 'Concluído'
  };
  
  return translations[status] || status;
}