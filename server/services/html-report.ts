import PDFDocument from 'pdfkit';
import { FreightRequestWithQuote } from '@shared/schema';
import { formatISODateToDisplay } from '../../client/src/lib/utils';

/**
 * Gera um relatório de fretes em formato PDF
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
  return new Promise((resolve, reject) => {
    try {
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
      
      // Criar título do relatório
      const reportTitle = startDate && endDate
        ? `Relatório de Fretes - ${clientName} (${formatISODateToDisplay(startDate.toISOString())} a ${formatISODateToDisplay(endDate.toISOString())})`
        : `Relatório de Fretes - ${clientName}`;

      // Criar documento PDF
      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        size: 'A4',
      });
      
      // Coletar chunks para criar buffer
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Configurações de estilo
      const titleFont = 'Helvetica-Bold';
      const regularFont = 'Helvetica';
      const blueColor = '#2563eb';
      const grayColor = '#4b5563';
      const lightGrayColor = '#6b7280';
      
      // Adicionar título
      doc.font(titleFont).fontSize(18).fillColor(blueColor);
      doc.text(reportTitle, { align: 'center' });
      doc.moveDown();
      
      // Data de geração
      doc.font(regularFont).fontSize(10).fillColor(lightGrayColor);
      doc.text(`Data de geração: ${formatISODateToDisplay(new Date().toISOString())}`, { align: 'left' });
      doc.moveDown(2);
      
      // Se não houver solicitações
      if (filteredRequests.length === 0) {
        doc.font(regularFont).fontSize(12).fillColor(grayColor);
        doc.text('Nenhuma solicitação de frete encontrada para o período especificado.', { align: 'center' });
        doc.end();
        return;
      }
      
      // Desenhar tabela - Cabeçalho
      doc.font(titleFont).fontSize(10).fillColor('#000000');
      
      const tableTop = doc.y;
      const tableHeaders = ['ID', 'Status', 'Origem', 'Destino', 'Data Envio', 'Data Entrega', 'Valor (R$)', 'Conclusão'];
      const colWidths = [30, 60, 70, 70, 65, 65, 70, 65];
      const tableWidth = doc.page.width - 100; // Margens esquerda e direita somadas
      
      // Desenhar fundo do cabeçalho
      doc.fillColor('#f3f4f6').rect(50, tableTop, tableWidth, 20).fill();
      
      // Desenhar textos do cabeçalho
      doc.fillColor('#000000');
      let xPos = 50;
      tableHeaders.forEach((header, i) => {
        doc.text(header, xPos + 3, tableTop + 5, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });
      
      doc.moveTo(50, tableTop).lineTo(50 + tableWidth, tableTop).stroke();
      doc.moveTo(50, tableTop + 20).lineTo(50 + tableWidth, tableTop + 20).stroke();
      
      // Linhas verticais do cabeçalho
      xPos = 50;
      for (let i = 0; i <= colWidths.length; i++) {
        doc.moveTo(xPos, tableTop).lineTo(xPos, tableTop + 20).stroke();
        if (i < colWidths.length) xPos += colWidths[i];
      }
      
      // Dados das linhas
      let rowTop = tableTop + 20;
      let altRow = false;
      
      doc.font(regularFont).fontSize(9);
      
      filteredRequests.forEach((request, index) => {
        const rowHeight = 25;
        
        // Fundo alternado para linhas
        if (altRow) {
          doc.fillColor('#f9fafb').rect(50, rowTop, tableWidth, rowHeight).fill();
        }
        altRow = !altRow;
        
        // Valores das células
        const completionDate = request.completedAt 
          ? formatISODateToDisplay(
              request.completedAt instanceof Date 
                ? request.completedAt.toISOString() 
                : typeof request.completedAt === 'string'
                  ? request.completedAt
                  : new Date(request.completedAt).toISOString()
            ) 
          : '-';
            
        const rowValues = [
          request.id.toString(),
          translateStatus(request.status),
          `${request.originCity}/${request.originState}`,
          `${request.destinationCity}/${request.destinationState}`,
          formatISODateToDisplay(request.pickupDate),
          formatISODateToDisplay(request.deliveryDate),
          `R$ ${(request.quote?.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          completionDate
        ];
        
        // Escrever valores
        xPos = 50;
        doc.fillColor('#000000');
        rowValues.forEach((value, i) => {
          doc.text(value, xPos + 3, rowTop + 7, { width: colWidths[i], align: 'left' });
          xPos += colWidths[i];
        });
        
        // Linhas horizontais para cada linha
        doc.moveTo(50, rowTop + rowHeight).lineTo(50 + tableWidth, rowTop + rowHeight).stroke();
        
        // Linhas verticais para cada célula
        xPos = 50;
        for (let i = 0; i <= colWidths.length; i++) {
          doc.moveTo(xPos, rowTop).lineTo(xPos, rowTop + rowHeight).stroke();
          if (i < colWidths.length) xPos += colWidths[i];
        }
        
        rowTop += rowHeight;
        
        // Verificar se precisamos adicionar uma nova página
        if (rowTop > doc.page.height - 100 && index < filteredRequests.length - 1) {
          doc.addPage();
          rowTop = 50;
          
          // Adicionar cabeçalho na nova página
          doc.font(titleFont).fontSize(10);
          tableTop = rowTop;
          
          // Fundo do cabeçalho
          doc.fillColor('#f3f4f6').rect(50, tableTop, tableWidth, 20).fill();
          
          // Textos do cabeçalho
          doc.fillColor('#000000');
          xPos = 50;
          tableHeaders.forEach((header, i) => {
            doc.text(header, xPos + 3, tableTop + 5, { width: colWidths[i], align: 'left' });
            xPos += colWidths[i];
          });
          
          // Linhas do cabeçalho
          doc.moveTo(50, tableTop).lineTo(50 + tableWidth, tableTop).stroke();
          doc.moveTo(50, tableTop + 20).lineTo(50 + tableWidth, tableTop + 20).stroke();
          
          // Linhas verticais do cabeçalho
          xPos = 50;
          for (let i = 0; i <= colWidths.length; i++) {
            doc.moveTo(xPos, tableTop).lineTo(xPos, tableTop + 20).stroke();
            if (i < colWidths.length) xPos += colWidths[i];
          }
          
          rowTop = tableTop + 20;
          doc.font(regularFont).fontSize(9);
        }
      });
      
      // Adicionar seção de resumo
      doc.moveDown(2);
      doc.font(titleFont).fontSize(14).fillColor(grayColor);
      doc.text('Resumo', 50);
      doc.moveDown();
      
      doc.font(regularFont).fontSize(11).fillColor('#000000');
      doc.text(`Total de fretes: ${totalFreights}`, 50);
      doc.text(`Fretes concluídos: ${completedFreights}`, 50);
      doc.moveDown(0.5);
      doc.font(titleFont).fontSize(11).fillColor(blueColor);
      doc.text(`Valor total: R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 50);
      
      // Finalizar o documento
      doc.end();
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      reject(error);
    }
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