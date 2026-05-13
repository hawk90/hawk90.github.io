---
title: "Ch 25: 레이어와 경계"
date: 2026-06-08T01:00:00
description: "단순한 3겹 다이어그램이 만능이 아니다. Hunt the Wumpus 예제로 보는 다축 변경과 다중 데이터 흐름."
tags: [Architecture, Layers, Boundaries]
series: "Clean Architecture"
seriesOrder: 25
---

## 이 챕터의 메시지

Clean Architecture를 보는 사람들이 자주 빠지는 함정 — **3겹 / 4겹이 절대적인 것처럼 받아들이는 것**. UI / Business / DB의 세 층만 있으면 된다고 단순화한다.

Martin은 한 가지 예제를 통해 이게 부족함을 보여 준다. 그 예가 **Hunt the Wumpus** 게임이다.

## Hunt the Wumpus

1970년대 텍스트 어드벤처 게임. 동굴을 탐험하며 Wumpus라는 괴물을 사냥한다.

```
You are in room 12.
Tunnels lead to rooms 2, 11, 13.
> shoot 11
The Wumpus is in room 11. You win!
```

단순해 보인다. 그러나 이 게임을 진지하게 짜면 다음과 같은 변경 축들이 등장한다.

## 변경 축 1 — 게임 규칙

비즈니스 로직 (게임 메카닉). 동굴 구조, Wumpus 행동, 화살 개수, 승패 조건.

이 부분은 게임의 본질이다. 가장 안정적이고, 가장 핵심.

## 변경 축 2 — UI

플레이어와 어떻게 상호작용할 것인가.

- 텍스트 입력 / 출력
- 그래픽 UI
- 음성 명령
- 모바일 / 데스크톱

UI는 자주 바뀐다. 같은 게임을 여러 UI에서 출시할 수도 있다.

## 변경 축 3 — 언어

영어 / 한국어 / 일본어 — 출력 메시지.

```
You are in room 12.        // 영어
12번 방에 있습니다.          // 한국어
あなたは12号室にいます。      // 일본어
```

언어 변경은 UI 변경과 다른 축이다. 영어 텍스트 UI에서 한국어 텍스트 UI로 옮기는 건 언어 축 변경. 텍스트에서 그래픽으로는 UI 축 변경.

## 변경 축 4 — 데이터 저장

상태를 어떻게 저장할 것인가.

- 인메모리 (단일 세션)
- 파일 (저장/불러오기)
- DB (멀티플레이어, 클라우드)
- 분산 (멀티 서버)

## 3겹으로는 부족하다

전통적인 UI / Business / DB 3겹으로 이걸 표현하려면.

```
[UI]                ← UI 축 + 언어 축이 섞임
   ↓
[Business Rules]    ← 게임 규칙 축
   ↓
[Data]              ← 저장 축
```

문제: UI 층이 두 축(UI 형태 + 언어)을 동시에 가진다. UI 변경과 언어 변경이 같은 코드를 만진다. SRP 위반.

해법은 **두 축을 별도 경계로 분리**하는 것이다.

```
[UI 형태 (텍스트/그래픽)]
        ↓
[언어 인터페이스]
        ↓
[게임 규칙]
        ↓
[저장 인터페이스]
        ↓
[저장 구현]
```

여기서 경계는 4개다. 3겹이 아니라.

## 더 일반적인 원칙

이 예제가 보여 주는 것 — **변경 축마다 경계가 하나씩 필요**.

```
변경 축 1 ← 경계
변경 축 2 ← 경계
변경 축 3 ← 경계
...
```

각 축의 변경이 다른 축에 영향을 주지 않게 만든다. 그게 좋은 경계 배치다.

## 다중 데이터 흐름

또 다른 통찰 — Clean Architecture의 다이어그램이 **한 가지 데이터 흐름**만 가진 게 아니다.

같은 시스템 안에 여러 데이터 흐름이 공존한다.

```
흐름 1 (사용자 요청): UI → Use Case → DB
흐름 2 (비동기 이벤트): 외부 시스템 → Listener → Use Case → DB
흐름 3 (배치): Scheduler → Use Case → DB
흐름 4 (조회): UI → Use Case → DB read-only
```

각 흐름이 다른 경계를 가로지를 수 있다. 그리고 그 흐름들이 같은 Use Case들을 공유하면서도 다른 Adapter들을 거친다.

## 다이어그램의 일반화

Clean Architecture 22장의 4겹은 한 종류의 데이터 흐름을 그린 것이다. 실제 시스템은 더 복잡한 그림을 가진다.

```
                Use Cases (중심)
                  ↑   ↑   ↑   ↑
                 │   │   │   │
            ┌────┘   │   │   └────┐
            │        │   │        │
     UI Adapter  Event   Batch   Read Model
                Listener Worker
            │        │   │        │
    HTTP/REST    MessageQ  Cron    DB Replica
```

여러 진입점, 여러 출구. 그러나 의존성 규칙은 그대로 — 모든 화살표가 안쪽으로 향한다.

## 실용적 조언

이 챕터의 실용적 메시지.

**1. 3겹 / 4겹을 절대적으로 받아들이지 마라**

도메인에 맞는 경계의 수를 찾는다. 더 많아도, 더 적어도 된다.

**2. 변경 축마다 경계 후보**

새 변경 요구가 들어왔을 때 "어떤 축의 변경인가?"를 묻는다. 새 축이라면 새 경계가 필요할 수 있다.

**3. 다중 데이터 흐름을 그려 본다**

시스템 안에 몇 개의 진입점이 있는가? 각 진입점이 어떤 경계를 거치는가? 그림을 그려 보면 누락된 경계가 드러난다.

## 정리

- Clean Architecture의 4겹은 **출발점**, 절대적이지 않음
- 시스템마다 변경 축이 다르고, 각 축마다 경계가 필요
- Hunt the Wumpus 예 — UI / 언어 / 규칙 / 저장 = 4축
- 다중 데이터 흐름 — 한 시스템에 여러 진입점과 출구
- 의존성 규칙은 모든 흐름에 동일 — 안쪽으로

## 다음 장 예고

다음 장은 **Main 컴포넌트** — 시스템의 진입점과 의존성 주입의 자리.

## 관련 항목

- [Ch 22: The Clean Architecture](/blog/programming/design/clean-architecture/chapter22-the-clean-architecture) — 4겹의 출발점
- [Ch 7: SRP](/blog/programming/design/clean-architecture/chapter07-srp-the-single-responsibility-principle) — actor 기반 분리
