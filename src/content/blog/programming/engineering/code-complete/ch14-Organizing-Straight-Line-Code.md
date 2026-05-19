---
title: "Chapter 14: Organizing Straight-Line Code"
date: 2026-05-11T14:00:00
description: "조건 분기 없는 순차 코드의 조직 — 의존성 명시, 묶음, 가까이."
series: "Code Complete"
seriesOrder: 14
tags: [code-complete, control-flow, McConnell]
draft: true
---

## 이 챕터의 메시지

조건이나 루프 없이 **위에서 아래로 흐르는 코드**도 — 조직 방식이 중요하다.

> 호출 순서가 의미 있다면 — 그 의존성을 **코드에 명시**한다.

## 핵심 내용

- **순서가 중요한 코드**는 의존성을 명시.
- **순서 무관한 코드**는 자유롭게 배치 가능 — 그래도 관련은 묶기.
- 관련 코드는 **가까이** 둔다.
- 짧은 블록은 — **빈 줄로 단락** 구분.

## 순서가 중요한 코드

```c
file = openFile(name);    // 1
data = readFile(file);     // 2
closeFile(file);           // 3
```

`open → read → close`. 이 순서를 다른 자리에서도 강제하려면 — 함수 시그니처로 표현한다.

### 의존성 명시

```c
// Bad — 의존성이 코드 순서에만
void process() {
    auto file = openFile(name);
    closeFile(file);
    auto data = readFile(file);    // ❌ 닫힌 후 읽기
}

// Good — 의존성이 매개변수로
Data readFromFile(File& f);
Data readFromFile(openFile("name"));    // 의존성이 시그니처
```

또는 — RAII로 자동 정리.

```cpp
{
    FileHandle f(openFile(name));    // RAII
    Data d = readFile(f);
}    // 자동 close
```

## 순서 무관한 코드

```c
total = 0;
count = 0;
average = 0;
```

세 줄의 순서는 상관없다. 그래도 — **세 줄을 묶어** 두는 게 자연스럽다. 다른 코드 사이에 흩뿌리면 — 이게 한 단위인지 분간 어려움.

## 관련 코드는 가까이

```c
// Bad — 관련 변수가 멀리
int customerCount = 0;
// ... 30줄 ...
customerCount++;

// Good — 가까이
// ... 30줄 ...
int customerCount = 0;
customerCount++;
```

스코프를 좁히고 사용처 가까이 선언. ([Ch 10](/blog/programming/engineering/code-complete/ch10-General-Issues-in-Using-Variables) 참고).

## 단락 구분

순차 코드도 — **빈 줄로 단락**을 나눈다.

```c
// 단락 1 — 입력 검증
if (!isValid(input)) return ERROR;
if (input.size == 0) return EMPTY;

// 단락 2 — 계산
double sum = computeSum(input);
double avg = sum / input.size;

// 단락 3 — 출력
printResult(avg);
```

각 단락이 한 의도. 빈 줄이 그 경계를 시각화.

## 정리

- **순서 중요** → 코드/시그니처로 의존성 명시 (RAII 등).
- **순서 무관** → 관련 코드 묶음.
- **관련 코드 가까이** — 변수는 사용처 가까이 선언.
- **단락 구분** — 빈 줄로 한 의도의 경계.

## 관련 항목

- [Ch 13: Unusual Data Types](/blog/programming/engineering/code-complete/ch13-Unusual-Data-Types)
- [Ch 15: Using Conditionals](/blog/programming/engineering/code-complete/ch15-Using-Conditionals)
- [Clean Code Ch 5: 포맷팅](/blog/programming/engineering/clean-code/chapter05-formatting)
