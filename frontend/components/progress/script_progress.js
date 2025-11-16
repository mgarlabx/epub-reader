class ChapterProgress {
    constructor() {
        this.currentChapter = null;
        this.totalChapters = 0;
        this.init();
    }

    init() {
        // Adicionar listeners para os botões de navegação
        document.getElementById('chapter-progress-first').addEventListener('click', () => this.goToFirstChapter());
        document.getElementById('chapter-progress-previous').addEventListener('click', () => this.goToPreviousChapter());
        document.getElementById('chapter-progress-next').addEventListener('click', () => this.goToNextChapter());
        document.getElementById('chapter-progress-last').addEventListener('click', () => this.goToLastChapter());
        
        // Adicionar listener para clicar na barra de progresso
        const progressBarContainer = document.getElementById('chapter-progress-bar');
        progressBarContainer.addEventListener('click', (e) => this.handleProgressBarClick(e));
        
        // Adicionar cursor pointer na barra
        progressBarContainer.style.cursor = 'pointer';
    }

    updateProgress(currentIndex, totalChapters, visibleChapters) {
        this.currentChapter = currentIndex;
        this.totalChapters = totalChapters;
        this.visibleChapters = visibleChapters;

        // Atualizar os displays
        const currentDisplay = document.getElementById('chapter-progress-current');
        const totalDisplay = document.getElementById('chapter-progress-total');

        // Encontrar a posição do capítulo atual na lista de capítulos visíveis
        const currentPosition = visibleChapters.indexOf(currentIndex) + 1; // +1 para começar de 1

        currentDisplay.textContent = currentPosition;
        totalDisplay.textContent = totalChapters;

        // Atualizar barra de progresso
        this.updateProgressBar(currentPosition);
    }

    updateProgressBar(currentPosition) {
        const progressBar = document.getElementById('chapter-progress-bar');
        if (this.totalChapters > 0) {
            const percentage = (currentPosition / this.totalChapters) * 100;
            progressBar.style.setProperty('--progress-width', `${percentage}%`);
        }
    }

    handleProgressBarClick(event) {
        if (!this.visibleChapters || this.visibleChapters.length === 0) return;
        
        const progressBar = event.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const barWidth = rect.width;
        const clickPercentage = clickX / barWidth;
        
        // Calcular qual capítulo corresponde a essa posição
        const targetPosition = Math.ceil(clickPercentage * this.totalChapters);
        const clampedPosition = Math.max(1, Math.min(targetPosition, this.totalChapters));
        
        // Obter o índice do capítulo correspondente
        const targetChapterIndex = this.visibleChapters[clampedPosition - 1];
        
        if (window.reader && targetChapterIndex !== undefined) {
            window.reader.loadChapter(targetChapterIndex);
        }
    }

    goToFirstChapter() {
        if (window.reader && window.reader.getFirstChapterIndex) {
            const firstIndex = window.reader.getFirstChapterIndex();
            window.reader.loadChapter(firstIndex);
        }
    }

    goToPreviousChapter() {
        if (window.reader && this.currentChapter !== null) {
            const prevIndex = window.reader.getPreviousChapterIndex(this.currentChapter);
            if (prevIndex !== null) {
                window.reader.loadChapter(prevIndex);
            }
        }
    }

    goToNextChapter() {
        if (window.reader && this.currentChapter !== null) {
            const nextIndex = window.reader.getNextChapterIndex(this.currentChapter);
            if (nextIndex !== null) {
                window.reader.loadChapter(nextIndex);
            }
        }
    }

    goToLastChapter() {
        if (window.reader && window.reader.getLastChapterIndex) {
            const lastIndex = window.reader.getLastChapterIndex();
            window.reader.loadChapter(lastIndex);
        }
    }
}

// Instanciar o gerenciador de progresso
window.chapterProgress = new ChapterProgress();
