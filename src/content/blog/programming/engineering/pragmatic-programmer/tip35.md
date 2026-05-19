---
title: "Tip 35: Learn a Text Manipulation Language"
date: 2026-05-11T11:00:00
description: "텍스트 조작 언어를 익혀라 — 매일 마주치는 — 텍스트 처리. 사고의 도구."
series: "The Pragmatic Programmer"
seriesOrder: 35
tags: [pragmatic-programmer, tools]
draft: true
---

## 이 팁의 메시지

> **Learn a Text Manipulation Language** — Python/Ruby/Perl/awk. 한 개는 — 능숙하게.

## 핵심 내용

- 텍스트 = 매일 마주침.
- 작은 스크립트 — 일을 — 자동화.
- 한 언어 — 능숙하게.
- 셸 + 텍스트 언어 = 큰 힘.

## 무엇에 쓰는가

- 로그 분석.
- 보고서 생성.
- 데이터 변환.
- 자동화 스크립트.
- 한 번 쓰는 작업.

## 추천 언어

- **Python** — 가장 인기.
- **Ruby** — Pickaxe 풍부.
- **Perl** — 옛 유닉스 표준.
- **awk** — 한 줄짜리 신호.

## 작은 예제

```python
# 로그에서 — 에러만 — 시간순.
import re
from collections import Counter

errors = []
with open("app.log") as f:
    for line in f:
        m = re.match(r"(\S+)\s+ERROR\s+(.+)", line)
        if m:
            errors.append((m.group(1), m.group(2)))

# 가장 많은 에러 메시지.
counter = Counter(msg for _, msg in errors)
for msg, count in counter.most_common(10):
    print(f"{count:5d}  {msg}")
```

이런 일을 — GUI로? — 한 시간. 스크립트로? — 5분.

## 정리

- 텍스트 조작 = 매일.
- 한 언어 — 능숙하게.
- 셸 + 언어 = 자동화.

## 관련 항목

- [Tip 26: Command Shells](/blog/programming/engineering/pragmatic-programmer/tip26)
- [Tip 27: Editor Fluency](/blog/programming/engineering/pragmatic-programmer/tip27)
- [Tip 36: Can't Write Perfect Software](/blog/programming/engineering/pragmatic-programmer/tip36)
