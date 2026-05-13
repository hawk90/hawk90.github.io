---
title: "Chapter 31: Layout and Style"
date: 2025-06-21T07:00:00
description: "코드 레이아웃 — 가독성을 위한 시각적 구조. 들여쓰기, 빈 줄, 정렬, 컨벤션."
series: "Code Complete"
seriesOrder: 31
tags: [code-complete, style, formatting, McConnell]
draft: true
---

## 이 챕터의 메시지

레이아웃은 — **시각적 구조**를 통해 코드의 논리 구조를 드러낸다. 잘된 레이아웃은 — 한눈에 의도가 보인다.

> 좋은 레이아웃 = **들여쓰기로 계층, 빈 줄로 단락, 정렬로 그룹**.

[Clean Code Ch 5](/blog/programming/engineering/clean-code/chapter05-formatting)와 같은 주제. 다른 시각.

## 핵심 내용

- 레이아웃은 — 논리 구조의 **시각화**.
- **들여쓰기** — 계층, 보통 4 공백.
- **빈 줄** — 단락 구분.
- **정렬** — 비슷한 코드 한눈에.
- **팀 컨벤션** > 개인 취향.

## 들여쓰기

```c
// 계층이 보임
function() {
    if (condition) {
        for (...) {
            doSomething();
        }
    }
}
```

들여쓰기 폭 — **4 공백**이 가장 가독성 좋다는 연구.

- 2 공백 — 너무 가까워 계층이 안 보임.
- 8 공백 — 깊은 중첩에서 화면 부족.
- 탭 — 환경마다 폭 다름 → 일관성 깨짐.

## 빈 줄

빈 줄은 — 논리 단락을 시각화.

```c
// 단락 1 — 입력
read_input();
validate();

// 단락 2 — 처리
process();
calculate();

// 단락 3 — 출력
print_result();
```

함수 사이, 의미 단위 사이에 빈 줄.

## 정렬

비슷한 코드를 정렬하면 — 패턴이 보임.

```c
int   age      = 25;
char  name[10] = "Alice";
float salary   = 50000.0;
```

다만 — 수정 시 모든 줄을 같이 바꿔야 함. **자동 포맷터가 보통 안 함**.

## 줄 길이

권장 — **80~120자**.

- 80자 — 옛 터미널 컨벤션, 분할 뷰에서 좋음.
- 120자 — 현대 모니터에서 자연.
- 그 이상 — 가로 스크롤 강요.

## 중괄호 위치

여러 스타일이 있다.

```c
// K&R
if (condition) {
    ...
}

// Allman
if (condition)
{
    ...
}

// GNU
if (condition)
  {
    ...
  }
```

**선택보다 일관성**. 팀 컨벤션을 따른다.

## 컨벤션 자동화

> 자동 포맷터로 — 사람의 결정 줄이기.

- C/C++: clang-format.
- Java: Google Java Format.
- Python: black, ruff format.
- JavaScript: prettier.

CI에서 — 자동 포맷 검증. PR에서 일관성 자동 확보.

## 자기 문서화

좋은 레이아웃 = **자기 문서화**. 주석 없이도 의도가 보인다.

```c
// 의도가 시각으로 드러남
if (isReady) {
    process();
    notify();
} else {
    waitForReady();
}
```

들여쓰기, 빈 줄, 이름이 — 함께 의도를 만든다.

## 정리

- 레이아웃 = **논리 구조의 시각화**.
- 들여쓰기 4 공백, 빈 줄로 단락.
- 줄 길이 80~120자.
- 중괄호 스타일은 — **일관성이 형식보다 중요**.
- **자동 포맷터로 강제**.

## 관련 항목

- [Ch 30: Tools](/blog/programming/engineering/code-complete/ch30-Programming-Tools)
- [Ch 32: Self-Documenting Code](/blog/programming/engineering/code-complete/ch32-Self-Documenting-Code)
- [Clean Code Ch 5: 포맷팅](/blog/programming/engineering/clean-code/chapter05-formatting)
