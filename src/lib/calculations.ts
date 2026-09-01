import { ReportRecord, ExecutiveMetrics, ChartDataPoints } from '../types.js';

// Helper to normalize text for extremely robust Portuguese comparisons
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// User-specified models that are classified as Antennas and Radios
const ANTENNAS_AND_RADIOS = [
  'Antena Rádio Nano Station M5',
  'Antena Rádio Powerbeam 5Ac 400',
  'Antena Rádio Powerbeam 5Ac 500',
  'Antena Rádio Powerbeam M5 300',
  'Antena Rádio Ubiquiti Airgrid M5Hp 27Db',
  'Rádio Nano Beam Ac',
  'Rádio Nano Loco',
  'Rádio Ubiquiti Airgrid M5Hp 23Db',
  'Rádio Ubiquiti Lite Beam 5Ac 23 Dbi',
  'Rádio Ubiquiti lite beam ac',
  'Rádio Ubiquiti Lite Beam M5 23Dbi',
  'Rádio Ubiquiti Nano Beam M5',
  'Rádio Ubiquiti Nano Beam M5-300'
].map(normalizeText);

// Helper to determine if a model is an Antenna/Radio
function isAntennaOrRadio(modelo: string): boolean {
  const norm = normalizeText(modelo);
  return ANTENNAS_AND_RADIOS.includes(norm);
}

// User-specified discard reasons (motivos de descarte). Any other reason is considered a defect reason.
const DISCARD_REASONS = [
  'antena amarelada',
  'antena quebrada',
  'antena danificada',
  'Botão ligar/desligar quebrado',
  'Botão reset quebrado',
  'ligando apenas o power',
  'onu travada',
  'parte exterior amarelada',
  'parte exterior com tinta',
  'porta LAN queimada',
  'porta WAN queimada',
  'queimado'
].map(normalizeText);

function isDiscardReason(reason: string): boolean {
  const norm = normalizeText(reason);
  if (!norm) return false;

  // Let's check for any exact matches first
  if (DISCARD_REASONS.includes(norm)) {
    return true;
  }

  // Keywords that definitely make it a discard reason
  const discardKeywords = [
    'quebrada', 'quebrado',
    'amarelada', 'amarelado',
    'danificada', 'danificado', 'dafinicada',
    'queimada', 'queimado',
    'com tinta',
    'ligando apenas o power',
    'onu travada'
  ];

  for (const kw of discardKeywords) {
    if (norm.includes(kw)) {
      return true;
    }
  }

  return false;
}

export function performCalculations(records: ReportRecord[]): { metrics: ExecutiveMetrics; charts: ChartDataPoints } {
  const totalRecords = records.length;
  const totalEquipments = records.reduce((sum, r) => sum + r.qtd, 0);

  const distinctModels = new Set(records.map(r => r.modelo));
  const totalModels = distinctModels.size;

  const distinctCities = new Set(records.map(r => r.cidade));
  const totalCities = distinctCities.size;

  const distinctTeams = new Set(records.map(r => r.equipe));
  const totalTeams = distinctTeams.size;

  // Destino counts
  const totalReaproveitados = records.filter(r => r.destino === 'Reaproveitado').reduce((sum, r) => sum + r.qtd, 0);
  const totalDescarte = records.filter(r => r.destino === 'Descarte').reduce((sum, r) => sum + r.qtd, 0);
  const totalRma = records.filter(r => r.destino === 'RMA').reduce((sum, r) => sum + r.qtd, 0);
  const totalVenda = records.filter(r => r.destino === 'Venda').reduce((sum, r) => sum + r.qtd, 0);

  const taxaReaproveitamento = totalEquipments > 0 ? (totalReaproveitados / totalEquipments) * 100 : 0;
  const taxaDescarte = totalEquipments > 0 ? (totalDescarte / totalEquipments) * 100 : 0;
  const taxaRma = totalEquipments > 0 ? (totalRma / totalEquipments) * 100 : 0;
  const taxaVenda = totalEquipments > 0 ? (totalVenda / totalEquipments) * 100 : 0;

  // Group by Date for timeline
  const dateMap: { [key: string]: number } = {};
  records.forEach(r => {
    dateMap[r.data] = (dateMap[r.data] || 0) + r.qtd;
  });
  const distinctDates = Object.keys(dateMap).sort();
  const diasUteis = distinctDates.length;
  const mediaDiaria = diasUteis > 0 ? totalEquipments / diasUteis : 0;

  // Monthly data
  const monthlyVolumeMap: { [key: string]: number } = {};
  records.forEach(r => {
    const month = r.data.substring(0, 7); // YYYY-MM
    monthlyVolumeMap[month] = (monthlyVolumeMap[month] || 0) + r.qtd;
  });

  const monthsSorted = Object.keys(monthlyVolumeMap).sort();
  let crescimentoMensal = 0;
  if (monthsSorted.length > 1) {
    const prevMonth = monthlyVolumeMap[monthsSorted[monthsSorted.length - 2]];
    const currMonth = monthlyVolumeMap[monthsSorted[monthsSorted.length - 1]];
    crescimentoMensal = prevMonth > 0 ? ((currMonth - prevMonth) / prevMonth) * 100 : 0;
  }

  // Top Responsavel
  const respMap: { [key: string]: { total: number; osTotal: number; osEligible: number; osResolved: number } } = {};
  records.forEach(r => {
    if (!respMap[r.responsavel]) {
      respMap[r.responsavel] = { total: 0, osTotal: 0, osEligible: 0, osResolved: 0 };
    }
    respMap[r.responsavel].total += r.qtd;
    if (r.origem === 'Caixa de OS') {
      respMap[r.responsavel].osTotal += r.qtd;
      if (r.destino === 'Reaproveitado' || r.destino === 'RMA') {
        respMap[r.responsavel].osEligible += r.qtd;
      }
      if (r.destino === 'Reaproveitado') {
        respMap[r.responsavel].osResolved += r.qtd;
      }
    }
  });

  let responsavelTop = '';
  let responsavelTopQtd = 0;
  Object.keys(respMap).forEach(k => {
    if (respMap[k].total > responsavelTopQtd) {
      responsavelTopQtd = respMap[k].total;
      responsavelTop = k;
    }
  });

  // OS Resolution
  const totalOsRows = records.filter(r => r.origem === 'Caixa de OS');
  const totalOsVolume = totalOsRows.reduce((sum, r) => sum + r.qtd, 0);
  const eligibleOsVolume = totalOsRows.filter(r => r.destino === 'Reaproveitado' || r.destino === 'RMA').reduce((sum, r) => sum + r.qtd, 0);
  const resolvidosOS = totalOsRows.filter(r => r.destino === 'Reaproveitado').reduce((sum, r) => sum + r.qtd, 0);
  const taxaResolucaoOS = eligibleOsVolume > 0 
    ? (resolvidosOS / eligibleOsVolume) * 100 
    : (totalOsVolume > 0 ? (resolvidosOS / totalOsVolume) * 100 : 0);

  // Model statistics
  const modelStats: { [key: string]: { total: number; descarte: number; rma: number; reap: number } } = {};
  records.forEach(r => {
    if (!modelStats[r.modelo]) {
      modelStats[r.modelo] = { total: 0, descarte: 0, rma: 0, reap: 0 };
    }
    modelStats[r.modelo].total += r.qtd;
    if (r.destino === 'Descarte') modelStats[r.modelo].descarte += r.qtd;
    if (r.destino === 'RMA') modelStats[r.modelo].rma += r.qtd;
    if (r.destino === 'Reaproveitado') modelStats[r.modelo].reap += r.qtd;
  });

  let modeloCritico = '';
  let modeloCriticoDescarteTaxa = 0;
  let modeloMaisReaproveitado = '';
  let modeloMaisReaproveitadoTaxa = 0;

  Object.keys(modelStats).forEach(m => {
    const stats = modelStats[m];
    const dTaxa = stats.total > 0 ? (stats.descarte / stats.total) * 100 : 0;
    const rTaxa = stats.total > 0 ? (stats.reap / stats.total) * 100 : 0;

    // Model with highest descarte rate (minimum volume 5)
    if (stats.total >= 5 || !modeloCritico) {
      if (dTaxa >= modeloCriticoDescarteTaxa) {
        modeloCriticoDescarteTaxa = dTaxa;
        modeloCritico = m;
      }
    }

    // Model with highest reaproveitamento rate (minimum volume 5)
    if (stats.total >= 5 || !modeloMaisReaproveitado) {
      if (rTaxa >= modeloMaisReaproveitadoTaxa) {
        modeloMaisReaproveitadoTaxa = rTaxa;
        modeloMaisReaproveitado = m;
      }
    }
  });

  // Cities statistics (excluding Descarte to ensure realistic resolution rate)
  const cityStats: { [key: string]: { total: number; descarte: number; rma: number; reap: number; eligible: number } } = {};
  records.forEach(r => {
    if (!cityStats[r.cidade]) {
      cityStats[r.cidade] = { total: 0, descarte: 0, rma: 0, reap: 0, eligible: 0 };
    }
    if (r.destino !== 'Descarte') {
      cityStats[r.cidade].total += r.qtd;
      if (r.destino === 'RMA') {
        cityStats[r.cidade].rma += r.qtd;
        cityStats[r.cidade].eligible += r.qtd;
      }
      if (r.destino === 'Reaproveitado') {
        cityStats[r.cidade].reap += r.qtd;
        cityStats[r.cidade].eligible += r.qtd;
      }
    }
  });

  let cidadeCritica = '';
  let cidadeCriticaRmaTaxa = 0;
  Object.keys(cityStats).forEach(c => {
    const stats = cityStats[c];
    // Combined RMA rate
    const rmaTaxa = stats.total > 0 ? (stats.rma / stats.total) * 100 : 0;
    if (rmaTaxa >= cidadeCriticaRmaTaxa) {
      cidadeCriticaRmaTaxa = rmaTaxa;
      cidadeCritica = c;
    }
  });

  // Teams statistics (excluding Descarte)
  const teamStats: { [key: string]: number } = {};
  records.forEach(r => {
    if (r.destino !== 'Descarte') {
      teamStats[r.equipe] = (teamStats[r.equipe] || 0) + r.qtd;
    }
  });

  let equipeMaisProdutiva = '';
  let equipeMaisProdutivaQtd = 0;
  Object.keys(teamStats).forEach(t => {
    const isNaoInformado = !t || t.trim() === '' || t.toLowerCase() === 'não informado' || t.toLowerCase() === 'nao informado';
    if (!isNaoInformado && teamStats[t] > equipeMaisProdutivaQtd) {
      equipeMaisProdutivaQtd = teamStats[t];
      equipeMaisProdutiva = t;
    }
  });

  // Index of Operational Risk (combining stats)
  const indiceRiscoOperacional = (taxaDescarte * 1.1) + (taxaRma * 1.6) + (100 - taxaReaproveitamento) * 0.05;
  const roundedRisk = Math.round(indiceRiscoOperacional * 10) / 10;
  const indiceRiscoStatus = roundedRisk < 20 ? 'OK' : roundedRisk < 40 ? 'ATENÇÃO' : 'CRÍTICO';

  const metrics: ExecutiveMetrics = {
    totalRecords,
    totalEquipments,
    totalModels,
    totalCities,
    totalTeams,
    totalReaproveitados,
    totalDescarte,
    totalRma,
    totalVenda,
    taxaReaproveitamento: Math.round(taxaReaproveitamento * 10) / 10,
    taxaDescarte: Math.round(taxaDescarte * 10) / 10,
    taxaRma: Math.round(taxaRma * 10) / 10,
    taxaVenda: Math.round(taxaVenda * 10) / 10,
    crescimentoMensal: Math.round(crescimentoMensal * 10) / 10,
    mediaDiaria: Math.round(mediaDiaria * 10) / 10,
    diasUteis,
    responsavelTop,
    responsavelTopQtd,
    resolvidosOS,
    taxaResolucaoOS: Math.round(taxaResolucaoOS * 100) / 100,
    modeloCritico,
    modeloCriticoDescarteTaxa: Math.round(modeloCriticoDescarteTaxa * 10) / 10,
    modeloMaisReaproveitado,
    modeloMaisReaproveitadoTaxa: Math.round(modeloMaisReaproveitadoTaxa * 10) / 10,
    cidadeCritica,
    cidadeCriticaRmaTaxa: Math.round(cidadeCriticaRmaTaxa * 10) / 10,
    equipeMaisProdutiva,
    equipeMaisProdutivaQtd,
    indiceRiscoOperacional: roundedRisk,
    indiceRiscoStatus,
  };

  // Generate Chart Data Points
  const volumeMensal = monthsSorted.map(m => ({
    month: m,
    qtd: monthlyVolumeMap[m],
  }));

  const evolucaoTemporal = distinctDates.map(d => ({
    date: d,
    qtd: dateMap[d],
  }));

  const destinoFinal = [
    { name: 'Reaproveitado', value: totalReaproveitados, percentage: Math.round(taxaReaproveitamento * 10) / 10 },
    { name: 'Descarte', value: totalDescarte, percentage: Math.round(taxaDescarte * 10) / 10 },
    { name: 'Venda', value: totalVenda, percentage: Math.round(taxaVenda * 10) / 10 },
    { name: 'RMA', value: totalRma, percentage: Math.round(taxaRma * 10) / 10 },
  ].filter(d => d.value > 0);

  // Stacked destination per month
  const monthlyDestMap: { [month: string]: { Descarte: number; RMA: number; Reaproveitado: number; Venda: number } } = {};
  records.forEach(r => {
    const month = r.data.substring(0, 7);
    if (!monthlyDestMap[month]) {
      monthlyDestMap[month] = { Descarte: 0, RMA: 0, Reaproveitado: 0, Venda: 0 };
    }
    const dest = r.destino;
    monthlyDestMap[month][dest] = (monthlyDestMap[month][dest] || 0) + r.qtd;
  });
  const destinoPorMes = Object.keys(monthlyDestMap).sort().map(m => ({
    month: m,
    ...monthlyDestMap[m],
  }));

  // Matrix Origem vs Destino
  const origDestMap: { [orig: string]: { Reaproveitado: number; Descarte: number; RMA: number; Venda: number; total: number } } = {
    'Caixa de OS': { Reaproveitado: 0, Descarte: 0, RMA: 0, Venda: 0, total: 0 },
    'Casa Velha': { Reaproveitado: 0, Descarte: 0, RMA: 0, Venda: 0, total: 0 },
    'Recolhimento': { Reaproveitado: 0, Descarte: 0, RMA: 0, Venda: 0, total: 0 },
  };
  records.forEach(r => {
    if (origDestMap[r.origem]) {
      const dest = r.destino;
      origDestMap[r.origem][dest] += r.qtd;
      origDestMap[r.origem].total += r.qtd;
    }
  });
  const origemDestino = Object.keys(origDestMap).map(orig => {
    const stats = origDestMap[orig];
    const reapPercentage = stats.total > 0 ? (stats.Reaproveitado / stats.total) * 100 : 0;
    return {
      origem: orig,
      ...stats,
      '%Reap': Math.round(reapPercentage * 10) / 10,
    };
  });

  // All Models with volume (unsliced)
  const allModelsWithVolume = Object.keys(modelStats)
    .map(name => ({ name, qtd: modelStats[name].total }))
    .filter(m => m.name && m.name.trim() !== '' && m.name.toLowerCase() !== 'não informado' && m.name.toLowerCase() !== 'nao informado' && m.qtd > 0);

  // Top 10 Modelos
  const sortedModels = [...allModelsWithVolume]
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 10);

  const top10Modelos = sortedModels;

  // RMA, Descarte, Reaproveitamento rates for top models (filtering out 0 rates)
  const top10RmaModelos = sortedModels.map(sm => {
    const s = modelStats[sm.name];
    const rate = s.total > 0 ? (s.rma / s.total) * 100 : 0;
    return { name: sm.name, percentage: Math.round(rate * 10) / 10 };
  }).filter(item => item.percentage > 0).sort((a, b) => b.percentage - a.percentage);

  const top10DescarteModelos = sortedModels.map(sm => {
    const s = modelStats[sm.name];
    const rate = s.total > 0 ? (s.descarte / s.total) * 100 : 0;
    return { name: sm.name, percentage: Math.round(rate * 10) / 10 };
  }).filter(item => item.percentage > 0).sort((a, b) => b.percentage - a.percentage);

  const top10ReaproveitamentoModelos = sortedModels.map(sm => {
    const s = modelStats[sm.name];
    const rate = s.total > 0 ? (s.reap / s.total) * 100 : 0;
    return { name: sm.name, percentage: Math.round(rate * 10) / 10 };
  }).filter(item => item.percentage > 0).sort((a, b) => b.percentage - a.percentage);

  // Defeitos & Descartes
  const defectsOutrosMap: { [key: string]: { name: string, qtd: number } } = {};
  const defectsAntenasMap: { [key: string]: { name: string, qtd: number } } = {};
  const discardOutrosMap: { [key: string]: { name: string, qtd: number } } = {};
  const discardAntenasMap: { [key: string]: { name: string, qtd: number } } = {};

  records.forEach(r => {
    const isAnt = isAntennaOrRadio(r.modelo);
    const reason = (r.defeito || r.motivo_descarte || '').trim();
    if (!reason) return;

    const normReason = normalizeText(reason);
    const isDisc = isDiscardReason(reason);

    if (isDisc) {
      if (isAnt) {
        if (!discardAntenasMap[normReason]) {
          discardAntenasMap[normReason] = { name: reason, qtd: 0 };
        }
        discardAntenasMap[normReason].qtd += r.qtd;
      } else {
        if (!discardOutrosMap[normReason]) {
          discardOutrosMap[normReason] = { name: reason, qtd: 0 };
        }
        discardOutrosMap[normReason].qtd += r.qtd;
      }
    } else {
      if (isAnt) {
        if (!defectsAntenasMap[normReason]) {
          defectsAntenasMap[normReason] = { name: reason, qtd: 0 };
        }
        defectsAntenasMap[normReason].qtd += r.qtd;
      } else {
        if (!defectsOutrosMap[normReason]) {
          defectsOutrosMap[normReason] = { name: reason, qtd: 0 };
        }
        defectsOutrosMap[normReason].qtd += r.qtd;
      }
    }
  });

  const defeitosOutros = Object.values(defectsOutrosMap)
    .filter(item => item.qtd > 0 && item.name && item.name.toLowerCase() !== 'não informado' && item.name.toLowerCase() !== 'nao informado')
    .sort((a, b) => b.qtd - a.qtd);

  const defeitosAntenas = Object.values(defectsAntenasMap)
    .filter(item => item.qtd > 0 && item.name && item.name.toLowerCase() !== 'não informado' && item.name.toLowerCase() !== 'nao informado')
    .sort((a, b) => b.qtd - a.qtd);

  const descarteOutros = Object.values(discardOutrosMap)
    .filter(item => item.qtd > 0 && item.name && item.name.toLowerCase() !== 'não informado' && item.name.toLowerCase() !== 'nao informado')
    .sort((a, b) => b.qtd - a.qtd);

  const descarteAntenas = Object.values(discardAntenasMap)
    .filter(item => item.qtd > 0 && item.name && item.name.toLowerCase() !== 'não informado' && item.name.toLowerCase() !== 'nao informado')
    .sort((a, b) => b.qtd - a.qtd);

  // Cidade Destino Table (excluding Descarte)
  const cidadeDestino = Object.keys(cityStats)
    .filter(c => c && c.trim() !== '' && c.toLowerCase() !== 'não informado' && c.toLowerCase() !== 'nao informado')
    .map(c => {
      const s = cityStats[c];
      const rate = s.eligible > 0 ? (s.reap / s.eligible) * 100 : (s.total > 0 ? (s.reap / s.total) * 100 : 0);
      return {
        cidade: c,
        equip: s.total,
        reap: s.reap,
        descarte: s.descarte,
        rma: s.rma,
        taxaResol: Math.round(rate * 10) / 10,
      };
    })
    .filter(item => item.equip > 0)
    .sort((a, b) => b.equip - a.equip);

  // Equipe Destino Table (excluding Descarte)
  const teamDestMap: { [team: string]: { total: number; descarte: number; rma: number; reap: number; eligible: number } } = {};
  records.forEach(r => {
    if (!teamDestMap[r.equipe]) {
      teamDestMap[r.equipe] = { total: 0, descarte: 0, rma: 0, reap: 0, eligible: 0 };
    }
    if (r.destino !== 'Descarte') {
      teamDestMap[r.equipe].total += r.qtd;
      if (r.destino === 'RMA') {
        teamDestMap[r.equipe].rma += r.qtd;
        teamDestMap[r.equipe].eligible += r.qtd;
      }
      if (r.destino === 'Reaproveitado') {
        teamDestMap[r.equipe].reap += r.qtd;
        teamDestMap[r.equipe].eligible += r.qtd;
      }
    }
  });

  const equipeDestino = Object.keys(teamDestMap)
    .filter(eq => eq && eq.trim() !== '' && eq.toLowerCase() !== 'não informado' && eq.toLowerCase() !== 'nao informado')
    .map(eq => {
      const s = teamDestMap[eq];
      const rate = s.eligible > 0 ? (s.reap / s.eligible) * 100 : (s.total > 0 ? (s.reap / s.total) * 100 : 0);
      return {
        equipe: eq,
        equip: s.total,
        reap: s.reap,
        descarte: s.descarte,
        rma: s.rma,
        taxaResol: Math.round(rate * 10) / 10,
      };
    })
    .filter(item => item.equip > 0)
    .sort((a, b) => b.equip - a.equip);

  // Responsavel Produtividade Table
  const produtividadeResponsavel = Object.keys(respMap).map(resp => {
    const s = respMap[resp];
    const rate = s.osEligible > 0 ? (s.osResolved / s.osEligible) * 100 : (s.osTotal > 0 ? (s.osResolved / s.osTotal) * 100 : 0);
    return {
      responsavel: resp,
      qtd: s.osTotal > 0 ? s.osTotal : s.total,
      qtdTotal: s.total,
      resolvidos: s.osResolved,
      taxaResolucao: Math.round(rate * 100) / 100,
    };
  }).sort((a, b) => b.qtd - a.qtd);

  // Advanced Indicators List
  const indicadoresAvancados = [
    { indicador: 'Taxa Geral de Resolução (Caixa OS)', valor: `${Math.round(taxaResolucaoOS * 100) / 100}%`, status: taxaResolucaoOS > 60 ? 'OK' : taxaResolucaoOS > 40 ? 'ATENÇÃO' : 'CRÍTICO' as any },
    { indicador: 'Taxa Geral de Descarte', valor: `${Math.round(taxaDescarte * 10) / 10}%`, status: taxaDescarte < 15 ? 'OK' : taxaDescarte < 25 ? 'ATENÇÃO' : 'CRÍTICO' as any },
    { indicador: 'Taxa Geral de RMA', valor: `${Math.round(taxaRma * 10) / 10}%`, status: taxaRma < 5 ? 'OK' : taxaRma < 10 ? 'ATENÇÃO' : 'CRÍTICO' as any },
    { indicador: 'Modelo Mais Problemático', valor: modeloCritico || 'N/A', status: 'ATENÇÃO' as any },
    { indicador: 'Modelo Mais Reaproveitado', valor: modeloMaisReaproveitado || 'N/A', status: 'OK' as any },
    { indicador: 'Cidade Mais Crítica', valor: cidadeCritica || 'N/A', status: 'ATENÇÃO' as any },
    { indicador: 'Equipe com Maior Volume', valor: equipeMaisProdutiva || 'N/A', status: 'OK' as any },
    { indicador: 'Principal Motivo de Defeito', valor: (defeitosOutros[0]?.name || defeitosAntenas[0]?.name || 'N/A'), status: 'ATENÇÃO' as any },
    { indicador: 'Principal Motivo de Descarte', valor: (descarteOutros[0]?.name || descarteAntenas[0]?.name || 'N/A'), status: 'CRÍTICO' as any },
    { indicador: 'Crescimento Operacional (M/M-1)', valor: `${crescimentoMensal >= 0 ? '+' : ''}${Math.round(crescimentoMensal * 10) / 10}%`, status: 'OK' as any },
    { indicador: 'Índice de Risco Operacional', valor: `${roundedRisk} (${indiceRiscoStatus === 'OK' ? 'Baixo' : indiceRiscoStatus === 'ATENÇÃO' ? 'Moderado' : 'Alto'})`, status: indiceRiscoStatus as any },
  ];

  const charts: ChartDataPoints = {
    volumeMensal,
    evolucaoTemporal,
    destinoFinal,
    destinoPorMes,
    origemDestino,
    top10Modelos,
    top10RmaModelos,
    top10DescarteModelos,
    top10ReaproveitamentoModelos,
    defeitosOutros,
    defeitosAntenas,
    descarteOutros,
    descarteAntenas,
    cidadeDestino,
    equipeDestino,
    produtividadeResponsavel,
    indicadoresAvancados,
  };

  return { metrics, charts };
}
