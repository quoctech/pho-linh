#!/usr/bin/env bash
set -euo pipefail

# Chạy script ở đâu cũng được; mọi lệnh luôn dùng root của project này.
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# ================== CẤU HÌNH ==================
if [[ -z "${ANDROID_SDK_ROOT:-}" ]]; then
  export ANDROID_SDK_ROOT="${HOME}/Android/Sdk"
fi

ADB_BIN="${ANDROID_SDK_ROOT}/platform-tools/adb"
DEV_PORT="${DEV_PORT:-8100}"

# ================== CHECK PREREQUISITES ==================
if [[ ! -x "$ADB_BIN" ]]; then
  if command -v adb >/dev/null 2>&1; then
    ADB_BIN="$(command -v adb)"
  else
    echo "❌ Không tìm thấy ADB tại $ADB_BIN"
    echo "   Cài Android Studio + SDK Platform Tools, hoặc set ANDROID_SDK_ROOT."
    exit 1
  fi
fi

if ! command -v ionic >/dev/null 2>&1; then
  echo "❌ Không tìm thấy Ionic CLI. Cài bằng: npm install -g @ionic/cli"
  exit 1
fi

# ================== KIỂM TRA THIẾT BỊ ==================
echo "🔍 Đang quét thiết bị Android..."
if ! "$ADB_BIN" start-server >/dev/null 2>&1; then
  echo "❌ Không thể khởi động ADB server."
  echo "   Kiểm tra quyền truy cập USB/ADB hoặc chạy lại ngoài sandbox."
  exit 1
fi

DEVICE_ID="$("$ADB_BIN" devices | awk '$2 == "device" && $1 !~ /^emulator-/ { print $1; exit }')"
if [[ -z "$DEVICE_ID" ]]; then
  echo "❌ Không tìm thấy điện thoại Android nào."
  echo "   • Cắm cáp USB"
  echo "   • Bật Developer options → USB Debugging"
  echo "   • Bấm Allow khi điện thoại hỏi cấp quyền"

  UNAUTHORIZED="$("$ADB_BIN" devices | awk '$2 == "unauthorized" { print }')"
  if [[ -n "$UNAUTHORIZED" ]]; then
    echo
    echo "⚠️ Có thiết bị chưa cấp quyền:"
    echo "$UNAUTHORIZED"
  fi
  exit 1
fi

DEVICE_MODEL="$("$ADB_BIN" -s "$DEVICE_ID" shell getprop ro.product.model 2>/dev/null | tr -d '\r')"
echo "✅ Thiết bị: $DEVICE_ID ($DEVICE_MODEL)"

# ================== SYNC NATIVE ==================
# Live reload dùng dev server, nhưng các plugin Capacitor và native assets
# vẫn phải được đồng bộ trước khi chạy app Android.
echo "🔄 Đang sync Capacitor Android..."
ionic cap sync android --inline

# ================== ADB REVERSE ==================
# App trên điện thoại truy cập localhost:${DEV_PORT}; adb reverse chuyển
# request đó về đúng port dev server trên máy tính qua USB.
echo "🔌 Tạo USB tunnel: tcp:${DEV_PORT} → tcp:${DEV_PORT}..."
"$ADB_BIN" -s "$DEVICE_ID" reverse --remove-all >/dev/null 2>&1 || true
"$ADB_BIN" -s "$DEVICE_ID" reverse tcp:"$DEV_PORT" tcp:"$DEV_PORT"

echo "-----------------------------------------------------"
echo "🌐 Dev URL trong app: http://localhost:${DEV_PORT}"
echo "🔌 Mode: USB reverse tunnel — không cần cùng Wi-Fi"
echo "📦 App ID: io.ionic.starter"
echo "📱 Device: $DEVICE_MODEL"
echo "-----------------------------------------------------"

# Không dùng --external: app sẽ dùng localhost, đi qua adb reverse.
exec ionic cap run android -l --target="$DEVICE_ID" --port="$DEV_PORT" "$@"
