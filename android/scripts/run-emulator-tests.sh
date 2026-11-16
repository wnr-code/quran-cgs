#!/usr/bin/env bash
# Called as one line by reactivecircus/android-emulator-runner; its script input
# parser executes each input line in a separate /bin/sh process.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
diag_dir="${RUNNER_TEMP:-/tmp}"
mkdir -p "$diag_dir"

capture_logcat() {
  timeout 20s adb logcat -d -v threadtime > "$diag_dir/android-emulator-logcat.txt" 2>&1 || true
}
trap capture_logcat EXIT

adb wait-for-device
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0

set +e
gradle :app:connectedDebugAndroidTest --no-daemon --console=plain --stacktrace 2>&1 | tee "$diag_dir/android-connected-tests.log"
test_status=${PIPESTATUS[0]}
set -e
exit "$test_status"
