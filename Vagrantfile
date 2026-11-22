# -*- mode: ruby -*-
# VM Ubuntu 22.04 qui héberge Docker, l'application et la supervision.
Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"
  config.vm.hostname = "devops-vm"

  # Adresse IP fixe : c'est elle qu'on tape dans le navigateur (http://192.168.56.10)
  config.vm.network "private_network", ip: "192.168.56.10"

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
