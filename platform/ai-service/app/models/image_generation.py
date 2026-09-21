import hashlib
import hmac
import json
import os
import base64
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, urlsplit

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field, SecretStr


def user_config_directory() -> Path:
    if os.getenv("APPDATA"):
        return Path(os.environ["APPDATA"]) / "ZhixueTeachingPlatform"
    if os.getenv("XDG_CONFIG_HOME"):
        return Path(os.environ["XDG_CONFIG_HOME"]) / "zhixue-teaching-platform"
    return Path.home() / ".config" / "zhixue-teaching-platform"


CONFIG_DIRECTORY = user_config_directory()
IMAGE_CONFIG_PATH = CONFIG_DIRECTORY / "image-provider.json"
LEGACY_IMAGE_CONFIG_PATH = (
    Path(os.environ["APPDATA"]) / "project-image-asset-generator" / "image-asset-data" / "config.json"
    if os.getenv("APPDATA") else Path.home() / ".project-image-asset-generator" / "config.json"
)
DEFAULT_CONFIG = {
    "access_key_id": "",
    "secret_access_key": "",
    "endpoint": "https://visual.volcengineapi.com",
    "region": "cn-north-1",
    "model": "high_aes_general_v30l_zt2i",
    "source": "external",
}


class ImageProviderConfiguration(BaseModel):
    access_key_id: SecretStr = SecretStr("")
    secret_access_key: SecretStr = SecretStr("")
    endpoint: str = Field(default=DEFAULT_CONFIG["endpoint"], min_length=1, max_length=500)
    region: str = Field(default=DEFAULT_CONFIG["region"], min_length=1, max_length=80)
    model: str = Field(default=DEFAULT_CONFIG["model"], min_length=1, max_length=120)


class ImageGenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    width: int = Field(default=1024, ge=512, le=2048)
    height: int = Field(default=1024, ge=512, le=2048)


def _write_config(config: dict) -> None:
    CONFIG_DIRECTORY.mkdir(parents=True, exist_ok=True)
    temporary = IMAGE_CONFIG_PATH.with_suffix(".tmp")
    temporary.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(IMAGE_CONFIG_PATH)
    try:
        IMAGE_CONFIG_PATH.chmod(0o600)
    except OSError:
        pass


def _read_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError, TypeError):
        return {}


def _migrate_legacy_config() -> None:
    if IMAGE_CONFIG_PATH.exists() or not LEGACY_IMAGE_CONFIG_PATH.exists():
        return
    legacy = _read_json(LEGACY_IMAGE_CONFIG_PATH)
    if not legacy:
        return
    migrated = {
        **DEFAULT_CONFIG,
        "access_key_id": str(legacy.get("accessKeyId", "")),
        "secret_access_key": str(legacy.get("secretAccessKey", "")),
        "source": "project-image-asset-generator",
    }
    _write_config(migrated)


def image_configuration() -> dict:
    _migrate_legacy_config()
    config = {**DEFAULT_CONFIG, **_read_json(IMAGE_CONFIG_PATH)}
    return config


def image_configuration_status() -> dict:
    config = image_configuration()
    access_key_id = str(config.get("access_key_id", ""))
    configured = bool(access_key_id and config.get("secret_access_key"))
    return {
        "provider": "volcengine",
        "name": "火山引擎视觉（图片素材生成器）",
        "status": "configured" if configured else "unconfigured",
        "access_key_hint": ("****" + access_key_id[-4:]) if access_key_id else "",
        "endpoint": config["endpoint"],
        "region": config["region"],
        "model": config["model"],
        "source": config.get("source", "external"),
        "storage": str(IMAGE_CONFIG_PATH),
    }


def configure_image_provider(payload: ImageProviderConfiguration) -> dict:
    current = image_configuration()
    parsed = urlsplit(payload.endpoint.strip())
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
        raise HTTPException(400, "图片接口 URL 必须是有效的 HTTPS 地址，且不能包含账号密码")
    access_key_id = payload.access_key_id.get_secret_value().strip() or str(current.get("access_key_id", ""))
    secret_access_key = payload.secret_access_key.get_secret_value().strip() or str(current.get("secret_access_key", ""))
    if not access_key_id or not secret_access_key:
        raise HTTPException(400, "请填写 AccessKey ID 和 SecretAccessKey")
    _write_config({
        "access_key_id": access_key_id,
        "secret_access_key": secret_access_key,
        "endpoint": payload.endpoint.strip().rstrip("/"),
        "region": payload.region.strip(),
        "model": payload.model.strip(),
        "source": "external",
    })
    return image_configuration_status()


def clear_image_provider() -> dict:
    _write_config({**DEFAULT_CONFIG, "source": "external"})
    return image_configuration_status()


def _encode(value: str) -> str:
    return quote(str(value), safe="-_.~")


def _canonical_query(params: dict[str, str]) -> str:
    return "&".join(f"{_encode(key)}={_encode(value)}" for key, value in sorted(params.items()))


def _hmac(key: bytes | str, value: str) -> bytes:
    material = key.encode("utf-8") if isinstance(key, str) else key
    return hmac.new(material, value.encode("utf-8"), hashlib.sha256).digest()


def _authorization(access_key_id: str, secret_access_key: str, region: str,
                   query: dict[str, str], body: bytes, timestamp: str) -> tuple[str, str]:
    body_hash = hashlib.sha256(body).hexdigest()
    canonical_headers = f"x-content-sha256:{body_hash}\nx-date:{timestamp}"
    signed_headers = "x-content-sha256;x-date"
    canonical_request = "\n".join([
        "POST", "/", _canonical_query(query), canonical_headers + "\n", signed_headers, body_hash,
    ])
    date = timestamp[:8]
    scope = f"{date}/{region}/cv/request"
    string_to_sign = "\n".join([
        "HMAC-SHA256", timestamp, scope, hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
    ])
    signing_key = _hmac(_hmac(_hmac(_hmac(secret_access_key, date), region), "cv"), "request")
    signature = hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    authorization = (
        f"HMAC-SHA256 Credential={access_key_id}/{scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )
    return authorization, body_hash


def _extract_image_urls(response: dict) -> list[str]:
    if response.get("ResponseMetadata"):
        error = response["ResponseMetadata"].get("Error") or {}
        if error.get("Message"):
            raise HTTPException(502, str(error["Message"]))
        response = response.get("Result", response)
    if response.get("code") not in (None, 10000):
        raise HTTPException(502, str(response.get("message") or "图片生成失败"))
    data = response.get("data", response)
    urls = data.get("image_urls", []) if isinstance(data, dict) else []
    return [str(url) for url in urls if str(url).startswith("https://")]


def _download_generated_image(client: httpx.Client, url: str) -> dict:
    allowed = {"image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp"}
    try:
        with client.stream("GET", url) as response:
            response.raise_for_status()
            mime_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
            if mime_type not in allowed:
                return {"url": url}
            chunks: list[bytes] = []
            size = 0
            for chunk in response.iter_bytes():
                size += len(chunk)
                if size > 12 * 1024 * 1024:
                    return {"url": url}
                chunks.append(chunk)
            content = b"".join(chunks)
            if not content:
                return {"url": url}
            return {
                "url": url,
                "content_base64": base64.b64encode(content).decode("ascii"),
                "mime_type": mime_type,
                "extension": allowed[mime_type],
            }
    except (httpx.RequestError, httpx.HTTPStatusError):
        return {"url": url}


def generate_image(payload: ImageGenerateRequest) -> dict:
    config = image_configuration()
    if not config.get("access_key_id") or not config.get("secret_access_key"):
        raise HTTPException(503, "图片生成尚未配置，请在系统设置中填写火山引擎 AccessKey")
    body = json.dumps({
        "req_key": config["model"],
        "prompt": payload.prompt.strip(),
        "seed": -1,
        "scale": 2.5,
        "width": payload.width,
        "height": payload.height,
        "return_url": True,
    }, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    query = {"Action": "CVProcess", "Version": "2022-08-31"}
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    authorization, body_hash = _authorization(
        str(config["access_key_id"]), str(config["secret_access_key"]), str(config["region"]),
        query, body, timestamp,
    )
    try:
        with httpx.Client(timeout=httpx.Timeout(130, connect=10)) as client:
            response = client.post(
                str(config["endpoint"]).rstrip("/") + "/",
                params=query,
                content=body,
                headers={
                    "Content-Type": "application/json; charset=utf-8",
                    "X-Date": timestamp,
                    "X-Content-Sha256": body_hash,
                    "Authorization": authorization,
                },
            )
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException:
        raise HTTPException(504, "图片生成超时，请稍后重试") from None
    except httpx.HTTPStatusError as error:
        if error.response.status_code in (401, 403):
            raise HTTPException(502, "图片接口鉴权失败，请检查 AccessKey 和视觉服务权限") from None
        raise HTTPException(502, "图片生成服务请求失败") from None
    except (httpx.RequestError, ValueError):
        raise HTTPException(503, "无法连接图片生成服务") from None
    urls = _extract_image_urls(data)
    if not urls:
        raise HTTPException(502, "图片服务未返回有效图片")
    with httpx.Client(timeout=httpx.Timeout(45, connect=10), follow_redirects=True) as client:
        images = [_download_generated_image(client, url) for url in urls]
    return {
        "images": images,
        "provider": "volcengine",
        "model": config["model"],
        "mode": "live",
        "width": payload.width,
        "height": payload.height,
    }
