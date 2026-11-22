#!/usr/bin/env bash
# Provisionnement de la VM : Docker Engine + plugin Compose. Rejouable sans risque.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

if ! command -v docker >/dev/null 2>&1; then
  echo ">>> Installation de Docker"
  apt-get update -y
  apt-get install -y ca-certificates curl git jq
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# L'utilisateur "vagrant" (qui fera tourner le runner GitHub) peut utiliser Docker
usermod -aG docker vagrant
systemctl enable --now docker

echo ">>> Prêt : $(docker --version) | $(docker compose version)"
