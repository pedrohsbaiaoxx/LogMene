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
      const totalDistance = filteredRequests.reduce((sum, request) => {
        return sum + (request.quote?.distanceKm || 0);
      }, 0);
      const completedFreights = filteredRequests.filter(req => req.status === 'completed').length;
      const pendingFreights = filteredRequests.filter(req => req.status === 'pending').length;
      const quotedFreights = filteredRequests.filter(req => req.status === 'quoted').length;
      const inProgressFreights = filteredRequests.filter(req => req.status === 'accepted').length;
      const rejectedFreights = filteredRequests.filter(req => req.status === 'rejected').length;
      
      // Criar título do relatório
      const reportTitle = startDate && endDate
        ? `Relatório de Fretes - ${clientName} (${formatISODateToDisplay(startDate.toISOString())} a ${formatISODateToDisplay(endDate.toISOString())})`
        : `Relatório de Fretes - ${clientName}`;

      // Criar documento PDF
      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        size: 'A4',
        info: {
          Title: reportTitle,
          Author: 'LogMene - Sistema de Logística Inteligente',
          Subject: 'Relatório de Fretes',
          Keywords: 'logística, frete, relatório, cliente'
        }
      });
      
      // Coletar chunks para criar buffer
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Configurações de estilo
      const titleFont = 'Helvetica-Bold';
      const regularFont = 'Helvetica';
      const primaryColor = '#2563eb';
      const secondaryColor = '#0d9488';
      const grayColor = '#4b5563';
      const lightGrayColor = '#6b7280';
      const strokeColor = '#e5e7eb';
      const accentColor = '#0369a1';
      
      // ===== Cabeçalho =====
      addHeader(doc, reportTitle);
      
      // Data de geração e período do relatório
      doc.font(regularFont).fontSize(10).fillColor(grayColor);
      doc.text(`Data de geração: ${formatISODateToDisplay(new Date().toISOString())}`, { align: 'left' });
      
      if (startDate && endDate) {
        doc.text(`Período: ${formatISODateToDisplay(startDate.toISOString())} a ${formatISODateToDisplay(endDate.toISOString())}`, { align: 'left' });
      }
      
      doc.moveDown(0.5);
      
      // Linha separadora
      doc.strokeColor(strokeColor).lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .stroke();
      
      doc.moveDown(1);
      
      // Resumo superior - com quadros de indicadores
      addSummaryBoxes(doc, 
        totalFreights, 
        completedFreights, 
        inProgressFreights,
        totalValue,
        totalDistance
      );
      
      doc.moveDown(1);
      
      // Se não houver solicitações
      if (filteredRequests.length === 0) {
        doc.font(regularFont).fontSize(12).fillColor(grayColor);
        doc.text('Nenhuma solicitação de frete encontrada para o período especificado.', { align: 'center' });
        
        // Adicionar rodapé
        addFooter(doc);
        
        doc.end();
        return;
      }
      
      // Seção de lista de fretes
      doc.font(titleFont).fontSize(14).fillColor(primaryColor);
      doc.text('Lista de Fretes', { align: 'left' });
      doc.moveDown(0.5);
      
      // Desenhar tabela - Cabeçalho
      doc.font(titleFont).fontSize(9).fillColor('#000000');
      
      const tableTop = doc.y;
      const tableHeaders = ['ID', 'Status', 'Origem', 'Destino', 'Data Envio', 'Data Entrega', 'Dist. (km)', 'Valor (R$)', 'Conclusão'];
      const colWidths = [25, 55, 60, 60, 55, 55, 55, 55, 75]; // Ajustado para acomodar melhor a distância e conclusão
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
      
      doc.font(regularFont).fontSize(8);
      
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
        
        // Formatar a distância e garantir que seja exibida com 1 casa decimal quando disponível
        const distanceFormatted = request.quote?.distanceKm 
          ? `${request.quote.distanceKm.toLocaleString('pt-BR', { 
              minimumFractionDigits: 1,
              maximumFractionDigits: 1
            })}`
          : '-';
            
        const rowValues = [
          request.id.toString(),
          translateStatus(request.status),
          `${request.originCity}/${request.originState}`,
          `${request.destinationCity}/${request.destinationState}`,
          formatISODateToDisplay(request.pickupDate),
          formatISODateToDisplay(request.deliveryDate),
          distanceFormatted,
          `R$ ${(request.quote?.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          completionDate
        ];
        
        // Escrever valores
        xPos = 50;
        doc.fillColor('#000000');
        rowValues.forEach((value, i) => {
          // Destacar o status com cor
          if (i === 1) { // coluna de status
            if (request.status === 'completed') {
              doc.fillColor('#059669'); // verde para concluído
            } else if (request.status === 'accepted') {
              doc.fillColor('#0284c7'); // azul para em andamento
            } else if (request.status === 'quoted') {
              doc.fillColor('#9333ea'); // roxo para cotado
            } else if (request.status === 'rejected') {
              doc.fillColor('#dc2626'); // vermelho para rejeitado
            } else {
              doc.fillColor('#f59e0b'); // amarelo para pendente
            }
          } else {
            doc.fillColor('#000000');
          }
          
          doc.text(value, xPos + 3, rowTop + 8, { width: colWidths[i], align: 'left' });
          xPos += colWidths[i];
        });
        
        // Linhas horizontais para cada linha
        doc.strokeColor(strokeColor).lineWidth(0.5)
          .moveTo(50, rowTop + rowHeight)
          .lineTo(50 + tableWidth, rowTop + rowHeight)
          .stroke();
        
        // Linhas verticais para cada célula
        xPos = 50;
        for (let i = 0; i <= colWidths.length; i++) {
          doc.moveTo(xPos, rowTop).lineTo(xPos, rowTop + rowHeight).stroke();
          if (i < colWidths.length) xPos += colWidths[i];
        }
        
        rowTop += rowHeight;
        
        // Verificar se precisamos adicionar uma nova página
        if (rowTop > doc.page.height - 150 && index < filteredRequests.length - 1) {
          // Adicionar rodapé antes de mudar de página
          addPageFooter(doc);
          
          doc.addPage();
          
          // Adicionar cabeçalho na nova página
          addPageHeader(doc, reportTitle);
          
          rowTop = 100; // Deixar espaço para o cabeçalho
          
          // Adicionar cabeçalho da tabela na nova página
          doc.font(titleFont).fontSize(9);
          const newTableTop = rowTop;
          
          // Fundo do cabeçalho
          doc.fillColor('#f3f4f6').rect(50, newTableTop, tableWidth, 20).fill();
          
          // Textos do cabeçalho
          doc.fillColor('#000000');
          xPos = 50;
          tableHeaders.forEach((header, i) => {
            doc.text(header, xPos + 3, newTableTop + 5, { width: colWidths[i], align: 'left' });
            xPos += colWidths[i];
          });
          
          // Linhas do cabeçalho
          doc.strokeColor(strokeColor).lineWidth(0.5)
            .moveTo(50, newTableTop)
            .lineTo(50 + tableWidth, newTableTop)
            .stroke()
            .moveTo(50, newTableTop + 20)
            .lineTo(50 + tableWidth, newTableTop + 20)
            .stroke();
          
          // Linhas verticais do cabeçalho
          xPos = 50;
          for (let i = 0; i <= colWidths.length; i++) {
            doc.moveTo(xPos, newTableTop).lineTo(xPos, newTableTop + 20).stroke();
            if (i < colWidths.length) xPos += colWidths[i];
          }
          
          rowTop = newTableTop + 20;
          doc.font(regularFont).fontSize(8);
        }
      });
      
      // Adicionar seção de resumo detalhado
      doc.moveDown(2);
      doc.font(titleFont).fontSize(14).fillColor(primaryColor);
      doc.text('Resumo Detalhado', 50);
      doc.moveDown(0.5);
      
      // Adicionar gráfico de barras simples para status dos fretes
      const statusBarWidth = 350;
      const statusBarHeight = 20;
      const statusBarX = 50;
      const statusBarY = doc.y;
      
      doc.font(regularFont).fontSize(10).fillColor(grayColor);
      doc.text('Distribuição por Status:', statusBarX, statusBarY);
      doc.moveDown(0.5);
      
      // Calcular valores percentuais para o gráfico
      const pendingPercent = (pendingFreights / totalFreights) * 100;
      const quotedPercent = (quotedFreights / totalFreights) * 100;
      const inProgressPercent = (inProgressFreights / totalFreights) * 100;
      const completedPercent = (completedFreights / totalFreights) * 100;
      const rejectedPercent = (rejectedFreights / totalFreights) * 100;
      
      // Desenhar barras para cada status
      // Barra completa (fundo)
      doc.rect(statusBarX, doc.y, statusBarWidth, statusBarHeight).stroke();
      
      let currentX = statusBarX;
      
      // Barra para pendentes
      if (pendingFreights > 0) {
        const width = (pendingPercent / 100) * statusBarWidth;
        doc.fillColor('#f59e0b').rect(currentX, doc.y, width, statusBarHeight).fill();
        currentX += width;
      }
      
      // Barra para cotados
      if (quotedFreights > 0) {
        const width = (quotedPercent / 100) * statusBarWidth;
        doc.fillColor('#9333ea').rect(currentX, doc.y, width, statusBarHeight).fill();
        currentX += width;
      }
      
      // Barra para em andamento
      if (inProgressFreights > 0) {
        const width = (inProgressPercent / 100) * statusBarWidth;
        doc.fillColor('#0284c7').rect(currentX, doc.y, width, statusBarHeight).fill();
        currentX += width;
      }
      
      // Barra para concluídos
      if (completedFreights > 0) {
        const width = (completedPercent / 100) * statusBarWidth;
        doc.fillColor('#059669').rect(currentX, doc.y, width, statusBarHeight).fill();
        currentX += width;
      }
      
      // Barra para rejeitados
      if (rejectedFreights > 0) {
        const width = (rejectedPercent / 100) * statusBarWidth;
        doc.fillColor('#dc2626').rect(currentX, doc.y, width, statusBarHeight).fill();
      }
      
      doc.moveDown(1.5);
      
      // Legenda do gráfico
      const legendY = doc.y;
      doc.font(regularFont).fontSize(9);
      
      // Pendente
      doc.fillColor('#f59e0b').rect(statusBarX, legendY, 12, 12).fill();
      doc.fillColor('#000000').text(`Pendentes: ${pendingFreights} (${pendingPercent.toFixed(1)}%)`, statusBarX + 16, legendY + 2);
      
      // Cotado
      doc.fillColor('#9333ea').rect(statusBarX + 120, legendY, 12, 12).fill();
      doc.fillColor('#000000').text(`Cotados: ${quotedFreights} (${quotedPercent.toFixed(1)}%)`, statusBarX + 136, legendY + 2);
      
      // Em andamento
      doc.fillColor('#0284c7').rect(statusBarX + 240, legendY, 12, 12).fill();
      doc.fillColor('#000000').text(`Em andamento: ${inProgressFreights} (${inProgressPercent.toFixed(1)}%)`, statusBarX + 256, legendY + 2);
      
      // Nova linha para a legenda
      const legendY2 = legendY + 20;
      
      // Concluído
      doc.fillColor('#059669').rect(statusBarX, legendY2, 12, 12).fill();
      doc.fillColor('#000000').text(`Concluídos: ${completedFreights} (${completedPercent.toFixed(1)}%)`, statusBarX + 16, legendY2 + 2);
      
      // Rejeitado
      doc.fillColor('#dc2626').rect(statusBarX + 120, legendY2, 12, 12).fill();
      doc.fillColor('#000000').text(`Rejeitados: ${rejectedFreights} (${rejectedPercent.toFixed(1)}%)`, statusBarX + 136, legendY2 + 2);
      
      doc.moveDown(2);
      
      // Estatísticas gerais
      doc.font(titleFont).fontSize(12).fillColor(secondaryColor);
      doc.text('Totais e Médias', 50);
      doc.moveDown(0.5);
      
      doc.font(regularFont).fontSize(10).fillColor('#000000');
      
      // Criar uma tabela para as estatísticas
      const statsTable = [
        ['Total de Fretes:', totalFreights.toString(), 'Distância Total:', `${totalDistance.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} km`],
        ['Valor Total:', `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Fretes Concluídos:', completedFreights.toString()],
        ['Valor Médio:', `R$ ${(totalValue / (totalFreights || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Distância Média:', `${(totalDistance / (totalFreights || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} km`]
      ];
      
      // Larguras para as colunas de estatísticas
      const statsCols = [100, 100, 100, 120];
      
      // Escrever as estatísticas
      statsTable.forEach((row, i) => {
        let statX = 50;
        
        row.forEach((text, j) => {
          const align = j % 2 === 0 ? 'left' : 'left';
          const font = j % 2 === 0 ? regularFont : titleFont;
          const color = j % 2 === 0 ? grayColor : accentColor;
          
          doc.font(font).fillColor(color);
          doc.text(text, statX, doc.y, { width: statsCols[j], align });
          
          statX += statsCols[j];
        });
        
        doc.moveDown(0.5);
      });
      
      // Adicionar rodapé
      addFooter(doc);
      
      // Finalizar o documento
      doc.end();
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      reject(error);
    }
  });
}

// Função para adicionar o cabeçalho principal do relatório
function addHeader(doc: PDFKit.PDFDocument, title: string) {
  // Título principal
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#2563eb');
  doc.text(title, { align: 'center' });
  doc.moveDown(0.5);
  
  // Subtítulo
  doc.font('Helvetica-Oblique').fontSize(12).fillColor('#6b7280');
  doc.text('LogMene - Sistema de Logística Inteligente', { align: 'center' });
  doc.moveDown(1);
}

// Função para adicionar o cabeçalho de página
function addPageHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#2563eb');
  doc.text(title, 50, 50);
  
  doc.font('Helvetica').fontSize(10).fillColor('#6b7280');
  doc.text('LogMene - Sistema de Logística Inteligente', { align: 'right' });
  
  doc.strokeColor('#e5e7eb').lineWidth(1)
    .moveTo(50, 75)
    .lineTo(doc.page.width - 50, 75)
    .stroke();
    
  doc.moveDown(2);
}

// Função para adicionar o rodapé da página
function addPageFooter(doc: PDFKit.PDFDocument) {
  // Como a propriedade pageNumber não existe diretamente,
  // podemos usar um número fixo ou implementar um contador posteriormente
  doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
  doc.text(
    'LogMene - Sistema de Logística Inteligente',
    50,
    doc.page.height - 50,
    { align: 'center', width: doc.page.width - 100 }
  );
}

// Função para adicionar o rodapé final
function addFooter(doc: PDFKit.PDFDocument) {
  // Linha separadora
  doc.strokeColor('#e5e7eb').lineWidth(1)
    .moveTo(50, doc.page.height - 70)
    .lineTo(doc.page.width - 50, doc.page.height - 70)
    .stroke();
  
  // Texto do rodapé
  doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
  doc.text(
    'Este relatório foi gerado automaticamente pelo sistema LogMene - Sistema de Logística Inteligente.',
    50,
    doc.page.height - 60,
    { align: 'center', width: doc.page.width - 100 }
  );
  
  // Data e hora
  const now = new Date();
  const formattedDate = now.toLocaleDateString('pt-BR');
  const formattedTime = now.toLocaleTimeString('pt-BR');
  
  doc.text(
    `Gerado em ${formattedDate} às ${formattedTime}`,
    50,
    doc.page.height - 45,
    { align: 'center', width: doc.page.width - 100 }
  );
  
  // Data do relatório no rodapé
  doc.text(
    `${formattedDate}`,
    50,
    doc.page.height - 30,
    { align: 'center', width: doc.page.width - 100 }
  );
}

// Função para adicionar os quadros de resumo no topo
function addSummaryBoxes(
  doc: PDFKit.PDFDocument, 
  totalFreights: number, 
  completedFreights: number, 
  inProgressFreights: number,
  totalValue: number,
  totalDistance: number
) {
  const boxWidth = 120;
  const boxHeight = 60;
  const boxMargin = 15;
  const boxStartX = 50;
  const boxStartY = doc.y;
  const boxColor = '#f3f4f6';
  const boxBorder = '#e5e7eb';
  
  // Quadro 1: Total de Fretes
  doc.fillColor(boxColor)
    .strokeColor(boxBorder)
    .lineWidth(1)
    .rect(boxStartX, boxStartY, boxWidth, boxHeight)
    .fillAndStroke();
  
  doc.fillColor('#2563eb')
    .font('Helvetica-Bold')
    .fontSize(24)
    .text(totalFreights.toString(), boxStartX + boxWidth/2, boxStartY + 15, {
      width: 0,
      align: 'center'
    });
    
  doc.fillColor('#4b5563')
    .font('Helvetica')
    .fontSize(10)
    .text('Total de Fretes', boxStartX + boxWidth/2, boxStartY + boxHeight - 20, {
      width: 0,
      align: 'center'
    });
  
  // Quadro 2: Fretes Concluídos
  const box2X = boxStartX + boxWidth + boxMargin;
  
  doc.fillColor(boxColor)
    .strokeColor(boxBorder)
    .rect(box2X, boxStartY, boxWidth, boxHeight)
    .fillAndStroke();
  
  doc.fillColor('#059669')
    .font('Helvetica-Bold')
    .fontSize(24)
    .text(completedFreights.toString(), box2X + boxWidth/2, boxStartY + 15, {
      width: 0,
      align: 'center'
    });
    
  doc.fillColor('#4b5563')
    .font('Helvetica')
    .fontSize(10)
    .text('Fretes Concluídos', box2X + boxWidth/2, boxStartY + boxHeight - 20, {
      width: 0,
      align: 'center'
    });
  
  // Quadro 3: Fretes em Andamento
  const box3X = box2X + boxWidth + boxMargin;
  
  doc.fillColor(boxColor)
    .strokeColor(boxBorder)
    .rect(box3X, boxStartY, boxWidth, boxHeight)
    .fillAndStroke();
  
  doc.fillColor('#0284c7')
    .font('Helvetica-Bold')
    .fontSize(24)
    .text(inProgressFreights.toString(), box3X + boxWidth/2, boxStartY + 15, {
      width: 0,
      align: 'center'
    });
    
  doc.fillColor('#4b5563')
    .font('Helvetica')
    .fontSize(10)
    .text('Em Andamento', box3X + boxWidth/2, boxStartY + boxHeight - 20, {
      width: 0,
      align: 'center'
    });
  
  // Quadro 4: Valor Total
  const box4X = box3X + boxWidth + boxMargin;
  
  doc.fillColor(boxColor)
    .strokeColor(boxBorder)
    .rect(box4X, boxStartY, boxWidth, boxHeight)
    .fillAndStroke();
  
  doc.fillColor('#9333ea')
    .font('Helvetica-Bold')
    .fontSize(16)
    .text(`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, box4X + boxWidth/2, boxStartY + 20, {
      width: 0,
      align: 'center'
    });
    
  doc.fillColor('#4b5563')
    .font('Helvetica')
    .fontSize(10)
    .text('Valor Total', box4X + boxWidth/2, boxStartY + boxHeight - 20, {
      width: 0,
      align: 'center'
    });
    
  // Atualizar posição do cursor
  doc.y = boxStartY + boxHeight + 20;
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