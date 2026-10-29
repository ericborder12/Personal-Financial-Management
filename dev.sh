#!/usr/bin/env bash
# Khởi chạy cả dự án bằng MỘT lệnh: Postgres (Docker) + Django + Vite.
#
#   ./dev.sh               chạy tất cả, Ctrl+C để dừng tất cả
#   KEEP_DB=1 ./dev.sh     khi thoát vẫn giữ container Postgres chạy


set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
ROOT="$PWD"

log() { printf '\033[1;36m[dev]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[dev] %s\033[0m\n' "$*" >&2; exit 1; }

command -v docker >/dev/null || die "Chưa cài docker."
command -v npm >/dev/null    || die "Chưa cài node/npm."

# --- Tìm virtualenv của backend ------------------------------------------------
PY=""
for v in backend/.venv backend/venv .venv venv; do
  if [[ -x "$ROOT/$v/bin/python" ]]; then PY="$ROOT/$v/bin/python"; break; fi
done
[[ -n "$PY" ]] || die "Không thấy virtualenv. Tạo: cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"

# --- Nạp .env gốc để backend dùng cùng cấu hình với docker compose --------------
# Đọc từng dòng KEY=value (không dùng `source`, nên giá trị có dấu cách, $ hay
# ngoặc cũng không bị bash hiểu nhầm là lệnh).
if [[ -f .env ]]; then
  n=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    n=$((n + 1))
    line="${line%$'\r'}"                                  # bỏ \r nếu file lưu kiểu Windows
    [[ -z "${line//[[:space:]]/}" || "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[2]}"
      val="${BASH_REMATCH[3]}"
      if [[ "$val" =~ ^\"(.*)\"$ || "$val" =~ ^\'(.*)\'$ ]]; then val="${BASH_REMATCH[1]}"; fi
      export "$key=$val"
    else
      die ".env dòng $n sai định dạng. Mỗi dòng phải là TEN=giá_trị (dùng dấu =, không phải dấu :)."
    fi
  done < .env
else
  log "Cảnh báo: chưa có file .env ở thư mục gốc (cp .env.example .env)."
fi

# --- Dọn dẹp khi thoát ----------------------------------------------------------
PIDDIR="$(mktemp -d)"

group_alive() { kill -0 -- "-$(cat "$1")" 2>/dev/null; }

cleanup() {
  trap - EXIT
  log "Đang dừng backend + frontend..."
  for f in "$PIDDIR"/*; do
    [[ -s "$f" ]] && kill -TERM -- "-$(cat "$f")" 2>/dev/null || true
  done
  sleep 1
  for f in "$PIDDIR"/*; do   # còn sót thì ép dừng
    [[ -s "$f" ]] && group_alive "$f" && kill -KILL -- "-$(cat "$f")" 2>/dev/null || true
  done
  rm -rf "$PIDDIR"
  if [[ "${KEEP_DB:-0}" != "1" ]]; then
    log "Dừng Postgres (dữ liệu vẫn nằm trong volume)."
    docker compose stop db >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# Chạy một lệnh trong thư mục riêng, mỗi dòng log có tiền tố [tên]. Mỗi dịch vụ nằm
# trong nhóm tiến trình riêng (setsid) nên dừng được sạch cả cây tiến trình con
# (npm -> vite, ...). PID của nhóm được ghi vào file để cleanup đọc lại.
start() {
  local name="$1" dir="$2"; shift 2
  setsid bash -c 'echo $$ > "$1"; cd "$2"; shift 2; exec "$@" 2>&1 | sed -u "s/^/[$0] /"' \
    "$name" "$PIDDIR/$name" "$dir" "$@" &
}

# --- 1) Database ---------------------------------------------------------------
log "Bật Postgres (Docker)..."
docker compose up -d --wait db

# --- 2) Backend ----------------------------------------------------------------
wait_for_db() {
local max_attempts=60
local attempt=1

log "Chờ Django kết nối được PostgreSQL..."

while (( attempt <= max_attempts )); do
if (cd backend && "$PY" manage.py shell -c 
'from django.db import connection; connection.ensure_connection()' 
>/dev/null 2>&1); then
log "Django đã kết nối PostgreSQL thành công."
return 0
fi

log "PostgreSQL chưa sẵn sàng (lần $attempt/$max_attempts), thử lại sau 2 giây..."
sleep 2
attempt=$((attempt + 1))

done

die "Không thể kết nối PostgreSQL sau $((max_attempts * 2)) giây. Kiểm tra cấu hình .env và log Docker: docker compose logs db"
}

wait_for_db

log "Chạy migrate..."
(cd backend && "$PY" manage.py migrate --noinput)

# --- 3) Frontend: cài thư viện lần đầu ------------------------------------------
if [[ ! -d frontend/node_modules ]]; then
  log "Cài thư viện frontend (lần đầu)..."
  (cd frontend && npm install)
fi

log "Khởi động backend + frontend..."
start be backend  "$PY" manage.py runserver
start fe frontend npm run dev

cat <<MSG

  Ứng dụng:  http://localhost:5173
  API:       http://localhost:8000/api
  Admin:     http://localhost:8000/admin
  Ctrl+C để dừng tất cả.

MSG

# Đợi cả hai dịch vụ ghi xong PID nhóm.
for _ in $(seq 1 50); do
  [[ -s "$PIDDIR/be" && -s "$PIDDIR/fe" ]] && break
  sleep 0.1
done

# Theo dõi: nếu một dịch vụ tự thoát (lỗi), dừng nốt phần còn lại.
while :; do
  for f in "$PIDDIR"/*; do
    group_alive "$f" || break 2
  done
  sleep 1
done
log "Một dịch vụ đã dừng, đang tắt phần còn lại."
