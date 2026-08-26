import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Play, Download, ArrowRight, Loader2 } from 'lucide-react';
import { CSVPreview, ImportError } from '../types';

interface UploadViewProps {
  onValidate: (csvText: string) => Promise<{ errors: ImportError[]; preview?: CSVPreview }>;
  onGenerate: (csvText: string, title: string, description: string) => Promise<void>;
  darkMode: boolean;
}

export default function UploadView({ onValidate, onGenerate, darkMode }: UploadViewProps) {
  const [csvText, setCsvText] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [preview, setPreview] = useState<CSVPreview | null>(null);

  // Editable report details
  const [reportTitle, setReportTitle] = useState<string>('');
  const [reportDesc, setReportDesc] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Progression steps for generation loading
  const loadingSteps = [
    'Lendo dados do arquivo CSV...',
    'Realizando cálculos e cruzando estatísticas...',
    'Gerando gráficos gerenciais de alta resolução...',
    'Estruturando tabelas operacionais...',
    'Acionando Inteligência Artificial para gerar insights estratégicos...',
    'Estruturando páginas do documento...',
    'Compilando PDF e salvando no histórico do sistema...',
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processText = async (text: string) => {
    setLoading(true);
    setLoadingProgress('Validando dados do CSV...');
    setErrors([]);
    setPreview(null);
    setCsvText(text);

    try {
      const result = await onValidate(text);
      if (result.errors && result.errors.length > 0) {
        setErrors(result.errors);
      } else if (result.preview) {
        setPreview(result.preview);
        // Set default title
        const today = new Date().toLocaleDateString('pt-BR');
        setReportTitle('Relatório do Laboratório');
        setReportDesc('');
      }
    } catch (err) {
      setErrors([{ row: 0, column: 'Geral', message: 'Erro ao processar o arquivo CSV.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const text = await file.text();
      await processText(text);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const text = await file.text();
      await processText(text);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const loadSampleCSV = async () => {
    setLoading(true);
    setLoadingProgress('Carregando modelo de testes RBT...');
    try {
      const response = await fetch('/sample_dados_rbt.csv');
      const text = await response.text();
      await processText(text);
    } catch (err) {
      setErrors([{ row: 0, column: 'Geral', message: 'Não foi possível carregar o CSV de exemplo.' }]);
    } finally {
      setLoading(false);
    }
  };

  const triggerGenerate = async () => {
    if (!csvText || !preview) return;
    setLoading(true);
    
    // Simulate progression steps for visual delight
    for (let i = 0; i < loadingSteps.length; i++) {
      setLoadingProgress(loadingSteps[i]);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    try {
      await onGenerate(csvText, reportTitle, reportDesc);
    } catch (err) {
      alert('Erro ao gerar o relatório: ' + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full font-sans">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl flex flex-col items-center gap-6">
            <Loader2 className="h-12 w-12 text-white animate-spin" />
            <h3 className="font-display font-bold text-xl text-slate-100">Gerando Relatório Gerencial</h3>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-full animate-pulse w-full"></div>
            </div>
            <p className="text-sm font-medium text-slate-400">{loadingProgress}</p>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="mb-8">
        <h1 className={`font-display font-bold text-3xl tracking-tight mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
          Gerador Automático de Relatórios 
        </h1>
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Suba seu arquivo CSV para gerar relatórios em PDF.
        </p>
      </div>

      {/* Dropzone Area */}
      <div className="mb-8">
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-6 transition-all ${
            dragActive
              ? 'border-orange-500 bg-orange-500/5'
              : (darkMode ? 'border-slate-800 bg-[#111827] hover:border-slate-700' : 'border-slate-300 bg-slate-50/50 hover:border-slate-400')
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <div className={`p-5 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <Upload className={`h-10 w-10 animate-pulse ${darkMode ? 'text-slate-100' : 'text-slate-900'}`} />
          </div>
          <div className="text-center">
            <button
              id="upload-file-button"
              onClick={handleButtonClick}
              className={`text-base font-bold outline-none transition-colors ${
                darkMode ? 'text-slate-100 hover:text-slate-300' : 'text-slate-900 hover:text-slate-700'
              }`}
            >
              Clique para selecionar o arquivo
            </button>
            <span className={`text-base ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}> ou arraste-o aqui</span>
            <p className="text-sm text-slate-500 mt-2">Apenas formato CSV (.csv)</p>
          </div>
        </div>
      </div>

      {/* Errors Section */}
      {errors.length > 0 && (
        <div className="border border-red-500/30 bg-red-500/5 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-3 mb-4">
            <XCircle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display font-semibold text-red-500 text-base">Erros de Validação Encontrados</h3>
              <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Corrija os problemas estruturais ou de preenchimento indicados abaixo no seu CSV antes de prosseguir:
              </p>
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-red-500/10 text-xs">
            {errors.map((err, idx) => (
              <div key={idx} className="py-2.5 flex justify-between gap-4">
                <span className="font-mono text-red-400 font-semibold shrink-0">
                  {err.row > 0 ? `Linha ${err.row}` : 'Estrutura'}:
                </span>
                <span className={`flex-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{err.message}</span>
                {err.column && (
                  <span className={`px-2 py-0.5 rounded font-mono ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                    Coluna: {err.column}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSV Preview / Generator Area */}
      {preview && (
        <div className="flex flex-col gap-8 animate-fadeIn">
          {/* Quick Stats Panel */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Registros', val: preview.totalRecords, color: 'border-blue-500/20 text-blue-500' },
              { label: 'Equipamentos', val: preview.totalEquipments, color: 'border-green-500/20 text-green-500' },
              { label: 'Modelos', val: preview.totalModels, color: 'border-amber-500/20 text-amber-500' },
              { label: 'Cidades', val: preview.totalCities, color: 'border-purple-500/20 text-purple-500' },
              { label: 'Equipes', val: preview.totalTeams, color: 'border-rose-500/20 text-rose-500' },
            ].map((stat, idx) => (
              <div key={idx} className={`border rounded-xl p-4 flex flex-col justify-center ${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'} ${stat.color}`}>
                <span className="text-2xl font-display font-bold">{stat.val}</span>
                <span className="text-xs text-slate-400 font-medium mt-0.5">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Setup Metadata Form */}
          <div className={`border rounded-2xl p-6 ${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className={`font-display font-semibold text-lg mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              Configuração do Relatório
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Título Oficial do Relatório</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className={`w-full p-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    darkMode ? 'bg-[#0F172A] border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  placeholder="Ex: Relatório de Triagem - Maio 2026"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Descrição Resumida</label>
                <input
                  type="text"
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  className={`w-full p-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    darkMode ? 'bg-[#0F172A] border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  placeholder="Ex: Resumo executivo dos equipamentos processados"
                />
              </div>
            </div>

            {/* First rows sample table */}
            <h4 className={`font-display font-semibold text-sm mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Pré-visualização dos Primeiros Registros (CSV)
            </h4>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl mb-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={darkMode ? 'bg-slate-800/80 text-slate-300 border-b border-slate-800' : 'bg-slate-100 text-slate-600 border-b border-slate-200'}>
                    <th className="p-3">Data</th>
                    <th className="p-3">Responsável</th>
                    <th className="p-3">Modelo</th>
                    <th className="p-3">Origem</th>
                    <th className="p-3">Destino</th>
                    <th className="p-3">Cidade</th>
                    <th className="p-3">Equipe</th>
                    <th className="p-3 text-center">Qtd</th>
                  </tr>
                </thead>
                <tbody className={darkMode ? 'divide-y divide-slate-800 text-slate-400' : 'divide-y divide-slate-200 text-slate-600'}>
                  {preview.sampleRows.map((row, idx) => (
                    <tr key={idx} className={darkMode ? 'hover:bg-slate-900/20' : 'hover:bg-slate-50'}>
                      <td className="p-3 font-mono">{row.data}</td>
                      <td className="p-3 font-medium">{row.responsavel}</td>
                      <td className="p-3">{row.modelo}</td>
                      <td className="p-3">{row.origem}</td>
                      <td className="p-3 font-semibold">{row.destino}</td>
                      <td className="p-3">{row.cidade}</td>
                      <td className="p-3">{row.equipe}</td>
                      <td className="p-3 text-center font-bold">{row.qtd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Launch Action */}
            <div className="flex justify-end">
              <button
                id="generate-report-button"
                onClick={triggerGenerate}
                className="flex items-center gap-2 py-3.5 px-8 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg hover:shadow-orange-500/10 hover:from-orange-600 hover:to-amber-600"
              >
                <Play className="h-4 w-4" />
                Gerar Relatório Completo
                <ArrowRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
