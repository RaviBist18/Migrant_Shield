#!/bin/bash
arq worker.WorkerSettings &
uvicorn main:app --host 0.0.0.0 --port 8000