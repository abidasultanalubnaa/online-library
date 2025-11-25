from flask import Flask, jsonify, request, send_from_directory, abort
import sqlite3
import os

# Serve the project root as static so / -> index.html works
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')

DB_PATH = os.path.join(BASE_DIR, "db", "library.db")

def query_db(sql, params=()):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(sql, params)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_scalar(sql, params=()):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(sql, params)
    (val,) = cur.fetchone()
    conn.close()
    return val

@app.after_request
def add_header(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.route('/')
def home():
    # Serve index.html from project root
    return send_from_directory(app.static_folder, 'index.html')

# ---------- API: Books list with search, sort, pagination ----------
@app.route('/api/books')
def api_books():
    # query params
    q = request.args.get('q', '', type=str).strip()
    sort = request.args.get('sort', 'title', type=str).lower()      # title|author|id
    order = request.args.get('order', 'asc', type=str).lower()      # asc|desc
    page = max(1, request.args.get('page', 1, type=int))
    page_size = min(48, max(1, request.args.get('page_size', 12, type=int)))

    # whitelisted sort columns
    sort_col = 'title' if sort not in ('id','title','author') else sort
    order_dir = 'ASC' if order != 'desc' else 'DESC'

    where = ""
    params = []
    if q:
        where = "WHERE title LIKE ? OR author LIKE ? OR description LIKE ?"
        like = f"%{q}%"
        params = [like, like, like]

    total_sql = f"SELECT COUNT(*) FROM books {where}"
    total = get_scalar(total_sql, params) if where else get_scalar("SELECT COUNT(*) FROM books")

    offset = (page - 1) * page_size
    sql = f"""
        SELECT id, title, author, description, pdf_path, image_path
        FROM books
        {where}
        ORDER BY {sort_col} {order_dir}
        LIMIT ? OFFSET ?
    """
    data = query_db(sql, params + [page_size, offset])

    return jsonify({
        "total": total,
        "page": page,
        "page_size": page_size,
        "sort": sort_col,
        "order": order_dir.lower(),
        "items": data
    })

# ---------- API: Popular (random) ----------
@app.route('/api/books/random')
def api_books_random():
    limit = min(24, max(1, request.args.get('limit', 8, type=int)))
    data = query_db(f"""
        SELECT id, title, author, description, pdf_path, image_path
        FROM books
        ORDER BY RANDOM()
        LIMIT ?
    """, (limit,))
    return jsonify({"items": data})

# ---------- API: Single book (for book.html later) ----------
@app.route('/api/books/<int:book_id>')
def api_book_one(book_id):
    rows = query_db("""
        SELECT id, title, author, description, pdf_path, image_path
        FROM books WHERE id = ?
    """, (book_id,))
    if not rows:
        abort(404)
    return jsonify(rows[0])

# Static passthrough (images, pdfs, partials, css, js)
@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    app.run(debug=True)