class EPUBReader {
    constructor() {
        this.info = null;
        this.hideChapters = [];
        this.visibleChapters = [];
        this.currentChapterIndex = null;
        this.init();
    }

    async init() {
        try {

            // Voltar para a tela inicial
            document.getElementById('home').style.display = 'block';
            document.getElementById('chapter').style.display = 'none';
            document.getElementById('chapter-tools').style.display = 'none';
            document.getElementById('chapter-progress').style.display = 'none';
            window.scrollTo(0, 0);

            // Limpar TOC anterior
            document.getElementById('book-toc').innerHTML = '';

            // Carregar informações do livro
            const url = App.appUrl + 'book/' + App.epub;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            this.info = await response.json();

            this.hideChapters = App.books.find(book => book.value === App.epub)?.hide || [];

            // Construir lista de capítulos visíveis
            this.visibleChapters = [];
            if (!this.hideChapters.includes(-1)) {
                this.visibleChapters.push(-1);
            }
            for (let i = 0; i < this.info.toc.length; i++) {
                if (!this.hideChapters.includes(i)) {
                    this.visibleChapters.push(i);
                }
            }

            document.getElementById('book-cover').innerHTML = this.info.cover_image;

            // Adicionar capítulo "Sobre" ao índice
            if (!this.hideChapters.includes(-1)) {
                const chapterItem = document.createElement('div');
                chapterItem.className = 'chapter-item';
                chapterItem.innerText = 'SOBRE';
                chapterItem.dataset.index = -1;
                chapterItem.addEventListener('click', () => this.loadChapter(-1));
                document.getElementById('book-toc').appendChild(chapterItem);
            }

            // Adicionar capítulos ao índice
            for (let i = 0; i < this.info.toc.length; i++) {
                if (this.hideChapters.includes(i)) {
                    continue;
                }
                const chapter = this.info.toc[i];
                const chapterItem = document.createElement('div');
                chapterItem.className = 'chapter-item';
                chapterItem.innerText = chapter.title;
                chapterItem.dataset.index = i;
                chapterItem.addEventListener('click', () => this.loadChapter(i));
                document.getElementById('book-toc').appendChild(chapterItem);
            }


        } catch (error) {
            console.error('Error loading book:', error);
            alert('Erro ao carregar o livro: ' + error.message);
        }
    }


    async loadChapter(index) {

        try {
            const chapterDiv = document.getElementById('chapter');
            chapterDiv.innerHTML = '<p>Loading chapter...</p>';

            // Esconder home e mostrar capítulo
            document.getElementById('home').style.display = 'none';
            chapterDiv.style.display = 'block';
            document.getElementById('chapter-tools').style.display = 'flex';
            document.getElementById('chapter-progress').style.display = 'block';

            const response = await fetch(App.appUrl + 'book/chapter/' + App.epub + '/' + index, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to load chapter');
            }
            const content = await response.json();

            // Adicionar conteúdo
            chapterDiv.innerHTML = `
                    <div class="chapter-content">${content}</div>
                `;

            // Destacar capítulo ativo
            document.querySelectorAll('.chapter-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`[data-index="${index}"]`).classList.add('active');

            // Atualizar informações do capítulo atual
            this.currentChapterIndex = index;

            // Atualizar progresso
            if (window.chapterProgress) {
                window.chapterProgress.updateProgress(index, this.visibleChapters.length, this.visibleChapters);
            }

            window.scrollTo(0, 0);
        } catch (error) {
            console.error('Error loading chapter:', error);
            document.getElementById('chapter').innerHTML = '<p>Error loading chapter: ' + error.message + '</p>';
        }
    }

    showHome() {
        document.getElementById('home').style.display = 'block';
        document.getElementById('chapter').style.display = 'none';
        document.getElementById('chapter-tools').style.display = 'none';
        document.getElementById('chapter-progress').style.display = 'none';
        window.scrollTo(0, 0);
    }

    getFirstChapterIndex() {
        return this.visibleChapters.length > 0 ? this.visibleChapters[0] : null;
    }

    getLastChapterIndex() {
        return this.visibleChapters.length > 0 ? this.visibleChapters[this.visibleChapters.length - 1] : null;
    }

    getPreviousChapterIndex(currentIndex) {
        const currentPos = this.visibleChapters.indexOf(currentIndex);
        if (currentPos > 0) {
            return this.visibleChapters[currentPos - 1];
        }
        return null;
    }

    getNextChapterIndex(currentIndex) {
        const currentPos = this.visibleChapters.indexOf(currentIndex);
        if (currentPos >= 0 && currentPos < this.visibleChapters.length - 1) {
            return this.visibleChapters[currentPos + 1];
        }
        return null;
    }

}
