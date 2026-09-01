import { Document, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, HeadingLevel, PageBreak, Packer } from 'docx';
import { ExecutiveMetrics, ChartDataPoints, ReportInsights, ReportRecord } from '../src/types.js';

// Styles & Colors for RBT Internet
const COLOR_PRIMARY = '0F2D59';    // RBT Deep Blue
const COLOR_SECONDARY = 'E36F1E';  // RBT Orange
const COLOR_TEXT = '333333';       // Dark Grey
const COLOR_LIGHT_BG = 'F4F6F9';   // Off-white background
const COLOR_BORDER = 'E2E8F0';     // Border light grey

// Helper to create styled paragraph
function createParagraph(text: string, options: {
  bold?: boolean;
  size?: number;
  color?: string;
  alignment?: any;
  spacing?: { before?: number; after?: number };
} = {}): Paragraph {
  return new Paragraph({
    alignment: options.alignment || AlignmentType.LEFT,
    spacing: {
      before: (options.spacing?.before ?? 0) * 20, // docx uses twips (1 pt = 20 twips)
      after: (options.spacing?.after ?? 6) * 20,
    },
    children: [
      new TextRun({
        text,
        bold: options.bold || false,
        size: (options.size || 11) * 2, // docx half-points
        color: options.color || COLOR_TEXT,
        font: 'Inter',
      }),
    ],
  });
}

// Helper to create headings
function createHeading(text: string, level: any, color: string = COLOR_PRIMARY): Paragraph {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 24 : 20,
        color,
        font: 'Inter',
      }),
    ],
  });
}

// Helper to create a cell with background color and padding
function createStyledCell(text: string, options: {
  bg?: string;
  bold?: boolean;
  color?: string;
  align?: any;
  width?: number;
} = {}): TableCell {
  return new TableCell({
    shading: options.bg ? { fill: options.bg } : undefined,
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    margins: {
      top: 140,
      bottom: 140,
      left: 140,
      right: 140,
    },
    children: [
      new Paragraph({
        alignment: options.align || AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: options.bold || false,
            color: options.color || COLOR_TEXT,
            font: 'Inter',
            size: 19, // ~9.5pt
          }),
        ],
      }),
    ],
  });
}

export async function generateWordReport(
  name: string,
  metrics: ExecutiveMetrics,
  charts: ChartDataPoints,
  insights: ReportInsights,
  periodStart: string,
  periodEnd: string
): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // ================= PAGE 1: COVER PAGE =================
          createParagraph('◆ RELATÓRIO EXECUTIVO', { bold: true, size: 14, color: COLOR_SECONDARY, spacing: { before: 120, after: 120 } }),
          new Paragraph({ spacing: { before: 800 } }),
          createHeading('Controle de Laboratório & RMA', HeadingLevel.HEADING_1),
          createParagraph('Relatório Gerencial de Análise de Dados', { bold: true, size: 16, color: COLOR_PRIMARY }),
          createParagraph('Análise Operacional de Equipamentos de Telecomunicações', { size: 12, color: '666666', spacing: { after: 1200 } }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createStyledCell('Período analisado:', { bold: true, color: COLOR_SECONDARY, bg: COLOR_PRIMARY, width: 40 }),
                  createStyledCell(`${periodStart} até ${periodEnd}`, { bg: COLOR_LIGHT_BG }),
                ],
              }),
              new TableRow({
                children: [
                  createStyledCell('Data de geração:', { bold: true, color: COLOR_SECONDARY, bg: COLOR_PRIMARY }),
                  createStyledCell(new Date().toLocaleDateString('pt-BR'), { bg: COLOR_LIGHT_BG }),
                ],
              }),
              new TableRow({
                children: [
                  createStyledCell('Empresa:', { bold: true, color: COLOR_SECONDARY, bg: COLOR_PRIMARY }),
                  createStyledCell('RBT Internet', { bg: COLOR_LIGHT_BG }),
                ],
              }),
              new TableRow({
                children: [
                  createStyledCell('Sistema:', { bold: true, color: COLOR_SECONDARY, bg: COLOR_PRIMARY }),
                  createStyledCell('Sistema de Gestão do Laboratório Técnico', { bg: COLOR_LIGHT_BG }),
                ],
              }),
              new TableRow({
                children: [
                  createStyledCell('Responsável técnico:', { bold: true, color: COLOR_SECONDARY, bg: COLOR_PRIMARY }),
                  createStyledCell(metrics.responsavelTop || 'Equipe RBT', { bg: COLOR_LIGHT_BG }),
                ],
              }),
            ],
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // ================= PAGE 2: SUMÁRIO =================
          createHeading('Sumário', HeadingLevel.HEADING_1),
          new Paragraph({ spacing: { after: 120 } }),
          ...[
            '1. Sumário Executivo',
            '2. Volume de Equipamentos e Evolução Temporal',
            '3. Destino Final dos Equipamentos',
            '4. Origem dos Equipamentos × Destino Final',
            '5. Análise por Modelo',
            '6. Motivos de Defeito e Descarte',
            '7. Desempenho por Cidade',
            '8. Desempenho por Equipe',
            '9. Indicadores de Produtividade',
            '10. Indicadores Avançados',
            '11. Insights Gerenciais Gerados por IA',
            '12. Conclusão Executiva',
          ].map((item, idx) => 
            new Paragraph({
              spacing: { after: 140 },
              children: [
                new TextRun({ text: `${idx + 1}. `.padStart(4, ' '), bold: true, color: COLOR_PRIMARY, font: 'Inter' }),
                new TextRun({ text: item.substring(3), color: COLOR_TEXT, font: 'Inter' }),
              ],
            })
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // ================= PAGE 3: 1. SUMÁRIO EXECUTIVO =================
          createHeading('1. Sumário Executivo', HeadingLevel.HEADING_1),
          createParagraph(insights.resumoExecutivo, { spacing: { after: 240 } }),

          createParagraph('Principais Indicadores', { bold: true, size: 14, color: COLOR_PRIMARY, spacing: { before: 120, after: 120 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createStyledCell('REGISTROS\n' + metrics.totalRecords + '\nlinhas', { bg: COLOR_LIGHT_BG, align: AlignmentType.CENTER }),
                  createStyledCell('EQUIPAMENTOS\n' + metrics.totalEquipments + '\nsoma de QTD', { bg: COLOR_LIGHT_BG, align: AlignmentType.CENTER }),
                  createStyledCell('MODELOS\n' + metrics.totalModels + '\ndistintos', { bg: COLOR_LIGHT_BG, align: AlignmentType.CENTER }),
                  createStyledCell('CIDADES\n' + metrics.totalCities + '\natendidas', { bg: COLOR_LIGHT_BG, align: AlignmentType.CENTER }),
                ],
              }),
              new TableRow({
                children: [
                  createStyledCell('REAPROVEITAMENTO\n' + metrics.taxaReaproveitamento + '%\n' + metrics.totalReaproveitados + ' un', { bg: COLOR_LIGHT_BG, align: AlignmentType.CENTER }),
                  createStyledCell('DESCARTE\n' + metrics.taxaDescarte + '%\n' + metrics.totalDescarte + ' un', { bg: COLOR_LIGHT_BG, align: AlignmentType.CENTER }),
                  createStyledCell('RMA\n' + metrics.taxaRma + '%\n' + metrics.totalRma + ' un', { bg: COLOR_LIGHT_BG, align: AlignmentType.CENTER }),
                  createStyledCell('EQUIPES\n' + metrics.totalTeams + '\nenvolvidas', { bg: COLOR_LIGHT_BG, align: AlignmentType.CENTER }),
                ],
              }),
            ],
          }),

          createParagraph('Principais Achados', { bold: true, size: 14, color: COLOR_PRIMARY, spacing: { before: 240, after: 120 } }),
          createParagraph(`● Alta taxa de reaproveitamento (${metrics.taxaReaproveitamento}%), indicando elevada eficiência operacional no processo de triagem do laboratório.`, { spacing: { after: 120 } }),
          createParagraph(`▲ O modelo "${metrics.modeloCritico}" apresentou taxa de descarte de ${metrics.modeloCriticoDescarteTaxa}%, exigindo atenção prioritária do laboratório.`, { spacing: { after: 120 } }),
          createParagraph(`■ O modelo "${metrics.modeloMaisReaproveitado}" registrou ${metrics.modeloMaisReaproveitadoTaxa}% de reaproveitamento, firmando-se como destaque de robustez.`, { spacing: { after: 120 } }),
          createParagraph(`▲ A cidade de "${metrics.cidadeCritica}" concentra um volume de falhas elevado (${metrics.cidadeCriticaRmaTaxa}% entre RMA e Descarte), sugerindo intervenção ou triagem local.`, { spacing: { after: 120 } }),

          new Paragraph({ children: [new PageBreak()] }),

          // ================= PAGE 4: 2. VOLUME DE EQUIPAMENTOS E EVOLUÇÃO TEMPORAL =================
          createHeading('2. Volume de Equipamentos e Evolução Temporal', HeadingLevel.HEADING_1),
          createParagraph('Histórico consolidado do período com a evolução das triagens operacionais e distribuição temporal de recebimento de hardware:', { spacing: { after: 180 } }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createStyledCell('TOTAL RECEBIDO\n' + metrics.totalEquipments + ' un', { bg: COLOR_LIGHT_BG, align: AlignmentType.CENTER }),
                  createStyledCell('REAPROVEITADOS\n' + metrics.totalReaproveitados + ' un', { bg: COLOR_LIGHT_BG, align: AlignmentType.CENTER }),
                  createStyledCell('DESCARTADOS\n' + metrics.totalDescarte + ' un', { bg: COLOR_LIGHT_BG, align: AlignmentType.CENTER }),
                  createStyledCell('ENVIADOS RMA\n' + metrics.totalRma + ' un', { bg: COLOR_LIGHT_BG, align: AlignmentType.CENTER }),
                ],
              }),
            ],
          }),

          createParagraph('Evolução de Entradas por Dia (Amostra)', { bold: true, size: 12, color: COLOR_PRIMARY, spacing: { before: 240, after: 120 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createStyledCell('Data', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF' }),
                  createStyledCell('Volume de Equipamentos', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                ],
              }),
              ...charts.evolucaoTemporal.slice(0, 10).map(point => new TableRow({
                children: [
                  createStyledCell(point.date),
                  createStyledCell(point.qtd.toString(), { align: AlignmentType.CENTER }),
                ],
              })),
            ],
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // ================= PAGE 5: DESTINO FINAL POR MÊS =================
          createHeading('Volume por Destino Final Mensal', HeadingLevel.HEADING_2),
          createParagraph(insights.oQuePiorou, { spacing: { after: 240 } }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createStyledCell('Mês / Período', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF' }),
                  createStyledCell('Reaproveitado', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                  createStyledCell('Descarte', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                  createStyledCell('RMA', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                  createStyledCell('Venda', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                ],
              }),
              ...charts.destinoPorMes.map(m => new TableRow({
                children: [
                  createStyledCell(m.month),
                  createStyledCell(m.Reaproveitado.toString(), { align: AlignmentType.CENTER }),
                  createStyledCell(m.Descarte.toString(), { align: AlignmentType.CENTER }),
                  createStyledCell(m.RMA.toString(), { align: AlignmentType.CENTER }),
                  createStyledCell(m.Venda.toString(), { align: AlignmentType.CENTER }),
                ],
              })),
            ],
          }),

          createParagraph('Interpretação Operacional', { bold: true, size: 12, color: COLOR_PRIMARY, spacing: { before: 240, after: 120 } }),
          createParagraph(insights.proximosMeses),

          new Paragraph({ children: [new PageBreak()] }),

          // ================= PAGE 6: 3. DESTINO FINAL DOS EQUIPAMENTOS =================
          createHeading('3. Destino Final dos Equipamentos', HeadingLevel.HEADING_1),
          createParagraph('Abaixo apresentamos a distribuição global consolidada de destino final após triagem e validação técnica no laboratório da RBT:', { spacing: { after: 180 } }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createStyledCell('Destino Final', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF' }),
                  createStyledCell('Quantidade', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                  createStyledCell('Percentual (%)', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                ],
              }),
              ...charts.destinoFinal.map(d => new TableRow({
                children: [
                  createStyledCell(d.name),
                  createStyledCell(d.value.toString(), { align: AlignmentType.CENTER }),
                  createStyledCell(`${d.percentage}%`, { align: AlignmentType.CENTER }),
                ],
              })),
            ],
          }),

          createParagraph('Análise de Destinos', { bold: true, size: 12, color: COLOR_PRIMARY, spacing: { before: 240, after: 120 } }),
          createParagraph('O laboratório apresenta uma capacidade robusta de recuperação, o que gera uma excelente economia para o parque circulante de ativos da RBT Internet. As taxas operacionais mantêm-se controladas dentro das metas globais do setor técnico.'),

          new Paragraph({ children: [new PageBreak()] }),

          // ================= PAGE 7: 4. ORIGEM DOS EQUIPAMENTOS × DESTINO FINAL =================
          createHeading('4. Origem dos Equipamentos × Destino Final', HeadingLevel.HEADING_1),
          createParagraph('Detalhamento do fluxo cruzado mapeando a origem do recolhimento de campo até o veredito final no laboratório:', { spacing: { after: 180 } }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createStyledCell('Origem', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF' }),
                  createStyledCell('Reaproveitado', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                  createStyledCell('Descarte', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                  createStyledCell('RMA', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                  createStyledCell('Total', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                  createStyledCell('% Reap.', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                ],
              }),
              ...charts.origemDestino.map(od => new TableRow({
                children: [
                  createStyledCell(od.origem),
                  createStyledCell(od.Reaproveitado.toString(), { align: AlignmentType.CENTER }),
                  createStyledCell(od.Descarte.toString(), { align: AlignmentType.CENTER }),
                  createStyledCell(od.RMA.toString(), { align: AlignmentType.CENTER }),
                  createStyledCell(od.total.toString(), { align: AlignmentType.CENTER }),
                  createStyledCell(`${od['%Reap']}%`, { align: AlignmentType.CENTER }),
                ],
              })),
            ],
          }),

          createParagraph('Análise de Origem vs Destino', { bold: true, size: 12, color: COLOR_PRIMARY, spacing: { before: 240, after: 120 } }),
          createParagraph('Os canais de coleta apontam dinâmicas distintas. Equipamentos oriundos de Recolhimento massivo apresentam alta taxa de recuperação e integridade física para reinstalação imediata, enquanto itens classificados como Caixa de OS contêm maiores defeitos relatados diretamente por assinantes de campo.'),

          new Paragraph({ children: [new PageBreak()] }),

          // ================= PAGE 8: 5. ANÁLISE POR MODELO =================
          createHeading('5. Análise por Modelo', HeadingLevel.HEADING_1),
          createParagraph('Ranking detalhado dos modelos mais triados no período operacional e suas principais taxas de conversão:', { spacing: { after: 180 } }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createStyledCell('Modelo', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', width: 60 }),
                  createStyledCell('Quantidade Processada', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER, width: 40 }),
                ],
              }),
              ...charts.top10Modelos.map(m => new TableRow({
                children: [
                  createStyledCell(m.name),
                  createStyledCell(m.qtd.toString(), { align: AlignmentType.CENTER }),
                ],
              })),
            ],
          }),

          createParagraph('Taxas Críticas por Modelo (Top Modelos)', { bold: true, size: 12, color: COLOR_PRIMARY, spacing: { before: 240, after: 120 } }),
          createParagraph(insights.qualModeloAtenção, { spacing: { after: 120 } }),

          new Paragraph({ children: [new PageBreak()] }),

          // ================= PAGE 9: 6. MOTIVOS DE DEFEITO E DESCARTE =================
          createHeading('6. Motivos de Defeito e Descarte', HeadingLevel.HEADING_1),
          createParagraph('Indicadores de causas de falhas agrupados para Outros Equipamentos e Rádios/Antenas:', { spacing: { after: 180 } }),

          createParagraph('Principais Motivos de Defeito', { bold: true, size: 12, color: COLOR_PRIMARY }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createStyledCell('Motivo de Defeito', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF' }),
                  createStyledCell('Volume Registrado', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                ],
              }),
              ...(charts.defeitosOutros.slice(0, 5).map(d => new TableRow({
                children: [
                  createStyledCell(d.name),
                  createStyledCell(d.qtd.toString(), { align: AlignmentType.CENTER }),
                ],
              }))),
            ],
          }),

          createParagraph('Análise de Causas de Descarte', { bold: true, size: 12, color: COLOR_PRIMARY, spacing: { before: 240, after: 120 } }),
          createParagraph(insights.oQuePiorou),

          new Paragraph({ children: [new PageBreak()] }),

          // ================= PAGE 10: 7. DESEMPENHO POR CIDADE =================
          createHeading('7. Desempenho por Cidade', HeadingLevel.HEADING_1),
          createParagraph('Comportamento operacional de falhas e triagem regionalizado por praças de atendimento da RBT:', { spacing: { after: 180 } }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createStyledCell('Cidade', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF' }),
                  createStyledCell('Equipamentos (Reap + RMA)', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                  createStyledCell('Reaproveitados', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                  createStyledCell('RMA', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                  createStyledCell('% Resol.', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                ],
              }),
              ...charts.cidadeDestino.map(c => new TableRow({
                children: [
                  createStyledCell(c.cidade),
                  createStyledCell(c.equip.toString(), { align: AlignmentType.CENTER }),
                  createStyledCell(c.reap.toString(), { align: AlignmentType.CENTER }),
                  createStyledCell(c.rma.toString(), { align: AlignmentType.CENTER }),
                  createStyledCell(`${c.taxaResol}%`, { align: AlignmentType.CENTER }),
                ],
              })),
            ],
          }),

          createParagraph('Análise Regional', { bold: true, size: 12, color: COLOR_PRIMARY, spacing: { before: 240, after: 120 } }),
          createParagraph(insights.qualCidadeProblemas),

          new Paragraph({ children: [new PageBreak()] }),

          // ================= PAGE 11: 8. DESEMPENHO POR EQUIPE =================
          createHeading('8. Desempenho por Equipe', HeadingLevel.HEADING_1),
          createParagraph('Relação de equipamentos processados por equipe técnica de recolhimento de campo (Reaproveitamento e RMA):', { spacing: { after: 180 } }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createStyledCell('Equipe', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF' }),
                  createStyledCell('Equip. Processados (Reap + RMA)', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                  createStyledCell('Reaproveitados', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                  createStyledCell('RMA', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                  createStyledCell('% Resolução', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                ],
              }),
              ...charts.equipeDestino.slice(0, 10).map(eq => new TableRow({
                children: [
                  createStyledCell(eq.equipe),
                  createStyledCell(eq.equip.toString(), { align: AlignmentType.CENTER }),
                  createStyledCell(eq.reap.toString(), { align: AlignmentType.CENTER }),
                  createStyledCell(eq.rma.toString(), { align: AlignmentType.CENTER }),
                  createStyledCell(`${eq.taxaResol}%`, { align: AlignmentType.CENTER }),
                ],
              })),
            ],
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // ================= PAGE 12: 9. INDICADORES DE PRODUTIVIDADE =================
          createHeading('9. Indicadores de Produtividade', HeadingLevel.HEADING_1),
          createParagraph('Relação de produtividade dos analistas do laboratório:', { spacing: { after: 180 } }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createStyledCell('Responsável Técnico', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF' }),
                  createStyledCell('Qtd. Analisada', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                  createStyledCell('Resolvidos (OS)', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                  createStyledCell('Taxa Resolução OS (%)', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER }),
                ],
              }),
              ...charts.produtividadeResponsavel.map(p => new TableRow({
                children: [
                  createStyledCell(p.responsavel),
                  createStyledCell(p.qtd.toString(), { align: AlignmentType.CENTER }),
                  createStyledCell(p.resolvidos.toString(), { align: AlignmentType.CENTER }),
                  createStyledCell(`${p.taxaResolucao}%`, { align: AlignmentType.CENTER }),
                ],
              })),
            ],
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // ================= PAGE 13: 10. INDICADORES AVANÇADOS =================
          createHeading('10. Indicadores Avançados', HeadingLevel.HEADING_1),
          createParagraph('Visão consolidada de indicadores avançados de riscos, tendências e alertas preventivos:', { spacing: { after: 180 } }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createStyledCell('Indicador', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', width: 60 }),
                  createStyledCell('Valor', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER, width: 25 }),
                  createStyledCell('Status', { bold: true, bg: COLOR_PRIMARY, color: 'FFFFFF', align: AlignmentType.CENTER, width: 15 }),
                ],
              }),
              ...charts.indicadoresAvancados.map(ind => new TableRow({
                children: [
                  createStyledCell(ind.indicador),
                  createStyledCell(ind.valor, { align: AlignmentType.CENTER }),
                  createStyledCell(ind.status, {
                    align: AlignmentType.CENTER,
                    bold: true,
                    color: ind.status === 'OK' ? '2D3748' : ind.status === 'ATENÇÃO' ? 'DD6B20' : 'E53E3E',
                  }),
                ],
              })),
            ],
          }),

          createParagraph('Índice de Risco Operacional', { bold: true, size: 12, color: COLOR_PRIMARY, spacing: { before: 240, after: 120 } }),
          createParagraph(insights.riscoOperacional),

          new Paragraph({ children: [new PageBreak()] }),

          // ================= PAGE 14: 11. INSIGHTS GERENCIAIS GERADOS POR IA =================
          createHeading('11. Insights Gerenciais Gerados por IA', HeadingLevel.HEADING_1),
          createParagraph('Análise interpretativa de alto nível dos padrões operacionais observados:', { spacing: { after: 240 } }),

          createParagraph('O que melhorou neste período?', { bold: true, size: 12, color: COLOR_PRIMARY }),
          createParagraph(insights.oQueMelhorou, { spacing: { after: 180 } }),

          createParagraph('O que piorou?', { bold: true, size: 12, color: COLOR_PRIMARY }),
          createParagraph(insights.oQuePiorou, { spacing: { after: 180 } }),

          createParagraph('Qual modelo merece atenção?', { bold: true, size: 12, color: COLOR_PRIMARY }),
          createParagraph(insights.qualModeloAtenção, { spacing: { after: 180 } }),

          createParagraph('Qual cidade apresentou mais problemas?', { bold: true, size: 12, color: COLOR_PRIMARY }),
          createParagraph(insights.qualCidadeProblemas, { spacing: { after: 180 } }),

          createParagraph('Onde a equipe deve focar esforços no próximo mês?', { bold: true, size: 12, color: COLOR_PRIMARY }),
          createParagraph(insights.ondeConcentrarEsforços, { spacing: { after: 180 } }),

          new Paragraph({ children: [new PageBreak()] }),

          // ================= PAGE 15: 12. CONCLUSÃO EXECUTIVA =================
          createHeading('12. Conclusão Executiva', HeadingLevel.HEADING_1),
          createParagraph(insights.conclusaoExecutiva, { spacing: { after: 360 } }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createStyledCell('RBT Internet\nLaboratório Técnico', { bold: true, width: 50 }),
                  createStyledCell(`Gerado em\n${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, { align: AlignmentType.RIGHT, width: 50 }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
