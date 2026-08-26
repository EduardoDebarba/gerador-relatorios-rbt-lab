export interface ReportRecord {
  data: string; // YYYY-MM-DD
  responsavel: string;
  modelo: string;
  origem: 'Caixa de OS' | 'Casa Velha' | 'Recolhimento';
  destino: 'Reaproveitado' | 'Descarte' | 'Venda' | 'RMA';
  cidade: string;
  equipe: string;
  qtd: number;
  defeito?: string;
  motivo_descarte?: string;
}

export interface ImportError {
  row: number;
  column: string;
  message: string;
  value?: string;
}

export interface CSVPreview {
  totalRecords: number;
  totalEquipments: number; // Sum of Qtd
  totalModels: number;
  totalCities: number;
  totalTeams: number;
  dateStart: string;
  dateEnd: string;
  sampleRows: ReportRecord[];
}

export interface ExecutiveMetrics {
  totalRecords: number;
  totalEquipments: number;
  totalModels: number;
  totalCities: number;
  totalTeams: number;
  totalReaproveitados: number;
  totalDescarte: number;
  totalRma: number;
  totalVenda: number;
  taxaReaproveitamento: number; // %
  taxaDescarte: number; // %
  taxaRma: number; // %
  taxaVenda: number; // %
  crescimentoMensal: number;
  mediaDiaria: number;
  diasUteis: number;
  responsavelTop: string;
  responsavelTopQtd: number;
  resolvidosOS: number;
  taxaResolucaoOS: number; // %
  modeloCritico: string;
  modeloCriticoDescarteTaxa: number;
  modeloMaisReaproveitado: string;
  modeloMaisReaproveitadoTaxa: number;
  cidadeCritica: string;
  cidadeCriticaRmaTaxa: number;
  equipeMaisProdutiva: string;
  equipeMaisProdutivaQtd: number;
  indiceRiscoOperacional: number;
  indiceRiscoStatus: 'OK' | 'ATENÇÃO' | 'CRÍTICO';
}

export interface ChartDataPoints {
  volumeMensal: { month: string; qtd: number }[];
  evolucaoTemporal: { date: string; qtd: number }[];
  destinoFinal: { name: string; value: number; percentage: number }[];
  destinoPorMes: { month: string; Descarte: number; RMA: number; Reaproveitado: number; Venda: number }[];
  origemDestino: { origem: string; Reaproveitado: number; Descarte: number; RMA: number; Venda: number; total: number; '%Reap': number }[];
  top10Modelos: { name: string; qtd: number }[];
  top10RmaModelos: { name: string; percentage: number }[];
  top10DescarteModelos: { name: string; percentage: number }[];
  top10ReaproveitamentoModelos: { name: string; percentage: number }[];
  defeitosOutros: { name: string; qtd: number }[];
  defeitosAntenas: { name: string; qtd: number }[];
  descarteOutros: { name: string; qtd: number }[];
  descarteAntenas: { name: string; qtd: number }[];
  cidadeDestino: { cidade: string; equip: number; reap: number; descarte: number; rma: number; taxaResol: number }[];
  equipeDestino: { equipe: string; equip: number; reap: number; descarte: number; rma: number; taxaResol: number }[];
  produtividadeResponsavel: { responsavel: string; qtd: number; qtdTotal: number; resolvidos: number; taxaResolucao: number }[];
  indicadoresAvancados: { indicador: string; valor: string; status: 'OK' | 'ATENÇÃO' | 'CRÍTICO' }[];
}

export interface ReportInsights {
  oQueMelhorou: string;
  oQuePiorou: string;
  qualModeloAtenção: string;
  qualCidadeProblemas: string;
  riscoOperacional: string;
  ondeConcentrarEsforços: string;
  tendenciasIdentificadas: string;
  proximosMeses: string;
  resumoExecutivo: string;
  conclusaoExecutiva: string;
}

export interface GeneratedReport {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
  metrics: ExecutiveMetrics;
  charts: ChartDataPoints;
  insights: ReportInsights;
  docxUrl?: string;
  pdfUrl?: string;
}
