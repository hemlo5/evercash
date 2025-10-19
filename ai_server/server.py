from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import torch
from transformers import BertTokenizer, BertForSequenceClassification
import requests

MODEL_NAME = "kuro-08/bert-transaction-categorization"

# Load once on startup
tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)
model = BertForSequenceClassification.from_pretrained(MODEL_NAME)
model.eval()

app = FastAPI()

# Permissive CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ClassifyRequest(BaseModel):
    text: str
    type: Optional[str] = None  # "income" | "expense"

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/ai/hf-classify")
def classify(item: ClassifyRequest):
    # Prepare text as in the Python example
    text = item.text.strip()
    if item.type in ("income", "expense", "expenses"):
        text = f"Transaction: {text} - Type: {item.type}"

    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probs = torch.softmax(logits, dim=-1)
        label_id = int(torch.argmax(probs, dim=-1).item())
        score = float(probs[0, label_id].item())

    label_name = None
    if hasattr(model.config, "id2label") and isinstance(model.config.id2label, dict):
        label_name = model.config.id2label.get(label_id)
    if not label_name:
        label_name = f"LABEL_{label_id}"

    return {
        "label_id": label_id,
        "label_name": label_name,
        "score": score,
    }

FINA_API_URL = "https://app.fina.money/api/resource/categorize"
FINA_API_KEY_DEFAULT = "fina-api-test"
FINA_PARTNER_ID_DEFAULT = "f-j1fvmjmj"

class FinaItem(BaseModel):
    name: str
    merchant: Optional[str] = ""
    amount: Optional[float] = 0

class FinaRequest(BaseModel):
    items: List[FinaItem]
    model: Optional[str] = "v3"
    mapping: Optional[bool] = True
    api_key: Optional[str] = None
    partner_id: Optional[str] = None

@app.post("/ai/fina-categorize")
def fina_categorize(req: FinaRequest):
    model = req.model or "v3"
    mapping = "true" if (req.mapping is None or req.mapping) else "false"
    api_key = req.api_key or FINA_API_KEY_DEFAULT
    partner_id = req.partner_id or FINA_PARTNER_ID_DEFAULT
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "x-partner-id": partner_id,
        "x-api-model": model,
        "x-api-mapping": mapping,
    }
    if model == "v1":
        payload = [it.name for it in req.items]
    else:
        payload = [it.model_dump() for it in req.items]
    r = requests.post(FINA_API_URL, json=payload, headers=headers, timeout=15)
    if r.status_code >= 400:
        return {"status": r.status_code, "error": r.text}
    try:
        data = r.json()
    except Exception:
        data = r.text
    return {"status": 200, "categories": data}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8010)
