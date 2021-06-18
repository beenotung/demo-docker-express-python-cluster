import socketio
import asyncio
import time
import random
import os


interval = 1

worker_id = str(random.uniform(0, 1))


async def start():
    print("connecting to server")
    socket = socketio.AsyncClient()

    dead = False

    @socket.event
    async def connect():
        print('connected to server, worker_id:', worker_id)
        global interval
        interval = 1
        if dead:
            return
        await socket.emit('worker_ready', {'worker_id': worker_id})

    @socket.event
    async def disconnect():
        print('disconnected from server')
        dead = True
        # do not rely on socket.io auto reconnect, to avoid duplicated instances
        await socket.disconnect()

    @socket.on('close')
    def close():
        print('connection closed')
        socket.close()

    @socket.event
    async def task_message(message):
        print('received task_message from server')
        print('message:', message)
        job_id = message['job_id']
        query = message['query']
        chance = float(query['chance'])
        i = 0
        while True:
            i = i + 1
            print('chance:', chance, 'i:', i)
            if random.uniform(0, 1) < chance:
                print('lucky, i:', i)
                event = 'complete_job:' + str(job_id)
                await socket.emit(event, {
                    'job_id': job_id,
                    'i': i,
                })
                break

    MAIN_HOST = os.environ['MAIN_HOST']
    MAIN_PORT = os.environ['MAIN_PORT']
    await socket.connect(f"http://{MAIN_HOST}:{MAIN_PORT}", socketio_path='/worker')
    await socket.wait()


async def main():
    while True:
        try:
            await start()
        except:
            print("failed to connect server")
            global interval
            print(f"reconnect after {interval} seconds")
            time.sleep(interval)
            interval = interval * 1.5

if __name__ == "__main__":
    asyncio.run(main())
else:
    print("worker.py should be run as standalone program")
