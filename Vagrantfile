# -*- mode: ruby -*-
# VM Ubuntu 22.04 qui héberge Docker, l'application et la supervision.
Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"
  config.vm.hostname = "devops-vm"

  # Adresse IP fixe : c'est elle qu'on tape dans le navigateur (http://192.168.56.10)
  config.vm.network "private_network", ip: "192.168.56.10"

  # Option : rendre aussi la VM visible par les autres appareils du réseau (téléphone, voisin...)
  # Utilisation : $env:BRIDGE="1"; vagrant reload   → la VM reçoit une 2e adresse IP du routeur
  # La carte réseau du PC (Wi-Fi ou Ethernet) est choisie automatiquement : la première « Up ».
  if ENV["BRIDGE"] == "1"
    vbm = File.exist?("C:/Program Files/Oracle/VirtualBox/VBoxManage.exe") ? "C:/Program Files/Oracle/VirtualBox/VBoxManage.exe" : "VBoxManage"
    carte = `"#{vbm}" list bridgedifs`.split(/\r?\n\r?\n/).find { |b| b =~ /Status:\s+Up/ }
    nom = carte && carte[/^Name:\s+(.+?)\s*$/, 1]
    config.vm.network "public_network", bridge: nom if nom
  end

  config.vm.provider "virtualbox" do |vb|
    vb.name = "devops-vm"
    vb.memory = 3072
    vb.cpus = 2
  end

  # Le code du projet est visible dans la VM (utile pour les tests manuels)
  config.vm.synced_folder ".", "/vagrant", disabled: false

  # Installation de Docker + outils (exécuté une seule fois au premier "vagrant up")
  config.vm.provision "shell", path: "provision/provision.sh"
end
