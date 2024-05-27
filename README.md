# MTG Rater

Fullstack application to rate new magic cards and see how others rated them.

Not hosted anywhere due to awful german data policy laws.

## Run locally

To run this project locally, run `docker-compose up --build` from project root after installing Docker. Find the website running at `localhost:80`.

The setup was only tested from WSL2 running Ubuntu, connected to Docker running on the host Windows 10 machine, but should work anywhere.

## Deploy

To deploy, modify the `deploy.sh` script to point to your instance url with your pem key, and approriate target directory. Then modify `compose.yaml` and `prod/compose.yaml` to point the `server` service to your image repository (e.g. on dockerhub), and authenticate yourself with it. 

Locally, run `bash deploy.sh` from root to build the components and transfer all necessary components.

On your server, navigate to the target directory and run `docker-compose pull` followed by `docker-compose up -d`. Your server should now be online, though you'll likely need to change the server address in `prod/nginx.conf`, `prod/frontend/nginx.conf` and set up SSL encryption, e.g. via letsencrypt (see commented out certbot sections in `prod/compose.yaml` and `prod/nginx.conf`).

## Development

The project is composed of a React frontend using Material UI, a Rust backend using Tokio and Axum, a locally running Postgres Database (with manual backup script for AWS-based deployments) and a nginx reverse-proxy posing as the public interface of the server.

Most of the used technologies were new to me and I advise against following my solutions blindly, as few are optimal.

Local development is fully dockerized, whereas the production deployment builds the frontend locally and deploys the output manually, as building on the host machine required too much RAM on the AWS EC2 t3.nano instance.

