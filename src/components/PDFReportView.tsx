import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Printer, ChevronLeft, ChevronRight, LayoutGrid, FileText } from 'lucide-react';
import { GeneratedReport } from '../types';
import { getReportRecordsFirestore } from '../lib/firebase.js';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  LabelList,
} from 'recharts';

interface PDFReportViewProps {
  report: GeneratedReport;
  darkMode: boolean;
  autoPrint?: boolean;
}

export default function PDFReportView({ report, darkMode, autoPrint }: PDFReportViewProps) {
  const [activePageView, setActivePageView] = useState<'paged' | 'full'>(autoPrint ? 'full' : 'paged');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = 18;

  const metrics = report.metrics;
  const charts = report.charts;
  const insights = report.insights;

  // Dynamically compute the most productive team excluding "Não Informado" or empty strings
  const sortedEquipes = [...(charts.equipeDestino || [])]
    .filter(eq => eq.equipe && eq.equipe.trim() !== '' && eq.equipe.toLowerCase() !== 'não informado' && eq.equipe.toLowerCase() !== 'nao informado')
    .sort((a, b) => b.equip - a.equip);
  const realEquipeMaisProdutiva = sortedEquipes[0]?.equipe || 'N/A';
  const realEquipeMaisProdutivaQtd = sortedEquipes[0]?.equip || 0;

  const [downloadingWord, setDownloadingWord] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const handleDownloadWord = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (downloadingWord) return;
    setDownloadingWord(true);
    try {
      const response = await fetch('/api/reports/download/word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Relatorio_RBT_${report.id}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert('Erro ao gerar o arquivo Word.');
      }
    } catch (err) {
      console.error('Erro no download do Word:', err);
      alert('Erro ao se conectar com o servidor.');
    } finally {
      setDownloadingWord(false);
    }
  };

  const handleDownloadExcel = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (downloadingExcel) return;
    setDownloadingExcel(true);
    try {
      const records = await getReportRecordsFirestore(report.id);
      if (!records || records.length === 0) {
        // Fallback to direct GET in case no local records found
        window.open(`/api/reports/${report.id}/download/excel`, '_blank');
        return;
      }

      const response = await fetch('/api/reports/download/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, id: report.id }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Dados_RBT_${report.id}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        window.open(`/api/reports/${report.id}/download/excel`, '_blank');
      }
    } catch (err) {
      console.error('Erro no download do Excel:', err);
      window.open(`/api/reports/${report.id}/download/excel`, '_blank');
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Filtered charts to ensure zero-valued items are removed and we always have clean top 10 lists
  const top10ModelosFiltered = (charts.top10Modelos || []).filter(m => m.qtd > 0);
  const top10RmaModelosFiltered = (charts.top10RmaModelos || []).filter(m => m.percentage > 0);
  const top10DescarteModelosFiltered = (charts.top10DescarteModelos || []).filter(m => m.percentage > 0);
  const top10ReaproveitamentoModelosFiltered = (charts.top10ReaproveitamentoModelos || []).filter(m => m.percentage > 0);

  const defeitosOutrosFiltered = (charts.defeitosOutros || []).filter(m => m.qtd > 0).slice(0, 10);
  const defeitosAntenasFiltered = (charts.defeitosAntenas || []).filter(m => m.qtd > 0).slice(0, 10);
  const descarteOutrosFiltered = (charts.descarteOutros || []).filter(m => m.qtd > 0).slice(0, 10);
  const descarteAntenasFiltered = (charts.descarteAntenas || []).filter(m => m.qtd > 0).slice(0, 10);

  const handlePrint = () => {
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;
    if (isIframe) {
      // In development iframe, window.print is blocked. Open in new tab where it will print automatically in the same tab!
      window.open(`?printReportId=${report.id}`, '_blank');
      return;
    }
    // Switch to full view first so all pages are rendered for print
    setActivePageView('full');
    setTimeout(() => {
      window.print();
    }, 300);
  };

  useEffect(() => {
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;
    if (autoPrint && !isIframe) {
      // Small timeout to let Recharts SVG charts render before initiating browser print dialog
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  // Renders the common running header for pages 2 to 20
  const renderHeader = (pageNum: number) => (
    <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-6 text-[10px] text-slate-500 font-sans uppercase tracking-wider no-print">
      <div className="font-semibold">RBT Internet | Controle de Laboratório & RMA</div>
      <div>Relatório Gerencial • {new Date(report.createdAt).toLocaleDateString('pt-BR')}</div>
    </div>
  );

  // Renders the common running footer for pages 2 to 20
  const renderFooter = (pageNum: number) => (
    <div className="absolute bottom-6 left-[20mm] right-[20mm] flex justify-between items-center border-t border-slate-200 pt-2 text-[10px] text-slate-400 font-sans no-print">
      <div>Relatório gerado automaticamente a partir dos dados operacionais do laboratório.</div>
      <div className="font-bold">Página {pageNum}</div>
    </div>
  );

  // Render Page Content
  const renderPageContent = (pageNum: number) => {
    switch (pageNum) {
      case 1:
        // COVER PAGE
        return (
          <div className="flex-1 bg-white text-slate-800 p-12 flex flex-col justify-between h-full relative font-sans select-none">
            {/* Top orange line */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#E36F1E]" />

            <div className="mt-8">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-orange-600 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                    Relatório Executivo
                  </span>
                  <h1 className="text-4xl md:text-5xl font-display font-bold mt-6 tracking-tight leading-none text-[#0F2D59]">
                    Controle de Laboratório<br />& RMA
                  </h1>
                  <p className="text-lg text-slate-700 mt-6 font-medium">
                    Relatório Gerencial de Análise de Dados
                  </p>
                </div>
                <img src="/logo-vermelho.png" alt="RBT Internet Logo" className="h-24 w-24 object-contain opacity-90" />
              </div>
            </div>

            <div className="mb-8 border-t border-slate-200">
              <table className="w-full text-xs text-left">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-2.5 font-bold text-orange-600 w-1/3">Período analisado:</td>
                    <td className="py-2.5 text-slate-700">{report.periodStart} até {report.periodEnd}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2.5 font-bold text-orange-600">Data de geração:</td>
                    <td className="py-2.5 text-slate-700">{new Date(report.createdAt).toLocaleDateString('pt-BR')}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2.5 font-bold text-orange-600">Empresa:</td>
                    <td className="py-2.5 text-slate-700">RBT Internet</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2.5 font-bold text-orange-600">Responsável técnico:</td>
                    <td className="py-2.5 text-slate-700">{metrics.responsavelTop || 'Eduardo'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bottom orange line */}
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-[#E36F1E]" />
          </div>
        );

      case 2:
        // TABLE OF CONTENTS (SUMÁRIO)
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800">
            <div>
              {renderHeader(pageNum)}
              <h2 className="text-2xl font-display font-bold text-[#0F2D59] mb-8">Sumário</h2>
              
              <div className="flex flex-col gap-3 font-sans text-xs">
                {[
                  { name: 'Sumário Executivo', page: 3 },
                  { name: 'Volume de Equipamentos e Evolução Temporal', page: 4 },
                  { name: 'Destino Final dos Equipamentos', page: 6 },
                  { name: 'Origem dos Equipamentos × Destino Final', page: 7 },
                  { name: 'Análise por Modelo', page: 8 },
                  { name: 'Motivos de Defeito e Descarte', page: 11 },
                  { name: 'Desempenho por Cidade', page: 13 },
                  { name: 'Desempenho por Equipe', page: 14 },
                  { name: 'Indicadores de Produtividade', page: 15 },
                  { name: 'Indicadores Avançados', page: 16 },
                  { name: 'Insights Gerenciais Gerados por IA', page: 17 },
                  { name: 'Conclusão Executiva', page: 18 },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between border-b border-dashed border-slate-200 pb-1.5">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-slate-700">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-400">Pág. {item.page}</span>
                  </div>
                ))}
              </div>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      case 3:
        // 1. SUMÁRIO EXECUTIVO
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800">
            <div>
              {renderHeader(pageNum)}
              <h2 className="text-2xl font-display font-bold text-[#0F2D59] mb-4">1. Sumário Executivo</h2>
              <p className="text-xs leading-relaxed text-slate-600 mb-6 font-sans">
                {insights.resumoExecutivo}
              </p>

              {/* Indicator Grid */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { border: 'border-t-4 border-[#0F2D59]', val: metrics.totalRecords, label: 'REGISTROS', sub: 'linhas processadas' },
                  { border: 'border-t-4 border-[#0284C7]', val: metrics.totalEquipments, label: 'EQUIPAMENTOS', sub: 'soma de QTD' },
                  { border: 'border-t-4 border-[#0F2D59]', val: metrics.totalModels, label: 'MODELOS', sub: 'distintos' },
                  { border: 'border-t-4 border-[#F59E0B]', val: metrics.totalCities, label: 'CIDADES', sub: 'atendidas' },
                  { border: 'border-t-4 border-[#10B981]', val: `${metrics.taxaReaproveitamento}%`, label: 'REAPROVEITAMENTO', sub: `${metrics.totalReaproveitados} unidades` },
                  { border: 'border-t-4 border-[#EF4444]', val: `${metrics.taxaDescarte}%`, label: 'DESCARTE', sub: `${metrics.totalDescarte} unidades` },
                  { border: 'border-t-4 border-[#F59E0B]', val: `${metrics.taxaRma}%`, label: 'RMA', sub: `${metrics.totalRma} unidades` },
                  { border: 'border-t-4 border-[#0F2D59]', val: metrics.totalTeams, label: 'EQUIPES', sub: 'envolvidas' },
                ].map((ind, idx) => (
                  <div key={idx} className={`bg-slate-50 border border-slate-100 rounded-lg p-3 ${ind.border} flex flex-col justify-between h-20`}>
                    <span className="text-lg font-display font-bold text-slate-800 leading-none">{ind.val}</span>
                    <div className="mt-1">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">{ind.label}</span>
                      <span className="text-[8px] text-slate-400 block">{ind.sub}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Principais Achados */}
              <h3 className="text-sm font-display font-bold text-[#0F2D59] mb-3">Principais Achados</h3>
              <div className="flex flex-col gap-2 font-sans text-[10px] leading-relaxed">
                <div className="p-3 bg-green-500/5 border-l-4 border-green-500 rounded-r-lg flex items-start gap-2.5">
                  <span className="text-green-600 font-bold">●</span>
                  <p className="text-slate-700">
                    <strong className="text-slate-900">Alta taxa de reaproveitamento ({metrics.taxaReaproveitamento}%)</strong>, indicando elevada eficiência no processo de triagem e recuperação de equipamentos.
                  </p>
                </div>
                <div className="p-3 bg-amber-500/5 border-l-4 border-amber-500 rounded-r-lg flex items-start gap-2.5">
                  <span className="text-amber-600 font-bold">▲</span>
                  <p className="text-slate-700">
                    O modelo <strong className="text-slate-900">{metrics.modeloCritico}</strong> apresentou taxa de descarte de <strong className="text-slate-900">{metrics.modeloCriticoDescarteTaxa}%</strong>, acima da média da base.
                  </p>
                </div>
                <div className="p-3 bg-red-500/5 border-l-4 border-red-500 rounded-r-lg flex items-start gap-2.5">
                  <span className="text-red-600 font-bold">■</span>
                  <p className="text-slate-700">
                    O modelo <strong className="text-slate-900">{metrics.modeloMaisReaproveitado}</strong> registrou <strong className="text-slate-900">{metrics.modeloMaisReaproveitadoTaxa}%</strong> de envios para reaproveitamento, indicando excelente durabilidade.
                  </p>
                </div>
                <div className="p-3 bg-amber-500/5 border-l-4 border-amber-500 rounded-r-lg flex items-start gap-2.5">
                  <span className="text-amber-600 font-bold">▲</span>
                  <p className="text-slate-700">
                    A cidade de <strong className="text-slate-900">{metrics.cidadeCritica}</strong> concentra a maior taxa de falha (<strong className="text-slate-900">{metrics.cidadeCriticaRmaTaxa}%</strong> entre descarte e RMA), sugerindo intervenção preventiva.
                  </p>
                </div>
              </div>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      case 4:
        // 2. VOLUME DE EQUIPAMENTOS E EVOLUÇÃO TEMPORAL
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800">
            <div>
              {renderHeader(pageNum)}
              <h2 className="text-2xl font-display font-bold text-[#0F2D59] mb-4">2. Volume de Equipamentos e Evolução Temporal</h2>

              {/* Metrics block */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'TOTAL RECEBIDO', val: metrics.totalEquipments, border: 'border-l-4 border-[#0F2D59]' },
                  { label: 'REAPROVEITADOS', val: metrics.totalReaproveitados, border: 'border-l-4 border-[#10B981]' },
                  { label: 'DESCARTADOS', val: metrics.totalDescarte, border: 'border-l-4 border-[#EF4444]' },
                  { label: 'ENVIADOS RMA', val: metrics.totalRma, border: 'border-l-4 border-[#F59E0B]' },
                ].map((m, idx) => (
                  <div key={idx} className={`bg-slate-50 border border-slate-100 rounded-lg p-3 ${m.border}`}>
                    <span className="text-[8px] font-bold text-slate-400 block mb-1">{m.label}</span>
                    <span className="text-lg font-display font-bold text-slate-800">{m.val}</span>
                  </div>
                ))}
              </div>

              {/* Chart 1: Monthly scatter/line chart */}
              <h3 className="text-xs font-display font-bold text-[#0F2D59] text-center mb-2">Volume de Equipamentos Processados por Mês</h3>
              <div className="h-44 w-full mb-6 text-[8px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.volumeMensal} margin={{ top: 20, right: 15, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Area type="monotone" dataKey="qtd" stroke="#0F2D59" fill="#0F2D59" fillOpacity={0.1} strokeWidth={2} isAnimationActive={false} dot={{ r: 4, fill: '#0F2D59', stroke: '#0F2D59', strokeWidth: 1 }}>
                      <LabelList dataKey="qtd" position="top" style={{ fontSize: 9, fontWeight: 'bold', fill: '#0F2D59' }} />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 2: Daily Area Chart */}
              <h3 className="text-xs font-display font-bold text-[#0F2D59] text-center mb-2">Equipamentos Recebidos por Dia</h3>
              <div className="h-40 w-full text-[8px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.evolucaoTemporal} margin={{ top: 20, right: 15, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Area type="monotone" dataKey="qtd" stroke="#0284C7" fill="#0284C7" fillOpacity={0.1} strokeWidth={2} isAnimationActive={false} dot={{ r: 2.5, fill: '#0284C7', stroke: '#0284C7', strokeWidth: 1 }}>
                      <LabelList dataKey="qtd" position="top" style={{ fontSize: 7, fontWeight: 'bold', fill: '#0284C7' }} />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      case 5:
        // DESTINO FINAL POR MÊS & INTERPRETAÇÃO
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800">
            <div>
              {renderHeader(pageNum)}
              <h2 className="text-xl font-display font-bold text-[#0F2D59] text-center mb-4">Destino Final por Mês</h2>

              {/* Vertical Bar Chart (Grouped) */}
              <div className="h-72 w-full mb-8 text-[8px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.destinoPorMes} margin={{ top: 25, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    <Bar dataKey="Descarte" fill="#EF4444" isAnimationActive={false}>
                      <LabelList dataKey="Descarte" position="top" style={{ fontSize: 7, fontWeight: 'bold', fill: '#EF4444' }} formatter={(v: number) => v > 0 ? v : ''} />
                    </Bar>
                    <Bar dataKey="RMA" fill="#F59E0B" isAnimationActive={false}>
                      <LabelList dataKey="RMA" position="top" style={{ fontSize: 7, fontWeight: 'bold', fill: '#F59E0B' }} formatter={(v: number) => v > 0 ? v : ''} />
                    </Bar>
                    <Bar dataKey="Reaproveitado" fill="#10B981" isAnimationActive={false}>
                      <LabelList dataKey="Reaproveitado" position="top" style={{ fontSize: 7, fontWeight: 'bold', fill: '#10B981' }} formatter={(v: number) => v > 0 ? v : ''} />
                    </Bar>
                    <Bar dataKey="Venda" fill="#0284C7" isAnimationActive={false}>
                      <LabelList dataKey="Venda" position="top" style={{ fontSize: 7, fontWeight: 'bold', fill: '#0284C7' }} formatter={(v: number) => v > 0 ? v : ''} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Interpretation */}
              <h3 className="text-sm font-display font-bold text-[#0F2D59] mb-3">Interpretação</h3>
              <p className="text-xs leading-relaxed text-slate-600 font-sans">
                {insights.proximosMeses}
              </p>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      case 6:
        // 3. DESTINO FINAL DOS EQUIPAMENTOS
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800">
            <div>
              {renderHeader(pageNum)}
              <h2 className="text-2xl font-display font-bold text-[#0F2D59] mb-4">3. Destino Final dos Equipamentos</h2>

              {/* Donut Chart */}
              <div className="flex justify-center items-center h-48 w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.destinoFinal}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={55}
                      paddingAngle={5}
                      dataKey="value"
                      isAnimationActive={false}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {charts.destinoFinal.map((entry, index) => {
                        const COLORS = ['#10B981', '#EF4444', '#0284C7', '#F59E0B'];
                        return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                      })}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Destino Table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-[10px] text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0F2D59] text-white">
                      <th className="p-2.5 font-bold">Destino</th>
                      <th className="p-2.5 font-bold text-center">Quantidade</th>
                      <th className="p-2.5 font-bold text-center">Percentual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {charts.destinoFinal.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold text-slate-700">{d.name}</td>
                        <td className="p-2.5 text-center font-mono text-slate-600">{d.value}</td>
                        <td className="p-2.5 text-center font-bold text-slate-800">{d.percentage}%</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-2.5 text-[#0F2D59]">TOTAL</td>
                      <td className="p-2.5 text-center font-mono text-slate-800">{metrics.totalEquipments}</td>
                      <td className="p-2.5 text-center text-slate-800">100,0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Análise text */}
              <h3 className="text-xs font-display font-bold text-[#0F2D59] mb-2">Análise</h3>
              <p className="text-[10px] leading-relaxed text-slate-600 font-sans">
                O laboratório técnico apresenta uma capacidade de recuperação consolidada de <strong className="text-slate-800">{metrics.taxaReaproveitamento}%</strong>, evidenciando excelente economia e sustentabilidade no reaproveitamento de ativos de telecomunicações. As perdas representadas por descartes e envio de RMA estão em patamares saudáveis.
              </p>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      case 7:
        // 4. ORIGEM DOS EQUIPAMENTOS x DESTINO FINAL
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800">
            <div>
              {renderHeader(pageNum)}
              <h2 className="text-2xl font-display font-bold text-[#0F2D59] mb-4">4. Origem dos Equipamentos × Destino Final</h2>

              {/* Matrix Layout Grid */}
              <h3 className="text-xs font-display font-bold text-[#0F2D59] text-center mb-3">Origem × Destino Final (quantidade)</h3>
              <div className="grid grid-cols-4 gap-2 mb-6 text-center font-mono text-[10px]">
                {/* Headers */}
                <div className="bg-slate-100 p-2 font-bold font-sans">Origem</div>
                <div className="bg-red-500/10 text-red-600 p-2 font-bold font-sans">Descarte</div>
                <div className="bg-amber-500/10 text-amber-600 p-2 font-bold font-sans">RMA</div>
                <div className="bg-green-500/10 text-green-600 p-2 font-bold font-sans">Reaproveitado</div>

                {charts.origemDestino.map((od, idx) => (
                  <React.Fragment key={idx}>
                    <div className="bg-slate-50 p-2 font-bold text-slate-700 text-left font-sans">{od.origem}</div>
                    <div className="bg-slate-50/50 p-2 text-slate-600 font-bold">{od.Descarte}</div>
                    <div className="bg-slate-50/50 p-2 text-slate-600 font-bold">{od.RMA}</div>
                    <div className="bg-[#0F2D59]/5 text-[#0F2D59] p-2 font-black">{od.Reaproveitado}</div>
                  </React.Fragment>
                ))}
              </div>

              {/* Table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-[9px] text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0F2D59] text-white">
                      <th className="p-2 font-bold">Origem</th>
                      <th className="p-2 text-center font-bold">Total</th>
                      <th className="p-2 text-center font-bold">Reaproveitado</th>
                      <th className="p-2 text-center font-bold">RMA</th>
                      <th className="p-2 text-center font-bold">Descarte</th>
                      <th className="p-2 text-center font-bold">% Reap.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {charts.origemDestino.map((od, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-semibold text-slate-700">{od.origem}</td>
                        <td className="p-2 text-center font-mono text-slate-600">{od.total}</td>
                        <td className="p-2 text-center font-mono text-slate-600">{od.Reaproveitado}</td>
                        <td className="p-2 text-center font-mono text-slate-600">{od.RMA}</td>
                        <td className="p-2 text-center font-mono text-slate-600">{od.Descarte}</td>
                        <td className="p-2 text-center font-bold text-slate-800">{od['%Reap']}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Analysis */}
              <h3 className="text-xs font-display font-bold text-[#0F2D59] mb-2">Análise</h3>
              <p className="text-[10px] leading-relaxed text-slate-600 font-sans">
                O canal de Recolhimento de campo demonstra maior aproveitamento, com taxas superiores de integridade de hardware. Já os dispositivos encaminhados como Caixa de OS carregam reclamações ativas de assinantes, exigindo testes funcionais calibrados e gerando um volume considerável de envio de RMA devido a falhas críticas.
              </p>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      case 8:
        // 5. ANÁLISE POR MODELO
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800">
            <div>
              {renderHeader(pageNum)}
              <h2 className="text-2xl font-display font-bold text-[#0F2D59] mb-6">5. Análise por Modelo</h2>

              {/* Top 10 Modelos */}
              <h3 className="text-xs font-display font-bold text-[#0F2D59] text-center mb-4">Top 10 Modelos Mais Processados (unidades)</h3>
              <div className="h-80 w-full text-[8px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={top10ModelosFiltered}
                    layout="vertical"
                    margin={{ top: 5, right: 35, left: 15, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} tick={{ fontSize: 10, fontWeight: 500 }} />
                    <Tooltip />
                    <Bar dataKey="qtd" fill="#0F2D59" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fontWeight: 'bold', fill: '#1e293b' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      case 9:
        // TAXAS POR MODELO (RMA vs DESCARTE)
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800">
            <div>
              {renderHeader(pageNum)}
              <h2 className="text-2xl font-display font-bold text-[#0F2D59] mb-4">Taxas por modelo</h2>

              {/* RMA rate */}
              <h3 className="text-xs font-display font-bold text-[#0F2D59] text-center mb-2">Taxa de RMA por Modelo (%)</h3>
              <div className="h-[340px] w-full mb-8 text-[8px]">
                {top10RmaModelosFiltered.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={top10RmaModelosFiltered}
                      layout="vertical"
                      margin={{ top: 5, right: 35, left: 15, bottom: 5 }}
                      barSize={16}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#94a3b8" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} tick={{ fontSize: 10, fontWeight: 500 }} />
                      <Tooltip />
                      <Bar dataKey="percentage" fill="#F59E0B" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                        <LabelList dataKey="percentage" position="right" formatter={(val: number) => `${val}%`} style={{ fontSize: 9, fontWeight: 'bold', fill: '#1e293b' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl text-slate-400 italic">
                    Sem registros de RMA para modelos no período
                  </div>
                )}
              </div>

              {/* Descarte rate */}
              <h3 className="text-xs font-display font-bold text-[#0F2D59] text-center mb-2">Taxa de Descarte por Modelo (%)</h3>
              <div className="h-[380px] w-full text-[8px]">
                {top10DescarteModelosFiltered.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={top10DescarteModelosFiltered}
                      layout="vertical"
                      margin={{ top: 5, right: 35, left: 15, bottom: 5 }}
                      barSize={20}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#94a3b8" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} tick={{ fontSize: 10, fontWeight: 500 }} />
                      <Tooltip />
                      <Bar dataKey="percentage" fill="#EF4444" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                        <LabelList dataKey="percentage" position="right" formatter={(val: number) => `${val}%`} style={{ fontSize: 9, fontWeight: 'bold', fill: '#1e293b' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl text-slate-400 italic">
                    Sem registros de descarte para modelos no período
                  </div>
                )}
              </div>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      case 10:
        // TAXA REAPROVEITAMENTO & ANÁLISE AUTOMATIZADA
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800">
            <div>
              {renderHeader(pageNum)}
              
              {/* Reaproveitamento rate */}
              <h3 className="text-xs font-display font-bold text-[#0F2D59] text-center mb-4">Taxa de Reaproveitamento por Modelo (%)</h3>
              <div className="h-[380px] w-full mb-8 text-[8px]">
                {top10ReaproveitamentoModelosFiltered.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={top10ReaproveitamentoModelosFiltered}
                      layout="vertical"
                      margin={{ top: 5, right: 35, left: 15, bottom: 5 }}
                      barSize={20}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#94a3b8" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} tick={{ fontSize: 10, fontWeight: 500 }} />
                      <Tooltip />
                      <Bar dataKey="percentage" fill="#10B981" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                        <LabelList dataKey="percentage" position="right" formatter={(val: number) => `${val}%`} style={{ fontSize: 9, fontWeight: 'bold', fill: '#1e293b' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl text-slate-400 italic">
                    Sem registros de reaproveitamento para modelos no período
                  </div>
                )}
              </div>

              {/* Automate Analysis */}
              <h3 className="text-sm font-display font-bold text-[#0F2D59] mb-3">Análise automatizada</h3>
              <p className="text-xs leading-relaxed text-slate-600 font-sans">
                {insights.qualModeloAtenção}
              </p>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      case 11:
        // 6. MOTIVOS DE DEFEITO E DESCARTE (DEFEITOS)
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800">
            <div>
              {renderHeader(pageNum)}
              <h2 className="text-2xl font-display font-bold text-[#0F2D59] mb-4">6. Motivos de Defeito e Descarte</h2>
              <span className="text-xs font-semibold text-slate-500 mb-6 block">Defeitos (Reaproveitado / RMA)</span>

              {/* Defeitos Outros */}
              <h3 className="text-[10px] font-display font-bold text-[#0F2D59] text-center mb-2">Motivos de Defeito — Outros Equipamentos</h3>
              <div className="h-[360px] w-full mb-6 text-[8px]">
                {defeitosOutrosFiltered.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={defeitosOutrosFiltered}
                      layout="vertical"
                      margin={{ top: 5, right: 35, left: 15, bottom: 5 }}
                      barSize={18}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#94a3b8" />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} tick={{ fontSize: 10, fontWeight: 500 }} />
                      <Tooltip />
                      <Bar dataKey="qtd" fill="#0F2D59" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                        <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fontWeight: 'bold', fill: '#1e293b' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl text-slate-400 italic">
                    Sem registros de defeito para outros equipamentos no período
                  </div>
                )}
              </div>

              {/* Defeitos Antenas */}
              <h3 className="text-[10px] font-display font-bold text-[#0F2D59] text-center mb-2">Motivos de Defeito — Antenas e Rádios</h3>
              <div className="h-[360px] w-full text-[8px]">
                {defeitosAntenasFiltered.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={defeitosAntenasFiltered}
                      layout="vertical"
                      margin={{ top: 5, right: 35, left: 15, bottom: 5 }}
                      barSize={18}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#94a3b8" />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} tick={{ fontSize: 10, fontWeight: 500 }} />
                      <Tooltip />
                      <Bar dataKey="qtd" fill="#0F2D59" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                        <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fontWeight: 'bold', fill: '#1e293b' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl text-slate-400 italic">
                    Sem registros de defeito para antenas no período
                  </div>
                )}
              </div>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      case 12:
        // DESCARTES & ANÁLISE DE CAUSAS
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800">
            <div>
              {renderHeader(pageNum)}
              <span className="text-xs font-semibold text-slate-500 mb-6 block">Descartes</span>

              {/* Descarte Outros */}
              <h3 className="text-[10px] font-display font-bold text-[#0F2D59] text-center mb-2">Motivos de Descarte — Outros Equipamentos</h3>
              <div className="h-[360px] w-full mb-6 text-[8px]">
                {descarteOutrosFiltered.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={descarteOutrosFiltered}
                      layout="vertical"
                      margin={{ top: 5, right: 35, left: 15, bottom: 5 }}
                      barSize={18}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#94a3b8" />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} tick={{ fontSize: 10, fontWeight: 500 }} />
                      <Tooltip />
                      <Bar dataKey="qtd" fill="#EF4444" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                        <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fontWeight: 'bold', fill: '#1e293b' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl text-slate-400 italic">
                    Sem registros de descarte para outros equipamentos no período
                  </div>
                )}
              </div>

              {/* Descarte Antenas */}
              <h3 className="text-[10px] font-display font-bold text-[#0F2D59] text-center mb-2">Motivos de Descarte — Antenas e Rádios</h3>
              <div className="h-[360px] w-full mb-6 text-[8px]">
                {descarteAntenasFiltered.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={descarteAntenasFiltered}
                      layout="vertical"
                      margin={{ top: 5, right: 35, left: 15, bottom: 5 }}
                      barSize={18}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#94a3b8" />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} tick={{ fontSize: 10, fontWeight: 500 }} />
                      <Tooltip />
                      <Bar dataKey="qtd" fill="#EF4444" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                        <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fontWeight: 'bold', fill: '#1e293b' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl text-slate-400 italic">
                    Sem registros no período
                  </div>
                )}
              </div>

              {/* Cause analysis */}
              <h3 className="text-sm font-display font-bold text-[#0F2D59] mb-2">Análise de causas</h3>
              <p className="text-[10px] leading-relaxed text-slate-600 font-sans">
                {insights.oQuePiorou}
              </p>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      case 13:
        // 7. DESEMPENHO POR CIDADE
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800">
            <div>
              {renderHeader(pageNum)}
              <h2 className="text-2xl font-display font-bold text-[#0F2D59] mb-4">7. Desempenho por Cidade</h2>

              {/* Equip por cidade stacked bar chart */}
              <h3 className="text-xs font-display font-bold text-[#0F2D59] text-center mb-2">Equipamentos por Cidade e Destino</h3>
              <div className="h-48 w-full mb-6 text-[8px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={charts.cidadeDestino}
                    layout="vertical"
                    margin={{ top: 5, right: 5, left: 15, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="cidade" type="category" stroke="#94a3b8" width={120} tick={{ fontSize: 10, fontWeight: 500 }} />
                    <Tooltip />
                    <Bar dataKey="reap" name="Reaproveitado" fill="#10B981" stackId="a" isAnimationActive={false}>
                      <LabelList dataKey="reap" position="inside" style={{ fontSize: 9, fontWeight: 'bold', fill: '#ffffff' }} formatter={(val: number) => val > 0 ? val : ''} />
                    </Bar>
                    <Bar dataKey="rma" name="RMA" fill="#F59E0B" stackId="a" isAnimationActive={false}>
                      <LabelList dataKey="rma" position="inside" style={{ fontSize: 9, fontWeight: 'bold', fill: '#ffffff' }} formatter={(val: number) => val > 0 ? val : ''} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-[9px] text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0F2D59] text-white">
                      <th className="p-2 font-bold">Cidade</th>
                      <th className="p-2 text-center font-bold">Equip.</th>
                      <th className="p-2 text-center font-bold">Reap.</th>
                      <th className="p-2 text-center font-bold">Descarte</th>
                      <th className="p-2 text-center font-bold">RMA</th>
                      <th className="p-2 text-center font-bold">Taxa Resol.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {charts.cidadeDestino.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-semibold text-slate-700">{c.cidade}</td>
                        <td className="p-2 text-center font-mono text-slate-600">{c.equip}</td>
                        <td className="p-2 text-center font-mono text-slate-600">{c.reap}</td>
                        <td className="p-2 text-center font-mono text-slate-600">{c.descarte}</td>
                        <td className="p-2 text-center font-mono text-slate-600">{c.rma}</td>
                        <td className="p-2 text-center font-bold text-slate-800">{c.taxaResol}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Analysis */}
              <h3 className="text-xs font-display font-bold text-[#0F2D59] mb-2">Análise regional</h3>
              <p className="text-[10px] leading-relaxed text-slate-600 font-sans">
                {insights.qualCidadeProblemas}
              </p>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      case 14:
        // 8. DESEMPENHO POR EQUIPE (GRAPH & TABLE)
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800">
            <div>
              {renderHeader(pageNum)}
              <h2 className="text-2xl font-display font-bold text-[#0F2D59] mb-4">8. Desempenho por Equipe</h2>

              {/* Column Chart */}
              <h3 className="text-xs font-display font-bold text-[#0F2D59] text-center mb-2">Equipamentos Analisados por Equipe</h3>
              <div className="h-44 w-full mb-6 text-[8px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={charts.equipeDestino.slice(0, 10)}
                    margin={{ top: 15, right: 10, left: -25, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="equipe" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="equip" fill="#0F2D59" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      <LabelList dataKey="equip" position="top" style={{ fontSize: 9, fontWeight: 'bold', fill: '#0F2D59' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table of Equipes */}
              <div className="border border-slate-100 rounded-xl overflow-hidden text-[8px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0F2D59] text-white">
                      <th className="p-1.5 font-bold">Equipe</th>
                      <th className="p-1.5 text-center font-bold">Equip.</th>
                      <th className="p-1.5 text-center font-bold">Reap.</th>
                      <th className="p-1.5 text-center font-bold">Descarte</th>
                      <th className="p-1.5 text-center font-bold">RMA</th>
                      <th className="p-1.5 text-center font-bold">Taxa Resol.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {charts.equipeDestino.slice(0, 6).map((eq, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-1.5 font-semibold text-slate-700">{eq.equipe}</td>
                        <td className="p-1.5 text-center font-mono text-slate-600">{eq.equip}</td>
                        <td className="p-1.5 text-center font-mono text-slate-600">{eq.reap}</td>
                        <td className="p-1.5 text-center font-mono text-slate-600">{eq.descarte}</td>
                        <td className="p-1.5 text-center font-mono text-slate-600">{eq.rma}</td>
                        <td className="p-1.5 text-center font-bold text-slate-800">{eq.taxaResol}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Analysis */}
              <h3 className="text-xs font-display font-bold text-[#0F2D59] mt-4 mb-2">Análise de desempenho</h3>
              <p className="text-[10px] leading-relaxed text-slate-600 font-sans">
                A triagem de campo e o diagnóstico preliminar por parte das equipes locais influenciam diretamente na eficiência operacional. A equipe <strong className="text-slate-900">{realEquipeMaisProdutiva}</strong> liderou as entradas com <strong className="text-slate-900">{realEquipeMaisProdutivaQtd}</strong> unidades recolhidas. Recomenda-se realizar cruzamento estatístico periódico das taxas de resolução por equipe de forma a calibrar os treinamentos preventivos de campo.
              </p>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      case 15:
        // 9. INDICADORES DE PRODUTIVIDADE
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800">
            <div>
              {renderHeader(pageNum)}
              <h2 className="text-2xl font-display font-bold text-[#0F2D59] mb-4">9. Indicadores de Produtividade</h2>

              {/* Metric Row */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { name: metrics.responsavelTop || 'Eduardo', label: 'RESPONSÁVEL TOP', sub: `${metrics.responsavelTopQtd} un.` },
                  { name: metrics.resolvidosOS, label: 'RESOLVIDOS', sub: 'Caixa de OS' },
                  { name: metrics.diasUteis, label: 'DIAS ÚTEIS', sub: 'no período' },
                  { name: metrics.mediaDiaria, label: 'MÉDIA/DIA', sub: 'unidades/dia' },
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                    <span className="text-lg font-display font-bold text-slate-800 block leading-none">{item.name}</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase block mt-1">{item.label}</span>
                    <span className="text-[8px] text-slate-400 block">{item.sub}</span>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-[10px] text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0F2D59] text-white">
                      <th className="p-2.5 font-bold">Responsável</th>
                      <th className="p-2.5 text-center font-bold">Qtd. Total</th>
                      <th className="p-2.5 text-center font-bold">Qtd. Caixa de OS</th>
                      <th className="p-2.5 text-center font-bold">Resolvidos (OS)</th>
                      <th className="p-2.5 text-center font-bold">Taxa Resolução OS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {charts.produtividadeResponsavel.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold text-slate-700">{p.responsavel}</td>
                        <td className="p-2.5 text-center font-mono text-slate-600">{p.qtdTotal}</td>
                        <td className="p-2.5 text-center font-mono text-slate-600">{p.qtd}</td>
                        <td className="p-2.5 text-center font-mono text-slate-600">{p.resolvidos}</td>
                        <td className="p-2.5 text-center font-bold text-slate-800">{p.taxaResolucao}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Leitura */}
              <h3 className="text-sm font-display font-bold text-[#0F2D59] mb-2">Leitura</h3>
              <p className="text-xs leading-relaxed text-slate-600 font-sans">
                Toda a operação foi conduzida sob a liderança técnica de <strong className="text-slate-900">{metrics.responsavelTop}</strong>, com uma média diária consolidada de <strong className="text-slate-900">{metrics.mediaDiaria} equipamentos/dia</strong>. A taxa de resolução em chamados de Caixa de OS foi de <strong className="text-slate-900">{metrics.taxaResolucaoOS}%</strong>, que representa o termômetro de produtividade da equipe em restaurar equipamentos defeituosos.
              </p>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      case 16:
        // 10. INDICADORES AVANÇADOS
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800">
            <div>
              {renderHeader(pageNum)}
              <h2 className="text-2xl font-display font-bold text-[#0F2D59] mb-4">10. Indicadores Avançados</h2>

              {/* Table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden mb-6 text-[9px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0F2D59] text-white">
                      <th className="p-2 font-bold">Indicador</th>
                      <th className="p-2 font-bold">Valor</th>
                      <th className="p-2 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {charts.indicadoresAvancados.map((ind, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-semibold text-slate-700">{ind.indicador}</td>
                        <td className="p-2 font-medium text-slate-600">{ind.valor}</td>
                        <td className="p-2 text-center">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            ind.status === 'OK' ? 'text-green-600' : ind.status === 'ATENÇÃO' ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            ● {ind.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Risk details block */}
              <div className="p-3 bg-amber-500/5 border-l-4 border-amber-500 rounded-r-lg font-sans text-xs">
                <p className="text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">▲ Índice de Risco Operacional: {metrics.indiceRiscoOperacional} ({metrics.indiceRiscoStatus === 'OK' ? 'Baixo' : metrics.indiceRiscoStatus === 'ATENÇÃO' ? 'Moderado' : 'Alto'})</strong>. {insights.riscoOperacional}
                </p>
              </div>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      case 17:
        // 11. INSIGHTS GERENCIAIS GERADOS POR IA (PART 1)
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800">
            <div>
              {renderHeader(pageNum)}
              <h2 className="text-2xl font-display font-bold text-[#0F2D59] mb-2">11. Insights Gerenciais Gerados por IA</h2>
              <p className="text-[10px] text-slate-500 mb-6 font-sans">
                Análise interpretativa de alto nível elaborada a partir dos padrões operacionais observados no período.
              </p>

              <div className="flex flex-col gap-4 text-[10px] leading-relaxed">
                <div>
                  <h3 className="font-display font-bold text-[#0F2D59] mb-1.5 uppercase tracking-wide">O que melhorou neste período?</h3>
                  <div className="p-3 bg-green-500/5 border-l-4 border-green-500 rounded-r-lg">
                    <p className="text-slate-700">{insights.oQueMelhorou}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-[#0F2D59] mb-1.5 uppercase tracking-wide">O que piorou?</h3>
                  <div className="p-3 bg-amber-500/5 border-l-4 border-amber-500 rounded-r-lg">
                    <p className="text-slate-700">{insights.oQuePiorou}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-[#0F2D59] mb-1.5 uppercase tracking-wide">Qual modelo merece atenção?</h3>
                  <div className="p-3 bg-amber-500/5 border-l-4 border-amber-500 rounded-r-lg">
                    <p className="text-slate-700">{insights.qualModeloAtenção}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-[#0F2D59] mb-1.5 uppercase tracking-wide">Qual cidade apresentou mais problemas?</h3>
                  <div className="p-3 bg-amber-500/5 border-l-4 border-amber-500 rounded-r-lg">
                    <p className="text-slate-700">{insights.qualCidadeProblemas}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-[#0F2D59] mb-1.5 uppercase tracking-wide">Existe algum risco operacional?</h3>
                  <div className="p-3 bg-amber-500/5 border-l-4 border-amber-500 rounded-r-lg">
                    <p className="text-slate-700">{insights.riscoOperacional}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-[#0F2D59] mb-1.5 uppercase tracking-wide">Onde a equipe deve concentrar esforços no próximo mês?</h3>
                  <div className="p-3 bg-blue-500/5 border-l-4 border-blue-500 rounded-r-lg">
                    <p className="text-slate-700">{insights.ondeConcentrarEsforços}</p>
                  </div>
                </div>
              </div>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      case 18:
        // 12. CONCLUSÃO EXECUTIVA & SIGNATURE
        return (
          <div className="flex-1 flex flex-col justify-between h-full text-slate-800 font-sans">
            <div>
              {renderHeader(pageNum)}
              <h2 className="text-2xl font-display font-bold text-[#0F2D59] mb-6">12. Conclusão Executiva</h2>
              <p className="text-xs leading-relaxed text-slate-600 mb-8">
                {insights.conclusaoExecutiva}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-6 mb-12 flex justify-between items-end text-xs">
              <div>
                <span className="font-bold text-slate-800 block">RBT Internet</span>
                <span className="text-slate-500 block">Laboratório Técnico</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-800 block">Gerado em</span>
                <span className="text-slate-500 block">{new Date(report.createdAt).toLocaleDateString('pt-BR')} às {new Date(report.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            {renderFooter(pageNum)}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#EEF2F7] dark:bg-[#0F172A] overflow-hidden font-sans">
      {/* Top action bar */}
      <div className="no-print print:hidden h-16 shrink-0 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <h2 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200 truncate max-w-sm">
            {report.name}
          </h2>
          <span className="text-xs text-slate-400">
            {report.periodStart} - {report.periodEnd}
          </span>
        </div>

        {/* View selection controls & actions */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-[#0F172A] p-1 rounded-lg flex items-center gap-1 text-xs">
            <button
              onClick={() => setActivePageView('paged')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activePageView === 'paged'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Paginado (A4)
            </button>
            <button
              onClick={() => setActivePageView('full')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activePageView === 'full'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Documento Inteiro
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 py-2 px-3 text-xs bg-[#0F2D59] text-white hover:bg-slate-800 font-semibold rounded-lg shadow transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Main viewport (visible on screen, hidden on print) */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-start print:hidden">
        {activePageView === 'paged' ? (
          /* SINGLE PAGE PAGINATED PREVIEW */
          <div className="flex flex-col items-center justify-center gap-6 py-6">
            {/* Pagination Controls - TOP */}
            <div className="no-print bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl flex items-center justify-between w-full max-w-sm shadow-md text-xs">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Page container */}
            <div className="a4-page relative flex flex-col justify-between shrink-0 select-none">
              {renderPageContent(currentPage)}
            </div>

            {/* Pagination Controls - BOTTOM */}
            <div className="no-print bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl flex items-center justify-between w-full max-w-sm shadow-md text-xs">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          /* CONTINUOUS MULTI-PAGE FLOW VIEW (PERFECT FOR PRINTING SCREEN VIEW) */
          <div className="flex flex-col items-center gap-10 py-6">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <div key={pageNum} className="a4-page relative flex flex-col justify-between shrink-0 break-after-page">
                {renderPageContent(pageNum)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print-only Container (always renders ALL pages for clean PDF print/save) */}
      <div className="print-only-container">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <div key={pageNum} className="a4-page relative flex flex-col justify-between shrink-0 break-after-page">
            {renderPageContent(pageNum)}
          </div>
        ))}
      </div>
    </div>
  );
}
