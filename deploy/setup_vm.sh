#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# FinanceFlow VM (Ubuntu 22.04 / 24.04) Deployment Script
# Usage (run from the cloned repo root on the VM):
#   bash deploy/setup_vm.sh finacialflow.duckdns.org
# ==============================================================================

DOMAIN="${1:-finacialflow.duckdns.org}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_USER="${SUDO_USER:-$USER}"

echo "=== FinanceFlow VM Setup ==="
echo "App directory : $APP_DIR"
echo "Run user      : $APP_USER"
echo "Domain        : $DOMAIN"
echo ""

if [ ! -f "$APP_DIR/.env" ]; then
  echo "[!] Không tìm thấy file $APP_DIR/.env."
  cp "$APP_DIR/deploy/.env.vm.example" "$APP_DIR/.env"
  echo "[!] Đã tạo mẫu $APP_DIR/.env từ deploy/.env.vm.example."
  echo "    Hãy mở file .env điền đủ SECRET_KEY, DATABASE_URL, GEMINI_API_KEY, EMAIL..., rồi chạy lại script này!"
  exit 1
fi

echo "--- 1. Cập nhật hệ thống & cài đặt gói cần thiết ---"
sudo apt-get update -y
sudo apt-get install -y python3 python3-venv python3-pip nginx certbot python3-certbot-nginx ufw fail2ban curl

if ! command -v node >/dev/null 2>&1; then
  echo "--- Cài đặt Node.js 20 LTS ---"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "--- 2. Cấu hình Firewall (UFW) & Fail2ban ---"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo systemctl enable --now fail2ban

echo "--- 3. Cài đặt Backend Python & Migrate Database ---"
cd "$APP_DIR/backend"
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
venv/bin/pip install --upgrade pip
venv/bin/pip install -r requirements.txt
venv/bin/python manage.py migrate --noinput
venv/bin/python manage.py collectstatic --noinput

echo "--- 4. Build Frontend React/Vite ---"
cd "$APP_DIR/frontend"
# Load VITE_* variables from root .env if present
set -a
# shellcheck source=/dev/null
source "$APP_DIR/.env"
set +a
npm ci
npm run build

# Ensure www-data (Nginx) can traverse APP_DIR to serve static files
chmod o+x "$(dirname "$APP_DIR")" "$APP_DIR" || true

echo "--- 5. Cấu hình Systemd service (Gunicorn) ---"
TMP_SERVICE="$(mktemp)"
sed \
  -e "s|__APP_USER__|$APP_USER|g" \
  -e "s|__APP_DIR__|$APP_DIR|g" \
  "$APP_DIR/deploy/systemd/financeflow.service" > "$TMP_SERVICE"
sudo mv "$TMP_SERVICE" /etc/systemd/system/financeflow.service
sudo systemctl daemon-reload
sudo systemctl enable financeflow
sudo systemctl restart financeflow

echo "--- 6. Cấu hình Nginx Reverse Proxy ---"
TMP_NGINX="$(mktemp)"
sed \
  -e "s|__DOMAIN__|$DOMAIN|g" \
  -e "s|__APP_DIR__|$APP_DIR|g" \
  "$APP_DIR/deploy/nginx/financeflow.conf" > "$TMP_NGINX"
sudo mv "$TMP_NGINX" /etc/nginx/sites-available/financeflow
sudo ln -sf /etc/nginx/sites-available/financeflow /etc/nginx/sites-enabled/financeflow
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "================================================================="
echo "Cài đặt hoàn tất cho HTTP!"
echo "Kiểm tra trạng thái backend: sudo systemctl status financeflow"
echo ""
echo "Bước cuối: Cài SSL HTTPS miễn phí (sau khi đã trỏ DuckDNS về IP của VM):"
echo "  sudo certbot --nginx -d $DOMAIN"
echo "================================================================="
