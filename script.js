// ---------- Utilities ----------
async function includePartials() {
  const nodes = document.querySelectorAll("[data-include]");
  await Promise.all(
    Array.from(nodes).map(async (el) => {
      const path = el.getAttribute("data-include");
      try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Failed to load ${path}`);
        el.innerHTML = await res.text();
      } catch (error) {
        console.error("Error loading partial:", error);
      }
    })
  );
  // Set dynamic year in footer
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

function el(tag, className = "", html = "") {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (html) n.innerHTML = html;
  return n;
}

function imgOrPlaceholder(path) {
  return path && path.trim() ? path : "images/placeholders/cover-default.jpg";
}

// ---------- Renderers ----------
function renderBookCard(book) {
  const card = el("article", "book-card");
  card.innerHTML = `
    <div class="cover">
      <img src="${imgOrPlaceholder(book.image_path)}" alt="${book.title}" onerror="this.src='images/placeholders/cover-default.jpg'">
    </div>
    <div class="meta">
      <h3 class="title" title="${book.title}">${book.title}</h3>
      <p class="author">${book.author || ""}</p>
      <p class="desc">${(book.description || "").slice(0, 120)}${(book.description||"").length>120?"…":""}</p>
      <div class="actions">
        <a class="btn small" href="book.html?id=${book.id}">📖 Read Now</a>
      </div>
    </div>
  `;

  card.addEventListener("click", (e) => {
    if (e.target.tagName.toLowerCase() === "a") return;
    window.location.href = `book.html?id=${book.id}`;
  });

  return card;
}

function renderGrid(containerId, items) {
  const grid = document.getElementById(containerId);
  if (!grid) {
    console.error(`Grid container ${containerId} not found!`);
    return;
  }
  grid.innerHTML = "";
  items.forEach(b => grid.appendChild(renderBookCard(b)));
}

function renderPagination({ total, page, page_size }, onJump) {
  const wrap = document.getElementById("pagination");
  if (!wrap) return;
  
  const pages = Math.max(1, Math.ceil(total / page_size));
  wrap.innerHTML = "";

  const makeBtn = (label, target, disabled=false, active=false) => {
    const a = el("button", `page-btn${active?" active":""}`);
    a.textContent = label;
    a.disabled = disabled;
    a.onclick = () => onJump(target);
    return a;
  };

  wrap.appendChild(makeBtn("« First", 1, page===1));
  wrap.appendChild(makeBtn("‹ Prev", Math.max(1, page-1), page===1));

  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize/2));
  let end = Math.min(pages, start + windowSize - 1);
  if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);

  for (let p = start; p <= end; p++) {
    wrap.appendChild(makeBtn(String(p), p, false, p===page));
  }

  wrap.appendChild(makeBtn("Next ›", Math.min(pages, page+1), page===pages));
  wrap.appendChild(makeBtn("Last »", pages, page===pages));

  const summary = el("div", "page-summary", `Page ${page} of ${pages} • ${total} books`);
  wrap.appendChild(summary);
}

// ---------- State ----------
const state = {
  q: "",
  sort: "id",
  order: "desc",
  page: 1,
  page_size: 18
};

// ---------- Data fetchers ----------
async function fetchBooks() {
  try {
    const params = new URLSearchParams({
      q: state.q,
      sort: state.sort,
      order: state.order,
      page: state.page,
      page_size: state.page_size
    });
    const res = await fetch(`/api/books?${params.toString()}`);
    if (!res.ok) throw new Error('API response not ok');
    return await res.json();
  } catch (error) {
    console.error('Error fetching books:', error);
    return { items: [], total: 0 };
  }
}

// ---------- Page wiring ----------
async function initHome() {
  console.log("🏠 Initializing home page...");
  
  await includePartials();

  // Smooth scrolling
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const id = a.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Search functionality
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const searchMeta = document.getElementById("searchMeta");
  
  if (searchInput && searchBtn) {
    document.getElementById("searchForm").addEventListener("submit", doSearch);
    searchBtn.addEventListener("click", doSearch);
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });
  }

  // Sort and page size controls
  const sortSelect = document.getElementById("sortSelect");
  const pageSizeSelect = document.getElementById("pageSizeSelect");

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      const [sort, order] = sortSelect.value.split("|");
      state.sort = sort; state.order = order; state.page = 1;
      loadBooks();
    });
  }

  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", () => {
      state.page_size = parseInt(pageSizeSelect.value, 10);
      state.page = 1;
      loadBooks();
    });
  }

  async function doSearch() {
    state.q = searchInput.value.trim();
    state.page = 1;
    const result = await fetchBooks();
    renderGrid("booksGrid", result.items);
    renderPagination(result, jumpTo);
    if (state.q && searchMeta) {
      searchMeta.textContent = `Showing ${result.items.length} of ${result.total} results for "${state.q}".`;
    } else if (searchMeta) {
      searchMeta.textContent = "";
    }
  }

  async function loadBooks() {
    const result = await fetchBooks();
    renderGrid("booksGrid", result.items);
    renderPagination(result, jumpTo);
    console.log(`📚 Loaded ${result.items.length} books`);
  }

  async function jumpTo(p) {
    state.page = p;
    const result = await fetchBooks();
    renderGrid("booksGrid", result.items);
    renderPagination(result, jumpTo);
  }

  // Initial load
  await loadBooks();
  console.log("✅ Home page initialized!");
}

// ---------- Book Page Functions ----------
async function loadBook() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    document.getElementById("bookTitle").textContent = "Book ID not specified";
    return;
  }

  try {
    const res = await fetch(`/api/books/${id}`);
    if (!res.ok) {
      document.getElementById("bookTitle").textContent = "Book not found";
      return;
    }

    const book = await res.json();
    document.getElementById("bookTitle").textContent = book.title;
    document.getElementById("bookAuthor").textContent = "by " + (book.author || "Unknown Author");
    document.getElementById("bookDesc").textContent = book.description || "No description available.";
    
    // Load the PDF using PDF.js
    loadPDF(book.pdf_path);
    
    // Set download link
    const downloadBtn = document.getElementById("downloadBtn");
    downloadBtn.href = book.pdf_path;
    downloadBtn.textContent = `Download "${book.title}" PDF`;
    downloadBtn.setAttribute('download', book.title + '.pdf');

  } catch (error) {
    console.error("Error loading book:", error);
    document.getElementById("bookTitle").textContent = "Error loading book";
  }
}

function initBookPage() {
  // Add back button functionality
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.history.back();
    });
  }
  
  // Load the book data
  loadBook();
}

// ---------- PDF.js Viewer ----------
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
const scale = 1.5;

function initPDFViewer() {
  // Set up PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
  
  // Set up page controls
  document.getElementById('prevPage').addEventListener('click', onPrevPage);
  document.getElementById('nextPage').addEventListener('click', onNextPage);
  document.getElementById('goToPage').addEventListener('click', onGoToPage);
  document.getElementById('pageJump').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') onGoToPage();
  });
}

function renderPage(num) {
  pageRendering = true;
  
  pdfDoc.getPage(num).then(function(page) {
    const canvas = document.getElementById('pdfCanvas');
    const ctx = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: scale });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };

    const renderTask = page.render(renderContext);

    renderTask.promise.then(function() {
      pageRendering = false;
      document.getElementById('currentPage').textContent = num;
      
      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });
}

function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

function onPrevPage() {
  if (pageNum <= 1) return;
  pageNum--;
  queueRenderPage(pageNum);
}

function onNextPage() {
  if (pageNum >= pdfDoc.numPages) return;
  pageNum++;
  queueRenderPage(pageNum);
}

function onGoToPage() {
  const input = document.getElementById('pageJump');
  const num = parseInt(input.value);
  
  if (num >= 1 && num <= pdfDoc.numPages) {
    pageNum = num;
    queueRenderPage(pageNum);
    input.value = '';
  }
}

function loadPDF(pdfUrl) {
  // Initialize PDF viewer first
  initPDFViewer();
  
  // Then load the PDF
  pdfjsLib.getDocument(pdfUrl).promise.then(function(pdfDoc_) {
    pdfDoc = pdfDoc_;
    document.getElementById('totalPages').textContent = pdfDoc.numPages;
    
    // Render first page
    renderPage(pageNum);
  }).catch(function(error) {
    console.error('Error loading PDF:', error);
    document.getElementById('pdfCanvas').innerHTML = `
      <div style="text-align: center; padding: 50px; color: var(--muted);">
        <h3>Error loading PDF</h3>
        <p>Could not load the PDF file. <a href="${pdfUrl}" class="btn small">Download instead</a></p>
      </div>
    `;
  });
}

// ---------- Page Router ----------
function initPage() {
  console.log("🚀 Initializing page...");
  
  // Check which page we're on and initialize accordingly
  if (document.getElementById('booksGrid')) {
    // We're on the home page
    console.log("📍 Detected home page");
    initHome();
  } else if (document.getElementById('bookDetails')) {
    // We're on the book page
    console.log("📍 Detected book page");
    includePartials().then(() => {
      initBookPage();
    });
  } else {
    console.log("❓ Unknown page type");
  }
}

// Update the DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", initPage);