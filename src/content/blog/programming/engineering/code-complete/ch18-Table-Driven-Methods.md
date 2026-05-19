---
title: "Chapter 18: Table-Driven Methods"
date: 2026-05-11T18:00:00
description: "테이블로 로직을 표현 — 거대한 if-else를 데이터로. 직접·인덱스·계단 테이블 접근."
series: "Code Complete"
seriesOrder: 18
tags: [code-complete, table-driven, McConnell]
draft: true
---

## 이 챕터의 메시지

복잡한 분기 로직은 — 종종 **테이블 조회**로 대체할 수 있다. 코드가 데이터로 옮겨지면 **추가·변경이 코드 수정 없이** 가능해진다.

> Table-driven = **로직을 데이터로**.

## 핵심 내용

- 거대한 `if-else if`나 `switch`는 — 테이블로 대체 가능.
- 세 가지 접근법: **직접·인덱스·계단** 테이블.
- 새 케이스 추가 시 — 코드 변경 없이 **데이터만 추가**.
- 게임 룰, 세금 계산, 파서 등에 자연스러움.

## 예시 — 한 달의 일수

```c
// 코드 기반
int daysInMonth(int month) {
    switch (month) {
        case 1: return 31;
        case 2: return 28;    // 윤년 무시
        case 3: return 31;
        case 4: return 30;
        // ... 8 more
    }
}

// 테이블 기반
const int DAYS[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
int daysInMonth(int month) {
    return DAYS[month - 1];
}
```

테이블 기반이 더 짧고, 변경하기 쉽다.

## 세 가지 테이블 접근

### 1) 직접 접근 (Direct Access)

키가 인덱스로 직접 변환 가능.

```c
const int DAYS[12] = {31, 28, ...};
int days = DAYS[month - 1];
```

빠르다, 단순하다. 가능하면 이걸.

### 2) 인덱스 접근 (Indexed Access)

키 → 인덱스 변환에 한 단계 추가.

```c
// 메시지 키 → 인덱스
const int idx = messageIdToIndex(key);
const char* msg = MESSAGES[idx];
```

키가 sparse하거나 비정수일 때.

### 3) 계단 접근 (Stair-Step Access)

범위 기반.

```c
// 점수 → 학점
double score = ...;
if      (score >= 90.0) return 'A';
else if (score >= 80.0) return 'B';
else if (score >= 70.0) return 'C';
// ...
```

테이블로 표현:

```c
struct { double threshold; char grade; } TABLE[] = {
    {90.0, 'A'}, {80.0, 'B'}, {70.0, 'C'}, {60.0, 'D'}, {0.0, 'F'}
};

char getGrade(double score) {
    for (auto& row : TABLE) {
        if (score >= row.threshold) return row.grade;
    }
}
```

새 학점 기준이 생기면 — 테이블만 수정.

## 언제 쓰나

테이블 기반이 자연스러운 자리:

- **게임 룰** — 캐릭터별 스탯, 능력치.
- **세금/할인 계산** — 구간별 비율.
- **파서/렉서** — 상태 전이 테이블.
- **국제화** — 언어별 메시지.
- **설정/구성** — 환경별 값.

## 언제 안 쓰나

- 케이스가 **3개 이하** — 그냥 코드가 더 명확.
- **케이스마다 매우 다른 동작** — 테이블에 함수 포인터를 두는 게 답이지만 — 그게 다형성과 같다.
- **자주 안 바뀜** — 코드의 명료함이 더 가치.

## 함수 포인터 테이블

다른 동작을 매핑할 때.

```c
typedef void (*Handler)(Message);

struct { int type; Handler handler; } HANDLERS[] = {
    {MSG_LOGIN,    handleLogin},
    {MSG_LOGOUT,   handleLogout},
    {MSG_PURCHASE, handlePurchase},
};

void dispatch(Message msg) {
    for (auto& row : HANDLERS) {
        if (row.type == msg.type) { row.handler(msg); return; }
    }
}
```

OOP에선 — **Strategy 패턴**과 같다.

## 정리

- 큰 분기 로직은 — **테이블 조회**로 대체 가능.
- **직접 / 인덱스 / 계단** — 세 가지 접근.
- 새 케이스가 코드 수정 없이 — **데이터 추가**로.
- 게임 룰, 세금, 파서 등에 자연.
- 3개 이하의 케이스엔 — 코드가 더 명확.

## 관련 항목

- [Ch 17: Unusual Control](/blog/programming/engineering/code-complete/ch17-Unusual-Control-Structures)
- [Ch 19: General Control Issues](/blog/programming/engineering/code-complete/ch19-General-Control-Issues)
- [Refactoring: Replace Conditional with Polymorphism](/blog/programming/engineering/refactoring/)
