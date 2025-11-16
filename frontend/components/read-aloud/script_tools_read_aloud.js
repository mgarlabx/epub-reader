// ================================================================================
// Funcionalidade de leitura em voz alta usando Speech Synthesis API
// ================================================================================

class ReadAloud {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentText = '';
        this.currentSentences = [];
        this.currentSentenceIndex = 0;
        this.language = 'pt-BR';
        this.voice = null;
        this.rate = parseFloat(localStorage.getItem('readAloudRate')) || 1.0;
        this.currentHighlight = null;
        
        // Aguardar carregamento das vozes
        this.loadVoices();
        
        // Se as vozes já estão carregadas
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.loadVoices();
        }
    }

    loadVoices() {
        const voices = this.synth.getVoices();
        
        // Tentar encontrar a voz Luciana (pt-BR)
        this.voice = voices.find(v => v.name.includes('Luciana')) ||
                     voices.find(v => v.lang === 'pt-BR') ||
                     voices.find(v => v.lang.startsWith('pt')) ||
                     voices[0];
        
        console.log('Selected voice:', this.voice?.name || 'None');
    }

    extractTextFromChapter() {
        const chapterContent = document.querySelector('.chapter-content');
        if (!chapterContent) return '';

        // Obter todos os nós de texto e seus elementos pai
        const walker = document.createTreeWalker(
            chapterContent,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Pular elementos script e style
                    if (node.parentElement.tagName === 'SCRIPT' || 
                        node.parentElement.tagName === 'STYLE') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // Aceitar apenas nós com conteúdo de texto
                    if (node.textContent.trim().length > 0) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            },
            false
        );

        let text = '';
        let node;
        while (node = walker.nextNode()) {
            text += node.textContent.trim() + ' ';
        }

        return text.trim();
    }

    splitIntoSentences(text) {
        // Dividir por fim de sentença, mantendo a pontuação
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        return sentences.map(s => s.trim()).filter(s => s.length > 0);
    }

    highlightCurrentSentence(sentence) {
        // Remover destaque anterior
        this.removeHighlight();

        // Find and highlight the current sentence in the chapter
        const chapterContent = document.querySelector('.chapter-content');
        if (!chapterContent) return;

        // Escapar caracteres especiais de regex na sentença
        const escapedSentence = sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedSentence, 'i');

        const walker = document.createTreeWalker(
            chapterContent,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent;
            const match = text.match(searchRegex);

            if (match) {
                const parent = node.parentNode;
                const fragment = document.createDocumentFragment();
                
                // Adicionar texto antes da correspondência
                if (match.index > 0) {
                    fragment.appendChild(document.createTextNode(text.substring(0, match.index)));
                }

                // Adicionar correspondência destacada
                const highlight = document.createElement('mark');
                highlight.className = 'read-aloud-highlight';
                highlight.textContent = match[0];
                fragment.appendChild(highlight);
                this.currentHighlight = highlight;

                // Adicionar texto restante
                const endIndex = match.index + match[0].length;
                if (endIndex < text.length) {
                    fragment.appendChild(document.createTextNode(text.substring(endIndex)));
                }

                parent.replaceChild(fragment, node);

                // Rolar até o texto destacado
                this.scrollToHighlight(highlight);
                break;
            }
        }
    }

    scrollToHighlight(element) {
        if (!element) return;

        const toolbarHeight = document.getElementById('chapter-tools')?.offsetHeight || 0;
        const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementTop - toolbarHeight - 100;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }

    removeHighlight() {
        const highlights = document.querySelectorAll('.read-aloud-highlight');
        highlights.forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
        this.currentHighlight = null;
    }

    speakSentence(index) {
        if (index >= this.currentSentences.length) {
            this.stop();
            return;
        }

        this.currentSentenceIndex = index;
        const sentence = this.currentSentences[index];

        // Cancelar qualquer fala em andamento antes de iniciar nova
        if (this.synth.speaking) {
            this.synth.cancel();
        }

        // Destacar sentença atual
        this.highlightCurrentSentence(sentence);

        this.utterance = new SpeechSynthesisUtterance(sentence);
        this.utterance.lang = this.language;
        this.utterance.rate = this.rate;
        
        if (this.voice) {
            this.utterance.voice = this.voice;
        }

        this.utterance.onend = () => {
            if (this.isPlaying && !this.isPaused) {
                this.speakSentence(index + 1);
            }
        };

        this.utterance.onerror = (event) => {
            // Ignorar erros 'interrupted' pois são esperados ao cancelar
            if (event.error !== 'interrupted') {
                console.error('Speech synthesis error:', event);
            }
        };

        // Pequeno atraso para garantir que o cancelamento seja processado
        setTimeout(() => {
            this.synth.speak(this.utterance);
        }, 50);
    }

    play() {
        if (this.isPaused) {
            // Retomar da pausa
            this.synth.resume();
            this.isPaused = false;
            this.isPlaying = true;
            this.updatePlayButton();
            return;
        }

        // Iniciar nova leitura
        this.currentText = this.extractTextFromChapter();
        if (!this.currentText) {
            alert('Nenhum texto encontrado para ler.');
            return;
        }

        this.currentSentences = this.splitIntoSentences(this.currentText);
        this.currentSentenceIndex = 0;
        this.isPlaying = true;
        this.isPaused = false;

        this.speakSentence(0);
        this.updatePlayButton();
    }

    pause() {
        if (this.isPlaying && !this.isPaused) {
            this.synth.pause();
            this.isPaused = true;
            this.updatePlayButton();
        }
    }

    stop() {
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        this.currentSentenceIndex = 0;
        this.removeHighlight();
        this.updatePlayButton();
    }

    togglePlayPause() {
        if (!this.isPlaying || this.isPaused) {
            this.play();
        } else {
            this.pause();
        }
    }

    skipForward(seconds = 15) {
        // Calcular quantas sentenças pular (aproximado)
        // Taxa média de fala é cerca de 150 palavras por minuto
        // Na taxa 1.0, são 2.5 palavras por segundo
        const wordsToSkip = seconds * 2.5 * this.rate;
        
        let wordsCount = 0;
        let sentencesToSkip = 0;
        
        for (let i = this.currentSentenceIndex; i < this.currentSentences.length; i++) {
            const words = this.currentSentences[i].split(/\s+/).length;
            wordsCount += words;
            sentencesToSkip++;
            
            if (wordsCount >= wordsToSkip) {
                break;
            }
        }

        const newIndex = Math.min(
            this.currentSentenceIndex + sentencesToSkip,
            this.currentSentences.length - 1
        );

        if (this.isPlaying) {
            this.speakSentence(newIndex);
        } else {
            this.currentSentenceIndex = newIndex;
        }
    }

    skipBackward(seconds = 15) {
        // Calcular quantas sentenças retroceder
        const wordsToSkip = seconds * 2.5 * this.rate;
        
        let wordsCount = 0;
        let sentencesToSkip = 0;
        
        for (let i = this.currentSentenceIndex; i >= 0; i--) {
            const words = this.currentSentences[i].split(/\s+/).length;
            wordsCount += words;
            sentencesToSkip++;
            
            if (wordsCount >= wordsToSkip) {
                break;
            }
        }

        const newIndex = Math.max(this.currentSentenceIndex - sentencesToSkip, 0);

        if (this.isPlaying) {
            this.speakSentence(newIndex);
        } else {
            this.currentSentenceIndex = newIndex;
        }
    }

    setRate(rate) {
        this.rate = rate;
        localStorage.setItem('readAloudRate', rate);

        // Se estiver tocando, reiniciar com nova taxa
        if (this.isPlaying && !this.isPaused) {
            this.speakSentence(this.currentSentenceIndex);
        }
    }

    updatePlayButton() {
        const playBtn = document.getElementById('read-aloud-play');
        if (playBtn) {
            if (this.isPlaying && !this.isPaused) {
                playBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                `;
                playBtn.title = 'Pausar';
            } else {
                playBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                `;
                playBtn.title = 'Play';
            }
        }
    }
}

// Inicializar leitura em voz alta
let readAloud = null;

const readAloudTool = document.getElementById('chapter-tool-read-aloud');

if (readAloudTool) {
    readAloudTool.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Inicializar ReadAloud se ainda não foi
        if (!readAloud) {
            readAloud = new ReadAloud();
        }

        // Criar ou mostrar modal de leitura em voz alta
        let modal = document.getElementById('read-aloud-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'read-aloud-modal';
            modal.className = 'read-aloud-modal';
            modal.innerHTML = `
                <div class="read-aloud-controls">
                    <div class="read-aloud-main-controls">
                        <button id="read-aloud-back" class="read-aloud-btn read-aloud-btn-icon" title="Recuar 15s">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38"/>
                                <text x="12" y="16" font-size="8" fill="currentColor" text-anchor="middle" font-weight="bold">15</text>
                            </svg>
                        </button>
                        <button id="read-aloud-play" class="read-aloud-btn read-aloud-btn-play" title="Play">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                        </button>
                        <button id="read-aloud-stop" class="read-aloud-btn read-aloud-btn-icon" title="Parar">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="6" y="6" width="12" height="12" rx="2"/>
                            </svg>
                        </button>
                        <button id="read-aloud-forward" class="read-aloud-btn read-aloud-btn-icon" title="Avançar 15s">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/>
                                <text x="12" y="16" font-size="8" fill="currentColor" text-anchor="middle" font-weight="bold">15</text>
                            </svg>
                        </button>
                    </div>
                    <div class="read-aloud-speed-controls">
                        <label for="read-aloud-speed">Velocidade:</label>
                        <input type="range" id="read-aloud-speed" min="0.5" max="2.0" step="0.1" value="${readAloud.rate}">
                        <span id="read-aloud-speed-value">${readAloud.rate}x</span>
                    </div>
                    <button id="read-aloud-close" class="read-aloud-close-btn" title="Fechar">✕</button>
                </div>
            `;
            document.body.appendChild(modal);

            // Position modal near the button
            const rect = readAloudTool.getBoundingClientRect();
            modal.style.top = (rect.bottom + 10) + 'px';
            modal.style.left = Math.max(10, rect.left - 100) + 'px';

            // Event listeners
            document.getElementById('read-aloud-play').addEventListener('click', (e) => {
                e.stopPropagation();
                readAloud.togglePlayPause();
            });

            document.getElementById('read-aloud-stop').addEventListener('click', (e) => {
                e.stopPropagation();
                readAloud.stop();
            });

            document.getElementById('read-aloud-back').addEventListener('click', (e) => {
                e.stopPropagation();
                readAloud.skipBackward(15);
            });

            document.getElementById('read-aloud-forward').addEventListener('click', (e) => {
                e.stopPropagation();
                readAloud.skipForward(15);
            });

            const speedSlider = document.getElementById('read-aloud-speed');
            const speedValue = document.getElementById('read-aloud-speed-value');
            
            speedSlider.addEventListener('input', (e) => {
                e.stopPropagation();
                const rate = parseFloat(e.target.value);
                speedValue.textContent = rate + 'x';
                readAloud.setRate(rate);
            });

            document.getElementById('read-aloud-close').addEventListener('click', (e) => {
                e.stopPropagation();
                modal.remove();
            });

            // Close modal when clicking outside
            document.addEventListener('click', function closeModal(e) {
                if (!modal.contains(e.target) && e.target !== readAloudTool) {
                    modal.remove();
                    document.removeEventListener('click', closeModal);
                }
            });
        }
    });
}

// Parar leitura quando o capítulo é fechado ou alterado
// Isso será configurado depois que EPUBReader for definido
window.addEventListener('DOMContentLoaded', () => {
    // Aguardar um pouco para garantir que EPUBReader foi carregado
    setTimeout(() => {
        if (typeof EPUBReader !== 'undefined') {
            // Sobrescrever método showHome
            const originalShowHome = EPUBReader.prototype.showHome;
            EPUBReader.prototype.showHome = function() {
                if (readAloud) {
                    readAloud.stop();
                }
                originalShowHome.call(this);
            };

            // Sobrescrever método loadChapter
            const originalLoadChapter = EPUBReader.prototype.loadChapter;
            EPUBReader.prototype.loadChapter = function(index) {
                if (readAloud) {
                    readAloud.stop();
                }
                return originalLoadChapter.call(this, index);
            };
        }
    }, 100);
});
