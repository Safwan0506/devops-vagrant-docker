# Guide pas à pas (avec les captures à prendre)

Chaque étape indique 📸 la capture à faire pour le rapport.

## Étape 1 — Créer la VM

```powershell
cd C:\Users\Administrateur\devops-vagrant-docker
vagrant up
```
Attendre la fin (installation de Docker incluse). Dernière ligne attendue : `Prêt : Docker version ... | Docker Compose version ...`
📸 **1** : fin du `vagrant up`.
📸 **2** : fenêtre VirtualBox avec la VM `devops-vm` en cours d'exécution.

## Étape 2 — Vérifier la VM

```powershell
vagrant status
vagrant ssh -c "docker --version && ip -4 addr show enp0s8"
```
📸 **3** : résultat, avec l'IP 192.168.56.10.

## Étape 3 — Créer le dépôt GitHub

Sur GitHub : **New repository** → nom `devops-vagrant-docker` → **Public** → ne rien cocher (pas de README) → Create.
📸 **4** : page du dépôt vide.

Puis, depuis le dossier du projet :
```powershell
git remote add origin https://github.com/Safwan0506/devops-vagrant-docker.git
git branch -M main
git push -u origin main
```
Le premier push lance le pipeline : le job `test` doit passer, le job `deploy` attend un runner (normal).

## Étape 4 — Installer le runner dans la VM

Sur GitHub : **Settings → Actions → Runners → New self-hosted runner** → Linux x64.
Copier uniquement le **token** (dans la ligne `./config.sh --url ... --token XXXXX`).
📸 **5** : cette page (masque le token avant de l'insérer dans le rapport).

```powershell
vagrant ssh
bash /vagrant/provision/install-runner.sh https://github.com/Safwan0506/devops-vagrant-docker TON_TOKEN
exit
```
Sur GitHub, le runner `vagrant-vm` doit apparaître **Idle** (vert).
📸 **6** : liste des runners avec `vagrant-vm` en ligne.

## Étape 5 — Premier déploiement

Dans l'onglet **Actions**, relancer le workflow (**Run workflow**) ou refaire un push.
Les trois jobs `test`, `build` et `deploy` passent au vert : l'image est construite puis publiée sur GHCR, et la VM la télécharge.
📸 **7** : l'exécution du workflow avec les trois jobs verts.
📸 **8** : le détail du job `deploy` (ligne `docker compose pull`).
📸 **8 bis** : page du dépôt → **Packages** (l'image publiée), ou `vagrant ssh -c "docker images"`.

Ouvrir **http://192.168.56.10** dans le navigateur.
📸 **9** : la page de l'application (avec l'adresse IP visible dans la barre d'adresse).

**Rendre l'adresse visible par d'autres appareils** (option, si le prof veut la tester depuis un autre appareil) :
```powershell
$env:BRIDGE="1"; vagrant reload
vagrant ssh -c "ip -4 addr show enp0s9"   # 2e adresse IP, donnée par ton routeur
```
Tout appareil connecté au même Wi-Fi peut alors ouvrir `http://<cette adresse>`.

## Étape 6 — Observabilité

- Prometheus : http://192.168.56.10:9090/targets → les 3 cibles doivent être **UP**.
  📸 **10**
- Grafana : http://192.168.56.10:3000 (admin / admin, ignorer le changement de mot de passe) → **Dashboards → Démo DevOps**.
  📸 **11** : le tableau de bord. Recharge la page de l'application plusieurs fois pour faire monter les courbes.

## Étape 7 — Démonstration de la mise à jour automatique (le point clé du devoir)

Modifier un texte, par exemple le titre dans `app/server.js` (`Déploiement automatique OK` → `Déploiement automatique OK, version 2`), puis :
```powershell
# adapter aussi le test dans app/server.test.js si le texte testé change
git add -A
git commit -m "Change le titre de la page"
git push
```
Regarder l'onglet **Actions** : test → deploy. Après environ 1 minute, recharger http://192.168.56.10 : le nouveau titre et le nouveau numéro de version (SHA du commit) s'affichent, sans rien faire dans la VM.
📸 **12** : page avant la modification.
📸 **13** : le pipeline qui s'exécute.
📸 **14** : page après la modification.

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `vagrant up` échoue sur VirtualBox / VT-x | Hyper-V ou WSL2 prend la virtualisation | redémarrer ; sinon `bcdedit /set hypervisorlaunchtype off` (admin) puis redémarrer |
| Le job `deploy` reste en attente | runner absent ou hors ligne | `vagrant ssh -c "sudo systemctl list-units 'actions.runner*'"` |
| `permission denied` sur docker.sock dans le deploy | runner démarré avant l'ajout au groupe docker | `vagrant ssh -c "sudo systemctl restart 'actions.runner*'"` |
| La page ne s'ouvre pas depuis Windows | mauvaise IP / pare-feu | `ping 192.168.56.10` ; la carte « VirtualBox Host-Only » doit exister |
| Le test échoue après changement du texte | le test cherche l'ancien texte | adapter `app/server.test.js` |

## Fin du devoir

`vagrant halt` éteint la VM, `vagrant destroy` la supprime. Penser à supprimer le runner côté GitHub (Settings → Actions → Runners) si le dépôt reste public.
