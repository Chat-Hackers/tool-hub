git pull
npm i
npm run build
npm run build-web
pm2 delete chathackers-wrapper
pm2 start dist/src/index.js --name chathackers-wrapper