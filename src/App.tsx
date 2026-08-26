import React, { useState, useEffect } from 'react';
import UploadView from './components/UploadView.js';
import HistoryView from './components/HistoryView.js';
import PDFReportView from './components/PDFReportView.js';
import { GeneratedReport, CSVPreview, ImportError } from './types.js';
import { ChevronLeft, Download, Printer, Sun, Moon } from 'lucide-react';
import { saveReportFirestore, getReportsFirestore, deleteReportFirestore } from './lib/firebase.js';
import { parseAndValidateCSV } from './lib/csv_reader.js';
import { performCalculations } from './lib/calculations.js';
import { generateInsights } from './lib/insights.js';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('rbt_theme');
    return saved !== null ? saved === 'dark' : false;
  });

  const toggleTheme = () => {
    setDarkMode(prev => {
      const newVal = !prev;
      localStorage.setItem('rbt_theme', newVal ? 'dark' : 'light');
      return newVal;
    });
  };

  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [activeReport, setActiveReport] = useState<GeneratedReport | null>(null);
  const [autoPrintActive, setAutoPrintActive] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Load history on mount
  useEffect(() => {
    fetchReports();
  }, []);

  // Handle auto-closing the download print dialog once completed or cancelled
  useEffect(() => {
    if (autoPrintActive) {
      const handleAfterPrint = () => {
        setActiveReport(null);
        setAutoPrintActive(false);
      };
      window.addEventListener('afterprint', handleAfterPrint);
      return () => {
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
  }, [autoPrintActive]);

  // Check URL parameters for direct print/download
  useEffect(() => {
    if (reports.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const printReportId = params.get('printReportId');
      if (printReportId) {
        const report = reports.find(r => r.id === printReportId);
        if (report) {
          setActiveReport(report);
          setAutoPrintActive(true);
          // Remove parameter from URL smoothly
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }
      }
    }
  }, [reports]);

  const fetchReports = async () => {
    try {
      const dbReports = await getReportsFirestore();
      setReports(dbReports);
    } catch (err) {
      console.error('Erro ao buscar histórico no Firebase Firestore:', err);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // 1. Client-Side: Validate CSV
  const handleValidate = async (csvText: string): Promise<{ errors: ImportError[]; preview?: CSVPreview }> => {
    try {
      const data = parseAndValidateCSV(csvText);
      if (data.errors && data.errors.length > 0) {
        showToast('error', `O arquivo contém ${data.errors.length} erro(s) de validação.`);
      } else {
        showToast('success', 'Arquivo CSV validado com sucesso!');
      }
      return data;
    } catch (err: any) {
      showToast('error', err.message || 'Falha ao validar CSV.');
      return { errors: [{ row: 0, column: 'Erro', message: err.message || 'Erro inesperado ao processar o CSV.' }] };
    }
  };

  // 2. Client-Side: Generate Report
  const handleGenerate = async (csvText: string, title: string, description: string): Promise<void> => {
    try {
      const reportTitle = title || `Relatório Operacional - ${new Date().toLocaleDateString('pt-BR')}`;
      const reportDesc = description || 'Gerado automaticamente a partir de dados operacionais do laboratório técnico.';

      const { errors, records, preview } = parseAndValidateCSV(csvText);
      if (errors && errors.length > 0) {
        throw new Error('O arquivo contém erros de validação e não pode ser processado.');
      }

      if (!records || !preview) {
        throw new Error('Erro inesperado ao extrair registros.');
      }

      // Calculations
      const { metrics, charts } = performCalculations(records);

      // Insights
      const insights = generateInsights(metrics);

      // Prepare Report Metadata
      const reportId = 'rep_' + Math.random().toString(36).substring(2, 15);
      const newReport: GeneratedReport = {
        id: reportId,
        name: reportTitle,
        description: reportDesc,
        createdAt: new Date().toISOString(),
        periodStart: preview.dateStart,
        periodEnd: preview.dateEnd,
        metrics,
        charts,
        insights,
        docxUrl: '',
        pdfUrl: '',
      };

      // Save permanently to the shared Firebase Firestore database
      await saveReportFirestore(newReport, records);
      
      setActiveReport(newReport);
      showToast('success', 'Relatório gerado com sucesso!');
      await fetchReports(); // reload history
    } catch (err: any) {
      showToast('error', err.message || 'Falha ao gerar relatório.');
      throw err;
    }
  };

  // 3. Client-Side: Delete Report
  const handleDeleteReport = async (id: string): Promise<void> => {
    try {
      // Delete permanently from the shared Firebase Firestore database
      await deleteReportFirestore(id);
      
      showToast('success', 'Relatório excluído permanentemente do histórico.');
      if (activeReport?.id === id) {
        setActiveReport(null);
      }
      await fetchReports();
    } catch (err: any) {
      showToast('error', 'Falha ao excluir o relatório do banco de dados.');
    }
  };

  const handleSelectReportFromHistory = (report: GeneratedReport, autoPrint: boolean = false) => {
    setActiveReport(report);
    setAutoPrintActive(autoPrint);
  };

  return (
    <div className={`min-h-screen w-full font-sans transition-colors duration-300 ${
      darkMode ? 'bg-[#0F172A] text-slate-100 dark' : 'bg-[#EEF2F7] text-slate-900'
    }`}>
      {/* Toast Alert Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-bounce">
          <div className={`p-4 rounded-xl shadow-2xl border flex items-center gap-3 max-w-sm ${
            toast.type === 'success'
              ? 'bg-emerald-500 border-emerald-400 text-white'
              : 'bg-red-500 border-red-400 text-white'
          }`}>
            <span className="font-semibold text-xs leading-normal">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Navigation Header styled like RBT Lab screenshot */}
      <header className={`${darkMode ? 'bg-[#111827] border-b border-slate-800' : 'bg-[#1E293B] text-white'} py-4 shadow-md print:hidden transition-colors duration-300`}>
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="RBT Internet Logo" className="h-10 w-10 object-contain" />
            <div className="flex flex-col">
              <span className="text-sm font-black text-white tracking-wide uppercase">RBT Lab</span>
              <span className="text-[10px] text-slate-300 font-semibold tracking-wider uppercase">
                Controle de Laboratório & RMA
              </span>
            </div>
          </div>
          
          <button
            onClick={toggleTheme}
            className={`p-2 py-1.5 sm:p-2.5 rounded-xl transition-all flex items-center gap-2 text-xs font-bold border cursor-pointer ${
              darkMode 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700' 
                : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
            }`}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
        </div>
      </header>

      {/* Main Single-Page Content Area */}
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-10 print:hidden">

        {/* Upload Form View */}
        <div className="w-full">
          <UploadView
            onValidate={handleValidate}
            onGenerate={handleGenerate}
            darkMode={darkMode}
          />
        </div>

        {/* Separator */}
        <div className={`border-t my-2 ${darkMode ? 'border-slate-800/80' : 'border-slate-200'}`}></div>

        {/* Reports History List View */}
        <div className="w-full">
          <HistoryView
            reports={reports}
            onSelect={handleSelectReportFromHistory}
            onDelete={handleDeleteReport}
            darkMode={darkMode}
          />
        </div>

      </div>

      {/* Full-screen overlay to display PDFReportView with an elegant close button */}
      {activeReport && (
        <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden animate-in fade-in duration-300 print:bg-white print:text-slate-900 print:relative print:overflow-visible print:h-auto print:w-auto ${
          autoPrintActive ? 'bg-slate-900/90 backdrop-blur-md text-slate-100' : 'bg-slate-950 text-slate-100'
        }`}>
          {/* Header Bar - HIDDEN from Print */}
          <div className="bg-slate-900 border-b border-slate-800 p-4 px-6 flex justify-between items-center z-10 shadow-lg no-print">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="RBT Internet Logo" className="h-10 w-10 object-contain" />
              <div className="flex flex-col">
                <span className="text-sm font-black text-white tracking-wide uppercase">RBT Internet</span>
                <span className="text-xs text-slate-400">
                  {autoPrintActive ? 'Gerando arquivo PDF...' : `Visualizando: ${activeReport.name}`}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveReport(null);
                setAutoPrintActive(false);
              }}
              className="px-4 py-2 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar ao Painel
            </button>
          </div>

          {/* Loading Indicator for direct download - HIDDEN from Print */}
          {autoPrintActive && (
            <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center no-print print:hidden">
              <div className="p-5 rounded-full bg-slate-900 border border-slate-800 mb-6 relative">
                {!isIframe && <div className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin"></div>}
                <Download className="h-10 w-10 text-white" />
              </div>
              <h3 className="font-display font-black text-2xl tracking-tight text-white mb-2">
                {isIframe ? 'Assistente de Impressão PDF' : 'Preparando Relatório em PDF...'}
              </h3>
              
              {isIframe ? (
                <>
                  <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-6">
                    Por limites de segurança do seu navegador, a impressão direta é bloqueada dentro do painel de visualização (iframe).
                    <br /><br />
                    Clique no botão abaixo para abrir o relatório em uma nova aba exclusiva, onde o assistente de gravação em PDF iniciará automaticamente!
                  </p>
                  
                  <a
                    href={`?printReportId=${activeReport.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      setAutoPrintActive(false);
                      setActiveReport(null);
                    }}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-orange-500/20 flex items-center justify-center gap-2 mb-4 cursor-pointer text-sm"
                  >
                    <Printer className="h-5 w-5" /> Abrir e Salvar como PDF (Nova Aba)
                  </a>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-6">
                    Por favor, escolha a opção <span className="text-white font-bold">"Salvar como PDF"</span> ou selecione sua impressora no assistente do navegador.
                  </p>
                  
                  <button
                    onClick={() => window.print()}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-orange-500/20 flex items-center gap-2 mb-4 cursor-pointer"
                  >
                    <Printer className="h-5 w-5" /> Abrir Assistente de Impressão (PDF)
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  setActiveReport(null);
                  setAutoPrintActive(false);
                }}
                className="px-5 py-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700 cursor-pointer"
              >
                Voltar ao Painel
              </button>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible print:h-auto print:w-auto">
            <PDFReportView
              report={activeReport}
              darkMode={darkMode}
              autoPrint={autoPrintActive}
            />
          </div>
        </div>
      )}
    </div>
  );
}
