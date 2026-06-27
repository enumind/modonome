from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path
from typing import Any

import httpx
import yaml
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

logger = logging.getLogger(__name__)

_MODELS_YAML = Path(__file__).parent / "models.yaml"
_DEFAULT_CAPACITY = 1
_BACKEND_TIMEOUT = 120.0


def _load_models_yaml() -> dict[str, Any]:
    with _MODELS_YAML.open() as fh:
        return yaml.safe_load(fh)


def create_app(
    models: dict[str, Any] | None = None,
    capacity: int | None = None,
) -> FastAPI:
    """Factory so tests can inject a fake models map and custom capacity."""

    config = _load_models_yaml() if models is None else {}
    models_map: dict[str, Any] = models if models is not None else config.get("models", {})

    if capacity is None:
        capacity = int(os.environ.get("FACTORY_GATEWAY_CAPACITY", config.get("capacity", _DEFAULT_CAPACITY)))

    semaphore = asyncio.Semaphore(capacity)
    in_flight = 0

    application = FastAPI(title="agent-factory gateway", version="0.1.0")

    @application.get("/healthz")
    async def healthz() -> JSONResponse:
        return JSONResponse({"status": "ok", "in_flight": in_flight, "capacity": capacity})

    @application.get("/v1/models")
    async def list_models() -> JSONResponse:
        data = [
            {
                "id": model_id,
                "object": "model",
                "owned_by": info.get("family", "local"),
            }
            for model_id, info in models_map.items()
        ]
        return JSONResponse({"object": "list", "data": data})

    @application.post("/v1/chat/completions")
    async def chat_completions(
        request: Request,
        x_factory_repo: str | None = Header(default=None),
    ) -> Any:
        nonlocal in_flight

        body: dict[str, Any] = await request.json()
        model_id: str = body.get("model", "")

        if model_id not in models_map:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown model '{model_id}'. Available models: {list(models_map)}",
            )

        # Per-repo fairness hook: log the requesting repo.
        # TODO (Phase B): implement strict round-robin fairness across repos so no
        # single repo can starve others when capacity is fully utilised.
        if x_factory_repo:
            logger.info("request from repo=%s model=%s", x_factory_repo, model_id)

        backend_base: str = models_map[model_id]["backend"].rstrip("/")
        target_url = f"{backend_base}/chat/completions"
        stream: bool = bool(body.get("stream", False))

        async with semaphore:
            in_flight += 1
            try:
                return await _proxy(request, body, target_url, stream)
            finally:
                in_flight -= 1

    return application


async def _proxy(
    request: Request,
    body: dict[str, Any],
    target_url: str,
    stream: bool,
) -> Any:
    headers = {
        k: v
        for k, v in request.headers.items()
        if k.lower() not in {"host", "content-length", "transfer-encoding"}
    }

    async with httpx.AsyncClient(timeout=_BACKEND_TIMEOUT) as client:
        if stream:

            async def _stream_generator():
                try:
                    async with client.stream("POST", target_url, json=body, headers=headers) as resp:
                        if resp.status_code >= 400:
                            text = await resp.aread()
                            raise HTTPException(
                                status_code=502,
                                detail=f"Backend error {resp.status_code}: {text.decode()}",
                            )
                        async for chunk in resp.aiter_bytes():
                            yield chunk
                except httpx.HTTPError as exc:
                    raise HTTPException(status_code=502, detail=str(exc)) from exc

            return StreamingResponse(
                _stream_generator(),
                media_type="text/event-stream",
            )

        try:
            resp = await client.post(target_url, json=body, headers=headers)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        if resp.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail=f"Backend error {resp.status_code}: {resp.text}",
            )

        return JSONResponse(content=resp.json(), status_code=resp.status_code)


app = create_app()
