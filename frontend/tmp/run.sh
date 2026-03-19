export $(cat ../backend/.env | grep -v "^#" | xargs) && node test-deploy.js
