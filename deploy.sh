echo "> pm2 배포"    >> /home/ubuntu/socket-deploy/deploy.log

export NVM_DIR="/home/ubuntu/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  
# This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. 
"$NVM_DIR/bash_completion"  
# This loads nvm bash_completion

nvm use 16

cd /home/ubuntu/socket-deploy
pm2 start bin/www >> /home/ubuntu/socket-deploy/deploy.log 2>/home/ubuntu/socket-deploy/deploy_err.log &
