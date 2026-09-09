import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Layers,
  Columns,
  BarChart3,
  FileText,
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Percent,
  Box,
  MapPin,
  Users,
  Award,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { GeneratedReport } from '../types';
import PDFReportView from './PDFReportView';

interface CompareReportsViewProps {
  reports: GeneratedReport[];
  darkMode: boolean;
  initialReportAId?: string;
  initialReportBId?: string;
  onClose: () => void;
  onSelectSingleReport?: (report: GeneratedReport) => void;
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function getReportMonthLabel(report?: GeneratedReport): string {
  if (!report) return '';

  const formatMonthYear = (str: string): string => {
    if (!str) return '';
    const trimmed = str.trim();

    // Check if it already includes a Portuguese month name
    const hasPtMonth = MONTH_NAMES_PT.some(m => trimmed.toLowerCase().includes(m.toLowerCase()));
    if (hasPtMonth) return trimmed;

    // Match YYYY-MM or YYYY-MM-DD
    const iso = trimmed.match(/^(\d{4})[-/](\d{1,2})/);
    if (iso) {
      const y = iso[1];
      const mIdx = parseInt(iso[2], 10) - 1;
      if (mIdx >= 0 && mIdx < 12) return `${MONTH_NAMES_PT[mIdx]}/${y}`;
    }

    // Match DD/MM/YYYY
    const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (br) {
      const mIdx = parseInt(br[2], 10) - 1;
      const y = br[3];
      if (mIdx >= 0 && mIdx < 12) return `${MONTH_NAMES_PT[mIdx]}/${y}`;
    }

    // Match MM/YYYY
    const my = trimmed.match(/^(\d{1,2})\/(\d{4})/);
    if (my) {
      const mIdx = parseInt(my[1], 10) - 1;
      const y = my[2];
      if (mIdx >= 0 && mIdx < 12) return `${MONTH_NAMES_PT[mIdx]}/${y}`;
    }

    return trimmed;
  };

  // 1. From charts.volumeMensal if available
  if (report.charts?.volumeMensal && report.charts.volumeMensal.length > 0) {
    const months = report.charts.volumeMensal
      .map(item => formatMonthYear(item.month))
      .filter(Boolean);
    const uniqueMonths = Array.from(new Set(months));
    if (uniqueMonths.length === 1) {
      return uniqueMonths[0];
    } else if (uniqueMonths.length > 1 && uniqueMonths.length <= 2) {
      return uniqueMonths.join(' e ');
    } else if (uniqueMonths.length > 2) {
      return `${uniqueMonths[0]} a ${uniqueMonths[uniqueMonths.length - 1]}`;
    }
  }

  // 2. From periodStart / periodEnd
  if (report.periodStart) {
    const startFormatted = formatMonthYear(report.periodStart);
    const endFormatted = report.periodEnd ? formatMonthYear(report.periodEnd) : '';
    if (startFormatted && endFormatted && startFormatted !== endFormatted) {
      return `${startFormatted} a ${endFormatted}`;
    }
    if (startFormatted) return startFormatted;
  }

  // 3. Fallback from createdAt
  if (report.createdAt) {
    try {
      const d = new Date(report.createdAt);
      if (!isNaN(d.getTime())) {
        return `${MONTH_NAMES_PT[d.getMonth()]}/${d.getFullYear()}`;
      }
    } catch {}
  }

  return '';
}

const PAGE_TITLES: { [key: number]: string } = {
  1: 'Capa do Relatório',
  2: '1. Resumo Executivo',
  3: '2. Volume e Evolução Temporal',
  4: '3. Destino Final dos Equipamentos',
  5: '4. Origem vs Destino',
  6: '5. Top 10 Modelos Analisados',
  7: 'Top 10 Modelos - Reaproveitamento',
  8: 'Top 10 Modelos - RMA',
  9: 'Top 10 Modelos - Descarte',
  10: '6. Defeitos Registrados (Geral)',
  11: 'Defeitos Registrados (Antenas)',
  12: '7. Motivos de Descarte (Geral)',
  13: 'Motivos de Descarte (Antenas)',
  14: '8. Desempenho por Equipe',
  15: '9. Desempenho por Cidade',
  16: '10. Produtividade por Responsável',
  17: '11. Indicadores Avançados e Riscos',
  18: '12. Conclusão e Recomendações',
};

export default function CompareReportsView({
  reports,
  darkMode,
  initialReportAId,
  initialReportBId,
  onClose,
  onSelectSingleReport,
}: CompareReportsViewProps) {
  // Sort reports by date descending
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reports]);

  // Selected report IDs
  const [reportAId, setReportAId] = useState<string>(() => {
    if (initialReportAId && reports.some(r => r.id === initialReportAId)) return initialReportAId;
    return sortedReports[1]?.id || sortedReports[0]?.id || '';
  });

  const [reportBId, setReportBId] = useState<string>(() => {
    if (initialReportBId && reports.some(r => r.id === initialReportBId)) return initialReportBId;
    return sortedReports[0]?.id || '';
  });

  // View Mode: 'metrics' (dashboard matrix with deltas) or 'dualA4' (side-by-side A4 pages)
  const [viewMode, setViewMode] = useState<'metrics' | 'dualA4'>('metrics');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Dual Document continuous scroll & responsive auto-fit
  const columnARef = React.useRef<HTMLDivElement>(null);
  const columnBRef = React.useRef<HTMLDivElement>(null);
  const [columnWidth, setColumnWidth] = useState<number>(600);
  const [syncScroll, setSyncScroll] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const isSyncingRef = React.useRef<boolean>(false);

  const totalPages = 18;

  // Measure column width dynamically so documents fit 100% without horizontal scrollbar
  useEffect(() => {
    const el = columnARef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setColumnWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [viewMode, isFullscreen]);

  // Compute fitScale based on columnWidth. Standard A4 width is 794px.
  // Leaving 24px total padding (12px left, 12px right) so it fits 100% with no horizontal scrollbar.
  const fitScale = useMemo(() => {
    const available = Math.max(260, columnWidth - 24);
    return Math.min(1.0, available / 794);
  }, [columnWidth]);

  // Synchronized scrolling handlers within the current page
  const handleScrollA = () => {
    if (!syncScroll || isSyncingRef.current) return;
    if (columnARef.current && columnBRef.current) {
      isSyncingRef.current = true;
      columnBRef.current.scrollTop = columnARef.current.scrollTop;
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    }
  };

  const handleScrollB = () => {
    if (!syncScroll || isSyncingRef.current) return;
    if (columnARef.current && columnBRef.current) {
      isSyncingRef.current = true;
      columnARef.current.scrollTop = columnBRef.current.scrollTop;
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    }
  };

  const handleJumpToPage = (pageNum: number) => {
    const targetPage = Math.max(1, Math.min(totalPages, pageNum));
    setCurrentPage(targetPage);
    if (columnARef.current) columnARef.current.scrollTop = 0;
    if (columnBRef.current) columnBRef.current.scrollTop = 0;
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handleJumpToPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handleJumpToPage(currentPage + 1);
    }
  };

  // Keyboard navigation for previous/next page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'dualA4') return;
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentPage > 1) {
          handleJumpToPage(currentPage - 1);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentPage < totalPages) {
          handleJumpToPage(currentPage + 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentPage, totalPages]);

  const reportA = useMemo(() => reports.find(r => r.id === reportAId) || reports[0], [reports, reportAId]);
  const reportB = useMemo(() => reports.find(r => r.id === reportBId) || reports[1] || reports[0], [reports, reportBId]);

  const reportAMonth = useMemo(() => getReportMonthLabel(reportA), [reportA]);
  const reportBMonth = useMemo(() => getReportMonthLabel(reportB), [reportB]);

  // Swap reports A and B
  const handleSwap = () => {
    const temp = reportAId;
    setReportAId(reportBId);
    setReportBId(temp);
  };

  // Helper for Delta calculation
  const getDelta = (valA: number, valB: number, isPercentage: boolean = false, invertSentiment: boolean = false) => {
    const diff = valB - valA;
    const pctChange = valA > 0 ? (diff / valA) * 100 : 0;
    
    let isPositive = diff > 0;
    if (invertSentiment) {
      isPositive = diff < 0; // e.g. lower discard rate is positive!
    }

    const isNeutral = Math.abs(diff) < 0.001;

    return {
      diff,
      pctChange,
      isPositive,
      isNeutral,
      formattedDiff: isPercentage
        ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} p.p.`
        : `${diff >= 0 ? '+' : ''}${diff.toLocaleString('pt-BR')}`,
      formattedPct: `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%`,
    };
  };

  if (reports.length < 2) {
    return (
      <div className={`p-8 rounded-2xl border text-center my-6 ${
        darkMode ? 'bg-[#111827] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <Layers className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold font-display mb-2">Comparador de Relatórios</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          Você precisa de pelo menos <strong>2 relatórios gerados</strong> no sistema para realizar a comparação.
        </p>
        <button
          onClick={onClose}
          className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
        >
          Voltar e Enviar CSV
        </button>
      </div>
    );
  }

  // Precalculated Deltas between Report A (Base) and Report B (Target)
  const deltaVolume = getDelta(reportA?.metrics.totalEquipments || 0, reportB?.metrics.totalEquipments || 0);
  const deltaReap = getDelta(reportA?.metrics.taxaReaproveitamento || 0, reportB?.metrics.taxaReaproveitamento || 0, true);
  const deltaResolOS = getDelta(reportA?.metrics.taxaResolucaoOS || 0, reportB?.metrics.taxaResolucaoOS || 0, true);
  const deltaDescarte = getDelta(reportA?.metrics.taxaDescarte || 0, reportB?.metrics.taxaDescarte || 0, true, true);
  const deltaRma = getDelta(reportA?.metrics.taxaRma || 0, reportB?.metrics.taxaRma || 0, true, true);
  const deltaMediaDiaria = getDelta(reportA?.metrics.mediaDiaria || 0, reportB?.metrics.mediaDiaria || 0);

  // Combined Destination Comparison Data for Recharts
  const destinoComparisonData = [
    {
      categoria: 'Reaproveitado',
      unidadesA: reportA.metrics.totalReaproveitados ?? 0,
      unidadesB: reportB.metrics.totalReaproveitados ?? 0,
    },
    {
      categoria: 'RMA',
      unidadesA: reportA.metrics.totalRma ?? 0,
      unidadesB: reportB.metrics.totalRma ?? 0,
    },
    {
      categoria: 'Descarte',
      unidadesA: reportA.metrics.totalDescarte ?? 0,
      unidadesB: reportB.metrics.totalDescarte ?? 0,
    },
    {
      categoria: 'Venda',
      unidadesA: reportA.metrics.totalVenda ?? 0,
      unidadesB: reportB.metrics.totalVenda ?? 0,
    },
  ];

  return (
    <div
      className={
        isFullscreen
          ? `fixed inset-0 z-50 overflow-y-auto overflow-x-hidden w-full h-full p-2 sm:p-3 transition-all duration-300 ${
              darkMode ? 'bg-[#0B1120] text-slate-100' : 'bg-[#EEF2F7] text-slate-900'
            }`
          : `w-full max-w-full overflow-x-hidden flex flex-col font-sans transition-colors duration-300 pb-16 ${
              darkMode ? 'text-slate-100' : 'text-slate-900'
            }`
      }
    >
      {/* Top Header & Report Selection Bar - Only visible when NOT in fullscreen */}
      {!isFullscreen && (
        <div className={`sticky top-0 z-30 p-4 sm:p-5 rounded-2xl border shadow-lg backdrop-blur-md mb-6 transition-colors ${
          darkMode ? 'bg-[#111827]/95 border-slate-800 shadow-slate-950/40' : 'bg-white/95 border-slate-200 shadow-slate-200/50'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-lg sm:text-xl font-display font-bold tracking-tight ${
                    darkMode ? 'text-white' : 'text-[#0F2D59]'
                  }`}>
                    Comparador de Relatórios
                  </h1>
                </div>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Selecione dois relatórios para confrontar métricas, variações percentuais e visualização direta.
                </p>
              </div>
            </div>

            {/* Mode Switcher & Actions */}
            <div className="flex items-center gap-2 sm:gap-3 self-end lg:self-auto">
              {/* View Mode Buttons */}
              <div className={`p-1 rounded-xl flex items-center gap-1 text-xs border ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  onClick={() => setViewMode('metrics')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'metrics'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : (darkMode ? 'text-slate-400 hover:text-slate-100' : 'text-slate-600 hover:text-slate-900')
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Métricas</span>
                </button>
                <button
                  onClick={() => setViewMode('dualA4')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'dualA4'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : (darkMode ? 'text-slate-400 hover:text-slate-100' : 'text-slate-600 hover:text-slate-900')
                  }`}
                >
                  <Columns className="h-3.5 w-3.5" />
                  <span>Documentos A4</span>
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                }`}
                title="Fechar Comparador"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Fechar</span>
              </button>
            </div>
          </div>

          {/* Report Selection Dropdowns */}
          <div className={`mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 items-center ${
            darkMode ? 'border-slate-800/80' : 'border-slate-200/80'
          }`}>
            {/* Selector A (Left side) */}
            <div className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all ${
              darkMode ? 'bg-[#0B1120] border-blue-900/40' : 'bg-white border-blue-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold flex items-center gap-1.5 ${
                  darkMode ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  Relatório A (Base)
                  {reportAMonth && (
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${
                      darkMode ? 'bg-blue-950/80 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-300'
                    }`}>
                      {reportAMonth}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] font-mono font-medium ${
                  darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {reportA ? `${reportA.metrics.totalEquipments} un` : ''}
                </span>
              </div>
              <select
                value={reportAId}
                onChange={(e) => setReportAId(e.target.value)}
                className={`w-full text-xs font-semibold p-2 rounded-lg border outline-none cursor-pointer ${
                  darkMode ? 'bg-[#111827] border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800 shadow-xs'
                }`}
              >
                {sortedReports.map((r) => {
                  const m = getReportMonthLabel(r);
                  return (
                    <option key={`a-${r.id}`} value={r.id}>
                      {r.name} {m ? `[${m}]` : ''} ({r.periodStart} a {r.periodEnd}) • {r.metrics.totalEquipments} un
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSwap}
                className={`p-2.5 rounded-full border shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                  darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
                }`}
                title="Inverter Relatórios (A ↔ B)"
              >
                <ArrowLeftRight className="h-4 w-4 text-orange-500" />
              </button>
            </div>

            {/* Selector B (Right side) */}
            <div className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all ${
              darkMode ? 'bg-[#0B1120] border-orange-900/40' : 'bg-white border-orange-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold flex items-center gap-1.5 ${
                  darkMode ? 'text-orange-400' : 'text-orange-600'
                }`}>
                  <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                  Relatório B (Comparado)
                  {reportBMonth && (
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${
                      darkMode ? 'bg-orange-950/80 text-orange-300 border-orange-800' : 'bg-orange-100 text-orange-800 border-orange-300'
                    }`}>
                      {reportBMonth}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] font-mono font-medium ${
                  darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {reportB ? `${reportB.metrics.totalEquipments} un` : ''}
                </span>
              </div>
              <select
                value={reportBId}
                onChange={(e) => setReportBId(e.target.value)}
                className={`w-full text-xs font-semibold p-2 rounded-lg border outline-none cursor-pointer ${
                  darkMode ? 'bg-[#111827] border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800 shadow-xs'
                }`}
              >
                {sortedReports.map((r) => {
                  const m = getReportMonthLabel(r);
                  return (
                    <option key={`b-${r.id}`} value={r.id}>
                      {r.name} {m ? `[${m}]` : ''} ({r.periodStart} a {r.periodEnd}) • {r.metrics.totalEquipments} un
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Compact Header for Fullscreen in Metrics mode */}
      {isFullscreen && viewMode === 'metrics' && (
        <div className={`p-2.5 px-4 rounded-xl border shadow-sm flex flex-wrap items-center justify-between gap-3 mb-4 transition-colors ${
          darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-xs ${
              darkMode ? 'text-white' : 'text-[#0F2D59]'
            }`}>
              Comparação: {reportA.name} <span className="text-orange-500 font-normal">vs</span> {reportB.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('dualA4')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Documentos A4</span>
            </button>
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:bg-orange-600 shadow-sm"
              title="Sair da Tela Cheia (Esc)"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span>Sair da Tela Cheia</span>
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center cursor-pointer ${
                darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs'
              }`}
              title="Fechar Comparador"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================== MODE 1: METRICS & DELTAS VIEW ===================== */}
      {viewMode === 'metrics' && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-200">
          
          {/* 1. DELTA HIGHLIGHTS CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Volume */}
            <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
              darkMode ? 'bg-[#111827] border-slate-800 text-slate-100' : 'bg-white border-slate-200 shadow-sm text-slate-900'
            }`}>
              <div className={`flex items-center justify-between text-[11px] font-semibold ${
                darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <span>Volume Total</span>
                <Box className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="my-2">
                <div className={`text-lg font-black font-display tracking-tight ${
                  darkMode ? 'text-white' : 'text-slate-950'
                }`}>
                  {reportB.metrics.totalEquipments} <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>un</span>
                </div>
                <div className={`text-[11px] font-medium flex items-center justify-between ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <span>Base A: {reportA.metrics.totalEquipments}</span>
                </div>
              </div>
              <div className={`text-[11px] font-bold flex items-center gap-1 ${
                deltaVolume.isNeutral 
                  ? (darkMode ? 'text-slate-400' : 'text-slate-500') 
                  : deltaVolume.isPositive 
                    ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') 
                    : (darkMode ? 'text-rose-400' : 'text-rose-600')
              }`}>
                {deltaVolume.isNeutral ? <Minus className="h-3 w-3" /> : deltaVolume.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{deltaVolume.formattedDiff} ({deltaVolume.formattedPct})</span>
              </div>
            </div>

            {/* Taxa Reaproveitamento */}
            <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
              darkMode ? 'bg-[#111827] border-slate-800 text-slate-100' : 'bg-white border-slate-200 shadow-sm text-slate-900'
            }`}>
              <div className={`flex items-center justify-between text-[11px] font-semibold ${
                darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <span>Reaproveitamento</span>
                <Percent className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="my-2">
                <div className={`text-lg font-black font-display tracking-tight ${
                  darkMode ? 'text-white' : 'text-slate-950'
                }`}>
                  {reportB.metrics.taxaReaproveitamento}%
                </div>
                <div className={`text-[11px] font-medium ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <span>Base A: {reportA.metrics.taxaReaproveitamento}%</span>
                </div>
              </div>
              <div className={`text-[11px] font-bold flex items-center gap-1 ${
                deltaReap.isNeutral 
                  ? (darkMode ? 'text-slate-400' : 'text-slate-500') 
                  : deltaReap.isPositive 
                    ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') 
                    : (darkMode ? 'text-rose-400' : 'text-rose-600')
              }`}>
                {deltaReap.isNeutral ? <Minus className="h-3 w-3" /> : deltaReap.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{deltaReap.formattedDiff}</span>
              </div>
            </div>

            {/* Resolução Caixa de OS */}
            <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
              darkMode ? 'bg-[#111827] border-slate-800 text-slate-100' : 'bg-white border-slate-200 shadow-sm text-slate-900'
            }`}>
              <div className={`flex items-center justify-between text-[11px] font-semibold ${
                darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <span>Resolução OS</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="my-2">
                <div className={`text-lg font-black font-display tracking-tight ${
                  darkMode ? 'text-white' : 'text-slate-950'
                }`}>
                  {reportB.metrics.taxaResolucaoOS}%
                </div>
                <div className={`text-[11px] font-medium ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <span>Base A: {reportA.metrics.taxaResolucaoOS}%</span>
                </div>
              </div>
              <div className={`text-[11px] font-bold flex items-center gap-1 ${
                deltaResolOS.isNeutral 
                  ? (darkMode ? 'text-slate-400' : 'text-slate-500') 
                  : deltaResolOS.isPositive 
                    ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') 
                    : (darkMode ? 'text-rose-400' : 'text-rose-600')
              }`}>
                {deltaResolOS.isNeutral ? <Minus className="h-3 w-3" /> : deltaResolOS.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{deltaResolOS.formattedDiff}</span>
              </div>
            </div>

            {/* Taxa Descarte */}
            <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
              darkMode ? 'bg-[#111827] border-slate-800 text-slate-100' : 'bg-white border-slate-200 shadow-sm text-slate-900'
            }`}>
              <div className={`flex items-center justify-between text-[11px] font-semibold ${
                darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <span>Taxa Descarte</span>
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <div className="my-2">
                <div className={`text-lg font-black font-display tracking-tight ${
                  darkMode ? 'text-white' : 'text-slate-950'
                }`}>
                  {reportB.metrics.taxaDescarte}%
                </div>
                <div className={`text-[11px] font-medium ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <span>Base A: {reportA.metrics.taxaDescarte}%</span>
                </div>
              </div>
              <div className={`text-[11px] font-bold flex items-center gap-1 ${
                deltaDescarte.isNeutral 
                  ? (darkMode ? 'text-slate-400' : 'text-slate-500') 
                  : deltaDescarte.isPositive 
                    ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') 
                    : (darkMode ? 'text-rose-400' : 'text-rose-600')
              }`}>
                {deltaDescarte.isNeutral ? <Minus className="h-3 w-3" /> : deltaDescarte.isPositive ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                <span>{deltaDescarte.formattedDiff}</span>
              </div>
            </div>

            {/* Taxa RMA */}
            <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
              darkMode ? 'bg-[#111827] border-slate-800 text-slate-100' : 'bg-white border-slate-200 shadow-sm text-slate-900'
            }`}>
              <div className={`flex items-center justify-between text-[11px] font-semibold ${
                darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <span>Taxa RMA</span>
                <RefreshCw className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div className="my-2">
                <div className={`text-lg font-black font-display tracking-tight ${
                  darkMode ? 'text-white' : 'text-slate-950'
                }`}>
                  {reportB.metrics.taxaRma}%
                </div>
                <div className={`text-[11px] font-medium ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <span>Base A: {reportA.metrics.taxaRma}%</span>
                </div>
              </div>
              <div className={`text-[11px] font-bold flex items-center gap-1 ${
                deltaRma.isNeutral 
                  ? (darkMode ? 'text-slate-400' : 'text-slate-500') 
                  : deltaRma.isPositive 
                    ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') 
                    : (darkMode ? 'text-rose-400' : 'text-rose-600')
              }`}>
                {deltaRma.isNeutral ? <Minus className="h-3 w-3" /> : deltaRma.isPositive ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                <span>{deltaRma.formattedDiff}</span>
              </div>
            </div>

            {/* Média Diária */}
            <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
              darkMode ? 'bg-[#111827] border-slate-800 text-slate-100' : 'bg-white border-slate-200 shadow-sm text-slate-900'
            }`}>
              <div className={`flex items-center justify-between text-[11px] font-semibold ${
                darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <span>Média Diária</span>
                <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <div className="my-2">
                <div className={`text-lg font-black font-display tracking-tight ${
                  darkMode ? 'text-white' : 'text-slate-950'
                }`}>
                  {reportB.metrics.mediaDiaria} <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>/dia</span>
                </div>
                <div className={`text-[11px] font-medium ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <span>Base A: {reportA.metrics.mediaDiaria}/dia</span>
                </div>
              </div>
              <div className={`text-[11px] font-bold flex items-center gap-1 ${
                deltaMediaDiaria.isNeutral 
                  ? (darkMode ? 'text-slate-400' : 'text-slate-500') 
                  : deltaMediaDiaria.isPositive 
                    ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') 
                    : (darkMode ? 'text-rose-400' : 'text-rose-600')
              }`}>
                {deltaMediaDiaria.isNeutral ? <Minus className="h-3 w-3" /> : deltaMediaDiaria.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{deltaMediaDiaria.formattedDiff}</span>
              </div>
            </div>
          </div>

          {/* 2. TABELA COMPARATIVA GERAL (MATRIZ LADO A LADO) */}
          <div className={`border rounded-2xl overflow-hidden shadow-sm ${
            darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-orange-500" />
                <h3 className={`font-display font-bold text-sm ${
                  darkMode ? 'text-slate-100' : 'text-[#0F2D59]'
                }`}>
                  Matriz Comparativa de Indicadores Operacionais
                </h3>
              </div>
              <span className={`text-[11px] font-medium ${
                darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {reportAMonth || reportA.periodStart} vs {reportBMonth || reportB.periodStart}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={darkMode ? 'bg-slate-900/80 text-slate-300 border-b border-slate-800' : 'bg-slate-100 text-slate-700 font-bold border-b border-slate-200'}>
                    <th className="p-3 font-semibold">Indicador Operacional</th>
                    <th className={`p-3 font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      Relatório A ({reportAMonth || reportA.periodStart})
                    </th>
                    <th className={`p-3 font-semibold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                      Relatório B ({reportBMonth || reportB.periodStart})
                    </th>
                    <th className="p-3 font-semibold text-right">Variação (Delta)</th>
                  </tr>
                </thead>
                <tbody className={darkMode ? 'divide-y divide-slate-800/60 text-slate-300' : 'divide-y divide-slate-200 text-slate-700'}>
                  {/* Total Equipamentos */}
                  <tr className={darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                    <td className="p-3 font-semibold flex items-center gap-2">
                      <Box className={`h-3.5 w-3.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} /> Total de Equipamentos
                    </td>
                    <td className="p-3 font-mono font-medium">{reportA.metrics.totalEquipments} un</td>
                    <td className="p-3 font-mono font-medium">{reportB.metrics.totalEquipments} un</td>
                    <td className="p-3 text-right font-mono font-semibold">
                      <span className={deltaVolume.isPositive ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : (darkMode ? 'text-rose-400' : 'text-rose-600')}>
                        {deltaVolume.formattedDiff} ({deltaVolume.formattedPct})
                      </span>
                    </td>
                  </tr>

                  {/* Reaproveitados */}
                  <tr className={darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                    <td className="p-3 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Reaproveitamento
                    </td>
                    <td className="p-3 font-mono">
                      {reportA.metrics.totalReaproveitados} un ({reportA.metrics.taxaReaproveitamento}%)
                    </td>
                    <td className="p-3 font-mono">
                      {reportB.metrics.totalReaproveitados} un ({reportB.metrics.taxaReaproveitamento}%)
                    </td>
                    <td className="p-3 text-right font-mono font-semibold">
                      <span className={deltaReap.isPositive ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : (darkMode ? 'text-rose-400' : 'text-rose-600')}>
                        {deltaReap.formattedDiff}
                      </span>
                    </td>
                  </tr>

                  {/* Resolução Caixa de OS */}
                  <tr className={darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                    <td className="p-3 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> Resolução em Caixa de OS
                    </td>
                    <td className="p-3 font-mono">
                      {reportA.metrics.resolvidosOS} un ({reportA.metrics.taxaResolucaoOS}%)
                    </td>
                    <td className="p-3 font-mono">
                      {reportB.metrics.resolvidosOS} un ({reportB.metrics.taxaResolucaoOS}%)
                    </td>
                    <td className="p-3 text-right font-mono font-semibold">
                      <span className={deltaResolOS.isPositive ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : (darkMode ? 'text-rose-400' : 'text-rose-600')}>
                        {deltaResolOS.formattedDiff}
                      </span>
                    </td>
                  </tr>

                  {/* Descarte */}
                  <tr className={darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                    <td className="p-3 font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> Descarte / Sucata
                    </td>
                    <td className="p-3 font-mono">
                      {reportA.metrics.totalDescarte} un ({reportA.metrics.taxaDescarte}%)
                    </td>
                    <td className="p-3 font-mono">
                      {reportB.metrics.totalDescarte} un ({reportB.metrics.taxaDescarte}%)
                    </td>
                    <td className="p-3 text-right font-mono font-semibold">
                      <span className={deltaDescarte.isPositive ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : (darkMode ? 'text-rose-400' : 'text-rose-600')}>
                        {deltaDescarte.formattedDiff}
                      </span>
                    </td>
                  </tr>

                  {/* RMA */}
                  <tr className={darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                    <td className="p-3 font-semibold flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 text-amber-500" /> Envio para RMA
                    </td>
                    <td className="p-3 font-mono">
                      {reportA.metrics.totalRma} un ({reportA.metrics.taxaRma}%)
                    </td>
                    <td className="p-3 font-mono">
                      {reportB.metrics.totalRma} un ({reportB.metrics.taxaRma}%)
                    </td>
                    <td className="p-3 text-right font-mono font-semibold">
                      <span className={deltaRma.isPositive ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : (darkMode ? 'text-amber-400' : 'text-amber-600')}>
                        {deltaRma.formattedDiff}
                      </span>
                    </td>
                  </tr>

                  {/* Média Diária */}
                  <tr className={darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                    <td className="p-3 font-semibold flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-indigo-500" /> Ritmo Operacional (Média Diária)
                    </td>
                    <td className="p-3 font-mono">{reportA.metrics.mediaDiaria} un/dia ({reportA.metrics.diasUteis} dias)</td>
                    <td className="p-3 font-mono">{reportB.metrics.mediaDiaria} un/dia ({reportB.metrics.diasUteis} dias)</td>
                    <td className="p-3 text-right font-mono font-semibold">
                      <span className={deltaMediaDiaria.isPositive ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : (darkMode ? 'text-rose-400' : 'text-rose-600')}>
                        {deltaMediaDiaria.formattedDiff} un/dia
                      </span>
                    </td>
                  </tr>

                  {/* Modelo Crítico */}
                  <tr className={darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                    <td className="p-3 font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-400" /> Modelo com Maior Descarte
                    </td>
                    <td className={`p-3 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {reportA.metrics.modeloCritico || 'N/A'} ({reportA.metrics.modeloCriticoDescarteTaxa}%)
                    </td>
                    <td className={`p-3 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {reportB.metrics.modeloCritico || 'N/A'} ({reportB.metrics.modeloCriticoDescarteTaxa}%)
                    </td>
                    <td className={`p-3 text-right text-[11px] font-mono font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {reportA.metrics.modeloCritico === reportB.metrics.modeloCritico ? 'Mesmo Modelo' : 'Modelo Diferente'}
                    </td>
                  </tr>

                  {/* Equipe Top */}
                  <tr className={darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                    <td className="p-3 font-semibold flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-indigo-400" /> Equipe com Maior Volume
                    </td>
                    <td className={`p-3 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {reportA.metrics.equipeMaisProdutiva || 'N/A'} ({reportA.metrics.equipeMaisProdutivaQtd} un)
                    </td>
                    <td className={`p-3 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {reportB.metrics.equipeMaisProdutiva || 'N/A'} ({reportB.metrics.equipeMaisProdutivaQtd} un)
                    </td>
                    <td className={`p-3 text-right text-[11px] font-mono font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {reportA.metrics.equipeMaisProdutiva === reportB.metrics.equipeMaisProdutiva ? 'Mesma Equipe' : 'Equipe Diferente'}
                    </td>
                  </tr>

                  {/* Responsável Top */}
                  <tr className={darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                    <td className="p-3 font-semibold flex items-center gap-2">
                      <Award className="h-3.5 w-3.5 text-amber-500" /> Responsável Técnico Líder
                    </td>
                    <td className={`p-3 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {reportA.metrics.responsavelTop || 'N/A'} ({reportA.metrics.responsavelTopQtd} un)
                    </td>
                    <td className={`p-3 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {reportB.metrics.responsavelTop || 'N/A'} ({reportB.metrics.responsavelTopQtd} un)
                    </td>
                    <td className={`p-3 text-right text-[11px] font-mono font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {reportA.metrics.responsavelTop === reportB.metrics.responsavelTop ? 'Mesmo Técnico' : 'Técnico Diferente'}
                    </td>
                  </tr>

                  {/* Risco Operacional */}
                  <tr className={darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                    <td className="p-3 font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Risco Operacional Global
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        reportA.metrics.indiceRiscoStatus === 'OK'
                          ? (darkMode ? 'bg-emerald-950 text-emerald-400' : 'bg-emerald-100 text-emerald-800')
                          : reportA.metrics.indiceRiscoStatus === 'ATENÇÃO'
                          ? (darkMode ? 'bg-amber-950 text-amber-400' : 'bg-amber-100 text-amber-800')
                          : (darkMode ? 'bg-rose-950 text-rose-400' : 'bg-rose-100 text-rose-800')
                      }`}>
                        {reportA.metrics.indiceRiscoStatus} ({reportA.metrics.indiceRiscoOperacional} pts)
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        reportB.metrics.indiceRiscoStatus === 'OK'
                          ? (darkMode ? 'bg-emerald-950 text-emerald-400' : 'bg-emerald-100 text-emerald-800')
                          : reportB.metrics.indiceRiscoStatus === 'ATENÇÃO'
                          ? (darkMode ? 'bg-amber-950 text-amber-400' : 'bg-amber-100 text-amber-800')
                          : (darkMode ? 'bg-rose-950 text-rose-400' : 'bg-rose-100 text-rose-800')
                      }`}>
                        {reportB.metrics.indiceRiscoStatus} ({reportB.metrics.indiceRiscoOperacional} pts)
                      </span>
                    </td>
                    <td className="p-3 text-right text-[11px] font-mono font-semibold">
                      {reportB.metrics.indiceRiscoOperacional <= reportA.metrics.indiceRiscoOperacional ? (
                        <span className={darkMode ? 'text-emerald-400' : 'text-emerald-600'}>Risco Estável / Reduzido</span>
                      ) : (
                        <span className={darkMode ? 'text-rose-400' : 'text-rose-600'}>Risco Elevado</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. GRÁFICO COMPARATIVO DIRETO DE DESTINOS */}
          <div className={`p-6 rounded-2xl border shadow-sm ${
            darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className={`font-display font-bold text-sm ${
                  darkMode ? 'text-white' : 'text-[#0F2D59]'
                }`}>
                  Comparação Direta de Destinos Finais (Unidades)
                </h3>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Volume de equipamentos por categoria de desfecho entre Relatório A e Relatório B.
                </p>
              </div>
              <div className={`flex items-center gap-4 text-xs font-semibold ${
                darkMode ? 'text-slate-200' : 'text-slate-800'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-blue-500"></span>
                  <span>A: {reportA.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-orange-500"></span>
                  <span>B: {reportB.name}</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={destinoComparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1e293b' : '#e2e8f0'} />
                  <XAxis dataKey="categoria" stroke={darkMode ? '#94a3b8' : '#64748b'} tick={{ fill: darkMode ? '#94a3b8' : '#475569' }} />
                  <YAxis stroke={darkMode ? '#94a3b8' : '#64748b'} tick={{ fill: darkMode ? '#94a3b8' : '#475569' }} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                      borderColor: darkMode ? '#334155' : '#e2e8f0',
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                    }}
                    itemStyle={{
                      color: darkMode ? '#f8fafc' : '#0f172a',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                    labelStyle={{
                      color: darkMode ? '#94a3b8' : '#475569',
                      fontSize: '11px',
                      fontWeight: 700,
                      marginBottom: '4px',
                    }}
                  />
                  <Bar
                    dataKey="unidadesA"
                    name={`A: ${reportA.name || 'Relatório A'}`}
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="unidadesB"
                    name={`B: ${reportB.name || 'Relatório B'}`}
                    fill="#F97316"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. COLUNAS LADO A LADO: TOP MODELOS, CIDADES E EQUIPES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LADO A: Resumo do Relatório A */}
            <div className={`p-6 rounded-2xl border flex flex-col gap-6 ${
              darkMode ? 'bg-[#111827] border-blue-900/30' : 'bg-white border-blue-200 shadow-sm'
            }`}>
              <div className={`flex items-center justify-between border-b pb-3 ${
                darkMode ? 'border-blue-950' : 'border-blue-100'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                  <h4 className={`font-display font-bold text-sm ${
                    darkMode ? 'text-blue-300' : 'text-[#0F2D59]'
                  }`}>
                    {reportA.name}
                  </h4>
                </div>
                <span className={`text-xs font-mono font-medium ${
                  darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {reportA.periodStart} - {reportA.periodEnd}
                </span>
              </div>

              {/* Top 5 Modelos A */}
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider mb-2 block ${
                  darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Top 5 Modelos Analisados
                </span>
                <div className="flex flex-col gap-2">
                  {reportA.charts.top10Modelos?.slice(0, 5).map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between text-xs p-2.5 rounded-lg border transition-colors ${
                        darkMode
                          ? 'bg-slate-900/60 border-slate-800 text-slate-200'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <span className="font-semibold truncate max-w-[200px]">{m.name}</span>
                      <span className={`font-mono font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {m.qtd} un
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top 5 Cidades A */}
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider mb-2 block ${
                  darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Desempenho por Cidade (Reap + RMA)
                </span>
                <div className="flex flex-col gap-2">
                  {reportA.charts.cidadeDestino?.slice(0, 5).map((c, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between text-xs p-2.5 rounded-lg border transition-colors ${
                        darkMode
                          ? 'bg-slate-900/60 border-slate-800 text-slate-200'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <span className="font-semibold">{c.cidade}</span>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {c.equip} un
                        </span>
                        <span className={`font-mono font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {c.taxaResol}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* LADO B: Resumo do Relatório B */}
            <div className={`p-6 rounded-2xl border flex flex-col gap-6 ${
              darkMode ? 'bg-[#111827] border-orange-900/30' : 'bg-white border-orange-200 shadow-sm'
            }`}>
              <div className={`flex items-center justify-between border-b pb-3 ${
                darkMode ? 'border-orange-950' : 'border-orange-100'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-orange-500"></span>
                  <h4 className={`font-display font-bold text-sm ${
                    darkMode ? 'text-orange-300' : 'text-[#0F2D59]'
                  }`}>
                    {reportB.name}
                  </h4>
                </div>
                <span className={`text-xs font-mono font-medium ${
                  darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {reportB.periodStart} - {reportB.periodEnd}
                </span>
              </div>

              {/* Top 5 Modelos B */}
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider mb-2 block ${
                  darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Top 5 Modelos Analisados
                </span>
                <div className="flex flex-col gap-2">
                  {reportB.charts.top10Modelos?.slice(0, 5).map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between text-xs p-2.5 rounded-lg border transition-colors ${
                        darkMode
                          ? 'bg-slate-900/60 border-slate-800 text-slate-200'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <span className="font-semibold truncate max-w-[200px]">{m.name}</span>
                      <span className={`font-mono font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                        {m.qtd} un
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top 5 Cidades B */}
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider mb-2 block ${
                  darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Desempenho por Cidade (Reap + RMA)
                </span>
                <div className="flex flex-col gap-2">
                  {reportB.charts.cidadeDestino?.slice(0, 5).map((c, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between text-xs p-2.5 rounded-lg border transition-colors ${
                        darkMode
                          ? 'bg-slate-900/60 border-slate-800 text-slate-200'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <span className="font-semibold">{c.cidade}</span>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {c.equip} un
                        </span>
                        <span className={`font-mono font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {c.taxaResol}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODE 2: DUAL A4 PAGES VIEW ===================== */}
      {viewMode === 'dualA4' && (
        <div className="flex flex-col gap-3 sm:gap-4 animate-in fade-in duration-200">
          
          {/* Dual Document Controls Bar */}
          <div className={`p-2.5 sm:p-3 rounded-xl border shadow-sm flex flex-wrap items-center justify-between gap-3 ${
            darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Page Navigation with Previous / Next Arrows */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border font-bold text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 disabled:hover:bg-slate-800'
                      : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 disabled:hover:bg-white shadow-xs'
                  }`}
                  title="Página Anterior (Voltar)"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4 text-orange-500" />
                  <span className="hidden sm:inline font-semibold">Anterior</span>
                </button>

                <div className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 font-bold ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-800'
                }`}>
                  <span className="text-orange-500 font-extrabold">Pág {currentPage}</span>
                  <span className="text-slate-400 font-bold">/</span>
                  <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{totalPages}</span>
                </div>

                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border font-bold text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 disabled:hover:bg-slate-800'
                      : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 disabled:hover:bg-white shadow-xs'
                  }`}
                  title="Próxima Página (Avançar)"
                  aria-label="Próxima página"
                >
                  <span className="hidden sm:inline font-semibold">Próxima</span>
                  <ChevronRight className="h-4 w-4 text-orange-500" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isFullscreen && (
                <button
                  onClick={() => setViewMode('metrics')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs'
                  }`}
                  title="Ver Métricas e Deltas"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Métricas</span>
                </button>
              )}

              {/* Dual A4 Fullscreen shortcut */}
              <button
                onClick={toggleFullscreen}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isFullscreen
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                    : darkMode
                      ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                      : 'border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs'
                }`}
                title={isFullscreen ? 'Sair da Tela Cheia (Esc)' : 'Visualizar Documentos em Tela Cheia'}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5" />
                    <span>Sair da Tela Cheia</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>Tela Cheia</span>
                  </>
                )}
              </button>

              {isFullscreen && (
                <button
                  onClick={onClose}
                  className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center cursor-pointer ${
                    darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs'
                  }`}
                  title="Fechar Comparador"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* DUAL SPLIT SCREEN VIEW */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 w-full">
            {/* COLUMN A */}
            <div className={`rounded-2xl border flex flex-col overflow-hidden shadow-md ${
              darkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-[#E2E8F0] border-slate-300'
            }`}>
              {/* Column Header */}
              <div className="bg-blue-600 text-white p-2.5 sm:p-3 px-3 sm:px-4 flex items-center justify-between text-xs shrink-0 gap-2 shadow-xs">
                <div className="flex items-center gap-2 truncate min-w-0">
                  <span className="font-black px-1.5 py-0.5 rounded bg-blue-800 text-white text-[10px] shrink-0">A</span>
                  <span className="font-bold truncate">{reportA.name}</span>
                  {reportAMonth && (
                    <span className="bg-blue-800/90 text-blue-100 border border-blue-400/50 px-2 py-0.5 rounded font-extrabold text-[11px] shrink-0 tracking-wide shadow-xs">
                      {reportAMonth}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-blue-100 font-medium shrink-0 ml-2">Página {currentPage} de {totalPages}</span>
              </div>

              {/* Page Preview Container with Paginated View & Auto-Fit */}
              <div
                ref={columnARef}
                onScroll={handleScrollA}
                className="overflow-y-auto overflow-x-hidden w-full p-2 sm:p-4 flex flex-col items-center h-[750px] sm:h-[820px] xl:h-[880px] transition-all scroll-smooth"
                style={{
                  maxHeight: isFullscreen ? 'calc(100vh - 110px)' : undefined,
                  height: isFullscreen ? 'calc(100vh - 110px)' : undefined,
                }}
              >
                <PDFReportView
                  report={reportA}
                  darkMode={false}
                  viewModeOverride="paged"
                  controlledPage={currentPage}
                  fitScale={fitScale}
                  hideHeaderControls={true}
                />
              </div>
            </div>

            {/* COLUMN B */}
            <div className={`rounded-2xl border flex flex-col overflow-hidden shadow-md ${
              darkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-[#E2E8F0] border-slate-300'
            }`}>
              {/* Column Header */}
              <div className="bg-orange-600 text-white p-2.5 sm:p-3 px-3 sm:px-4 flex items-center justify-between text-xs shrink-0 gap-2 shadow-xs">
                <div className="flex items-center gap-2 truncate min-w-0">
                  <span className="font-black px-1.5 py-0.5 rounded bg-orange-800 text-white text-[10px] shrink-0">B</span>
                  <span className="font-bold truncate">{reportB.name}</span>
                  {reportBMonth && (
                    <span className="bg-orange-800/90 text-orange-100 border border-orange-300/50 px-2 py-0.5 rounded font-extrabold text-[11px] shrink-0 tracking-wide shadow-xs">
                      {reportBMonth}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-orange-100 font-medium shrink-0 ml-2">Página {currentPage} de {totalPages}</span>
              </div>

              {/* Page Preview Container with Paginated View & Auto-Fit */}
              <div
                ref={columnBRef}
                onScroll={handleScrollB}
                className="overflow-y-auto overflow-x-hidden w-full p-2 sm:p-4 flex flex-col items-center h-[750px] sm:h-[820px] xl:h-[880px] transition-all scroll-smooth"
                style={{
                  maxHeight: isFullscreen ? 'calc(100vh - 110px)' : undefined,
                  height: isFullscreen ? 'calc(100vh - 110px)' : undefined,
                }}
              >
                <PDFReportView
                  report={reportB}
                  darkMode={false}
                  viewModeOverride="paged"
                  controlledPage={currentPage}
                  fitScale={fitScale}
                  hideHeaderControls={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
