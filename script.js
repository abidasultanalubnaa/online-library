// ---------- Utilities ----------
async function includePartials() {
  const nodes = document.querySelectorAll("[data-include]");
  await Promise.all(
    Array.from(nodes).map(async (el) => {
      const path = el.getAttribute("data-include");
      const res = await fetch(path);
      el.innerHTML = await res.text();
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
      <img src="${imgOrPlaceholder(book.image_path)}" alt="${book.title}">
    </div>
    <div class="meta">
      <h3 class="title" title="${book.title}">${book.title}</h3>
      <p class="author">${book.author || ""}</p>
      <p class="desc">${(book.description || "").slice(0, 90)}${(book.description||"").length>90?"…":""}</p>
      <div class="actions">
        <a class="btn small" href="book.html?id=${book.id}">Read</a>
        <a class="btn ghost small" href="${book.pdf_path}" target="_blank" rel="noopener">Open PDF</a>
      </div>
    </div>
  `;
  return card;
}

function renderGrid(containerId, items) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = "";
  items.forEach(b => grid.appendChild(renderBookCard(b)));
}

function renderPagination({ total, page, page_size }, onJump) {
  const pages = Math.max(1, Math.ceil(total / page_size));
  const wrap = document.getElementById("pagination");
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

  // window of numbers
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
async function fetchPopular(limit=8) {
  const res = await fetch(`/api/books/random?limit=${limit}`);
  const json = await res.json();
  return json.items || [];
}

async function fetchBooks() {
  const params = new URLSearchParams({
    q: state.q,
    sort: state.sort,
    order: state.order,
    page: state.page,
    page_size: state.page_size
  });
  const res = await fetch(`/api/books?${params.toString()}`);
  return await res.json();
}

// ---------- Page wiring ----------
async function initHome() {
  await includePartials();

  // HERO button smooth scroll
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

  // Search
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const searchMeta = document.getElementById("searchMeta");
  document.getElementById("searchForm").addEventListener("submit", doSearch);
  searchBtn.addEventListener("click", doSearch);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });

  // Popular shelf
  async function loadPopular() {
    const items = await fetchPopular(8);
    renderGrid("popularGrid", items);
  }
  document.getElementById("refreshPopular").addEventListener("click", loadPopular);

  // Sort + Page size
  const sortSelect = document.getElementById("sortSelect");
  const pageSizeSelect = document.getElementById("pageSizeSelect");

  sortSelect.addEventListener("change", () => {
    const [sort, order] = sortSelect.value.split("|");
    state.sort = sort; state.order = order; state.page = 1;
    loadBooks();
  });

  pageSizeSelect.addEventListener("change", () => {
    state.page_size = parseInt(pageSizeSelect.value, 10);
    state.page = 1;
    loadBooks();
  });

  async function doSearch() {
    state.q = searchInput.value.trim();
    state.page = 1;
    const result = await fetchBooks();
    renderGrid("booksGrid", result.items);
    renderPagination(result, jumpTo);
    if (state.q) {
      searchMeta.textContent = `Showing ${result.items.length} of ${result.total} results for “${state.q}”.`;
    } else {
      searchMeta.textContent = "";
    }
  }

  async function loadBooks() {
    const result = await fetchBooks();
    renderGrid("booksGrid", result.items);
    renderPagination(result, jumpTo);
  }

  async function jumpTo(p) {
    state.page = p;
    const result = await fetchBooks();
    renderGrid("booksGrid", result.items);
    renderPagination(result, jumpTo);
  }

  // initial loads
  await loadPopular();
  await loadBooks();
}

document.addEventListener("DOMContentLoaded", initHome);
