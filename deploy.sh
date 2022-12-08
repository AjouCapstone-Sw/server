echo "> pm2 배포"    >> /home/ubuntu/socket-deploy/deploy.log
nvm use 16.18.0
pm2 start /home/ubuntu/socket-deploy/bin/www >> /home/ubuntu/socket-deploy/deploy.log 2>/home/ubuntu/socket-deploy/deploy_err.log &
