---
title: "Chapter 4: Actors"
date: 2026-05-22T04:00:00
description: "Erlang/Elixir의 Actor 모델 — 격리된 상태, 메시지 패싱, 슈퍼바이저, let it crash 철학."
series: "Seven Concurrency Models in Seven Weeks"
seriesOrder: 4
tags: [parallel, concurrency, book-review, actors, erlang, elixir, supervisor]
type: book-review
bookTitle: "Seven Concurrency Models in Seven Weeks"
bookAuthor: "Paul Butcher"
draft: true
---

> **Seven Concurrency Models in Seven Weeks** Chapter 4 요약

## 4.1 Actor 모델

Carl Hewitt의 1973년 모델. 핵심 아이디어 — **공유 상태 없음, 메시지로만 통신**.

각 Actor의 구성요소.

- 자기만의 **mailbox** (메시지 큐)
- 자기만의 **state** (격리됨)
- 자기 메시지를 *순차 처리*
- 다른 actor에게 메시지 전송 가능
- 새 actor 생성 가능

Actor A가 메시지를 보내면 Actor B의 mailbox에 들어가고, B는 자기 페이스로 처리한다. 두 actor의 state는 절대 공유되지 않는다.

상태 공유가 없으므로 *락 없음*. *데이터 레이스 없음*.

## 4.2 Elixir — 모던 Actor

Erlang VM(BEAM) 위에서 실행. 함수형 + Actor.

```elixir
defmodule Counter do
  def start, do: spawn(fn -> loop(0) end)
  
  def loop(state) do
    receive do
      {:inc, sender} ->
        new_state = state + 1
        send(sender, {:ok, new_state})
        loop(new_state)
      :get ->
        loop(state)
    end
  end
end

pid = Counter.start
send(pid, {:inc, self()})
receive do
  {:ok, n} -> IO.puts("Now: #{n}")
end
```

핵심:
- `spawn` — 새 프로세스 생성 (가벼움, 수백만 개 가능)
- `send` — 메시지 전송 (비동기)
- `receive` — mailbox에서 패턴 매칭
- `loop` — 재귀로 다음 상태 받음

## 4.3 Erlang 프로세스의 가벼움

| | 스택 | 컨텍스트 스위치 |
|------|------|----------------|
| OS thread | 수 MB | 수 µs |
| Erlang process | ~2 KB | 매우 빠름 |

→ 100만 개 프로세스 가능.

이게 Erlang의 가장 큰 무기 — *매우 가벼운 프로세스*.

## 4.4 메시지 패싱 의미론

1. **비동기** — `send`는 즉시 반환
2. **신뢰성** — 메시지 손실 없음 (같은 노드)
3. **순서** — 같은 sender → 같은 receiver는 순서 보장
4. **Mailbox** — `receive`는 패턴에 맞는 메시지를 선택

```elixir
;; 패턴 매칭 receive
receive do
  {:user, name}       -> handle_user(name)
  {:admin, name, key} -> handle_admin(name, key)
  msg                  -> log_unknown(msg)
end
```

## 4.5 Let It Crash

Erlang 철학의 핵심.

- **전통** — 모든 에러를 처리하려 한다
- **Erlang** — 에러가 났으면 죽이고 새로 시작한다

```elixir
defmodule Worker do
  def loop do
    receive do
      :work -> 
        do_dangerous_thing!  ;; 예외 가능
        loop()
    end
  end
end
;; 예외 발생 → 프로세스 종료
;; supervisor가 새 프로세스 시작
```

방어적 코딩의 *반대*. 에러 처리를 *상위 수준*에 맡김.

## 4.6 Supervisor

프로세스 트리를 *감독*.

```elixir
children = [
  {Worker, []},
  {DBConnection, []},
  {Cache, []}
]

Supervisor.start_link(children, strategy: :one_for_one)
```

전략:
- `:one_for_one` — 죽은 것만 재시작
- `:one_for_all` — 하나 죽으면 모두 재시작
- `:rest_for_one` — 죽은 것 + 그 뒤 모두 재시작

Supervisor 아래 Worker A, B, C가 있을 때 B가 죽으면 전략에 따라 다음과 같이 동작한다.

- `one_for_one` — B만 재시작
- `one_for_all` — A, B, C 모두 재시작
- `rest_for_one` — B, C 재시작 (B 뒤로 선언된 것까지)

장애 격리 + 자동 복구. 이게 BEAM 시스템이 *99.9999% uptime*을 달성하는 비결이다.

## 4.7 분산 — 위치 투명성

같은 노드 / 다른 노드 / 다른 머신 — 코드 동일.

```elixir
;; 로컬
pid = spawn(fn -> ... end)
send(pid, msg)

;; 원격 (다른 노드)
pid = Node.spawn(:"other@host", fn -> ... end)
send(pid, msg)  ;; 같은 API
```

이게 분산 시스템의 *우아한* 구축. 위치는 *세부 사항*.

## 4.8 GenServer — 표준 패턴

```elixir
defmodule Counter do
  use GenServer
  
  ;; 클라이언트 API
  def start_link, do: GenServer.start_link(__MODULE__, 0)
  def increment(pid), do: GenServer.call(pid, :inc)
  def get(pid), do: GenServer.call(pid, :get)
  
  ;; 서버 콜백
  def init(initial), do: {:ok, initial}
  
  def handle_call(:inc, _from, state) do
    new_state = state + 1
    {:reply, new_state, new_state}
  end
  
  def handle_call(:get, _from, state) do
    {:reply, state, state}
  end
end
```

손으로 receive 루프 짤 일은 거의 없다 — GenServer가 그 뼈대.

## 4.9 ETS — 공유 상태가 필요할 때

Actor는 격리가 기본이지만, 캐시 같은 공유 데이터엔 ETS(Erlang Term Storage).

```elixir
:ets.new(:cache, [:set, :public, :named_table])
:ets.insert(:cache, {:key, "value"})
:ets.lookup(:cache, :key)
```

내부적으로 *최적화된 동시 자료구조*. Actor 모델의 *예외*.

## 4.10 다른 언어의 Actor

| 구현 | 특징 |
|------|------|
| Erlang / Elixir | BEAM VM 위, 사실상 표준 |
| Akka (Scala / Java) | JVM에서 가장 성숙 |
| Pony | type-safe actor |
| Vlingo (Java / Kotlin) | Akka 대안 |
| Orleans (.NET) | virtual actor |
| Pykka (Python) | 경량 |

각 구현마다 디테일은 다르지만 *모델*은 같음.

## 4.11 Actor의 단점

1. **메시지 순서 미보장** — 서로 다른 sender 간
2. **응답 대기는 deadlock 위험** — call이 다시 자신을 호출하는 경우
3. **디버깅 어려움** — 분산 메시지 추적
4. **메시지 직렬화 비용** — 분산일 때
5. **메모리** — 큐가 무한히 자라면 OOM

특히 **메시지 폭주 (mailbox overflow)**가 흔한 운영 문제.

## 정리

- **Actor** — 격리된 상태 + 메시지 패싱
- **Let it crash** — 방어가 아닌 *복구*
- **Supervisor** — 자동 재시작, 트리 구조
- **위치 투명성** — 로컬/분산 동일 API
- **GenServer / OTP** — 표준 패턴
- 단점 — mailbox overflow, 메시지 순서, 디버깅

## 한국 개발자의 함정

1. ***Erlang = 통신사 전용*이라는 편견** — WhatsApp, Discord, Pinterest가 Erlang/Elixir를 쓴다. 실시간 시스템 전반에 적합.
2. ***Actor = 무거운 OS thread*라는 오해** — Erlang 프로세스는 *매우* 가볍다. 수백만 개 가능.
3. ***let it crash = 에러 무시*라는 오해** — 정확히는 *국소화된 실패 + 복구*. 시스템 차원에서 안정.
4. ***Akka actor = OOP 그대로*** — 격리와 메시지를 진짜로 따라야 한다. 공유 가변 상태를 두면 의미가 없다.
5. ***Actor가 항상 분산에 좋음*** — 메시지 직렬화, 순서, 신뢰성 처리가 필요하다. 위치 투명성도 *비용*이 있다.

## 실무 적용

**이론 → 실무**

| 개념 | 구현 |
|------|------|
| Erlang processes | Elixir GenServer |
| Supervisor tree | OTP |
| Akka actors | Scala / Java 백엔드 |
| Virtual actors | Microsoft Orleans (게임 서버) |
| Pony actors | 안전한 시스템 |

**대표 시스템**

- WhatsApp — Erlang 백엔드
- Discord — Elixir voice/messaging
- Klarna — Erlang 금융 시스템
- Pinterest — Elixir 알림
- 게임 서버 — 일반적으로 actor 모델

**설계 패턴**

- 도메인 entity → actor
- Pipeline stage → actor chain
- WebSocket connection → actor per connection
- DB pool → actor with mailbox

## 자기 점검

- [ ] Actor 모델의 세 가지 원칙은?
- [ ] Erlang 프로세스가 OS thread보다 가벼운 이유는?
- [ ] *Let it crash* 철학의 의미는?
- [ ] Supervisor의 세 가지 전략은?
- [ ] 메시지 순서가 보장되는 경우와 그렇지 않은 경우는?
- [ ] Actor의 단점과 대응은?

## 다음 장 예고

Ch 5 — **CSP**. Actor와 비슷한 메시지 패싱, 그러나 *채널*이 중심. Go의 goroutine.

## 관련 항목

- [Ch 3: The Clojure Way](/blog/parallel/seven-concurrency-models/ch03-the-clojure-way)
- [Ch 5: CSP](/blog/parallel/seven-concurrency-models/ch05-csp)
- [AMP Ch 1: Introduction](/blog/parallel/parallel-principles/ch01-introduction)
- [DDIA Ch 11: Stream Processing](/blog/parallel/designing-data-intensive-applications) — 분산 통신
