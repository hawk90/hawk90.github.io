---
title: "Chapter 11: The Power of Variable Names"
date: 2026-06-20T11:00:00
description: "변수 이름의 힘 — 의도 전달, 적절한 길이, 컨벤션, 흔한 함정."
series: "Code Complete"
seriesOrder: 11
tags: [code-complete, naming, McConnell]
---

## 이 챕터의 메시지

McConnell은 한 챕터 전체를 **변수 이름**에 할애한다. 그만큼 중요하다.

> 좋은 이름은 — 그 자체가 **문서**다. 주석 없이도 의도가 전달된다.

## 핵심 내용

- 이름은 **목적을 드러낸다** — 코드의 무엇이 아니라 **왜**.
- **9~15자**가 평균 최적.
- **타입이 아니라 의도**로 명명 — 헝가리안 X.
- **루프 변수, 상태 변수**의 컨벤션.
- 발음·검색 가능, 약어 자제.

## 좋은 이름의 속성

McConnell의 가이드.

### 목적을 묘사

```c
// Bad — 코드가 하는 일
int x;              // 무엇?
double tempo;       // 무엇의 tempo?

// Good — 의도
int customerCount;
double currentSpeed;
```

### 길이는 정보량에 비례

| 스코프 | 권장 길이 |
| --- | --- |
| 루프 인덱스 (1~2줄 안) | 1~3자 — `i`, `j` |
| 짧은 함수 안 변수 | 5~10자 — `count` |
| 클래스 멤버 | 8~15자 — `customerCount` |
| 전역 / public 상수 | 15~25자 — `DEFAULT_USER_TIMEOUT_SECONDS` |

McConnell의 연구 — **평균 9~15자**가 디버깅 노력을 최소화.

### 의도 = 위치 + 목적

이름의 의미는 — **스코프**에 따라 다르다.

```c
// 작은 스코프에선 i로 충분
for (int i = 0; i < n; i++) ...

// 큰 스코프에선 의미 필요
int customerCount = ...;   // 전역적으로 쓰이면
```

## 명명 컨벤션

여러 컨벤션이 있다. **한 가지를 선택하고 일관되게 적용**.

### 카멜케이스
```cpp
int customerCount;
void processOrder();
```

### 스네이크케이스
```c
int customer_count;
void process_order();
```

### PascalCase (클래스/타입)
```cpp
class CustomerOrder;
struct LineItem;
```

### 상수 — UPPER_SNAKE
```c
#define MAX_BUFFER_SIZE 1024
const int DEFAULT_TIMEOUT = 30;
```

선택은 — 언어/팀 컨벤션에 맡긴다. **일관성이 형식보다 중요**.

## 흔한 함정

### 헝가리안 표기

```c
// 옛 컨벤션
char* pszName;       // pointer to zero-terminated string of name
int iCount;          // integer count

// 현대
char* name;
int count;
```

IDE가 타입을 알려주므로 — 헝가리안은 노이즈.

### 의미 없는 접미사

```c
// Bad
customerData;
customerInfo;

// Good
customer;
```

`Data`, `Info`, `Manager` 등은 — 의미를 추가하지 않으면 잡음.

### 비슷한 이름 회피

```c
// 헷갈림
clientRecs, clientReps, clientRems, clientReas

// 명확
clientRecords, clientReports, clientRemarks, clientReasons
```

스펠링이 비슷한 이름은 — 자동완성·디버깅에서 혼동.

### 약어

```c
// Bad
int curUsr;        // current user?
int cmpRslt;       // compare result?

// Good
int currentUser;
int compareResult;
```

표준 약어(`HTTP`, `URL`)만 허용. 사용자 정의 약어는 금지.

### 단일 글자 변수

루프 인덱스(`i`, `j`)만 OK. 그 외에는 의미 있는 이름.

## 특수 자리

### 루프 변수

```cpp
for (int i = 0; i < customers.size(); i++) {
    customers[i].process();
}
```

`i`, `j`, `k`는 루프 인덱스로 컨벤션. 다른 자리에서 쓰지 마라.

### Boolean 변수

`is`, `has`, `can`, `should`로 시작.

```c
bool isReady;
bool hasError;
bool canRetry;
```

### 임시 변수

`temp`, `tmp`라는 이름 자체가 — "이 변수는 의미가 없다"고 선언하는 것. **임시여도 이름**을 짓는다.

```c
// Bad
double temp = a * b;
result = temp + c;

// Good
double rectangleArea = width * height;
result = rectangleArea + offset;
```

## 정리

- 이름은 **목적을 드러내야** — 코드의 무엇이 아니라 **왜**.
- 길이는 **스코프에 비례** — 9~15자가 평균 최선.
- **헝가리안 X, 약어 최소, 비슷한 이름 회피**.
- **boolean은 `is`/`has`/`can`**, 루프 변수는 `i`.
- 일관된 **명명 컨벤션**.

## 관련 항목

- [Ch 10: General Variables](/blog/programming/engineering/code-complete/ch10-General-Issues-in-Using-Variables)
- [Ch 12: Fundamental Data Types](/blog/programming/engineering/code-complete/ch12-Fundamental-Data-Types)
- [Clean Code Ch 2: 의미 있는 이름](/blog/programming/engineering/clean-code/chapter02-meaningful-names)
