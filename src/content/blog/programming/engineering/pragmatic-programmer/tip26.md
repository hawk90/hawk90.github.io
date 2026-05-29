---
title: "Tip 26: Use the Power of Command Shells"
date: 2026-05-12T02:00:00
description: "셸의 힘을 써라 — GUI는 1대 1, 셸은 N개 도구의 조합."
series: "The Pragmatic Programmer"
seriesOrder: 26
tags: [pragmatic-programmer, tools]
draft: true
---

## 이 팁의 메시지

> **Tip 26: Use the Power of Command Shells.** Use the shell when graphical user interfaces don't cut it.

GUI는 한 번에 한 도구를 쓴다. 셸은 여러 도구를 파이프로 연결한다. 이 조합의 힘이 자동화를 가능하게 한다.

## GUI vs 셸

GUI 애플리케이션은 직관적이다. 마우스로 클릭하면 결과가 보인다. 그러나 한 번에 한 작업만 할 수 있다. 반복 작업을 해야 하면 같은 클릭을 백 번 한다.

셸은 다르다. 여러 도구를 파이프(`|`)로 연결해서 한 줄로 복잡한 작업을 처리한다. 그리고 그 한 줄을 스크립트로 저장하면 언제든 재현할 수 있다.

## 파이프의 힘

한 줄로 여러 도구를 연결한다.

```bash
find . -name "*.py" \
  | xargs grep -l "TODO" \
  | xargs wc -l \
  | sort -nr
```

이 명령은 다음을 수행한다.

1. 현재 디렉토리에서 모든 `.py` 파일을 찾는다.
2. 그중 "TODO"를 포함하는 파일만 고른다.
3. 각 파일의 줄 수를 센다.
4. 줄 수 내림차순으로 정렬한다.

같은 작업을 GUI로 하려면 여러 프로그램을 오가며 클릭해야 한다.

## 자주 쓰는 도구

셸에서 자주 쓰는 도구들이 있다.

| 도구 | 용도 |
|------|------|
| `grep` | 텍스트 검색 |
| `find` | 파일 탐색 |
| `sed` / `awk` | 텍스트 변환 |
| `xargs` | 명령 조합 |
| `jq` | JSON 처리 |
| `curl` | HTTP 요청 |
| `tmux` / `screen` | 세션 관리 |

이 도구들을 조합하면 거의 모든 텍스트 처리 작업을 자동화할 수 있다.

## 셸 스크립트

반복되는 작업은 스크립트로 저장한다.

- 한 자리에 정리된다.
- 버전 관리가 가능하다.
- 동료와 공유할 수 있다.
- 실수가 줄어든다.

## 정리

- GUI = 한 도구. 셸 = 도구의 조합.
- 파이프로 여러 도구를 연결한다.
- 반복 작업을 스크립트로 자동화한다.
- 시간이 절약되고 실수가 줄어든다.

## 다음 장 예고

[Tip 27: Achieve Editor Fluency](/blog/programming/engineering/pragmatic-programmer/tip27)에서는 에디터를 악기처럼 다뤄야 한다는 점을 다룬다.

## 관련 항목

- [Tip 25: Keep Knowledge in Plain Text](/blog/programming/engineering/pragmatic-programmer/tip25)
- [Tip 27: Achieve Editor Fluency](/blog/programming/engineering/pragmatic-programmer/tip27)
