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
        // Fallback content
        if (path.includes('header')) {
          el.innerHTML = `
            <header class="site-header">
              <div class="container header-inner">
                <div class="brand">
                  <div class="logo-container">
                    <img src="images/logo.svg" alt="Library Logo" class="logo" 
                         onerror="this.src='images/default-logo.webp'; this.onerror=null;">
                    <div class="logo-fallback">📚</div>
                  </div>
                  <div class="brand-text">
                    <span class="brand-name">Online Library</span>
                    <span class="brand-tagline">Read . Learn . Grow</span>
                  </div>
                </div>

                <nav class="nav">
                  <a href="/" class="nav-link">
                    <span class="nav-icon">🏠</span>
                    <span class="nav-text">Home</span>
                  </a>
                  <a href="#popular" class="nav-link">
                    <span class="nav-icon">🔥</span>
                    <span class="nav-text">Popular</span>
                  </a>
                  <a href="#all-books" class="nav-link">
                    <span class="nav-icon">📚</span>
                    <span class="nav-text">All Books</span>
                  </a>
                </nav>
              </div>
            </header>
          `;
        }
        if (path.includes('footer')) {
          el.innerHTML = `
            <footer class="site-footer">
              <div class="container footer-inner">
                <div class="footer-brand">
                  <div class="logo small">📚</div>
                  <span>Online Library</span>
                </div>
                <div class="footer-links">
                  <a href="#">About</a>
                  <a href="#">Contact</a>
                  <a href="#">Privacy</a>
                </div>
                <div class="footer-copyright">
                  © <span id="year">${new Date().getFullYear()}</span> Online Library
                </div>
              </div>
            </footer>
          `;
        }
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
  return path && path.trim() ? path : "https://via.placeholder.com/280x320/3b82f6/ffffff?text=No+Cover";
}

// ---------- Header Scroll Effect ----------
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }
}

// ---------- Hero Carousel Functionality ----------
function initHeroCarousel() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.dot');
  
  let currentSlide = 0;
  let slideInterval;

  function showSlide(n) {
    // Hide all slides
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    // Show current slide
    currentSlide = (n + slides.length) % slides.length;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
  }

  function nextSlide() {
    showSlide(currentSlide + 1);
  }

  // Auto slide
  function startAutoSlide() {
    slideInterval = setInterval(nextSlide, 3000);
  }

  // Event listeners for dots only
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      showSlide(index);
      // Reset auto-slide timer when manually clicking dots
      clearInterval(slideInterval);
      startAutoSlide();
    });
  });

  // Pause auto-slide on hover
  const carousel = document.querySelector('.hero-carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', () => clearInterval(slideInterval));
    carousel.addEventListener('mouseleave', startAutoSlide);
  }

  // Start auto-slide
  startAutoSlide();
}

// ---------- Renderers ----------
function renderBookCard(book) {
  const card = el("article", "book-card");
  card.innerHTML = `
    <div class="cover">
      <img src="${imgOrPlaceholder(book.image_path)}" alt="${book.title}" 
           onerror="this.src='https://via.placeholder.com/280x320/3b82f6/ffffff?text=No+Cover'">
    </div>
    <div class="meta">
      <h3 class="title" title="${book.title}">${book.title}</h3>
      <p class="author">${book.author || "Unknown Author"}</p>
      <p class="desc">${(book.description || "No description available.").slice(0, 80)}${(book.description || "").length > 80 ? "…" : ""}</p>
      <div class="book-actions">
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
  
  if (items.length === 0) {
    grid.innerHTML = `
      <div class="no-books" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted);">
        <div style="font-size: 48px; margin-bottom: 16px;">📚</div>
        <h3>No books found</h3>
        <p>Try adjusting your search or browse all books</p>
      </div>
    `;
    return;
  }
  
  items.forEach((b) => grid.appendChild(renderBookCard(b)));
}

function renderPagination({ total, page, page_size }, onJump) {
  const wrap = document.getElementById("pagination");
  if (!wrap) return;

  const pages = Math.max(1, Math.ceil(total / page_size));
  wrap.innerHTML = "";

  const makeBtn = (label, target, disabled = false, active = false) => {
    const a = el("button", `page-btn${active ? " active" : ""}`);
    a.textContent = label;
    a.disabled = disabled;
    a.onclick = () => onJump(target);
    return a;
  };

  wrap.appendChild(makeBtn("« First", 1, page === 1));
  wrap.appendChild(makeBtn("‹ Prev", Math.max(1, page - 1), page === 1));

  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(pages, start + windowSize - 1);
  if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);

  for (let p = start; p <= end; p++) {
    wrap.appendChild(makeBtn(String(p), p, false, p === page));
  }

  wrap.appendChild(
    makeBtn("Next ›", Math.min(pages, page + 1), page === pages)
  );
  wrap.appendChild(makeBtn("Last »", pages, page === pages));

  const summary = el(
    "div",
    "page-summary",
    `Page ${page} of ${pages} • ${total} books`
  );
  wrap.appendChild(summary);
}

// ---------- State ----------
const state = {
  q: "",
  sort: "id",
  order: "desc", 
  page: 1,
  page_size: 8,
};

// ---------- Data fetchers ----------
async function fetchBooks() {
  try {
    const params = new URLSearchParams({
      q: state.q,
      sort: state.sort,
      order: state.order,
      page: state.page,
      page_size: state.page_size,
    });
    
    const res = await fetch(`/api/books?${params.toString()}`);
    
    if (!res.ok) {
      throw new Error(`API response not ok: ${res.status}`);
    }
    
    const data = await res.json();
    return data;
    
  } catch (error) {
    console.error("Error fetching books:", error);
    
    // Fallback: Show error message in UI
    const grid = document.getElementById("booksGrid");
    if (grid) {
      grid.innerHTML = `
        <div class="no-books" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted);">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <h3>Unable to load books</h3>
          <p>Please check your connection and try again</p>
          <button onclick="loadBooks()" class="btn small" style="margin-top: 16px;">Retry</button>
        </div>
      `;
    }
    
    return { items: [], total: 0 };
  }
}

async function fetchBookById(id) {
  try {
    const res = await fetch(`/api/books/${id}`);
    
    if (!res.ok) {
      throw new Error(`Book not found: ${res.status}`);
    }
    
    return await res.json();
    
  } catch (error) {
    console.error("Error fetching book:", error);
    return null;
  }
}

// ---------- Page wiring ----------
async function initHome() {
  console.log("🏠 Initializing home page...");

  await includePartials();
  initHeaderScroll();
  initHeroCarousel();

  // Smooth scrolling
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
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
    const doSearch = async () => {
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
    };

    document.getElementById("searchForm").addEventListener("submit", (e) => {
      e.preventDefault();
      doSearch();
    });
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
      state.sort = sort;
      state.order = order;
      state.page = 1;
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

  async function loadBooks() {
    console.log("📚 Loading books...");
    const result = await fetchBooks();
    renderGrid("booksGrid", result.items);
    renderPagination(result, jumpTo);
    console.log(`✅ Loaded ${result.items.length} books`);
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
    // Show loading state
    const pdfLoading = document.getElementById('pdfLoading');
    const pdfCanvas = document.getElementById('pdfCanvas');
    
    if (pdfLoading) pdfLoading.style.display = 'flex';
    if (pdfCanvas) pdfCanvas.style.display = 'none';

    const book = await fetchBookById(id);
    
    if (!book) {
      document.getElementById("bookTitle").textContent = "Book not found";
      if (pdfLoading) pdfLoading.style.display = 'none';
      return;
    }

    // Update book info
    document.getElementById("bookTitle").textContent = book.title;
    document.getElementById("bookAuthor").textContent = "by " + (book.author || "Unknown Author");
    document.getElementById("bookDesc").textContent = book.description || "No description available.";

    // Set download link
    const downloadBtn = document.getElementById("downloadBtn");
    if (downloadBtn && book.pdf_path) {
      downloadBtn.href = book.pdf_path;
      downloadBtn.setAttribute("download", `${book.title}.pdf`);
    }

    // Load PDF if path exists
    if (book.pdf_path) {
      await loadPDF(book.pdf_path);
    } else {
      if (pdfLoading) {
        pdfLoading.innerHTML = `
          <div style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
            <h3>PDF Not Available</h3>
            <p>This book doesn't have a PDF file yet.</p>
          </div>
        `;
      }
    }

  } catch (error) {
    console.error("Error loading book:", error);
    document.getElementById("bookTitle").textContent = "Error loading book";
    const pdfLoading = document.getElementById('pdfLoading');
    if (pdfLoading) {
      pdfLoading.style.display = 'none';
    }
  }
}

// ---------- PDF.js Viewer ----------
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
const scale = 1.5;

function initPDFViewer() {
  // Set up PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

  // Set up page controls
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const goToPageBtn = document.getElementById("goToPage");
  const pageJumpInput = document.getElementById("pageJump");

  if (prevPageBtn) prevPageBtn.addEventListener("click", onPrevPage);
  if (nextPageBtn) nextPageBtn.addEventListener("click", onNextPage);
  if (goToPageBtn) goToPageBtn.addEventListener("click", onGoToPage);
  if (pageJumpInput) {
    pageJumpInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") onGoToPage();
    });
  }
}

function loadPDF(pdfUrl) {
  // Initialize PDF viewer first
  initPDFViewer();

  // Show loading state
  const pdfLoading = document.getElementById('pdfLoading');
  const pdfCanvas = document.getElementById('pdfCanvas');
  
  if (pdfLoading) pdfLoading.style.display = 'flex';
  if (pdfCanvas) pdfCanvas.style.display = 'none';

  // Load the PDF
  const loadingTask = pdfjsLib.getDocument(pdfUrl);
  
  loadingTask.promise.then(function(pdfDoc_) {
    pdfDoc = pdfDoc_;
    
    // Set total pages
    document.getElementById("totalPages").textContent = pdfDoc.numPages;
    
    // Render first page
    renderPage(pageNum);
    
  }).catch(function(error) {
    console.error("Error loading PDF:", error);
    
    if (pdfLoading) {
      pdfLoading.innerHTML = `
        <div style="text-align: center; color: var(--muted);">
          <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
          <h3>Error Loading PDF</h3>
          <p>Could not load the PDF file.</p>
          <button onclick="window.history.back()" class="btn small" style="margin-top: 16px;">
            ← Back to Library
          </button>
        </div>
      `;
    }
  });
}

function renderPage(num) {
  pageRendering = true;

  pdfDoc.getPage(num).then(function(page) {
    const canvas = document.getElementById("pdfCanvas");
    const ctx = canvas.getContext("2d");
    const viewport = page.getViewport({ scale: scale });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    const renderTask = page.render(renderContext);

    renderTask.promise.then(function() {
      pageRendering = false;

      // Hide loading and show canvas
      const pdfLoading = document.getElementById('pdfLoading');
      const pdfCanvas = document.getElementById('pdfCanvas');
      
      if (pdfLoading) pdfLoading.style.display = 'none';
      if (pdfCanvas) pdfCanvas.style.display = 'block';

      // Update page info
      document.getElementById("currentPage").textContent = num;
      document.getElementById("totalPages").textContent = pdfDoc.numPages;

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
  const input = document.getElementById("pageJump");
  const num = parseInt(input.value);

  if (num >= 1 && num <= pdfDoc.numPages) {
    pageNum = num;
    queueRenderPage(pageNum);
    input.value = "";
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

// ---------- Page Router ----------
function initPage() {
  console.log("🚀 Initializing page...");

  // Check which page we're on and initialize accordingly
  if (document.getElementById("booksGrid")) {
    // We're on the home page
    console.log("📍 Detected home page");
    initHome();
  } else if (document.getElementById("bookDetails")) {
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