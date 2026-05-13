---
title: "Chapter 30: Programming Tools"
date: 2026-06-21T06:00:00
description: "프로그래밍 도구 — 편집기, 디버거, 빌드, VCS, 분석 도구. 도구 숙달의 가치."
series: "Code Complete"
seriesOrder: 30
tags: [code-complete, tools, McConnell]
---

## 이 챕터의 메시지

좋은 프로그래머는 — **도구를 깊이 안다**. 같은 일을 5배 빠르게 하면 — 그 차이가 곧 직업적 능력이다.

> 도구는 — **꾸준한 투자**의 대상.

## 핵심 내용

- **에디터** — 텍스트 조작의 속도가 모든 일에 영향.
- **디버거** — print 디버깅보다 보통 빠름.
- **빌드 시스템** — 의존성 관리.
- **VCS** — Git의 기본을 넘어.
- **정적 분석** — 결함 조기 발견.
- **프로파일러** — 성능 측정.

## 에디터 / IDE

코드 작성·편집의 속도가 — 일상의 큰 부분.

- **Vim, Emacs** — 키보드 중심, 학습 곡선 가파름.
- **VS Code, JetBrains** — IDE의 풍부한 기능.

선택보다 — **자기 도구를 깊이 익히기**.

### 학습 가치 있는 것

- 빠른 탐색 — 정의로, 사용처로.
- 리팩토링 — 이름 변경, 추출.
- 다중 커서, 매크로.
- 검색·치환 — 정규식.

## 디버거

대부분의 사람이 — **print 디버깅에 의존**. 그러나 디버거가 보통 빠르다.

- 브레이크포인트 — 조건부, 데이터.
- 단계 실행 — step in/out/over.
- 변수 검사 — 객체 상태.
- 스택 추적 — 호출 흐름.
- 메모리 검사.

### 도구

- C/C++: gdb, lldb, IDE 통합.
- Python: pdb, ipdb, IDE.
- Java: IntelliJ, Eclipse.

## 빌드 시스템

수동 컴파일은 — 작은 프로젝트만.

- **Make, CMake** — C/C++.
- **Maven, Gradle** — Java.
- **npm, yarn** — JavaScript.
- **Cargo** — Rust.

좋은 빌드 시스템 — **자동 의존성 관리, 증분 빌드**.

## 버전 관리 (VCS)

**Git이 표준**. 기본 명령은 모두 알아야:

- `add, commit, push, pull` — 일상.
- `branch, merge, rebase` — 협업.
- `log, diff, blame` — 추적.
- `stash, cherry-pick` — 임시 작업.
- `bisect` — 결함 위치.

### 좋은 사용 습관

- **작은 커밋** — 의미 있는 단위.
- **명확한 메시지** — Why를 적는다.
- **자주 push/pull** — 충돌 최소화.
- **branch 전략** — main 보호.

## 정적 분석

런타임 없이 — 코드를 검사.

- **린터** — ESLint, Pylint, clippy.
- **타입 검사** — TypeScript, mypy.
- **보안 분석** — SonarQube, CodeQL.
- **포맷터** — prettier, black, clang-format.

CI에 통합하면 — 결함이 PR 단계에서 차단.

## 프로파일러

성능 측정.

- C/C++: gprof, perf, VTune.
- Java: JProfiler, async-profiler.
- Python: cProfile, py-spy.
- 시스템: eBPF, dtrace.

[Ch 25-26 참고](/blog/programming/engineering/code-complete/ch25-Code-Tuning-Strategies).

## 메모리·동시성 도구

- **Valgrind** — 메모리 누수, 잘못된 접근.
- **AddressSanitizer** — 컴파일러 instrumentation.
- **ThreadSanitizer** — race 검출.
- **MemorySanitizer** — 비초기화 사용.

## 정리

- 도구는 — **꾸준한 투자**의 대상.
- 에디터·디버거·VCS는 매일 쓰는 도구 — 깊이 익힌다.
- 정적 분석·프로파일러를 CI에 통합.
- 도구 숙달이 — 직업적 능력의 큰 부분.

## 관련 항목

- [Ch 29: Integration](/blog/programming/engineering/code-complete/ch29-Integration)
- [Ch 31: Layout and Style](/blog/programming/engineering/code-complete/ch31-Layout-and-Style)
