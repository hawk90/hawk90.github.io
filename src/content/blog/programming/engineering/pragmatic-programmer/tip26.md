---
title: "Tip 26: Use the Power of Command Shells"
date: 2026-05-14T02:00:00
description: "셸의 힘을 써라 — GUI는 1대 1, 셸은 N개 도구의 조합."
series: "The Pragmatic Programmer"
seriesOrder: 26
tags: [pragmatic-programmer, tools]
draft: true
---

## 이 팁의 메시지

> **Use the Power of Command Shells** — GUI는 — 한 도구. 셸은 — **도구의 조합**.

## 핵심 내용

- GUI 한 도구 ≠ 셸 N개 도구.
- 셸은 — **자동화**.
- 파이프(`|`)로 — 도구를 잇는다.
- 셸 스크립트 = **재현 가능한 작업**.

## 파이프의 힘

```bash
# 한 줄로 — 여러 도구를 잇는다.
find . -name "*.py" \
  | xargs grep -l "TODO" \
  | xargs wc -l \
  | sort -nr
```

- `find` — 파일 찾기.
- `xargs grep` — 내용 검색.
- `wc` — 줄 수 세기.
- `sort` — 정렬.

이 한 줄을 — GUI로 하려면? 클릭의 미로.

## 자주 쓰는 도구

- `grep` — 검색.
- `find` — 파일 탐색.
- `sed`/`awk` — 텍스트 처리.
- `xargs` — 명령 조합.
- `jq` — JSON 처리.
- `curl` — HTTP.
- `tmux`/`screen` — 세션.

## 셸 스크립트

- 반복 작업을 — 자동화.
- 한 자리에 — 정리.
- 버전 관리 — 가능.

## 정리

- 셸 = 도구의 조합.
- 파이프로 — 풍부한 흐름.
- 자동화 = 시간 절약.

## 관련 항목

- [Tip 25: Plain Text](/blog/programming/engineering/pragmatic-programmer/tip25)
- [Tip 27: Editor Fluency](/blog/programming/engineering/pragmatic-programmer/tip27)
- [Code Complete Ch 30: Programming Tools](/blog/programming/engineering/code-complete/ch30-Programming-Tools)
