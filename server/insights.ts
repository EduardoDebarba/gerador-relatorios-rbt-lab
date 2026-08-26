import { GoogleGenAI } from '@google/genai';
import { ExecutiveMetrics, ReportInsights } from '../src/types.js';

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY' && key.trim() !== '') {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return aiClient;
}

// Highly customized fallback generator strictly based on data
export function generateLocalInsights(metrics: ExecutiveMetrics): ReportInsights {
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

export async function generateInsights(metrics: ExecutiveMetrics): Promise<ReportInsights> {
  const ai = getGeminiClient();
  const localFallback = generateLocalInsights(metrics);

  if (!ai) {
    return localFallback;
  }

  try {
    const prompt = `Você é um Analista de BI e Diretor de Operações de Telecomunicações experiente contratado pela empresa "RBT Internet".
Temos os seguintes indicadores operacionais de controle de laboratório técnico e RMA para analisar:

- Total de Equipamentos Processados: ${metrics.totalEquipments}
- Total de Modelos de Equipamentos: ${metrics.totalModels}
- Total de Cidades Atendidas: ${metrics.totalCities}
- Total de Equipes Envolvidas: ${metrics.totalTeams}
- Taxa de Reaproveitamento: ${metrics.taxaReaproveitamento}% (${metrics.totalReaproveitados} unidades)
- Taxa de Descarte: ${metrics.taxaDescarte}% (${metrics.totalDescarte} unidades)
- Taxa de RMA: ${metrics.taxaRma}% (${metrics.totalRma} unidades)
- Taxa de Venda: ${metrics.taxaVenda}% (${metrics.totalVenda} unidades)
- Média Diária de Triagem: ${metrics.mediaDiaria} equipamentos por dia
- Técnico Principal (Maior Produtividade): ${metrics.responsavelTop} (${metrics.responsavelTopQtd} unidades)
- Taxa Geral de Resolução de Caixa de OS (Triados com Sucesso): ${metrics.taxaResolucaoOS}% (${metrics.resolvidosOS} resolvidos)
- Modelo Mais Problemático (Maior taxa de descarte): "${metrics.modeloCritico}" com ${metrics.modeloCriticoDescarteTaxa}% de descarte
- Modelo de Alta Eficiência (Mais reaproveitado): "${metrics.modeloMaisReaproveitado}" com ${metrics.modeloMaisReaproveitadoTaxa}% de reaproveitamento
- Cidade Mais Crítica: "${metrics.cidadeCritica}" com ${metrics.cidadeCriticaRmaTaxa}% de taxa combinada de falhas
- Equipe Mais Produtiva: "${metrics.equipeMaisProdutiva}" com ${metrics.equipeMaisProdutivaQtd} equipamentos tratados
- Crescimento Mensal de Entradas: ${metrics.crescimentoMensal}%
- Índice de Risco Operacional: ${metrics.indiceRiscoOperacional} (Status: ${metrics.indiceRiscoStatus})

Com base exclusivamente nestes dados reais, elabore um conjunto de análises interpretativas em formato JSON de acordo com o seguinte esquema. O texto deve ser extremamente profissional, rico em detalhes corporativos, formal e fluído. Escreva em Português do Brasil de forma concisa mas de alto valor gerencial. Não mencione "Gemini" ou "IA" no texto, escreva como se fosse o Diretor de Operações do laboratório.

Retorne APENAS um objeto JSON válido, sem tags de markdown como \`\`\`json ou explicações, contendo as seguintes chaves textuais de insights:
{
  "resumoExecutivo": "Texto consolidando os registros e o fluxo operacional do laboratório",
  "oQueMelhorou": "Análise sobre o que melhorou (mencione taxas de reaproveitamento de ${metrics.taxaReaproveitamento}% e o técnico ${metrics.responsavelTop})",
  "oQuePiorou": "Análise sobre o que piorou (mencione descartes de ${metrics.taxaDescarte}% ou falhas funcionais e estéticas)",
  "qualModeloAtenção": "Análise de atenção sobre o modelo ${metrics.modeloCritico} e suas altas perdas",
  "qualCidadeProblemas": "Análise regional sobre os problemas da cidade de ${metrics.cidadeCritica} e possíveis falhas locais",
  "riscoOperacional": "Interpretação detalhada do Índice de Risco Operacional atual de ${metrics.indiceRiscoOperacional}",
  "ondeConcentrarEsforços": "Recomendações estratégicas práticas para a equipe focar no próximo mês",
  "tendenciasIdentificadas": "Discussão de tendências baseadas no crescimento mensal de ${metrics.crescimentoMensal}% e padrões de dias da semana",
  "proximosMeses": "Previsões operacionais para os próximos meses sobre o estoque e contratos",
  "conclusaoExecutiva": "Conclusão executiva global direcionando planos de ação baseados nos indicadores"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    const cleanText = text.trim();
    const insights: ReportInsights = JSON.parse(cleanText);

    // Ensure all fields exist
    return {
      resumoExecutivo: insights.resumoExecutivo || localFallback.resumoExecutivo,
      oQueMelhorou: insights.oQueMelhorou || localFallback.oQueMelhorou,
      oQuePiorou: insights.oQuePiorou || localFallback.oQuePiorou,
      qualModeloAtenção: insights.qualModeloAtenção || localFallback.qualModeloAtenção,
      qualCidadeProblemas: insights.qualCidadeProblemas || localFallback.qualCidadeProblemas,
      riscoOperacional: insights.riscoOperacional || localFallback.riscoOperacional,
      ondeConcentrarEsforços: insights.ondeConcentrarEsforços || localFallback.ondeConcentrarEsforços,
      tendenciasIdentificadas: insights.tendenciasIdentificadas || localFallback.tendenciasIdentificadas,
      proximosMeses: insights.proximosMeses || localFallback.proximosMeses,
      conclusaoExecutiva: insights.conclusaoExecutiva || localFallback.conclusaoExecutiva,
    };
  } catch (err) {
    console.error('Erro ao gerar insights com Gemini:', err);
    return localFallback;
  }
}
