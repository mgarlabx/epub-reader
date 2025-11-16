from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import base64
from bs4 import BeautifulSoup

# https://docs.sourcefabric.org/projects/ebooklib/
import ebooklib 
from ebooklib import epub

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/book/{epub_book}")
def get_book(epub_book: str):
    try:
        book = epub.read_epub(f'books_epub/{epub_book}.epub')
        info = _get_info(book)
        info['cover_image'] = _get_book_cover_image(book, info['cover_file_name'])
        return info
    except Exception as e:
        return {"error": f"Failed to read EPUB: {str(e)}"}


@app.get("/book/chapter/{epub_book}/{index}")
def get_book_chapter(epub_book: str, index: int):
    try:
        book = epub.read_epub(f'books_epub/{epub_book}.epub')
        info = _get_info(book)
        toc = info['toc']

        # get points
        base_file, start, end = _get_points(toc, index)

        # get text
        content = _get_text(book, base_file, start, end)

        # remove links
        if index < 1:
            soup = BeautifulSoup(content, 'html.parser')
            for a in soup.find_all('a', href=True):
                a.unwrap()
            content = str(soup)

        # images
        soup = BeautifulSoup(content, 'html.parser')
        images = soup.find_all('img')
        for image in images:
            if 'src' in image.attrs:
                image_base64 = _get_image(book, image['src'])
                if image_base64:
                    content = content.replace(image['src'], f"data:image/jpeg;base64,{image_base64}")

        return content
    except Exception as e:
        return f"<p>Error loading chapter: {str(e)}</p>"





"""
#####################################################################################
Helper functions
#####################################################################################
"""
    
def _get_info(book):
    """
    Extracts and returns basic information about the EPUB book.
    """
    return {
        'title': book.get_metadata('DC', 'title')[0][0],
        'authors': book.get_metadata('DC', 'creator'),
        'cover_file_name': _get_book_cover_file_name(book),
        'toc': _get_toc(book)
    }


def _get_book_cover_file_name(book):
    """
    Extracts and returns the cover file name of the EPUB book.
    """
    for item in book.get_items():
        if 'cover' in item.get_name().lower() or item.get_type() == ebooklib.ITEM_COVER:
            return item.get_name()
    return None   


def _get_book_cover_image(book, cover_image_path):
    """
    Given a book and cover image path, return the base64 encoded string of the cover image.
    """
    cover_image_base64 = _get_image(book, cover_image_path)
    return '<img src="data:image/jpeg;base64,{}" alt="Book Cover">'.format(cover_image_base64)


def _get_main_content_file(book):
    """
    Extracts and returns the main content file of the EPUB book.
    """
    documents = list(book.get_items_of_type(ebooklib.ITEM_DOCUMENT))
    for doc in documents:
        name = doc.get_name().lower()
        if not any(x in name for x in ['title', 'cover', 'toc']):
            return doc.get_name()
    return documents[0].get_name() if documents else None


def _get_toc(book):
    """
    Extracts and returns the table of contents of the EPUB book.
    """
    toc = [{'title': item.title, 'href': item.href} for item in book.toc]
    main_content_file = _get_main_content_file(book)
    if main_content_file not in [item['href'] for item in toc]:
        toc[0]['href'] = main_content_file
    return toc


def _get_image(book, image_path):
    """
    Given an image path, return the base64 encoded string of the image.
    """
    image_path = image_path.lstrip('./') # Normalize path by removing leading './'
    image_item = book.get_item_with_href(image_path)
    if image_item:
        image_content = image_item.get_content()
        image_base64 = base64.b64encode(image_content).decode('utf-8')
        return image_base64
    return None


def _get_text(book, base_file, start, end):
    """
    Given a base file, start, and end points, return the extracted HTML content.
    """
    
    item = book.get_item_with_href(base_file)
    content = item.get_content().decode('utf-8')
    soup = BeautifulSoup(content, 'html.parser')
    if start == '':
        start_element = soup.body.find()
    else:
        start_element = soup.find(id=start)
    if end == '':
        end_element = soup.body.find_all()[-1]
    else:
        end_element = soup.find(id=end)
        
    extracted_html = ''
    if start_element and end_element:
        current = start_element
        while current:
            extracted_html += str(current)
            if current == end_element:
                break
            current = current.next_sibling

    extracted_html = extracted_html.replace('\n', '').replace('\r', '')
        
    return extracted_html


def _get_points(toc, index):
    """
    Given a TOC and an index, return the base file, start, and end points.
    """

    base_file = ""
    start = ""
    end = ""

    if (index >= len(toc)) or (index < -1):
        return base_file, start, end

    elif index == -1:
        full_path = toc[0]['href']
        parts = full_path.split('#')
        base_file = parts[0]
        start = ''
        end = parts[1] if len(parts) > 1 else '' 

    else:
        full_path = toc[index]['href']
        parts = full_path.split('#')
        base_file = parts[0]
        start = parts[1] if len(parts) > 1 else ''
        if (index+1) == len(toc):
            end = ''
        elif (toc[index + 1]['href'].split('#')[0]) != parts[0]:
            end = ''
        else:
            next_parts = toc[index + 1]['href'].split('#')
            end = next_parts[1] if len(next_parts) > 1 else ''

    return base_file, start, end
    




if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)