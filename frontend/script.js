const App = {
    epub: null,
    appUrl: "http://localhost:8000/",
    books: [
        { title: "50 Contos de Machado de Assis", value: "machado_assis", hide: [-1, 0, 1, 4] },
        { title: "O Pequeno Príncipe", value: "pequeno_principe", hide: [-1] },
        { title: "Tabby's Travels", value: "tabby_travels", hide: []}
    ]
}

window.addEventListener('DOMContentLoaded', () => {

    const bookSelector = document.getElementById('book-selector');
    
    // Popular o seletor de livros
    App.books.forEach(book => {
        const option = document.createElement('option');
        option.value = book.value;
        option.textContent = book.title;
        bookSelector.appendChild(option);
    });

    // Manipular mudança de seleção de livro
    bookSelector.addEventListener('change', (e) => {
        const selectedBook = e.target.value;
        if (selectedBook) {
            App.epub = selectedBook;
            window.reader = new EPUBReader();
        }
    });

    // Desabilitar botão direito
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // Desabilitar copiar
    document.addEventListener('copy', (e) => {
        e.preventDefault();
        return false;
    });

    // Desabilitar recortar
    document.addEventListener('cut', (e) => {
        e.preventDefault();
        return false;
    });

    // Desabilitar atalhos de teclado para copiar e recortar
    document.addEventListener('keydown', (e) => {
        // Ctrl+C / Cmd+C
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            return false;
        }
        // Ctrl+X / Cmd+X
        if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
            e.preventDefault();
            return false;
        }
    });
});


