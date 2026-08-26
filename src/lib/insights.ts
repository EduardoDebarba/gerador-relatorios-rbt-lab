import { ExecutiveMetrics, ReportInsights } from '../types.js';

export function generateInsights(metrics: ExecutiveMetrics): ReportInsights {
  const reapPct = metrics.taxaReaproveitamento;
  const descPct = metrics.taxaDescarte;
  const rmaPct = metrics.taxaRma;

  return {
    resumoExecutivo: `Esta análise consolida os registros do laboratório técnico da RBT Internet referentes aos equipamentos de telecomunicações processados no período. Os dados refletem o fluxo de triagem, manutenção, reaproveitamento, descarte e envio para RMA, fornecendo subsídios para o planejamento operacional e a otimização de processos. Foram processados um total de ${metrics.totalEquipments} equipamentos de ${metrics.totalModels} modelos diferentes em ${metrics.totalCities} cidades.`,
    
    oQueMelhorou: `O processo de triagem manteve ${reapPct}% de reaproveitamento, indicador alinhado a operações eficientes do setor. A operação com ${metrics.responsavelTop} como principal responsável técnico registrou alta produtividade e demonstrou excelente capacidade de absorver picos diários de triagem sem ruptura de fluxo, ajudando a recuperar ${metrics.totalReaproveitados} equipamentos.`,
    
    oQuePiorou: `A concentração de descartes e defeitos estéticos aumentou neste período. A taxa de descarte geral ficou em ${descPct}%, o que totaliza ${metrics.totalDescarte} unidades encaminhadas para descarte. Além disso, equipamentos com problemas de carcaça amarelada ou desgaste estético limitaram o reaproveitamento máximo de alguns lotes.`,
    
    qualModeloAtenção: `O modelo "${metrics.modeloCritico}" exige maior acompanhamento devido à alta taxa de descarte (${metrics.modeloCriticoDescarteTaxa}%), que se posiciona de forma expressiva acima da média da base. Recomenda-se realizar uma auditoria de campo nas condições sob as quais esse modelo está operando ou avaliar o tempo de vida útil dessas unidades.`,
    
    qualCidadeProblemas: `A cidade de "${metrics.cidadeCritica}" registrou um índice de falhas significativo, concentrando a maior taxa combinada de descarte e envio para RMA (${metrics.cidadeCriticaRmaTaxa}%). Sugere-se auditar as condições de infraestrutura elétrica e as práticas de instalação das equipes locais nesta região para mitigar perdas futuras.`,
    
    riscoOperacional: `O Índice de Risco Operacional consolidado está em ${metrics.indiceRiscoOperacional} (${metrics.indiceRiscoStatus === 'OK' ? 'Baixo' : metrics.indiceRiscoStatus === 'ATENÇÃO' ? 'Moderado' : 'Alto'}). Este resultado é influenciado principalmente pelas taxas combinadas de descarte (${descPct}%) e RMA (${rmaPct}%), sinalizando atenção com o ritmo de reposição de estoque do laboratório.`,
    
    ondeConcentrarEsforços: `Recomenda-se focar na (1) padronização do preenchimento das ordens de serviço por parte das equipes locais de instalação; (2) calibração dos testes funcionais rápidos de bancada no laboratório para agilizar a triagem de modelos como ${metrics.modeloCritico}; e (3) implementação de uma política preventiva de recolhimento de equipamentos antigos.`,
    
    tendenciasIdentificadas: `Observa-se uma tendência de estabilização no volume de equipamentos recebidos (crescimento de ${metrics.crescimentoMensal}%). Há também uma tendência de recebimento em lotes concentrados em determinados dias da semana, o que exige planejamento flexível da escala operacional para evitar gargalos na recepção de hardware.`,
    
    proximosMeses: `Mantida a curva atual de entradas e a distribuição de destinos, espera-se uma pressão contínua sobre as ONUs e Roteadores de maior rotação. Recomenda-se planejar a ampliação da capacidade das bancadas técnicas em semanas de pico e revisar contratos de RMA para otimizar os tempos de resposta com fabricantes parceiros.`,
    
    conclusaoExecutiva: `O laboratório técnico da RBT Internet apresentou desempenho operacional satisfatório no período analisado, processando ${metrics.totalEquipments} equipamentos distribuídos em ${metrics.totalModels} modelos e atendendo ${metrics.totalCities} cidades. A taxa de reaproveitamento de ${reapPct}% confirma a maturidade dos processos de triagem e contribui diretamente para a economia operacional e sustentabilidade da empresa. Entretanto, gargalos associados ao modelo "${metrics.modeloCritico}" e à cidade de "${metrics.cidadeCritica}" merecem intervenções corretivas imediatas.`,
  };
}
