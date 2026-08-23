#!/usr/bin/env python3
"""Dependency-free structural checks for the ma0.dev static site."""

from __future__ import annotations

import subprocess
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
SEMANTIC_TAGS = {"article", "footer", "header", "main", "nav", "section"}
HOME_CHAPTERS = [
    ("cover", "00"),
    ("chapter-origin", "01"),
    ("projects", "02"),
    ("about", "03"),
    ("links", "04"),
    ("contact", "05"),
]


class SitePage(HTMLParser):
    def __init__(self, path: Path) -> None:
        super().__init__(convert_charrefs=True)
        self.path = path
        self.lang = ""
        self.ids: list[str] = []
        self.refs: list[tuple[str, str]] = []
        self.in_page_refs: list[str] = []
        self.blank_links: list[dict[str, str]] = []
        self.images: list[dict[str, str]] = []
        self.shape: list[tuple[object, ...]] = []
        self.chapters: list[tuple[str, str]] = []
        self.rail_refs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}

        if tag == "html":
            self.lang = values.get("lang", "")

        if element_id := values.get("id"):
            self.ids.append(element_id)

        for attribute in ("href", "src"):
            if ref := values.get(attribute):
                self.refs.append((attribute, ref))

        if tag == "a":
            href = values.get("href", "")
            if href.startswith("#") and len(href) > 1:
                self.in_page_refs.append(href)
            if values.get("target") == "_blank":
                self.blank_links.append(values)
            if "rail-tick" in values.get("class", "").split():
                self.rail_refs.append(href)

        if tag == "img":
            self.images.append(values)

        if tag in SEMANTIC_TAGS:
            self.shape.append(
                (
                    tag,
                    values.get("id", ""),
                    tuple(values.get("class", "").split()),
                    values.get("data-chapter-no", ""),
                    values.get("data-chapter-name", ""),
                )
            )

        if "data-chapter" in values:
            self.chapters.append((values.get("id", ""), values.get("data-chapter-no", "")))


def load_pages() -> dict[Path, SitePage]:
    pages: dict[Path, SitePage] = {}
    for path in sorted(ROOT.rglob("*.html")):
        if "node_modules" in path.parts:
            continue
        page = SitePage(path)
        page.feed(path.read_text(encoding="utf-8"))
        pages[path.relative_to(ROOT)] = page
    return pages


def local_target(page_path: Path, ref: str) -> Path | None:
    parsed = urlsplit(ref)
    if parsed.scheme or parsed.netloc or ref.startswith(("#", "mailto:", "data:", "//")):
        return None

    path = unquote(parsed.path)
    target = ROOT / path.lstrip("/") if path.startswith("/") else ROOT / page_path.parent / path
    if path.endswith("/"):
        target /= "index.html"
    return target


def verify() -> list[str]:
    errors: list[str] = []
    pages = load_pages()

    if not pages:
        return ["No HTML files found"]

    for relative_path, page in pages.items():
        if not page.lang:
            errors.append(f"{relative_path}: <html> is missing lang")

        duplicates = sorted(item for item, count in Counter(page.ids).items() if count > 1)
        if duplicates:
            errors.append(f"{relative_path}: duplicate ids: {', '.join(duplicates)}")

        known_ids = set(page.ids)
        for ref in page.in_page_refs:
            fragment = unquote(urlsplit(ref).fragment)
            if fragment not in known_ids:
                errors.append(f"{relative_path}: missing in-page target {ref}")

        for _, ref in page.refs:
            target = local_target(relative_path, ref)
            if target is not None and not target.exists():
                errors.append(f"{relative_path}: missing local asset/page {ref}")

        for link in page.blank_links:
            rel = set(link.get("rel", "").split())
            if not {"noopener", "noreferrer"}.issubset(rel):
                errors.append(
                    f"{relative_path}: target=_blank link needs rel=noopener noreferrer: "
                    f"{link.get('href', '')}"
                )

        for image in page.images:
            src = image.get("src", "<unknown>")
            if not image.get("alt"):
                errors.append(f"{relative_path}: image is missing non-empty alt: {src}")
            if not image.get("width") or not image.get("height"):
                errors.append(f"{relative_path}: image is missing width/height: {src}")

    for left, right in ((Path("index.html"), Path("en/index.html")), (Path("links/index.html"), Path("en/links/index.html"))):
        if pages[left].shape != pages[right].shape:
            errors.append(f"{left} and {right} have different semantic structures")

    expected_rail = ["#top", "#chapter-origin", "#projects", "#about", "#links", "#contact"]
    for path in (Path("index.html"), Path("en/index.html")):
        page = pages[path]
        if page.chapters != HOME_CHAPTERS:
            errors.append(f"{path}: chapter ids/numbers differ from the expected 00-05 sequence")
        if page.rail_refs != expected_rail:
            errors.append(f"{path}: chapter rail targets differ from the chapter sequence")

    syntax = subprocess.run(
        ["node", "--check", str(ROOT / "main.js")],
        capture_output=True,
        text=True,
        check=False,
    )
    if syntax.returncode:
        errors.append(f"main.js: syntax check failed\n{syntax.stderr.strip()}")

    return errors


def main() -> int:
    errors = verify()
    if errors:
        print("Site verification failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    html_count = len(load_pages())
    print(f"Site verification passed: {html_count} HTML files, localized structure, links, assets, and JavaScript syntax")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
