import React, { useState } from 'react';
import { FileText, Download, Trash2, Calendar, Eye, ArrowLeftRight, CheckSquare, Square } from 'lucide-react';
import { GeneratedReport } from '../types';

interface HistoryViewProps {
  reports: GeneratedReport[];
  onSelect: (report: GeneratedReport, autoPrint?: boolean) => void;
  onDelete: (id: string) => Promise<void>;
  onCompare?: (reportAId?: string, reportBId?: string) => void;
  darkMode: boolean;
}

export default function HistoryView({ reports, onSelect, onDelete, onCompare, darkMode }: HistoryViewProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 2) {
        // Keep the latest selected and add the new one
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const handleLaunchCompare = () => {
    if (!onCompare) return;
    if (selectedIds.length === 2) {
      onCompare(selectedIds[0], selectedIds[1]);
    } else if (selectedIds.length === 1) {
      // Compare with the next available
      const other = reports.find(r => r.id !== selectedIds[0]);
      onCompare(selectedIds[0], other?.id);
    } else {
      onCompare(reports[0]?.id, reports[1]?.id);
    }
  };

  return (
    <div className="w-full font-sans">
      {/* Title & Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`font-display font-bold text-3xl tracking-tight mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            Histórico de Relatórios
          </h1>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Consulte, visualize ou compare documentos gerados pelo laboratório da RBT Internet.
          </p>
        </div>

        {reports.length >= 2 && onCompare && (
          <button
            onClick={() => onCompare(reports[0]?.id, reports[1]?.id)}
            className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs transition-all shadow-md hover:shadow-orange-500/20 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>Comparar 2 Relatórios</span>
          </button>
        )}
      </div>

      {/* Comparison Selection floating banner */}
      {selectedIds.length > 0 && onCompare && (
        <div className="mb-6 p-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shadow-lg animate-in fade-in duration-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black px-2 py-0.5 rounded-full bg-white text-blue-700 text-[10px]">
              {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
            </span>
            <span>
              {selectedIds.length === 1
                ? 'Selecione mais 1 relatório para comparar'
                : 'Pronto para comparar!'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold cursor-pointer"
            >
              Limpar
            </button>
            <button
              onClick={handleLaunchCompare}
              className="px-3.5 py-1.5 rounded-lg bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span>Comparar</span>
            </button>
          </div>
        </div>
      )}

      {reports.length === 0 ? (
        <div className={`border-2 border-dashed rounded-2xl p-16 text-center ${
          darkMode ? 'border-slate-800 bg-[#111827]' : 'border-slate-200 bg-slate-50'
        }`}>
          <FileText className="h-10 w-10 text-slate-400 mx-auto mb-4" />
          <h3 className={`font-display font-semibold text-lg mb-1 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            Nenhum relatório gerado
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            Você ainda não gerou nenhum relatório. Vá para a aba "Upload CSV" e envie um arquivo para começar!
          </p>
        </div>
      ) : (
        <div className={`border rounded-2xl overflow-hidden ${
          darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={darkMode ? 'bg-slate-800/80 text-slate-300 border-b border-slate-800' : 'bg-slate-100 text-slate-600 border-b border-slate-200'}>
                  {onCompare && reports.length >= 2 && (
                    <th className="p-4 w-10 text-center font-semibold">Comparar</th>
                  )}
                  <th className="p-4 font-semibold">Nome do Relatório</th>
                  <th className="p-4 font-semibold">Período Analisado</th>
                  <th className="p-4 font-semibold">Gerado Em</th>
                  <th className="p-4 font-semibold text-center">Equipamentos</th>
                  <th className="p-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className={darkMode ? 'divide-y divide-slate-800 text-slate-300' : 'divide-y divide-slate-200 text-slate-700'}>
                {reports.map((report) => {
                  const isChecked = selectedIds.includes(report.id);
                  return (
                    <tr
                      key={report.id}
                      className={`${
                        isChecked
                          ? darkMode ? 'bg-blue-950/30' : 'bg-blue-50/70'
                          : darkMode ? 'hover:bg-slate-900/20' : 'hover:bg-slate-50'
                      }`}
                    >
                      {onCompare && reports.length >= 2 && (
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleSelect(report.id)}
                            className="text-slate-400 hover:text-blue-500 cursor-pointer p-0.5"
                            title={isChecked ? 'Desmarcar' : 'Selecionar para Comparação'}
                          >
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-sm">{report.name}</span>
                          {report.description && !report.description.includes('Análise gerencial') && (
                            <span className="text-[10px] text-slate-500 max-w-xs truncate">{report.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {report.periodStart} - {report.periodEnd}
                        </div>
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(report.createdAt).toLocaleDateString('pt-BR')} às {new Date(report.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 text-center font-bold">
                        {report.metrics.totalEquipments} un
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                          {/* Comparar */}
                          {onCompare && reports.length >= 2 && (
                            <button
                              onClick={() => {
                                const other = reports.find(r => r.id !== report.id);
                                onCompare(report.id, other?.id);
                              }}
                              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                darkMode ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-amber-50 text-amber-600'
                              }`}
                              title="Comparar este relatório"
                            >
                              <ArrowLeftRight className="h-4 w-4" />
                            </button>
                          )}

                          {/* Visualizar */}
                          <button
                            onClick={() => onSelect(report)}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              darkMode ? 'hover:bg-slate-800 text-white' : 'hover:bg-orange-50 text-orange-600'
                            }`}
                            title="Visualizar PDF"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Baixar PDF */}
                          <button
                            onClick={() => onSelect(report, true)}
                            className={`p-2 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer ${
                              darkMode ? 'hover:bg-slate-800 text-blue-400' : 'hover:bg-blue-50 text-blue-600'
                            }`}
                            title="Baixar Relatório (PDF)"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => {
                              setDeleteConfirmId(report.id);
                            }}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              darkMode ? 'hover:bg-slate-800 text-red-400' : 'hover:bg-red-50 text-red-600'
                            }`}
                            title="Excluir Relatório"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Beautiful custom confirmation modal avoiding iframe sandbox modal blocks */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-6 border animate-in fade-in zoom-in-95 duration-200 ${
            darkMode ? 'bg-[#111827] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="font-display font-bold text-lg mb-2">Excluir Relatório</h3>
            <p className={`text-xs mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Tem certeza que deseja excluir permanentemente este relatório do histórico? Esta ação é irreversível e os dados associados serão perdidos.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const idToDelete = deleteConfirmId;
                  setDeleteConfirmId(null);
                  await onDelete(idToDelete);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
