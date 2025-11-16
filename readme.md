# Leitor de EPUB - Tutorial

Este tutorial explica como criar um leitor de EPUBs customizado. O objetivo não é criar leitores genéricos (há muitos disponíveis), mas sim demonstrar como incorporar um leitor de EPUB em suas aplicações específicas, permitindo personalização e controle sobre a experiência de leitura.

https://github.com/user-attachments/assets/fe65f328-e37b-4677-983d-dd94524e3711



## Parte 1 - Sobre os EPUBs

### O que são EPUBs?

EPUB (Electronic Publication) é um formato de arquivo padrão aberto para livros digitais. Foi desenvolvido pelo International Digital Publishing Forum (IDPF), que posteriormente foi incorporado ao World Wide Web Consortium (W3C) em 2017.

### Versões do EPUB

- **EPUB 2.0** (2007): Primeira versão amplamente adotada, baseada em XHTML 1.1
- **EPUB 3.0** (2011): Suporte aprimorado para multimídia, interatividade e acessibilidade
- **EPUB 3.2** (2019): Versão atual, com melhorias de compatibilidade e alinhamento com padrões web modernos

### Estrutura Básica

Um arquivo EPUB é essencialmente um arquivo ZIP contendo:

1. **META-INF/container.xml**: Aponta para o arquivo de conteúdo principal
2. **OEBPS/content.opf**: Manifesto com metadados, lista de arquivos e ordem de leitura
3. **OEBPS/toc.ncx**: Índice de navegação (table of contents)
4. **Arquivos XHTML/HTML**: Conteúdo dos capítulos
5. **Imagens**: Capa e ilustrações
6. **Folhas de estilo CSS**: Formatação do conteúdo
7. **mimetype**: Arquivo que identifica o formato EPUB

## Parte 2 - Tipos de Readers

### Opção 1: Reader apenas Frontend

É possível criar um leitor usando apenas JavaScript no frontend, utilizando bibliotecas como o [epub.js](https://github.com/futurepress/epub.js).

**Vantagens:**

- Simples de implementar
- Não requer servidor
- Processamento no lado do cliente

**Desvantagens:**

- O arquivo EPUB fica disponível no frontend
- Pode ser facilmente compartilhado/baixado pelo usuário
- Desaconselhado para obras com direitos autorais

### Opção 2: Arquitetura Frontend/Backend (usado neste tutorial)

Uma alternativa mais segura utiliza arquitetura frontend/backend, onde:

- O backend processa e serve o conteúdo do EPUB
- O frontend apenas renderiza o que é enviado pelo servidor
- Permite implementar mecanismos de autenticação/autorização
- Maior controle sobre o acesso ao conteúdo

## Parte 3 - Backend

### Tecnologia

O backend desse tutorial foi desenvolvido em **Python** usando **FastAPI** como framework web. Para leitura e processamento dos arquivos EPUB, foi utilizada a biblioteca [ebooklib](https://docs.sourcefabric.org/projects/ebooklib/).

### Importante - Segurança

Este é um exemplo didático e **NÃO implementa mecanismos de autenticação/autorização**. Para uso em produção com conteúdo protegido por direitos autorais, você deve:

- Implementar autenticação de usuários
- Adicionar autorização para acesso aos livros
- Criar sistema de gestão de licenças
- Implementar logs de acesso
- Considerar criptografia do conteúdo

### Livros de Exemplo

Foram incluídos três livros na pasta `backend/books_epub/`:

- `machado_assis.epub` - 50 Contos de Machado de Assis
- `pequeno_principe.epub` - O Pequeno Príncipe
- `tabby_travels.epub` - Tabby's Travels

### Atenção sobre Compatibilidade

Os ebooks podem ter diversos formatos e estruturas internas. Este backend implementa uma lógica básica que funciona para os exemplos fornecidos, mas **pode não estar prevendo todas as possibilidades**. Poderá ser necessário ajustar o código para livros com estruturas diferentes.

### Descrição do Código Backend

#### Estrutura Principal (`app.py`)

**Configuração do FastAPI:**

```python
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

O servidor usa CORS permissivo para facilitar o desenvolvimento. Em produção, configure origins específicas.

#### Endpoints

**1. GET `/book/{epub_book}`**

Retorna informações do livro:

- Título
- Autores
- Nome do arquivo da capa
- Imagem da capa (base64)
- Índice (table of contents)

```python
@app.get("/book/{epub_book}")
def get_book(epub_book: str):
    book = epub.read_epub(f'books_epub/{epub_book}.epub')
    info = _get_info(book)
    info['cover_image'] = _get_book_cover_image(book, info['cover_file_name'])
    return info
```

**2. GET `/book/chapter/{epub_book}/{index}`**

Retorna o conteúdo de um capítulo específico:

- Extrai o HTML do capítulo baseado no índice
- Remove links (para o primeiro capítulo)
- Converte imagens para base64 e embute no HTML
- Retorna HTML pronto para renderização

```python
@app.get("/book/chapter/{epub_book}/{index}")
def get_book_chapter(epub_book: str, index: int):
    book = epub.read_epub(f'books_epub/{epub_book}.epub')
    info = _get_info(book)
    toc = info['toc']
  
    # Obter pontos de início e fim
    base_file, start, end = _get_points(toc, index)
  
    # Extrair texto
    content = _get_text(book, base_file, start, end)
  
    # Processar imagens
    # ...
  
    return content
```

#### Funções Auxiliares

**`_get_info(book)`**: Extrai metadados básicos do EPUB (título, autores, capa, índice)

**`_get_toc(book)`**: Extrai o índice (table of contents) do livro, retornando lista de capítulos com títulos e referências

**`_get_points(toc, index)`**: Calcula os pontos de início e fim de um capítulo baseado no índice. Retorna:

- `base_file`: Arquivo HTML que contém o capítulo
- `start`: ID do elemento HTML onde inicia
- `end`: ID do elemento HTML onde termina

**`_get_text(book, base_file, start, end)`**: Extrai o conteúdo HTML entre os pontos especificados usando BeautifulSoup. Navega pelos elementos do DOM e concatena o HTML relevante.

**`_get_image(book, image_path)`**: Extrai uma imagem do EPUB e retorna em formato base64 para embedding no HTML

**`_get_book_cover_image(book, cover_image_path)`**: Retorna a capa do livro como tag `<img>` com imagem em base64

## Parte 4 - Frontend

### Tecnologia

O frontend foi desenvolvido em **HTML, CSS e JavaScript puro**, sem frameworks. Esta escolha foi intencional para:

- Facilitar a compreensão do código
- Permitir fácil refatoração para frameworks de sua preferência (React, Vue, Angular, etc.)
- Demonstrar os conceitos fundamentais

### Estrutura

```
frontend/
├── index.html                          # Página principal
├── script.js                           # Lógica principal da aplicação
├── style.css                           # Estilos globais
└── components/
    ├── reader/                         # Componente de leitura
    │   ├── script_reader.js
    │   └── style_reader.css
    ├── progress/                       # Barra de progresso
    │   ├── script_progress.js
    │   └── style_progress.css
    ├── tools/                          # Ferramentas do leitor
    │   ├── script_tools.js
    │   └── style_tools.css
    └── read-aloud/                     # Leitura em voz alta
        ├── script_tools_read_aloud.js
        └── style_tools_read_aloud.css
```

### Funcionalidades Implementadas

#### 1. Seleção de Livros (`script.js`)

Permite selecionar um livro de uma lista predefinida. Cada livro pode ter capítulos ocultos (como páginas de créditos ou índices que não precisam ser exibidos):

```javascript
App.books = [
    { title: "50 Contos de Machado de Assis", value: "machado_assis", hide: [-1, 0, 1, 4] },
    { title: "O Pequeno Príncipe", value: "pequeno_principe", hide: [-1] },
    { title: "Tabby's Travels", value: "tabby_travels", hide: []}
]
```

#### 2. Leitor de EPUB (`components/reader/`)

**Classe `EPUBReader`**: Gerencia o carregamento e exibição do livro

**Métodos principais:**

- `init()`: Carrega informações do livro via API, constrói o índice e exibe a capa
- `loadChapter(index)`: Carrega e exibe um capítulo específico
- `showHome()`: Retorna para a tela inicial (capa e índice)
- `getFirstChapterIndex()`, `getLastChapterIndex()`, etc.: Navegação entre capítulos

#### 3. Barra de Progresso (`components/progress/`)

**Classe `ChapterProgress`**: Gerencia a navegação e visualização do progresso

**Funcionalidades:**

- Exibição do capítulo atual e total
- Barra visual de progresso
- Botões de navegação (primeiro, anterior, próximo, último)
- Clique na barra para navegar diretamente

**Importante**: O progresso não é persistido. É apenas ilustrativo e reseta ao recarregar a página.

#### 4. Ferramentas do Leitor (`components/tools/`)

**Voltar**: Retorna para a tela inicial

**Bookmark**: Marca página favorita (apenas visual, não persiste)

**Busca**: Busca texto no capítulo atual

- Destaca todas as ocorrências
- Navega entre resultados
- Scroll automático para resultados

**Tamanho de Fonte**: Ajusta o tamanho da fonte

- Salvo no localStorage
- Range de 12px a 48px

**Modo Escuro**: Alterna entre tema claro e escuro

- Salvo no localStorage
- Aplica cores suaves para leitura confortável

#### 5. Leitura em Voz Alta (`components/read-aloud/`)

**Classe `ReadAloud`**: Implementa text-to-speech usando a Web Speech API nativa dos navegadores

**Funcionalidades:**

- Play/Pause da leitura
- Controle de velocidade (0.5x a 2.0x)
- Pular 15 segundos para frente/trás
- Destaque visual da sentença sendo lida
- Scroll automático seguindo a leitura

**Importante sobre qualidade:**
A `speechSynthesis` API é nativa dos navegadores e muito fácil de implementar, mas tem **qualidade questionável**. As vozes são sintéticas e podem soar robóticas. Para resultados profissionais, considere usar serviços de text-to-speech mais avançados como:

- Google Cloud Text-to-Speech
- Amazon Polly
- Microsoft Azure Speech
- ElevenLabs

#### 6. Proteção de Conteúdo

O frontend implementa medidas básicas para dificultar (não impedir completamente) a cópia de conteúdo:

```javascript
// Desabilitar botão direito
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Desabilitar copiar e recortar
document.addEventListener('copy', (e) => {
    e.preventDefault();
});

// Desabilitar atalhos de teclado
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
    }
});
```

**Nota**: Estas são medidas de desencorajamento. Usuários determinados sempre encontrarão formas de extrair o conteúdo. Mas é possível criar mais barreiras para dificultar, tais como autenticação, autorização e técnicas de DRM (Digital Rights Management).

### Limitações e Ressalvas

1. **Bookmarks não persistem**: São apenas visuais
2. **Progresso não é salvo**: Não há integração com banco de dados
3. **Qualidade do read-aloud**: Vozes sintéticas básicas
4. **Sem autenticação**: Qualquer um pode acessar os livros
5. **Proteção limitada**: Medidas básicas de desencorajamento de cópia

### Como Executar

**Backend:**

```bash
cd backend
pip install fastapi uvicorn ebooklib beautifulsoup4
python app.py
```

O servidor estará disponível em `http://localhost:8000`

**Frontend:**
Abra o arquivo `frontend/index.html` em um navegador moderno ou use um servidor local:

```bash
cd frontend
python -m http.server 8080
```

Acesse `http://localhost:8080`

### Próximos Passos

Para transformar este projeto em uma aplicação de produção, considere:

1. Implementar sistema de autenticação (JWT, OAuth, etc.)
2. Adicionar banco de dados para persistir progresso e bookmarks
3. Criar sistema de gerenciamento de biblioteca
4. Aprimorar o suporte a diferentes formatos de EPUB
5. Melhorar a qualidade do text-to-speech
6. Adicionar anotações e highlights persistentes
7. Implementar testes automatizados

### Conclusão

Este tutorial demonstra os conceitos fundamentais para criar um leitor de EPUB personalizado. O código é modular e pode ser facilmente adaptado ou estendido conforme as necessidades específicas da sua aplicação.

Sinta-se livre para modificar, melhorar e adaptar este código para seus projetos.
