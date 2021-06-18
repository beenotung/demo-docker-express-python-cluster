import express from 'express'
import http from 'http'
import expressSession from 'express-session'
import * as runningAt from 'listening-on'
import { join, resolve } from 'path'
import { config } from 'dotenv'
import { router } from './router'
import SocketIO, { Socket } from 'socket.io'
config()

const app = express()
const server = http.createServer(app)
const wss = new SocketIO.Server(server, { path: '/worker' })

app.use(express.static('public'))

app.use(express.json() as any)
app.use(express.urlencoded({ extended: true }) as any)

const session = expressSession({
  secret: process.env.SESSION_SECRET || Math.random().toString(36),
  saveUninitialized: true,
  resave: true,
})
app.use(session)

app.use((req, res, next) => {
  if (req.method === 'GET') {
    console.log(req.method, req.url)
  } else {
    console.log(req.method, req.url, req.body)
  }
  next()
})

app.get('/report', (req, res) => {
  res.end(`workers: ${workers.length}`)
})

function randomFromSet<T>(set: Set<T>): T {
  let array = Array.from(set)
  return randomFromArray(array)
}

function randomFromArray<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('empty array')
  }
  let index = Math.floor(Math.random() * array.length)
  console.log('random from array:', { length: array.length, index })
  return array[index]
}

let jobs = Date.now()

class Worker {
  jobs = 0

  constructor(public socket: Socket, public worker_id: string) {}

  toJSON() {
    return {
      worker_id: this.worker_id,
      sid: this.socket.id,
      jobs: this.jobs,
    }
  }
}
let workers: Worker[] = []

function reportWorkers() {
  console.log('#worker:', workers.length)
  console.log(workers.map(worker => worker.toJSON()))
}

app.get('/job', (req, res) => {
  if (workers.length === 0) {
    res.status(500).end('no worker available')
    return
  }
  let worker = workers.sort((a, b) => a.jobs - b.jobs)[0]
  worker.jobs++
  jobs++
  reportWorkers()
  let job_id = jobs
  console.log('dispatch job:', { job_id, sid: worker.socket.id })
  worker.socket.once('complete_job:' + job_id, message => {
    console.log('finished job:', { job_id, sid: worker.socket.id })
    console.log('result message:', message)
    res.json(message)
    worker.jobs--
  })
  worker.socket.emit('task_message', {
    job_id,
    query: req.query,
  })
})

app.use(router)

app.use((req, res) => {
  res.sendFile(resolve(join('public', '404.html')))
})

wss.on('connection', ws => {
  console.log('worker connected:', ws.id)
  ws.on('worker_ready', message => {
    console.log('worker ready:', ws.id, message)
    try {
      let newWorker = new Worker(ws, message.worker_id)
      workers = workers.filter(
        worker => worker.worker_id !== newWorker.worker_id,
      )
      workers.push(newWorker)
      reportWorkers()
    } catch (error) {
      console.error(error)
    }
  })
  ws.on('error', error => {
    console.log('worker error', { sid: ws.id, error })
    // workers = workers.filter(worker => worker.socket !== ws)
  })
  ws.on('disconnect', reason => {
    console.log('worker disconnected', { sid: ws.id, reason })
    workers = workers.filter(worker => worker.socket !== ws)
    reportWorkers()
  })
})

const PORT = +process.env.PORT! || 8100

server.listen(PORT, () => {
  runningAt.print(PORT)
})
