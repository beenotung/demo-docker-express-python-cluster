# demo-docker-express-python-cluster

Demo repo putting node.js server and python worker inside docker, with multi-worker deployment setup.

## Demo Setup

The node.js server and python worker are packaged into separate docker images.

When you start the cluster with `docker-compose up`, 1 node.js server and 3 python workers will be run in 4 docker containers.
The conatiners are connected via a docker-provider virtual network.

The 8100 port of node.js server is exposed to the 9100 port on the host.
(The ports are configurated in the `docker-compose.yml` file)

## Communication Setup

The communication between python worker and node.js server is based on socket.io. (May simplify to use native websocket in the future)

When the node.js or python worker is restarted. The python worker will auto reconnect to the node.js server.

The node.js server keep trace of connected worker, and number of pending jobs per worker. When a new job is received, it dispatch to the worker with lowest pending job.

This setup allow dynamically adding new workers or removing excess workers.

## Options

### Run the cluster in background
`docker-compose up -d`

### Teardown the cluster in background
```bash
docker-compose down
```

(Make sure you have `cd` to the folder with `docker-compose.yml` file

### Scale up / Scale down the cluster in background
```bash
docker-compose up -d --scale python-worker=8
```

This example re-scale the cluster to deploy 8 instance of python-worker
