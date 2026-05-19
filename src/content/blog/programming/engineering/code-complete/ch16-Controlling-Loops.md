---
title: "Chapter 16: Controlling Loops"
date: 2026-05-11T16:00:00
description: "루프의 제어 — 입구·출구·본문 분리, 한 책임 한 루프, break/continue 신중."
series: "Code Complete"
seriesOrder: 16
tags: [code-complete, loops, McConnell]
draft: true
---

## 이 챕터의 메시지

루프는 — **조건만큼 자주 만나는 흐름 구조**다. 깊은 중첩, 무한 루프, off-by-one 버그가 모두 루프 주변에서 일어난다.

> 좋은 루프 = **명확한 종료 조건 + 한 책임 + 짧은 본문**.

## 핵심 내용

- **종료 조건이 명확**해야 한다 — 어떻게 끝나는가?
- **한 루프, 한 책임** — 여러 일 X.
- 본문이 길면 **함수로 추출**.
- `break`, `continue`는 **신중히** — 한 자리에서.
- **루프 인덱스 의미** — `i`, `j` 외에는 의미 있는 이름.

## 루프 종류 선택

| 종류 | 사용 |
| --- | --- |
| `for` | 횟수가 정해진 경우 |
| `while` | 조건 만족까지 |
| `do-while` | 최소 1회 실행 보장 |
| `range-for` (C++11+) | 컨테이너 순회 |

선택 기준 — **루프의 의도를 가장 잘 표현**.

```cpp
// 횟수 → for
for (int i = 0; i < n; i++) ...

// 조건 → while
while (queue.notEmpty()) ...

// 컨테이너 → range-for
for (auto& item : items) ...
```

## 종료 조건의 명확함

루프를 본 순간 — "이건 어떻게 끝나는가?"가 답해야 한다.

```c
// Bad — 종료 조건 묻혀 있음
for (;;) {
    // ... 50줄 ...
    if (something) break;
    // ... 더 ...
}

// Good — 명시적 조건
while (!done) {
    // ...
    if (something) done = true;
}
```

`for(;;)`나 `while(true)` + break는 — 가능하면 피한다.

## 한 루프, 한 책임

```c
// Bad — 두 책임을 한 루프에
for (int i = 0; i < customers.size(); i++) {
    customers[i].sendEmail();
    customers[i].updateStatus();
}

// Good — 두 루프로 분리
for (auto& c : customers) c.sendEmail();
for (auto& c : customers) c.updateStatus();
```

각 루프가 한 의도. 한 책임 변경 시 다른 영향 X.

(성능이 critical하면 한 루프로 합치는 게 합당할 수도 — 측정 후 결정.)

## 본문은 짧게

루프 본문이 한 화면을 넘으면 — **함수로 추출**.

```c
// Bad — 본문이 40줄
for (auto& order : orders) {
    // 40줄의 검증·계산·저장
}

// Good — 본문은 한 함수 호출
for (auto& order : orders) {
    processOrder(order);
}
```

루프의 흐름이 한눈에 보인다.

## break, continue 신중히

- **break**: 종료 조건이 본문 안에서 결정될 때. 한 자리에서.
- **continue**: 가드 절 효과. 본문 깊이를 줄임.

```c
// continue로 가드 효과
for (auto& item : items) {
    if (!item.isReady()) continue;
    if (item.isExpired())  continue;
    // 본격 처리 — 들여쓰기 X
}
```

여러 `break`/`continue`가 흩어지면 — 흐름 추적 어려움. **한 자리에서 한 번**이 이상적.

## 루프 인덱스 이름

```c
// 단순 루프 — i, j, k OK
for (int i = 0; i < n; i++) ...

// 중첩 루프 — 의미 있는 이름
for (int row = 0; row < rows; row++)
    for (int col = 0; col < cols; col++)
        grid[row][col] = ...;
```

중첩 시 — `i`, `j`만으로는 어느 게 어느 차원인지 헷갈림.

## 빈 루프 — 의도 명시

```c
// Bad — 본문이 비어 있음 — 의도?
while (process());

// Good — 명시적
while (process()) {
    // 의도: process가 false를 반환할 때까지 호출
}
```

빈 본문은 — 주석으로 의도 명시. 또는 별도 함수.

## 정리

- 루프 종류는 **의도를 가장 잘 표현**하는 것 선택.
- **종료 조건이 명확**해야.
- **한 루프, 한 책임**.
- 본문이 길면 **함수로 추출**.
- `break`/`continue`는 신중히, **한 자리에서**.

## 관련 항목

- [Ch 15: Conditionals](/blog/programming/engineering/code-complete/ch15-Using-Conditionals)
- [Ch 17: Unusual Control Structures](/blog/programming/engineering/code-complete/ch17-Unusual-Control-Structures)
