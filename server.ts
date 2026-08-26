import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { parseAndValidateCSV } from './server/csv_reader.js';
import { performCalculations } from './server/calculations.js';
import { generateInsights } from './server/insights.js';
import { generateWordReport } from './server/word_generator.js';
import { saveReport, getReports, getReportRecords, deleteReport } from './server/db.js';
import { GeneratedReport, ReportRecord } from './src/types.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use heavy payload limits to support large CSV uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // ==================== API ENDPOINTS ====================

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 2. Validate CSV Upload
  app.post('/api/reports/validate', (req, res) => {
    try {
      const { csvText } = req.body;
      if (!csvText) {
        return res.status(400).json({ error: 'Nenhum conteúdo CSV enviado.' });
      }

      const { errors, preview } = parseAndValidateCSV(csvText);
      return res.json({ errors, preview });
    } catch (err: any) {
      console.error('Erro na validação do CSV:', err);
      return res.status(500).json({ error: 'Erro interno ao validar o arquivo.', details: err.message });
    }
  });

  // 3. Generate Report
  app.post('/api/reports/generate', async (req, res) => {
    try {
      const { csvText, title, description } = req.body;
      if (!csvText) {
        return res.status(400).json({ error: 'Nenhum conteúdo CSV enviado.' });
      }

      const reportTitle = title || `Relatório Operacional - ${new Date().toLocaleDateString('pt-BR')}`;
      const reportDesc = description || 'Gerado automaticamente a partir de dados operacionais do laboratório técnico.';

      // Parse and Validate again to be sure
      const { errors, records, preview } = parseAndValidateCSV(csvText);
      if (errors && errors.length > 0) {
        return res.status(400).json({ error: 'O arquivo contém erros de validação e não pode ser processado.', errors });
      }

      if (!records || !preview) {
        return res.status(400).json({ error: 'Erro inesperado ao extrair registros.' });
      }

      // Calculations
      const { metrics, charts } = performCalculations(records);

      // AI Insights
      const insights = await generateInsights(metrics);

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
        docxUrl: `/api/reports/${reportId}/download/word`,
        pdfUrl: `/api/reports/${reportId}/view/pdf`,
      };

      // Save to Database
      await saveReport(newReport, records);

      return res.status(201).json({ report: newReport, records });
    } catch (err: any) {
      console.error('Erro ao gerar relatório:', err);
      return res.status(500).json({ error: 'Erro interno ao gerar o relatório.', details: err.message });
    }
  });

  // 4. Get List of Reports
  app.get('/api/reports', async (req, res) => {
    try {
      const list = await getReports();
      return res.json(list);
    } catch (err: any) {
      return res.status(500).json({ error: 'Erro ao listar relatórios históricos.', details: err.message });
    }
  });

  // 5. Delete Report
  app.delete('/api/reports/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await deleteReport(id);
      if (success) {
        return res.json({ success: true, message: 'Relatório excluído com sucesso.' });
      } else {
        return res.status(404).json({ error: 'Relatório não encontrado.' });
      }
    } catch (err: any) {
      return res.status(500).json({ error: 'Erro ao excluir relatório.', details: err.message });
    }
  });

  // 6. Download Word Report
  app.get('/api/reports/:id/download/word', async (req, res) => {
    try {
      const { id } = req.params;
      const list = await getReports();
      const report = list.find(r => r.id === id);
      if (!report) {
        return res.status(404).send('Relatório não encontrado.');
      }

      const wordBuffer = await generateWordReport(
        report.name,
        report.metrics,
        report.charts,
        report.insights,
        report.periodStart,
        report.periodEnd
      );

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="Relatorio_RBT_${id}.docx"`);
      return res.send(wordBuffer);
    } catch (err: any) {
      console.error('Erro no download do Word:', err);
      return res.status(500).send(`Erro interno ao gerar arquivo Word: ${err.message}`);
    }
  });

  // 7. Download Excel (CSV of records)
  app.get('/api/reports/:id/download/excel', async (req, res) => {
    try {
      const { id } = req.params;
      const records = await getReportRecords(id);
      if (!records) {
        return res.status(404).send('Registros não encontrados.');
      }

      // Generate clean CSV format with correct delimiter
      const headers = ['Data', 'Responsavel', 'Modelo', 'Origem', 'Destino', 'Cidade', 'Equipe', 'Qtd', 'Defeito', 'Motivo_Descarte'];
      const csvLines = [headers.join(';')];

      records.forEach((r: ReportRecord) => {
        const row = [
          r.data,
          r.responsavel,
          r.modelo,
          r.origem,
          r.destino,
          r.cidade,
          r.equipe,
          r.qtd,
          r.defeito || '',
          r.motivo_descarte || '',
        ].map(val => `"${val.toString().replace(/"/g, '""')}"`);
        csvLines.push(row.join(';'));
      });

      const csvBuffer = Buffer.from('\uFEFF' + csvLines.join('\n'), 'utf-8'); // Add UTF-8 BOM for Excel compatibility

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Dados_RBT_${id}.csv"`);
      return res.send(csvBuffer);
    } catch (err: any) {
      return res.status(500).send(`Erro ao exportar dados: ${err.message}`);
    }
  });

  // 8. Download Word Report via POST (stateful/stateless integration)
  app.post('/api/reports/download/word', async (req, res) => {
    try {
      const { name, metrics, charts, insights, periodStart, periodEnd, id } = req.body;
      if (!name || !metrics) {
        return res.status(400).send('Dados do relatório ausentes.');
      }

      const wordBuffer = await generateWordReport(
        name,
        metrics,
        charts,
        insights,
        periodStart,
        periodEnd
      );

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="Relatorio_RBT_${id || 'download'}.docx"`);
      return res.send(wordBuffer);
    } catch (err: any) {
      console.error('Erro no download do Word via POST:', err);
      return res.status(500).send(`Erro interno ao gerar arquivo Word: ${err.message}`);
    }
  });

  // 9. Download Excel/CSV via POST (stateful/stateless integration)
  app.post('/api/reports/download/excel', async (req, res) => {
    try {
      const { records, id } = req.body;
      if (!records || !Array.isArray(records)) {
        return res.status(400).send('Registros ausentes ou inválidos.');
      }

      // Generate clean CSV format with correct delimiter
      const headers = ['Data', 'Responsavel', 'Modelo', 'Origem', 'Destino', 'Cidade', 'Equipe', 'Qtd', 'Defeito', 'Motivo_Descarte'];
      const csvLines = [headers.join(';')];

      records.forEach((r: any) => {
        const row = [
          r.data || r.Data || '',
          r.responsavel || r.Responsavel || '',
          r.modelo || r.Modelo || '',
          r.origem || r.Origem || '',
          r.destino || r.Destino || '',
          r.cidade || r.Cidade || '',
          r.equipe || r.Equipe || '',
          r.qtd || r.Qtd || 0,
          r.defeito || r.Defeito || '',
          r.motivo_descarte || r.Motivo_Descarte || '',
        ].map(val => `"${val ? val.toString().replace(/"/g, '""') : ''}"`);
        csvLines.push(row.join(';'));
      });

      const csvBuffer = Buffer.from('\uFEFF' + csvLines.join('\n'), 'utf-8'); // Add UTF-8 BOM for Excel compatibility

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Dados_RBT_${id || 'download'}.csv"`);
      return res.send(csvBuffer);
    } catch (err: any) {
      console.error('Erro no download do Excel via POST:', err);
      return res.status(500).send(`Erro ao exportar dados: ${err.message}`);
    }
  });

  // ==================== VITE SETUP / STATIC SERVING ====================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
