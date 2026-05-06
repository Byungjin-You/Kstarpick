#!/bin/bash
# Self-healing health checker for kstarpick.
# Runs via system cron every 5 minutes. Detects + auto-resolves common issues.
# Safe actions only — refuses to act on ambiguous conditions.
#
# Install (one-time):
#   echo '*/5 * * * * ec2-user /doohub/service/kstarpick/scripts/self-heal.sh' | sudo tee /etc/cron.d/kstarpick-self-heal
#   sudo chmod 644 /etc/cron.d/kstarpick-self-heal

set -u
APP_DIR=/doohub/service/kstarpick
LOG=$APP_DIR/logs/self-heal.log
STATE_DIR=/tmp/kstarpick-heal
mkdir -p "$STATE_DIR"

log() { echo "[$(date '+%F %T')] $*" >> "$LOG"; }

# Cooldown: returns 0 if action should be SKIPPED (still cooling), 1 if allowed.
in_cooldown() {
  local key="$1" cooldown_sec="${2:-1800}"   # default 30 min
  local f="$STATE_DIR/$key"
  local now=$(date +%s)
  if [ -f "$f" ]; then
    local last=$(cat "$f")
    if [ $((now - last)) -lt "$cooldown_sec" ]; then return 0; fi
  fi
  echo "$now" > "$f"
  return 1
}

PM2_BIN=$(command -v pm2 || echo /usr/bin/pm2)
JQ_BIN=$(command -v jq || echo /usr/bin/jq)

# --- 1. Site availability (kstarpick on :13001) ---
http=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:13001/ 2>/dev/null || echo "000")
if [ "$http" != "200" ] && [ "$http" != "301" ] && [ "$http" != "302" ]; then
  if ! in_cooldown "kstarpick-restart" 1800; then
    log "ACTION: kstarpick HTTP=$http -> pm2 restart kstarpick"
    "$PM2_BIN" restart kstarpick >> "$LOG" 2>&1
  else
    log "SKIP: kstarpick HTTP=$http but in cooldown"
  fi
fi

# --- 2. PM2 restart count surge (catches infinite crash loop early) ---
SNAP="$STATE_DIR/pm2-snapshot.txt"
"$PM2_BIN" jlist 2>/dev/null | "$JQ_BIN" -r '.[] | "\(.name) \(.pm2_env.restart_time // 0)"' > "$SNAP.new" 2>/dev/null

if [ -s "$SNAP.new" ] && [ -f "$SNAP" ]; then
  while read -r name new_count; do
    old_count=$(grep "^$name " "$SNAP" 2>/dev/null | awk '{print $2}')
    if [ -n "$old_count" ] && [ "$new_count" -gt "$old_count" ]; then
      delta=$((new_count - old_count))
      # 5분에 30회+ 재시작 = 비정상 (정상 cron은 5분 1회 수준)
      if [ "$delta" -ge 30 ]; then
        if ! in_cooldown "stop-$name" 3600; then
          log "ACTION: RUNAWAY $name restarted $delta times in 5min -> pm2 stop"
          "$PM2_BIN" stop "$name" >> "$LOG" 2>&1
        else
          log "SKIP: $name still looping (delta=$delta) but in cooldown"
        fi
      fi
    fi
  done < "$SNAP.new"
fi
mv "$SNAP.new" "$SNAP" 2>/dev/null

# --- 3. Disk pressure ---
disk_pct=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$disk_pct" -ge 90 ]; then
  if ! in_cooldown "disk-cleanup" 3600; then
    log "ACTION: disk ${disk_pct}% -> truncate big logs + delete old rotated logs"
    find "$APP_DIR/logs" -name '*.log' -size +50M -exec truncate -s 0 {} \; 2>>"$LOG"
    find "$APP_DIR/logs" -name '*.log__*' -mtime +3 -delete 2>>"$LOG"
    "$PM2_BIN" flush >> "$LOG" 2>&1
    new_pct=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
    log "  result: disk now ${new_pct}%"
  else
    log "SKIP: disk ${disk_pct}% but in cooldown"
  fi
fi

# --- 4. Memory pressure ---
mem_pct=$(free | awk '/^Mem:/ {printf "%.0f", $3/$2*100}')
if [ "$mem_pct" -ge 92 ]; then
  if ! in_cooldown "mem-restart" 3600; then
    # Find biggest memory hog among PM2 processes EXCEPT kstarpick (don't touch main app for memory)
    biggest=$("$PM2_BIN" jlist 2>/dev/null | "$JQ_BIN" -r '.[] | select(.name!="kstarpick") | "\(.monit.memory) \(.name)"' 2>/dev/null | sort -nr | head -1 | awk '{print $2}')
    if [ -n "$biggest" ]; then
      log "ACTION: memory ${mem_pct}% -> pm2 restart $biggest (largest non-main)"
      "$PM2_BIN" restart "$biggest" >> "$LOG" 2>&1
    fi
  else
    log "SKIP: memory ${mem_pct}% but in cooldown"
  fi
fi

# --- 5. .next build sanity (catches the 4/21 incident pattern) ---
if [ ! -f "$APP_DIR/.next/BUILD_ID" ]; then
  if ! in_cooldown "rebuild" 7200; then
    log "ACTION: .next/BUILD_ID missing -> npm run build (background)"
    cd "$APP_DIR" && nohup npm run build > /tmp/self-heal-build.log 2>&1 &
    sleep 1
    log "  build started (PID $!), will auto-restart kstarpick when build completes is left to next health check"
  fi
fi

# --- 6. Load average — log only, no auto-action (too ambiguous) ---
load5=$(uptime | grep -oE 'load average:.*' | awk -F, '{print $2}' | tr -d ' ')
load5_int=$(echo "$load5" | awk '{print int($1)}')
if [ "$load5_int" -ge 4 ]; then
  log "WARN: load avg 5min=$load5 (vCPU=2). No auto-action."
fi

# Trim self-heal log if too big (keep last 5000 lines)
if [ -f "$LOG" ] && [ "$(wc -l < "$LOG")" -gt 10000 ]; then
  tail -5000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi
