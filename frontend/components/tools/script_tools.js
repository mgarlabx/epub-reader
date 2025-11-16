// Funcionalidade do botão voltar
const backTool = document.getElementById('chapter-tool-back');

if (backTool) {
    backTool.addEventListener('click', function() {
        if (window.reader) {
            window.reader.showHome();
        }
    });
}

// ================================================================================
// Funcionalidade de favoritos
// ================================================================================

const bookmarkTool = document.getElementById('chapter-tool-bookmark');

if (bookmarkTool) {
    bookmarkTool.addEventListener('click', function() {
        this.classList.toggle('bookmarked');
    });
}

// ================================================================================
// Funcionalidade de busca
// ================================================================================

const searchTool = document.getElementById('chapter-tool-search');
let searchResults = [];
let currentSearchIndex = -1;

if (searchTool) {
    searchTool.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Criar ou mostrar modal de busca
        let modal = document.getElementById('search-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'search-modal';
            modal.className = 'search-modal';
            modal.innerHTML = `
                <div class="search-controls">
                    <input type="text" id="search-input" placeholder="Buscar no capítulo..." />
                    <div class="search-buttons">
                        <button id="search-prev" class="search-nav-btn" disabled>◀</button>
                        <span id="search-counter">0/0</span>
                        <button id="search-next" class="search-nav-btn" disabled>▶</button>
                    </div>
                    <button id="search-close" class="search-close-btn">✕</button>
                </div>
            `;
            document.body.appendChild(modal);

            // Position modal near the button
            const rect = searchTool.getBoundingClientRect();
            modal.style.top = (rect.bottom + 10) + 'px';
            modal.style.left = (rect.left - 150) + 'px';

            const searchInput = document.getElementById('search-input');
            const searchPrev = document.getElementById('search-prev');
            const searchNext = document.getElementById('search-next');
            const searchClose = document.getElementById('search-close');
            const searchCounter = document.getElementById('search-counter');

            // Buscar ao digitar
            searchInput.addEventListener('input', function(e) {
                const searchTerm = e.target.value.trim();
                if (searchTerm.length > 0) {
                    performSearch(searchTerm);
                } else {
                    clearSearch();
                }
            });

            // Resultado anterior
            searchPrev.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateSearch(-1);
            });

            // Próximo resultado
            searchNext.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateSearch(1);
            });

            // Close modal
            searchClose.addEventListener('click', (e) => {
                e.stopPropagation();
                clearSearch();
                modal.remove();
            });

            // Close modal when clicking outside
            document.addEventListener('click', function closeModal(e) {
                if (!modal.contains(e.target) && e.target !== searchTool) {
                    clearSearch();
                    modal.remove();
                    document.removeEventListener('click', closeModal);
                }
            });

            // Focar no input
            setTimeout(() => searchInput.focus(), 100);
        }
    });
}

function performSearch(searchTerm) {
    const chapterContent = document.querySelector('.chapter-content');
    if (!chapterContent) return;

    // Limpar busca anterior
    clearSearch();

    // Obter todos os nós de texto
    const walker = document.createTreeWalker(
        chapterContent,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        if (node.textContent.trim().length > 0) {
            textNodes.push(node);
        }
    }

    // Buscar e destacar
    const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    searchResults = [];

    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const matches = [...text.matchAll(searchRegex)];

        if (matches.length > 0) {
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;

            matches.forEach(match => {
                // Adicionar texto antes da correspondência
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                }

                // Adicionar correspondência destacada
                const highlight = document.createElement('mark');
                highlight.className = 'search-highlight';
                highlight.textContent = match[0];
                fragment.appendChild(highlight);
                searchResults.push(highlight);

                lastIndex = match.index + match[0].length;
            });

            // Adicionar texto restante
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }

            textNode.parentNode.replaceChild(fragment, textNode);
        }
    });

    // Atualizar UI
    updateSearchUI();

    // Navegar para o primeiro resultado
    if (searchResults.length > 0) {
        currentSearchIndex = 0;
        scrollToSearchResult(0);
    }
}

function clearSearch() {
    // Remover todos os destaques
    document.querySelectorAll('.search-highlight').forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
    });

    searchResults = [];
    currentSearchIndex = -1;
    updateSearchUI();
}

function navigateSearch(direction) {
    if (searchResults.length === 0) return;

    currentSearchIndex += direction;

    // Voltar ao início/fim
    if (currentSearchIndex < 0) {
        currentSearchIndex = searchResults.length - 1;
    } else if (currentSearchIndex >= searchResults.length) {
        currentSearchIndex = 0;
    }

    scrollToSearchResult(currentSearchIndex);
    updateSearchUI();
}

function scrollToSearchResult(index) {
    if (index < 0 || index >= searchResults.length) return;

    // Remover classe ativa de todos os resultados
    searchResults.forEach(result => result.classList.remove('search-highlight-active'));

    // Adicionar classe ativa ao resultado atual
    const currentResult = searchResults[index];
    currentResult.classList.add('search-highlight-active');

    // Rolar até o resultado com offset para barra de ferramentas fixa
    const toolbarHeight = document.getElementById('chapter-tools').offsetHeight || 0;
    const elementTop = currentResult.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementTop - toolbarHeight - 20; // 20px de padding extra

    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
}

function updateSearchUI() {
    const searchCounter = document.getElementById('search-counter');
    const searchPrev = document.getElementById('search-prev');
    const searchNext = document.getElementById('search-next');

    if (searchCounter && searchPrev && searchNext) {
        if (searchResults.length > 0) {
            searchCounter.textContent = `${currentSearchIndex + 1}/${searchResults.length}`;
            searchPrev.disabled = false;
            searchNext.disabled = false;
        } else {
            searchCounter.textContent = '0/0';
            searchPrev.disabled = true;
            searchNext.disabled = true;
        }
    }
}





// ================================================================================
// Funcionalidade de tamanho de fonte
// ================================================================================

const fontSizeTool = document.getElementById('chapter-tool-font-size');
let currentFontSize = parseInt(localStorage.getItem('fontSize')) || 32;

if (fontSizeTool) {
    // Aplicar tamanho de fonte salvo
    document.documentElement.style.setProperty('--reader-font-size', currentFontSize + 'px');

    fontSizeTool.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Criar ou mostrar modal de tamanho de fonte
        let modal = document.getElementById('font-size-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'font-size-modal';
            modal.className = 'font-size-modal';
            modal.innerHTML = `
                <div class="font-size-controls">
                    <button id="decrease-font" class="font-size-btn">A-</button>
                    <span id="current-font-size">${currentFontSize}px</span>
                    <button id="increase-font" class="font-size-btn">A+</button>
                </div>
            `;
            document.body.appendChild(modal);

            // Position modal near the button
            const rect = fontSizeTool.getBoundingClientRect();
            modal.style.top = (rect.bottom + 10) + 'px';
            modal.style.left = (rect.left - 60) + 'px';

            // Adicionar event listeners
            document.getElementById('decrease-font').addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentFontSize > 12) {
                    currentFontSize -= 2;
                    updateFontSize();
                }
            });

            document.getElementById('increase-font').addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentFontSize < 48) {
                    currentFontSize += 2;
                    updateFontSize();
                }
            });

            // Close modal when clicking outside
            document.addEventListener('click', function closeModal(e) {
                if (!modal.contains(e.target) && e.target !== fontSizeTool) {
                    modal.remove();
                    document.removeEventListener('click', closeModal);
                }
            });
        }
    });
}

function updateFontSize() {
    document.documentElement.style.setProperty('--reader-font-size', currentFontSize + 'px');
    localStorage.setItem('fontSize', currentFontSize);
    const sizeDisplay = document.getElementById('current-font-size');
    if (sizeDisplay) {
        sizeDisplay.textContent = currentFontSize + 'px';
    }
}



// ================================================================================
// Funcionalidade de modo escuro
// ================================================================================

const darkModeTool = document.getElementById('chapter-tool-dark-mode');

if (darkModeTool) {
    // Verificar preferência de modo escuro salva
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'enabled') {
        document.body.classList.add('dark-mode');
        darkModeTool.classList.add('active');
    }

    darkModeTool.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        this.classList.toggle('active');
        
        // Salvar preferência
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('darkMode', 'enabled');
        } else {
            localStorage.setItem('darkMode', 'disabled');
        }
    });
}




