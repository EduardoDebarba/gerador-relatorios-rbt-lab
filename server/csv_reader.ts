import Papa from 'papaparse';
import { ReportRecord, ImportError, CSVPreview } from '../src/types.js';

export function parseAndValidateCSV(csvText: string): { errors: ImportError[]; preview?: CSVPreview; records?: ReportRecord[] } {
  const errors: ImportError[] = [];
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
  });

  if (parsed.errors && parsed.errors.length > 0) {
    parsed.errors.forEach((err) => {
      errors.push({
        row: err.row !== undefined ? err.row + 1 : 0,
        column: '',
        message: `Erro de sintaxe CSV: ${err.message}`,
      });
    });
    return { errors };
  }

  const headers = parsed.meta.fields || [];
  const requiredHeaders = ['Data', 'Responsavel', 'Modelo', 'Origem', 'Destino', 'Cidade', 'Equipe', 'Qtd'];
  
  function normalizeHeader(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Keep letters and numbers only
      .trim();
  }

  const aliases: { [key: string]: string[] } = {
    Data: ['data', 'date', 'dia', 'periodo'],
    Responsavel: ['responsavel', 'tecnico', 'responsible', 'colaborador', 'usuario', 'nome', 'autor'],
    Modelo: ['modelo', 'model', 'equipamento', 'aparelho', 'item'],
    Origem: ['origem', 'origin', 'de', 'from'],
    Destino: ['destino', 'destination', 'para', 'to', 'situacaofinal', 'situacao'],
    Cidade: ['cidade', 'city', 'local', 'localidade', 'municipio'],
    Equipe: ['equipe', 'team', 'grupo', 'time', 'setor'],
    Qtd: ['qtd', 'quantidade', 'qty', 'quantity', 'volume', 'unidades', 'unidade', 'numero', 'num'],
  };

  // Case-insensitive and accent-insensitive header mapping to tolerate variations
  const headerMap: { [key: string]: string } = {};
  requiredHeaders.forEach(req => {
    // First, try direct normalized match
    let found = headers.find(h => normalizeHeader(h) === normalizeHeader(req));
    
    // If not found, check matching list of aliases
    if (!found && aliases[req]) {
      const normalizedAliases = aliases[req].map(normalizeHeader);
      found = headers.find(h => normalizedAliases.includes(normalizeHeader(h)));
    }
    
    if (found) {
      headerMap[req] = found;
    }
  });

  // Check for missing headers
  const missingHeaders = requiredHeaders.filter(req => !headerMap[req]);
  if (missingHeaders.length > 0) {
    return {
      errors: [{
        row: 0,
        column: 'Cabeçalho',
        message: `Colunas obrigatórias ausentes: ${missingHeaders.join(', ')}`,
      }],
    };
  }

  // Defeito and Motivo_Descarte are optional but nice to map with robust aliases
  const defeitoAliases = [
    'defeito', 'defeitos', 'motivodefeito', 'motivodefeitos', 'motivododefeito', 'motivodosdefeitos',
    'problema', 'problemas', 'falha', 'falhas', 'obs', 'observacao', 'observacoes', 'motivo', 'motivos',
    'laudo', 'descricao', 'detalhe', 'detalhes', 'comentario', 'comentarios', 'observacaotecnica'
  ].map(normalizeHeader);

  const descarteAliases = [
    'motivodescarte', 'motivodescartes', 'motivododescarte', 'motivodedescarte', 'descarte', 'descartes',
    'motivolixo', 'motivosucata', 'motivodescarteobs'
  ].map(normalizeHeader);

  const defeitoHeader = headers.find(h => defeitoAliases.includes(normalizeHeader(h))) || '';
  const motivoDescarteHeader = headers.find(h => descarteAliases.includes(normalizeHeader(h))) || '';

  const records: ReportRecord[] = [];
  let lastValidDate = '2026-07-01';

  const dataRows = parsed.data as any[];

  dataRows.forEach((row, index) => {
    const rowIndex = index + 1;

    // Check if the row is completely empty
    let isEmpty = true;
    for (const key of Object.keys(row)) {
      const cellVal = row[key];
      if (cellVal !== undefined && cellVal !== null && cellVal.toString().trim() !== '') {
        isEmpty = false;
        break;
      }
    }
    if (isEmpty) return; // Skip completely empty rows

    // Parse/Validate Data
    const rawData = row[headerMap['Data']]?.toString().trim();
    let formattedDate = '';
    if (!rawData) {
      formattedDate = lastValidDate;
    } else {
      // Handle formats: DD/MM/YYYY, YYYY-MM-DD
      let d: Date | null = null;
      if (rawData.includes('/')) {
        const parts = rawData.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          d = new Date(year, month, day);
          if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
            const pad = (num: number) => num.toString().padStart(2, '0');
            formattedDate = `${year}-${pad(month + 1)}-${pad(day)}`;
          }
        }
      } else if (rawData.includes('-')) {
        const parts = rawData.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          d = new Date(year, month, day);
          if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
            const pad = (num: number) => num.toString().padStart(2, '0');
            formattedDate = `${year}-${pad(month + 1)}-${pad(day)}`;
          }
        }
      }

      if (!formattedDate) {
        formattedDate = lastValidDate;
      }
    }

    if (formattedDate) {
      lastValidDate = formattedDate;
    }

    // Parse/Validate Responsavel
    let rawResponsavel = row[headerMap['Responsavel']]?.toString().trim();
    if (!rawResponsavel) {
      rawResponsavel = 'Não Informado';
    }

    // Parse/Validate Modelo
    let rawModelo = row[headerMap['Modelo']]?.toString().trim();
    if (!rawModelo) {
      rawModelo = 'Não Informado';
    }

    // Parse/Validate Origem
    const rawOrigem = row[headerMap['Origem']]?.toString().trim();
    const validOrigens = ['Caixa de OS', 'Casa Velha', 'Recolhimento'];
    let matchedOrigem: any = 'Recolhimento';
    if (rawOrigem) {
      const normOrig = normalizeHeader(rawOrigem);
      if (normOrig.includes('caixadeos') || normOrig.includes('caixaos') || normOrig === 'os') {
        matchedOrigem = 'Caixa de OS';
      } else if (normOrig.includes('casavelha')) {
        matchedOrigem = 'Casa Velha';
      } else if (normOrig.includes('recolhimento') || normOrig.includes('recolhid')) {
        matchedOrigem = 'Recolhimento';
      } else {
        const found = validOrigens.find(o => o.toLowerCase() === rawOrigem.toLowerCase());
        if (found) matchedOrigem = found;
      }
    }

    // Parse/Validate Destino
    const rawDestino = row[headerMap['Destino']]?.toString().trim();
    const validDestinos = ['Reaproveitado', 'Descarte', 'Venda', 'RMA'];
    let matchedDestino: any = 'Reaproveitado';
    if (rawDestino) {
      const normDest = normalizeHeader(rawDestino);
      if (normDest.includes('reaproveit') || normDest.includes('reutiliz') || normDest.includes('reuso') || normDest === 'ok' || normDest.includes('aproveitado')) {
        matchedDestino = 'Reaproveitado';
      } else if (normDest.includes('descarte') || normDest.includes('descart') || normDest === 'lixo' || normDest === 'sucata' || normDest === 'perda') {
        matchedDestino = 'Descarte';
      } else if (normDest.includes('venda') || normDest.includes('vendid') || normDest.includes('comercializ')) {
        matchedDestino = 'Venda';
      } else if (normDest.includes('rma') || normDest.includes('conserto') || normDest.includes('garantia') || normDest.includes('devoluc')) {
        matchedDestino = 'RMA';
      } else {
        const found = validDestinos.find(d => d.toLowerCase() === rawDestino.toLowerCase());
        if (found) matchedDestino = found;
      }
    }

    // Parse/Validate Cidade
    let rawCidade = row[headerMap['Cidade']]?.toString().trim();
    if (!rawCidade) {
      rawCidade = 'Não Informado';
    }

    // Parse/Validate Equipe
    let rawEquipe = row[headerMap['Equipe']]?.toString().trim();
    if (!rawEquipe) {
      rawEquipe = 'Não Informado';
    }

    // Parse/Validate Qtd
    const rawQtd = row[headerMap['Qtd']]?.toString().trim();
    let parsedQtd = 1;
    if (rawQtd) {
      const parsed = parseInt(rawQtd, 10);
      if (!isNaN(parsed) && parsed > 0) {
        parsedQtd = parsed;
      }
    }

    // Optional fields
    const rawDefeito = defeitoHeader ? row[defeitoHeader]?.toString().trim() : undefined;
    const rawMotivoDescarte = motivoDescarteHeader ? row[motivoDescarteHeader]?.toString().trim() : undefined;

    records.push({
      data: formattedDate,
      responsavel: rawResponsavel,
      modelo: rawModelo,
      origem: matchedOrigem,
      destino: matchedDestino,
      cidade: rawCidade,
      equipe: rawEquipe,
      qtd: parsedQtd,
      defeito: rawDefeito || '',
      motivo_descarte: rawMotivoDescarte || '',
    });
  });

  if (errors.length > 0) {
    return { errors };
  }

  // Calculate quick preview metrics
  const totalRecords = records.length;
  const totalEquipments = records.reduce((sum, r) => sum + r.qtd, 0);
  const totalModels = new Set(records.map(r => r.modelo)).size;
  const totalCities = new Set(records.map(r => r.cidade)).size;
  const totalTeams = new Set(records.map(r => r.equipe)).size;

  const dates = records.map(r => new Date(r.data).getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  const pad = (num: number) => num.toString().padStart(2, '0');
  const dateStart = `${pad(minDate.getDate())}/${pad(minDate.getMonth() + 1)}/${minDate.getFullYear()}`;
  const dateEnd = `${pad(maxDate.getDate())}/${pad(maxDate.getMonth() + 1)}/${maxDate.getFullYear()}`;

  const preview: CSVPreview = {
    totalRecords,
    totalEquipments,
    totalModels,
    totalCities,
    totalTeams,
    dateStart,
    dateEnd,
    sampleRows: records.slice(0, 5),
  };

  return { errors: [], preview, records };
}
