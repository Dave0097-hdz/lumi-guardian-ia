#!/bin/bash
# LUMI Guardian Agent - Generic Install Script
# Servido desde el backend en: GET ${LUMI_BACKEND_URL}/agent/install
#
# Se invoca así (el snippet personalizado que genera VpsService.generateInstallScript
# exporta estas 3 variables antes de llamar a este script):
#
#   export LUMI_VPS_ID="..." \
#     && export LUMI_AGENT_TOKEN="..." \
#     && export LUMI_BACKEND_URL="..." \
#     && curl -fsSL "${LUMI_BACKEND_URL}/agent/install" | sudo -E bash

set -euo pipefail

# ---------- 0. Validaciones previas ----------
: "${LUMI_VPS_ID:?Falta LUMI_VPS_ID. Genera un nuevo script desde el dashboard.}"
: "${LUMI_AGENT_TOKEN:?Falta LUMI_AGENT_TOKEN. Genera un nuevo script desde el dashboard.}"
: "${LUMI_BACKEND_URL:?Falta LUMI_BACKEND_URL. Genera un nuevo script desde el dashboard.}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Este script necesita privilegios de root. Ejecuta con: sudo -E bash" >&2
  exit 1
fi

AGENT_VERSION="${LUMI_AGENT_VERSION:-latest}"
AGENT_DIR="/opt/lumi-agent"
AGENT_USER="lumi-agent"
ENV_FILE="/etc/lumi-agent/agent.env"
SERVICE_FILE="/etc/systemd/system/lumi-agent.service"
# TODO: confirmar de dónde se sirve el paquete del agente (ver nota al final)
RELEASE_URL="${LUMI_BACKEND_URL}/agent/releases/${AGENT_VERSION}/lumi-agent.tar.gz"

echo "==> Instalando LUMI Guardian Agent para VPS ${LUMI_VPS_ID}"

# ---------- 1. Verificar sistema y dependencias ----------
if ! command -v apt-get >/dev/null 2>&1; then
  echo "Este instalador solo soporta distribuciones basadas en Debian/Ubuntu (apt)." >&2
  exit 1
fi

echo "==> Actualizando índice de paquetes..."
apt-get update -qq

REQUIRED_PKGS=(python3.11 python3.11-venv ufw curl tar)
MISSING_PKGS=()
for pkg in "${REQUIRED_PKGS[@]}"; do
  dpkg -s "$pkg" >/dev/null 2>&1 || MISSING_PKGS+=("$pkg")
done

if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
  echo "==> Instalando dependencias faltantes: ${MISSING_PKGS[*]}"
  if [[ " ${MISSING_PKGS[*]} " == *" python3.11 "* ]]; then
    # python3.11 puede no estar en los repos default de Ubuntu < 22.10
    apt-get install -y -qq software-properties-common
    add-apt-repository -y ppa:deadsnakes/ppa
    apt-get update -qq
  fi
  apt-get install -y -qq "${MISSING_PKGS[@]}"
fi

# ---------- 2. Habilitar ufw sin cortar el acceso SSH actual ----------
if ! ufw status | grep -q "Status: active"; then
  echo "==> Habilitando ufw (permitiendo SSH primero para no perder acceso)..."
  ufw allow OpenSSH >/dev/null
  ufw --force enable
fi

# ---------- 3. Crear usuario de servicio dedicado ----------
if ! id -u "$AGENT_USER" >/dev/null 2>&1; then
  echo "==> Creando usuario de servicio '${AGENT_USER}'..."
  useradd --system --no-create-home --shell /usr/sbin/nologin "$AGENT_USER"
fi
usermod -aG adm "$AGENT_USER"

# Permiso sudo LIMITADO — solo el binario de ufw, no todo el sistema
SUDOERS_FILE="/etc/sudoers.d/lumi-agent"
cat > "$SUDOERS_FILE" <<EOF
${AGENT_USER} ALL=(root) NOPASSWD: /usr/sbin/ufw
EOF
chmod 440 "$SUDOERS_FILE"
visudo -cf "$SUDOERS_FILE" >/dev/null || {
  echo "Archivo sudoers inválido, abortando." >&2
  rm -f "$SUDOERS_FILE"
  exit 1
}

# ---------- 4. Descargar e instalar el agente ----------
echo "==> Descargando LUMI Agent (${AGENT_VERSION})..."
mkdir -p "$AGENT_DIR"
TMP_TARBALL="$(mktemp)"
curl -fsSL "$RELEASE_URL" -o "$TMP_TARBALL"
tar -xzf "$TMP_TARBALL" -C "$AGENT_DIR" --strip-components=1
rm -f "$TMP_TARBALL"

echo "==> Creando entorno virtual e instalando dependencias..."
python3.11 -m venv "$AGENT_DIR/.venv"
"$AGENT_DIR/.venv/bin/pip" install -q --upgrade pip
"$AGENT_DIR/.venv/bin/pip" install -q -e "$AGENT_DIR"

# ---------- 5. Config operativa (agent.toml) ----------
mkdir -p "$AGENT_DIR/config" "$AGENT_DIR/data" "$AGENT_DIR/logs"
if [ ! -f "$AGENT_DIR/config/agent.toml" ]; then
  cat > "$AGENT_DIR/config/agent.toml" <<'EOF'
[agent]
version = "0.1.0"

[logging]
level = "INFO"
file  = "logs/agent.log"

[storage]
db_path        = "data/lumi.db"
max_size_mb    = 500
retention_days = 30

[sensors]
system_interval_seconds = 5
log_batch_size          = 100
EOF
fi

chown -R "${AGENT_USER}:${AGENT_USER}" "$AGENT_DIR"

# ---------- 6. Credenciales en archivo protegido (nunca en agent.toml) ----------
echo "==> Guardando credenciales en ${ENV_FILE} (permisos 600)..."
mkdir -p "$(dirname "$ENV_FILE")"
cat > "$ENV_FILE" <<EOF
LUMI_VPS_ID=${LUMI_VPS_ID}
LUMI_AGENT_TOKEN=${LUMI_AGENT_TOKEN}
LUMI_BACKEND_URL=${LUMI_BACKEND_URL}
EOF
chmod 600 "$ENV_FILE"
chown root:"$AGENT_USER" "$ENV_FILE"

# ---------- 7. Servicio systemd ----------
echo "==> Instalando servicio systemd..."
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=LUMI Guardian AI - Agente de Telemetria
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${AGENT_USER}
WorkingDirectory=${AGENT_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${AGENT_DIR}/.venv/bin/python3 ${AGENT_DIR}/main.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable lumi-agent >/dev/null
systemctl restart lumi-agent

# ---------- 8. Verificación de arranque ----------
echo "==> Verificando que el agente arrancó correctamente..."
sleep 3
if systemctl is-active --quiet lumi-agent; then
  echo ""
  echo "✅ LUMI Agent instalado y corriendo."
  echo "   VPS ID:  ${LUMI_VPS_ID}"
  echo "   Backend: ${LUMI_BACKEND_URL}"
  echo "   Logs:    journalctl -u lumi-agent -f"
  echo ""
  echo "Verifica en el dashboard que el estado del VPS cambie a 'CONECTADO'"
  echo "en los próximos segundos (primer heartbeat)."
else
  echo ""
  echo "⚠️  El servicio no arrancó correctamente. Revisa los logs con:" >&2
  echo "   journalctl -u lumi-agent -n 50 --no-pager" >&2
  exit 1
fi