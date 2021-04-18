#!/bin/sh

# [создать файл подкачки 2 ГБ]
# fallocate -l 2G /swapfile
# chmod 600 /swapfile
# mkswap /swapfile
# swapon /swapfile
# echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# [установить софт]
apt update
apt install git curl screen mongodb
cd ~
curl -sL https://deb.nodesource.com/setup_14.x -o nodesource_setup.sh
bash nodesource_setup.sh
rm nodesource_setup.sh
apt install nodejs

# [скачать репозиторий]
git clone https://github.com/nvtem/fantasio.space.git
cd ~/fantasio.space

# [выполнить один раз]
npm i

# [собрать]
npm run build

# [запустить]
npm run start

# [обновить]
# остановить сервер
# git pull
# npm run build
# npm run start

# [обнулить очки игроков за месяц]
# ?