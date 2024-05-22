if [[ $# -eq 0 ]]; then
    cd frontend
    NODE_ENV=production npm run build
    cd ..

    cd backend
    docker-compose build
    docker-compose push
    cd ..
fi

cp -rdfa frontend/build/. prod/frontend/build/ 

scp -r -i ../PRIVATE/mtgRaterPair.pem ./prod/* ec2-user@mtgrater.com:/home/ec2-user/mtgRater/