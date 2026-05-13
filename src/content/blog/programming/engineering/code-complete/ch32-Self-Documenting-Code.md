---
title: "Chapter 32: Self-Documenting Code"
date: 2026-06-21T08:00:00
description: "자기 문서화 코드 — 좋은 이름·구조가 가장 좋은 문서. 주석은 보충."
series: "Code Complete"
seriesOrder: 32
tags: [code-complete, documentation, comments, McConnell]
---

## 이 챕터의 메시지

> 가장 좋은 문서는 — **코드 자체가 의도를 드러내는** 것.

좋은 이름, 명확한 구조, 한 가지 일을 하는 함수. 이것들이 결합하면 — 주석 없이도 코드가 자기를 설명한다.

[Clean Code Ch 4](/blog/programming/engineering/clean-code/chapter04-comments)와 같은 주제. 다른 시각.

## 핵심 내용

- 코드가 **스스로 설명**하면 — 주석은 줄어든다.
- 좋은 **이름, 구조, 함수 분할**이 자기 문서화의 핵심.
- 주석은 — **코드로 표현 못 하는 것**에만.
- 외부 문서(API doc 등)는 — 별도 가치.

## 자기 문서화의 핵심

### 1. 좋은 이름

```c
// 주석 필요
int d;    // elapsed time in days

// 주석 불필요
int elapsedTimeInDays;
```

이름 자체가 의도를 담는다.

### 2. 작은 함수

```c
// 큰 함수 — 주석 많이 필요
void process() {
    // 검증
    if (...) ...
    // 계산
    ...
    // 저장
    ...
}

// 작은 함수 — 이름이 주석 역할
void process() {
    validate();
    calculate();
    save();
}
```

### 3. 의도 있는 구조

```c
// 가독성 ↑ — 시각적 흐름
if (isValid) {
    // 정상 경로
} else {
    // 에러 경로
}
```

조건·루프·함수의 구조가 — 의도를 드러낸다.

## 좋은 주석의 자리

코드로 표현 못 하는 것들.

### Why — 왜 그렇게 했는가

```c
// 라이브러리 X의 v3.2에 known bug — workaround
// https://github.com/...
data = data.replace('\0', ' ');
```

### 의도 (특히 "안 하는 것")

```c
// 빈 catch 블록 — 의도된 무시.
// 이 예외는 다음 단계의 정상 동작이므로 무시한다.
try {
    optional();
} catch (NotFoundException e) {
    // ignore
}
```

### 알고리즘의 출처

```c
// Knuth Algorithm S - Selection sample without replacement
// TAOCP Vol. 2, Section 3.4.2
```

### TODO

```c
// TODO(alice 2025-03-15): 캐시 적용 후 이 함수 제거
```

## 나쁜 주석

### Redundant

```c
// Bad — 코드가 이미 말한다
i++;    // i를 1 증가

// 빈 줄
balance += deposit;   // 잔액에 입금액을 더한다
```

### 거짓

```c
// 잔액을 0으로 초기화
balance = userInput();    // ⚠️ 거짓말
```

코드가 바뀌었지만 주석은 안 바뀜.

### 모호

```c
// 처리
process(data);
```

"처리"가 무엇? 의미 없음.

## 자기 문서화의 한계

자기 문서화가 모든 것을 대체 X. **외부 문서**도 필요.

- **README** — 프로젝트 소개, 빌드 방법.
- **CHANGELOG** — 버전별 변경.
- **API 문서** — 공개 API의 사양.
- **아키텍처 문서** — 큰 그림.
- **운영 가이드** — 배포·모니터링.

이런 것들은 — 코드 자체로 표현 불가.

## 정리

- 자기 문서화 = **좋은 이름 + 작은 함수 + 의도 있는 구조**.
- 주석은 — **코드로 표현 못 하는 것**에만.
- 좋은 주석: Why, 의도, 알고리즘 출처, TODO.
- 나쁜 주석: 중복, 거짓, 모호.
- 외부 문서(README, API doc)는 — 별도 가치.

## 관련 항목

- [Ch 31: Layout and Style](/blog/programming/engineering/code-complete/ch31-Layout-and-Style)
- [Ch 33: Personal Character](/blog/programming/engineering/code-complete/ch33-Personal-Character)
- [Clean Code Ch 4: 주석](/blog/programming/engineering/clean-code/chapter04-comments)
