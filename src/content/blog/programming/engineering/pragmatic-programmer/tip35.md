---
title: "Tip 35: Learn a Text Manipulation Language"
date: 2026-05-11T11:00:00
description: "텍스트 조작 언어를 하나 익혀라. 매일 마주치는 텍스트 처리를 자동화하는 도구가 된다."
series: "The Pragmatic Programmer"
seriesOrder: 35
tags: [pragmatic-programmer, tools]
draft: false
---

## 이 팁의 메시지

> **Tip 35: Learn a Text Manipulation Language.** You spend a large part of each day working with text. Why not have the computer do some of it for you?

하루의 많은 시간을 텍스트와 보낸다. 컴퓨터가 일부를 대신하게 하라.

## 텍스트는 어디에나

개발자가 다루는 것은 대부분 텍스트다. 코드, 로그, 설정 파일, 데이터, 문서. 이 텍스트를 검색하고, 변환하고, 분석하는 작업이 매일 반복된다.

손으로 하면 한 시간이 걸리는 작업이 스크립트 한 줄이면 5분에 끝난다. 문제는 스크립트를 짜는 능력이다.

## 추천 언어

텍스트 조작에 강한 언어는 여러 가지다.

| 언어 | 특징 |
|------|------|
| Python | 가장 인기 있고 범용적이다 |
| Ruby | 텍스트 처리가 간결하다 |
| Perl | 유닉스 텍스트 처리의 원조다 |
| awk | 한 줄짜리 필터에 최적화됐다 |

어떤 언어든 좋다. 중요한 것은 *하나를 능숙하게* 다루는 것이다.

## 어디에 쓰는가

텍스트 조작 언어는 다음과 같은 작업에 쓴다.

- 로그에서 에러만 추출
- CSV를 JSON으로 변환
- 코드에서 패턴을 찾아 치환
- 보고서 자동 생성
- 한 번 쓰고 버리는 데이터 정리

이런 작업을 GUI로 하려면 여러 프로그램을 오가며 클릭해야 한다. 스크립트로 하면 한 번 짜 두고 반복 실행할 수 있다.

## 작은 예제

다음은 로그 파일에서 에러 메시지만 추출해 빈도순으로 정렬하는 Python 스크립트다.

```python
import re
from collections import Counter

errors = []
with open("app.log") as f:
    for line in f:
        m = re.match(r"(\S+)\s+ERROR\s+(.+)", line)
        if m:
            errors.append(m.group(2))

counter = Counter(errors)
for msg, count in counter.most_common(10):
    print(f"{count:5d}  {msg}")
```

이런 스크립트를 필요할 때마다 빠르게 짤 수 있으면 생산성이 올라간다.

## 셸과의 조합

[Tip 26: Use the Power of Command Shells](/blog/programming/engineering/pragmatic-programmer/tip26)에서 다룬 셸과 텍스트 언어를 조합하면 더 강력해진다. 셸의 파이프로 도구를 연결하고, 복잡한 로직은 스크립트로 처리한다.

## 정리

- 텍스트는 매일 마주친다.
- 텍스트 조작 언어를 하나 능숙하게 익힌다.
- Python, Ruby, Perl, awk 어느 것이든 좋다.
- 손으로 한 시간 걸리는 작업이 스크립트로 5분이다.
- 셸과 조합하면 더 강력하다.

## 다음 장 예고

[Tip 36: You Can't Write Perfect Software](/blog/programming/engineering/pragmatic-programmer/tip36)에서는 완벽한 소프트웨어는 존재하지 않는다는 사실을 받아들이고 방어적으로 코드를 짜야 한다는 점을 다룬다.

## 관련 항목

- [Tip 26: Use the Power of Command Shells](/blog/programming/engineering/pragmatic-programmer/tip26)
- [Tip 27: Achieve Editor Fluency](/blog/programming/engineering/pragmatic-programmer/tip27)
- [Tip 36: You Can't Write Perfect Software](/blog/programming/engineering/pragmatic-programmer/tip36)
