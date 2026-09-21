"""kor_unsmile 계열 분류기를 자체 서빙하는 최소 서버 (2차 의견용).

설치: pip install fastapi uvicorn transformers torch
실행: MODEL=<hf 모델 id> uvicorn scripts.ml.unsmile_server:app --port 8787
호출: POST /  {"inputs": "..."}  →  [{"label": "성소수자", "score": 0.91}, ...]
앱:   HF_MODERATION_URL=http://127.0.0.1:8787/

모델 id 는 허깅페이스에서 `dataset:smilegate-ai/kor_unsmile` 로 학습된 text-classification 모델을 골라 넣는다.
라이선스와 라벨 이름(성소수자/여성·가족/남성/인종·국적/연령/지역/종교/기타혐오/악플·욕설/clean)을 모델 카드에서 확인할 것.
"""
import os

from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline

MODEL = os.environ.get("MODEL")
if not MODEL:
    raise SystemExit("MODEL 환경변수에 허깅페이스 모델 id 를 넣으세요")

clf = pipeline("text-classification", model=MODEL, top_k=None, truncation=True, max_length=256)
app = FastAPI()


class In(BaseModel):
    inputs: str


@app.post("/")
def classify(body: In):
    out = clf(body.inputs[:2000])
    labels = out[0] if isinstance(out, list) and out and isinstance(out[0], list) else out
    return [{"label": x["label"], "score": float(x["score"])} for x in labels]
