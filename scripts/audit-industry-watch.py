#!/usr/bin/env python3
"""Watch official feeds/releases for new embedded-industry candidates.

Network access is intentional and opt-in at execution time.  The script only
creates a review queue; it never edits posts, roadmap entries, or frontmatter.
"""

import argparse
import hashlib
import json
import re
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG = REPO_ROOT / "data" / "industry-watch.json"
DEFAULT_STATE = REPO_ROOT / "reports" / "industry-watch" / "state.json"


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "hawk-industry-watch/1.0"})
    with urllib.request.urlopen(request, timeout=15) as response:
        return response.read()


def parse_date(value):
    if not value:
        return None
    value = value.strip()
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except ValueError:
        pass
    for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%Y-%m-%d", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def text_of(element):
    return " ".join("".join(element.itertext()).split()) if element is not None else ""


def parse_feed(data, source):
    root = ET.fromstring(data)
    entries = []
    for item in root.findall(".//item") + root.findall(".//{http://www.w3.org/2005/Atom}entry"):
        title = text_of(item.find("title")) or text_of(item.find("{http://www.w3.org/2005/Atom}title"))
        summary = text_of(item.find("description")) or text_of(item.find("{http://www.w3.org/2005/Atom}summary"))
        published = text_of(item.find("pubDate")) or text_of(item.find("{http://www.w3.org/2005/Atom}published")) or text_of(item.find("{http://www.w3.org/2005/Atom}updated"))
        # ElementTree elements with no children are false-y, so do not use
        # ``a or b`` here: RSS <link> elements commonly have no children.
        link_node = item.find("link")
        if link_node is None:
            link_node = item.find("{http://www.w3.org/2005/Atom}link")
        link = (link_node.get("href") if link_node is not None else "") or text_of(link_node)
        entries.append({"source": source["id"], "title": title, "summary": summary, "date": parse_date(published), "url": link, "topics": source.get("topics", [])})
    return entries


def github_releases(source):
    data = fetch(f"https://api.github.com/repos/{source['repo']}/releases?per_page=20")
    releases = json.loads(data.decode("utf-8"))
    return [{"source": source["id"], "title": r.get("name") or r.get("tag_name", ""), "summary": r.get("body", "") or "", "date": parse_date(r.get("published_at") or r.get("created_at")), "url": r.get("html_url", ""), "topics": source.get("topics", [])} for r in releases]


def classify(item, keywords):
    haystack = f"{item['title']} {item['summary']}".lower()
    matched = []
    for topic, terms in keywords.items():
        if any(term.lower() in haystack for term in terms):
            matched.append(topic)
    return matched or item.get("topics", [])


def item_key(item):
    raw = "|".join(str(item.get(key, "")) for key in ("source", "url", "date", "title"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default=str(DEFAULT_CONFIG))
    ap.add_argument("--since-days", type=int, default=30)
    ap.add_argument("--as-of", help="기준일 YYYY-MM-DD")
    ap.add_argument("--no-network", action="store_true", help="설정만 검증하고 fetch하지 않음")
    ap.add_argument("--state", default=str(DEFAULT_STATE), help="지난 실행에서 본 항목을 저장할 JSON")
    ap.add_argument("--json")
    args = ap.parse_args()
    config = json.loads(Path(args.config).read_text(encoding="utf-8"))
    as_of = date.fromisoformat(args.as_of) if args.as_of else date.today()
    cutoff = as_of - timedelta(days=args.since_days)
    findings, failures = [], []
    state_path = Path(args.state)
    try:
        state = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else {"seen": []}
        seen = set(state.get("seen", []))
    except (OSError, json.JSONDecodeError, AttributeError):
        seen = set()
    successful_keys = set()
    for source in config["sources"]:
        if args.no_network:
            continue
        try:
            entries = github_releases(source) if source["kind"] == "github-releases" else parse_feed(fetch(source["url"]), source)
            for item in entries:
                if item.get("date") and cutoff <= item["date"] <= as_of:
                    item["matchedTopics"] = classify(item, config["keywords"])
                    key = item_key(item)
                    item["new"] = key not in seen
                    successful_keys.add(key)
                    findings.append(item)
        except (OSError, urllib.error.URLError, urllib.error.HTTPError, ET.ParseError, json.JSONDecodeError, KeyError) as error:
            failures.append({"source": source["id"], "error": str(error)})
    findings.sort(key=lambda item: (item.get("date") or date.min, item["source"]), reverse=True)
    report = {
        "asOf": as_of.isoformat(),
        "since": cutoff.isoformat(),
        "newCount": sum(1 for item in findings if item.get("new")),
        "findings": findings,
        "failures": failures,
    }
    print("=== Industry Watch ===")
    print(f"  기준일: {as_of.isoformat()}  since={cutoff.isoformat()}  candidates={len(findings)}  failures={len(failures)}")
    for item in findings:
        marker = "NEW " if item.get("new") else "SEEN "
        print(f"  {marker}[{','.join(item['matchedTopics'])}] {item['date']} {item['source']}: {item['title']}")
        print(f"      {item['url']}")
    if failures:
        print("\n--- source failures ---")
        for failure in failures:
            print(f"  {failure['source']}: {failure['error']}")
    if args.json:
        output = Path(args.json)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str) + "\n", encoding="utf-8")
    if not args.no_network and successful_keys:
        state_path.parent.mkdir(parents=True, exist_ok=True)
        merged = seen | successful_keys
        state_path.write_text(json.dumps({"seen": sorted(merged)}, indent=2) + "\n", encoding="utf-8")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
