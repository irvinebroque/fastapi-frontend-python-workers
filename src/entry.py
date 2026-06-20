from typing import Annotated

import asgi
from fastapi import FastAPI, Query, Request
from pydantic import BaseModel, Field
from workers import WorkerEntrypoint


class Item(BaseModel):
    name: str = Field(examples=["Cloudflare Worker"])
    description: str | None = Field(default=None, examples=["Served by FastAPI on Python Workers"])
    price: float = Field(gt=0, examples=[12.5])
    tax: float | None = Field(default=None, ge=0, examples=[1.25])


app = FastAPI(
    title="FastAPI Frontend on Cloudflare Workers",
    summary="A FastAPI API served by Python Workers with static frontend assets served by Cloudflare.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    swagger_ui_oauth2_redirect_url="/api/docs/oauth2-redirect",
)


@app.get("/api")
async def read_root(request: Request):
    return {
        "message": "Hello from FastAPI on Cloudflare Python Workers",
        "frontend": "Cloudflare Static Assets serves the built files from ./dist",
        "api_docs": "/api/docs",
        "request_url": str(request.url),
    }


@app.get("/api/items/{item_id}")
async def read_item(
    item_id: int,
    q: Annotated[str | None, Query(max_length=50)] = None,
):
    return {
        "item_id": item_id,
        "q": q,
        "served_by": "FastAPI path operation in a Python Worker",
    }


@app.post("/api/items")
async def create_item(item: Item):
    total = item.price + (item.tax or 0)
    return {
        "item": item,
        "total": round(total, 2),
        "served_by": "FastAPI request body validation with Pydantic",
    }


@app.put("/api/items/{item_id}")
async def update_item(
    item_id: int,
    item: Item,
    q: Annotated[str | None, Query(max_length=50)] = None,
):
    total = item.price + (item.tax or 0)
    return {
        "item_id": item_id,
        "q": q,
        "item": item,
        "total": round(total, 2),
        "served_by": "FastAPI path and body validation in a Python Worker",
    }


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        return await asgi.fetch(app, request, self.env)
