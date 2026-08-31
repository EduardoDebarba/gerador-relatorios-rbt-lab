# 📊 Gerador de Relatórios Laboratório (RBT Telecom)

Sistema web completo para análise, consolidação e geração de relatórios técnicos e gerenciais de laboratório para provedores de internet (ISP) e empresas de telecomunicações.

O aplicativo processa dados operacionais de triagem e manutenção de equipamentos (roteadores, ONUs, switches, antenas e caixas de atendimento), calculando indicadores essenciais de produtividade e gerando relatórios executivos em PDF multipágina formatados para impressão e apresentação à diretoria.

---

## ✨ Principais Funcionalidades

- **📂 Importação Flexível de Dados**:
  - Leitura e validação de arquivos CSV com detecção automática de delimitadores (vírgula, ponto e vírgula, tabulação).
  - Reconhecimento automático e padronização de colunas (Data, Técnico/Responsável, Cidade, Equipe, Origem, Destino, Modelo, Quantidade).
  - Suporte a drag-and-drop e seleção manual de arquivos.

- **📈 Indicadores & KPIs Operacionais**:
  - **Volume Total e Médias Diárias**: Quantidade total de equipamentos movimentados no período.
  - **Taxa Real de Resolução de OS**: Cálculo percentual considerando os equipamentos elegíveis da Caixa de OS (itens destinados a Reaproveitamento e RMA vs. total elegível).
  - **Produtividade por Responsável**: Tabela detalhada com volume total analisado, quantidade de Caixa de OS, itens resolvidos e taxa de resolução individual.
  - **Índices de Destino**: Proporção de Reaproveitamento, Descarte, RMA e Venda de ativos.
  - **Análise por Modelo e Marca**: Identificação de modelos mais problemáticos e com maior taxa de descarte.
  - **Distribuição Geográfica e por Equipes**: Desempenho categorizado por cidade de atendimento e equipes de campo.

- **📑 Relatório Executivo em PDF Multipágina**:
  - Layout corporativo padronizado no formato A4 com paginação automática.
  - Gráficos gerenciais de alta resolução integrados diretamente nas páginas.
  - Seções estruturadas: Capa executiva, sumário, KPIs gerais, produtividade técnica, análise de modelos, detalhamento por cidades/equipes e considerações finais.
  - Botão de impressão nativo com ajustes automáticos de quebra de página (`print:break-inside-avoid`).

- **💾 Histórico & Persistência**:
  - Armazenamento de relatórios gerados via IndexedDB local e integração com Firebase Firestore.
  - Consulta e reabertura rápida de relatórios anteriores.

- **🎨 Interface & Usabilidade**:
  - Alternância rápida entre modo claro (*Light*) e modo escuro (*Dark*).
  - Design responsivo, tipografia limpa e animações fluidas.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**:
  - [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
  - [Tailwind CSS v4](https://tailwindcss.com/)
  - [Recharts](https://recharts.org/) (Gráficos e visualizações de dados)
  - [Lucide React](https://lucide.dev/) (Ícones)
  - [Motion](https://motion.dev/) (Animações de interface)
  - [PapaParse](https://www.papaparse.com/) (Parsing e processamento de arquivos CSV)
  - [Docx](https://docx.js.org/) (Exportação e manipulação documental)
- **Backend & Servidor**:
  - [Node.js](https://nodejs.org/) com [Express](https://expressjs.com/)
  - [tsx](https://github.com/privatenumber/tsx) & [esbuild](https://esbuild.github.io/)
- **Banco de Dados & Nuvem**:
  - [Firebase Firestore](https://firebase.google.com/)
  - [IndexedDB](https://developer.mozilla.org/pt-BR/docs/Web/API/IndexedDB_API) (Armazenamento offline do navegador)

---

## 📁 Estrutura do Projeto

```text
├── public/                    # Arquivos estáticos e amostras de dados
│   ├── favicon.svg
│   └── sample_dados_rbt.csv   # Planilha de exemplo para testes
├── server/                    # Lógica e cálculos do servidor
│   └── calculations.ts
├── src/
│   ├── assets/                # Imagens e logotipos
│   ├── components/
│   │   ├── HistoryView.tsx    # Visualização de relatórios arquivados
│   │   ├── PDFReportView.tsx  # Layout multipágina do relatório para impressão/PDF
│   │   └── UploadView.tsx     # Tela de upload, instruções e processamento
│   ├── lib/
│   │   ├── calculations.ts    # Motor de consolidação estatística e KPIs
│   │   ├── csv_reader.ts      # Parser e normalização de planilhas CSV
│   │   ├── firebase.ts        # Configuração do Firebase Firestore
│   │   ├── indexedDB.ts       # Gerenciador de armazenamento local
│   │   └── insights.ts        # Geração de resumos e conclusões técnicas
│   ├── App.tsx                # Componente raiz e controle de navegação/tema
│   ├── index.css              # Configurações de estilo global e Tailwind
│   ├── main.tsx               # Ponto de entrada React
│   └── types.ts               # Tipagens e interfaces TypeScript
├── server.ts                  # Servidor Express com integração Vite
├── package.json               # Dependências e scripts
└── tsconfig.json              # Configuração do compilador TypeScript
```

---

## 📋 Formato do Arquivo de Dados (CSV)

O sistema aceita arquivos `.csv` com as seguintes colunas recomendadas:

| Coluna | Descrição | Exemplos de Valores |
| :--- | :--- | :--- |
| **Data** | Data da triagem/movimentação | `01/08/2026`, `2026-08-01` |
| **Responsável** | Técnico que realizou a análise | `João Silva`, `Maria Souza` |
| **Origem** | Canal de entrada do equipamento | `Caixa de OS`, `Casa Velha`, `Recolhimento` |
| **Destino** | Classificação final do ativo | `Reaproveitado`, `Descarte`, `RMA`, `Venda` |
| **Equipe** | Equipe de campo que recolheu | `Equipe Alpha`, `Equipe Beta` |
| **Cidade** | Município de origem | `Chapecó`, `Erechim`, `Passo Fundo` |
| **Modelo** | Modelo do dispositivo | `ONU HG6145F`, `Roteador AX1800` |
| **Quantidade** | Quantidade de unidades | `1`, `5`, `10` |

> *Dica: O arquivo de exemplo `public/sample_dados_rbt.csv` pode ser usado como modelo.*

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 18 ou superior instalada.
- Gerenciador de pacotes `npm` ou `yarn`.

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
cd SEU-REPOSITORIO
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o ambiente de desenvolvimento:
```bash
npm run dev
```

4. Acesse no navegador:
```text
http://localhost:3000
```

---

## 📦 Scripts Disponíveis

- `npm run dev`: Inicia o servidor backend e o Vite em modo de desenvolvimento.
- `npm run build`: Compila o frontend e agrupa o servidor Node com `esbuild` para produção.
- `npm run start`: Executa o servidor de produção compilado em `dist/server.cjs`.
- `npm run lint`: Executa a verificação estática de tipos com o TypeScript (`tsc --noEmit`).

---

## 📄 Licença

Este projeto é desenvolvido para uso interno e operacional da **RBT Telecom**. Todos os direitos reservados.
