#!/usr/bin/env bash
# Installe le runner GitHub Actions "self-hosted" DANS la VM.
# Usage (dans la VM, en tant qu'utilisateur vagrant) :
#   bash /vagrant/provision/install-runner.sh https://github.com/<compte>/<depot> <TOKEN>
# Le TOKEN s'obtient sur GitHub : Settings > Actions > Runners > New self-hosted runner.
set -euo pipefail

REPO_URL="${1:?URL du dépôt manquante}"
TOKEN="${2:?token manquant}"
VERSION="2.321.0"
DIR="$HOME/actions-runner"

mkdir -p "$DIR" && cd "$DIR"
if [ ! -f ./config.sh ]; then
  curl -fsSL -o runner.tar.gz \
    "https://github.com/actions/runner/releases/download/v${VERSION}/actions-runner-linux-x64-${VERSION}.tar.gz"
  tar xzf runner.tar.gz && rm runner.tar.gz
fi

./config.sh --unattended --replace \
  --url "$REPO_URL" --token "$TOKEN" \
  --name "vagrant-vm" --labels "vagrant" --work _work

# Service systemd : le runner démarre avec la VM
sudo ./svc.sh install vagrant
sudo ./svc.sh start
sudo ./svc.sh status | head -5
