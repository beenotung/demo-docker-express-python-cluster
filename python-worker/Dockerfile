FROM python:slim

WORKDIR /usr/src/app/python-worker
COPY . .

RUN pip install -r requirements.txt

CMD python worker.py