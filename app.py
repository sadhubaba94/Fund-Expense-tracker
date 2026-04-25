from datetime import datetime
from pathlib import Path
import sqlite3

from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "expenses.db"

app = Flask(__name__)


def get_db_connection() -> sqlite3.Connection:
    """Create a database connection with dict-like row access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create transactions table if it does not exist."""
    with get_db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
                amount REAL NOT NULL CHECK(amount >= 0),
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                notes TEXT DEFAULT ''
            )
            """
        )
        conn.commit()


def validate_transaction(payload: dict) -> tuple[bool, str | None]:
    """Perform basic payload checks before insert/update."""
    required_fields = ["type", "amount", "category", "date"]
    missing = [field for field in required_fields if payload.get(field) in (None, "")]
    if missing:
        return False, f"Missing required fields: {', '.join(missing)}"

    if payload["type"] not in ("income", "expense"):
        return False, "type must be either 'income' or 'expense'"

    try:
        amount = float(payload["amount"])
        if amount < 0:
            return False, "amount must be greater than or equal to 0"
    except (TypeError, ValueError):
        return False, "amount must be a valid number"

    try:
        datetime.strptime(payload["date"], "%Y-%m-%d")
    except ValueError:
        return False, "date must be in YYYY-MM-DD format"

    return True, None


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/transactions", methods=["GET"])
def get_transactions():
    tx_type = request.args.get("type", "").strip().lower()
    start_date = request.args.get("start_date", "").strip()
    end_date = request.args.get("end_date", "").strip()

    query = "SELECT * FROM transactions WHERE 1=1"
    params: list[str] = []

    if tx_type in ("income", "expense"):
        query += " AND type = ?"
        params.append(tx_type)

    if start_date:
        query += " AND date >= ?"
        params.append(start_date)

    if end_date:
        query += " AND date <= ?"
        params.append(end_date)

    query += " ORDER BY date DESC, id DESC"

    with get_db_connection() as conn:
        rows = conn.execute(query, params).fetchall()

    transactions = [dict(row) for row in rows]
    return jsonify(transactions)


@app.route("/transactions", methods=["POST"])
def create_transaction():
    payload = request.get_json(silent=True) or {}
    is_valid, error = validate_transaction(payload)
    if not is_valid:
        return jsonify({"error": error}), 400

    with get_db_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO transactions (type, amount, category, date, notes)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                payload["type"],
                float(payload["amount"]),
                payload["category"].strip(),
                payload["date"],
                (payload.get("notes") or "").strip(),
            ),
        )
        conn.commit()
        transaction_id = cursor.lastrowid

    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM transactions WHERE id = ?", (transaction_id,)).fetchone()

    return jsonify(dict(row)), 201


@app.route("/transactions/<int:transaction_id>", methods=["PUT"])
def update_transaction(transaction_id: int):
    payload = request.get_json(silent=True) or {}
    is_valid, error = validate_transaction(payload)
    if not is_valid:
        return jsonify({"error": error}), 400

    with get_db_connection() as conn:
        existing = conn.execute("SELECT id FROM transactions WHERE id = ?", (transaction_id,)).fetchone()
        if not existing:
            return jsonify({"error": "Transaction not found"}), 404

        conn.execute(
            """
            UPDATE transactions
            SET type = ?, amount = ?, category = ?, date = ?, notes = ?
            WHERE id = ?
            """,
            (
                payload["type"],
                float(payload["amount"]),
                payload["category"].strip(),
                payload["date"],
                (payload.get("notes") or "").strip(),
                transaction_id,
            ),
        )
        conn.commit()

        row = conn.execute("SELECT * FROM transactions WHERE id = ?", (transaction_id,)).fetchone()

    return jsonify(dict(row))


@app.route("/transactions/<int:transaction_id>", methods=["DELETE"])
def delete_transaction(transaction_id: int):
    with get_db_connection() as conn:
        existing = conn.execute("SELECT id FROM transactions WHERE id = ?", (transaction_id,)).fetchone()
        if not existing:
            return jsonify({"error": "Transaction not found"}), 404

        conn.execute("DELETE FROM transactions WHERE id = ?", (transaction_id,))
        conn.commit()

    return jsonify({"message": "Transaction deleted successfully"})


init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
