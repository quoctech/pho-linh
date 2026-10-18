#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

if [[ -z "${ANDROID_SDK_ROOT:-}" ]]; then
  export ANDROID_SDK_ROOT="${HOME}/Android/Sdk"
fi

ADB_BIN="${ANDROID_SDK_ROOT}/platform-tools/adb"
if [[ ! -x "$ADB_BIN" ]]; then
  if command -v adb >/dev/null 2>&1; then
    ADB_BIN="$(command -v adb)"
  else
    echo "❌ Không tìm thấy ADB tại $ADB_BIN"
    exit 1
  fi
fi

if ! "$ADB_BIN" start-server >/dev/null 2>&1; then
  echo "❌ Không thể khởi động ADB server."
  echo "   Kiểm tra quyền truy cập USB/ADB hoặc chạy lại ngoài sandbox."
  exit 1
fi
DEVICE_ID="$("$ADB_BIN" devices | awk '$2 == "device" && $1 !~ /^emulator-/ { print $1; exit }')"
if [[ -z "$DEVICE_ID" ]]; then
  echo "❌ Không tìm thấy điện thoại Android đã cấp quyền."
  echo "   Chạy ./dev-device.sh trước hoặc bật USB Debugging."
  exit 1
fi

DEVICE_MODEL="$("$ADB_BIN" -s "$DEVICE_ID" shell getprop ro.product.model 2>/dev/null | tr -d '\r')"
echo "🧹 Xóa log cũ trên $DEVICE_MODEL ($DEVICE_ID)..."
"$ADB_BIN" -s "$DEVICE_ID" logcat -c
echo "📋 Đang theo dõi log Capacitor/WebView/Phaser. Nhấn Ctrl+C để dừng."

# Lọc các nhóm log hữu ích cho lỗi app, nhưng vẫn giữ process sống khi chưa
# có dòng khớp; logcat tiếp tục chờ dữ liệu mới.
"$ADB_BIN" -s "$DEVICE_ID" logcat -v color \
  | grep --line-buffered -Ei 'Capacitor|Chromium|WebView|Phaser|AndroidRuntime|FATAL EXCEPTION|io\.ionic\.starter|console' \
  || true
