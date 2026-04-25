# Expense Tracker (Flask + SQLite)

A modern, responsive expense tracker web app that supports adding, editing, deleting, filtering, and persisting transactions using a Python backend and database.

## Features

- Add income and expense transactions
- Edit and delete existing transactions
- Dashboard summary:
  - Total Balance
  - Total Income
  - Total Expense
- Transaction history table with color-coded amount values
- Filters by type and date range
- Backend persistence using SQLite (no localStorage for transactions)
- REST API for CRUD operations
- Optional dark mode toggle
- Simple income vs expense chart (canvas)

## Project Structure

```text
/project-root
  ├── static/
  │     ├── style.css
  │     ├── script.js
  ├── templates/
  │     ├── index.html
  ├── app.py
  ├── requirements.txt
  ├── README.md
```

## Database Schema

Table: `transactions`

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `type` TEXT (`income` or `expense`)
- `amount` REAL
- `category` TEXT
- `date` TEXT (`YYYY-MM-DD`)
- `notes` TEXT

## API Endpoints

### `GET /transactions`
Fetch transactions. Optional query params:

- `type=income|expense`
- `start_date=YYYY-MM-DD`
- `end_date=YYYY-MM-DD`

### `POST /transactions`
Add a transaction.

Example body:

```json
{
  "type": "expense",
  "amount": 45.5,
  "category": "Food",
  "date": "2026-04-25",
  "notes": "Lunch"
}
```

### `PUT /transactions/<id>`
Update a transaction by id.

### `DELETE /transactions/<id>`
Delete a transaction by id.

---

## Local Setup

### 1) Clone and enter project

```bash
git clone <your-repo-url>
cd Fund-Expense-tracker
```

### 2) Create virtual environment

```bash
python -m venv .venv
source .venv/bin/activate   # macOS/Linux
# .venv\Scripts\activate    # Windows PowerShell
```

### 3) Install dependencies

```bash
pip install -r requirements.txt
```

### 4) Run app

```bash
python app.py
```

App will be available at:

- `http://127.0.0.1:5000`

---

## AWS Deployment Guide (Beginner-Friendly)

### Option A: Deploy on EC2 with Gunicorn + Nginx

### 1) Launch EC2

- Use Ubuntu 22.04 (or latest LTS)
- Open inbound security group ports:
  - `22` (SSH)
  - `80` (HTTP)
  - `443` (HTTPS, optional)

### 2) Connect to instance

```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### 3) Install system packages

```bash
sudo apt update
sudo apt install -y python3-pip python3-venv nginx git
```

### 4) Copy project and install deps

```bash
git clone <your-repo-url>
cd Fund-Expense-tracker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 5) Test Gunicorn

```bash
gunicorn --bind 0.0.0.0:8000 app:app
```

Open `http://<EC2_PUBLIC_IP>:8000` to verify.

### 6) Create systemd service

Create `/etc/systemd/system/expense-tracker.service`:

```ini
[Unit]
Description=Gunicorn service for Expense Tracker
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/Fund-Expense-tracker
Environment="PATH=/home/ubuntu/Fund-Expense-tracker/.venv/bin"
ExecStart=/home/ubuntu/Fund-Expense-tracker/.venv/bin/gunicorn --workers 3 --bind unix:expense-tracker.sock app:app

[Install]
WantedBy=multi-user.target
```

Enable and run:

```bash
sudo systemctl daemon-reload
sudo systemctl start expense-tracker
sudo systemctl enable expense-tracker
sudo systemctl status expense-tracker
```

### 7) Configure Nginx reverse proxy

Create `/etc/nginx/sites-available/expense-tracker`:

```nginx
server {
    listen 80;
    server_name <EC2_PUBLIC_IP_OR_DOMAIN>;

    location / {
        include proxy_params;
        proxy_pass http://unix:/home/ubuntu/Fund-Expense-tracker/expense-tracker.sock;
    }
}
```

Enable site and restart nginx:

```bash
sudo ln -s /etc/nginx/sites-available/expense-tracker /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

Now open `http://<EC2_PUBLIC_IP_OR_DOMAIN>`.

---

## Adapting to PostgreSQL (for AWS RDS)

Current app uses SQLite for simplicity. To migrate:

1. Replace `sqlite3` with SQLAlchemy + psycopg2.
2. Move DB connection string to environment variable (`DATABASE_URL`).
3. Update SQL layer to use parameterized ORM queries.
4. Point `DATABASE_URL` to AWS RDS PostgreSQL endpoint.

---

## Run Command

This app runs directly with:

```bash
python app.py
```

