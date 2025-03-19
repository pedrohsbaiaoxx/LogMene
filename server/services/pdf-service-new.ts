import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { FreightRequestWithQuote } from '@shared/schema';
import { formatISODateToDisplay } from '../../client/src/lib/utils';
import fs from 'fs';
import path from 'path';

// Definição das fontes
const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

// Criar instância do PDFPrinter
const printer = new PdfPrinter(fonts);

/**
 * Gera um relatório de fretes para um cliente específico
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
  
  // Criar conteúdo do relatório
  const reportTitle = startDate && endDate
    ? `Relatório de Fretes - ${clientName} (${formatISODateToDisplay(startDate.toISOString())} a ${formatISODateToDisplay(endDate.toISOString())})`
    : `Relatório de Fretes - ${clientName}`;
  
  // Preparar os dados para a tabela
  const tableBody = [
    ['ID', 'Status', 'Origem', 'Destino', 'Data Envio', 'Data Entrega', 'Valor (R$)', 'Data Conclusão'],
    ...filteredRequests.map(request => [
      request.id.toString(),
      translateStatus(request.status),
      `${request.originCity}/${request.originState}`,
      `${request.destinationCity}/${request.destinationState}`,
      formatISODateToDisplay(request.pickupDate),
      formatISODateToDisplay(request.deliveryDate),
      (request.quote?.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      request.completedAt ? formatISODateToDisplay(request.completedAt instanceof Date 
        ? request.completedAt.toISOString() 
        : typeof request.completedAt === 'string'
          ? request.completedAt
          : new Date(request.completedAt).toISOString()
      ) : '-'
    ])
  ];
  
  const docDefinition: TDocumentDefinitions = {
    content: [
      { text: reportTitle, style: 'header' },
      { text: `Data de geração: ${formatISODateToDisplay(new Date().toISOString())}`, style: 'subheader' },
      { text: ' ', margin: [0, 10] },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', '*', '*', 'auto', 'auto', 'auto', 'auto'],
          body: tableBody
        }
      },
      { text: ' ', margin: [0, 10] },
      { text: 'Resumo', style: 'subheader' },
      {
        ul: [
          `Total de fretes: ${totalFreights}`,
          `Fretes concluídos: ${completedFreights}`,
          `Valor total: R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]
      }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5]
      }
    },
    defaultStyle: {
      font: 'Roboto'
    }
  };
  
  // Criar o documento PDF
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  
  // Buffer para armazenar o PDF
  const chunks: Buffer[] = [];
  
  return new Promise<Buffer>((resolve, reject) => {
    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
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