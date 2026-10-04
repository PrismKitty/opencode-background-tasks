#!/usr/bin/env bash
# Records the README demo into docs/readme/demo.gif by running OpenCode with this checkout under asciinema, in a
# tmux session driven from here. The agent's replies come from mock-model/scene.ts, so every run plays the
# same tool calls and words, while the shells and the subagent still really run.
# Needs opencode on PATH, plus tmux, asciinema and agg, which shell.nix provides.
set -euo pipefail

demo=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repository=$(cd "${demo}/../.." && pwd)
work=${TMPDIR:-/tmp}/opencode-background-tasks-demo
socket=${work}/tmux.sock
cast=${work}/demo.cast
# OpenCode's service outlives the recording and reopens a folder's last session, so every run gets a fresh one
home=${work}/run-$(date +%s)
project=${home}/projects/my-project
columns=150
rows=34
running_marker='[•]'
# Long enough for the last finished row to sit marked for a while
linger_seconds=5
prompt='Run ./build.sh and ./test.sh as background shells, and start a background explore subagent to summarise README.md. Then stop, without waiting for any of them.'

in_demo() {
    tmux -S "${socket}" "$@"
}

say() {
    echo "==> $*"
}

fail() {
    echo "$*" >&2
    exit 1
}

# usage: wait_for <seconds> <message on timeout> <command>...
wait_for() {
    local deadline=$(( SECONDS + $1 ))
    local message=$2
    shift 2
    until "$@"; do
        (( SECONDS < deadline )) || fail "${message}"
        sleep 0.2
    done
}

screen_shows() {
    in_demo capture-pane -p 2>/dev/null | grep -qF "$1"
}

all_tasks_finished() {
    ! screen_shows "${running_marker}"
}

type_slowly() {
    local text=$1
    local index
    for (( index = 0; index < ${#text}; index++ )); do
        in_demo send-keys -l "${text:index:1}"
        sleep 0.03
    done
    sleep 0.8
}

start_afresh() {
    say "Preparing a scratch project in ${project}"
    in_demo kill-server 2>/dev/null || true
    rm -rf "${work}"
    mkdir -p "${project}" "${home}/.config/opencode"
}

start_mock_model() {
    say "Starting the mock model"
    node "${demo}/mock-model/server.ts" > "${work}/mock-model.port" &
    mock_model_pid=$!
    trap 'kill "${mock_model_pid}"' EXIT
    wait_for 10 "The mock model didn't start" test -s "${work}/mock-model.port"
    mock_model_port=$(< "${work}/mock-model.port")
}

write_project() {
    git -C "${project}" init -q -b main
    cat > "${project}/opencode.json" <<JSON
{
  "\$schema": "https://opencode.ai/config.json",
  "model": "demo/scripted",
  "provider": {
    "demo": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Demo",
      "options": { "baseURL": "http://127.0.0.1:${mock_model_port}/v1", "apiKey": "unused" },
      "models": { "scripted": { "name": "Scripted" } }
    }
  }
}
JSON
    cat > "${project}/README.md" <<'MARKDOWN'
# my-project

A small shop front that sells houseplants.
MARKDOWN
    cat > "${project}/build.sh" <<'SH'
#!/usr/bin/env bash
sleep 6
echo "built"
SH
    cat > "${project}/test.sh" <<'SH'
#!/usr/bin/env bash
sleep 11
echo "2 tests failed" >&2
exit 1
SH
    chmod +x "${project}/build.sh" "${project}/test.sh"
}

# The sidebar footer holds the first-run "Getting started" card, which every fresh data folder shows
write_cli_config() {
    cat > "${home}/.config/opencode/cli.json" <<JSON
{
  "\$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["${repository}/src", "-opencode.sidebar.footer"]
}
JSON
}

start_recording() {
    say "Starting OpenCode under asciinema, ${columns}x${rows}"
    local session=(
        new-session -d
        -x "${columns}" -y "${rows}"
        -e TERM=xterm-256color
        # A private server under the scratch HOME loads none of the user's global config, plugins or
        # sessions, and OpenCode shows the project as ~/projects/my-project
        -e "HOME=${home}"
        -e "XDG_CONFIG_HOME=${home}/.config"
        -e "XDG_DATA_HOME=${home}/.local/share"
        -e "XDG_STATE_HOME=${home}/.local/state"
        -e "XDG_CACHE_HOME=${home}/.cache"
        -c "${project}"
        "asciinema rec --quiet --overwrite --window-size ${columns}x${rows} -c 'opencode --standalone 2>/dev/null' ${cast}"
    )
    in_demo -f /dev/null "${session[@]}"
    say "Waiting for OpenCode to be ready"
    wait_for 60 "OpenCode didn't start within 60s" screen_shows 'Ask anything'
    sleep 1.5
}

perform() {
    say "Asking for three background tasks"
    type_slowly "${prompt}"
    in_demo send-keys Enter
    say "Waiting for the background tasks to start"
    wait_for 120 "The background tasks didn't start within 120s" screen_shows "${running_marker}"
    say "Waiting for the background tasks to finish"
    wait_for 120 "The background tasks didn't finish within 120s" all_tasks_finished
    sleep "${linger_seconds}"
}

quit_opencode() {
    say "Quitting OpenCode"
    local attempt
    for (( attempt = 0; attempt < 10; attempt++ )); do
        in_demo send-keys C-c 2>/dev/null || return 0
        sleep 1
    done
    fail "OpenCode didn't quit"
}

render() {
    local font_options=(--font-family "DejaVu Sans Mono")
    if [[ -n "${DEMO_FONT_DIR:-}" ]]; then
        font_options+=(--font-dir "${DEMO_FONT_DIR}")
    fi
    say "Trimming OpenCode's exit from the recording"
    node "${demo}/trim-cast.ts" "${cast}" "${work}/trimmed.cast"
    say "Rendering docs/readme/demo.gif"
    mkdir -p "${repository}/docs"
    agg "${font_options[@]}" "${work}/trimmed.cast" "${repository}/docs/readme/demo.gif" >/dev/null
}

start_afresh
start_mock_model
write_project
write_cli_config
start_recording
perform
quit_opencode
render
echo "Wrote docs/readme/demo.gif"
