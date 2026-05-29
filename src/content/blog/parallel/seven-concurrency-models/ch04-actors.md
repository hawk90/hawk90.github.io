---
title: "Chapter 4: Actors"
date: 2026-05-06T04:00:00
description: "Erlang/Elixir의 Actor 모델 — 격리된 상태, 메시지 패싱, 슈퍼바이저, let it crash 철학."
series: "Seven Concurrency Models in Seven Weeks"
seriesOrder: 4
tags: [parallel, concurrency, book-review, actors, erlang, elixir, supervisor]
type: book-review
bookTitle: "Seven Concurrency Models in Seven Weeks"
bookAuthor: "Paul Butcher"
draft: true
---

Chapter 4는 Actor 모델을 다룹니다. Paul Butcher는 Elixir로 예제를 풀어갑니다. Elixir는 Erlang VM(BEAM) 위에서 동작하는 함수형 언어입니다. Erlang은 1980년대 후반 Ericsson에서 통신 교환기를 만들기 위해 태어났고, 그 결과 *동시성*과 *장애 복구*가 언어 차원의 1급 시민으로 자리잡았습니다.

이 장은 세 날로 구성됩니다. Day 1은 메시지와 mailbox로 actor 자체를 익힙니다. Day 2는 let it crash 철학과 supervisor를 배웁니다. Day 3은 분산으로 확장합니다. Wrap-Up에서 actor 모델의 강점과 약점을 정리하고, 다음 장의 CSP와 어떻게 이어지는지 봅니다.

## 왜 Actor 모델이 분산 시스템에서 이기는가

본격적으로 들어가기 전에 큰 그림을 한 번 짚고 갑니다. 스레드와 락으로 만든 시스템은 하나의 컴퓨터 안에서 어떻게든 굴러갑니다. 그런데 *그 시스템을 두 대의 컴퓨터로 늘리는 순간* 모든 것이 무너집니다. 락은 네트워크 너머로 동작하지 않고, 공유 메모리는 한 박스 안에서만 존재합니다. 한 노드가 죽으면 다른 노드는 그 사실을 *언제 알게 될지* 모릅니다.

Actor 모델은 처음부터 *그 세계*를 가정합니다. 같은 머신 안에서도 actor들은 공유 메모리를 쓰지 않습니다. 메시지만 주고받습니다. 그래서 로컬에서 잘 동작하는 코드는 노드 너머로 옮겨도 *그대로* 동작합니다. 한 actor가 죽어도 다른 actor는 살아 있고, supervisor가 죽은 actor를 새로 띄웁니다. 락은 없습니다. 데드락도 (대부분) 없습니다. 장애는 *국소적*입니다.

이것이 WhatsApp이 단 9명의 엔지니어로 1억 명의 동시 접속을 처리한 비결이고, Discord가 천만 명이 한 채널에 들어오는 상황을 견디는 이유이며, RabbitMQ가 메시지 브로커의 표준이 된 배경입니다. 모두 BEAM 위에서 돌아갑니다.

## 우체국 사서함 비유 — Actor 모델 직관

Actor 모델을 처음 만나면 추상적으로 느껴집니다. *우체국 사서함*으로 바꿔서 보면 단순합니다.

- **Actor = 사서함을 가진 사람.** 각자 자기 우편함을 가지고 있고, 남의 우편함을 *직접 들여다볼 수 없습니다.* 안에 뭐가 들었는지 알려면 편지를 보내 물어봐야 합니다.
- **send = 편지를 우편함에 넣는 행위.** 보낸 즉시 내 일은 끝납니다. 받는 사람이 언제 우편함을 열어볼지는 알 수 없습니다.
- **receive = 우편함에서 편지를 꺼내 읽는 행위.** 그것도 *맞는 편지만* 골라서 꺼냅니다. 광고지는 그대로 두고 청구서만 집을 수도 있습니다.
- **link = 부모와 자식이 운명을 함께함.** 한쪽 우편함 주인이 사라지면 다른 쪽도 함께 사라집니다.
- **monitor = 부모가 자식이 어떻게 됐는지 알림만 받음.** 자식이 사라져도 부모는 살아 있고, "자식이 떠났다"는 통지만 받습니다.
- **supervisor = 가게 매니저.** 직원이 실수해서 그만두면, *매달리지 않고* 조용히 새 직원을 채용합니다.

이 직관을 머리에 넣고 코드를 보면 모든 프리미티브가 자연스러워집니다.

## 4.1 Actor 모델 — 한 줄 요약

Actor 모델은 Carl Hewitt이 1973년에 제안했습니다. 핵심은 **공유 상태 없음, 메시지로만 통신**입니다.

각 actor의 구성요소는 단순합니다.

- 자기만의 **mailbox** (메시지 큐)
- 자기만의 **state** (격리된 힙)
- 자기 메시지를 *순차 처리*
- 다른 actor에게 메시지 전송 가능
- 새 actor 생성 가능

Actor A가 메시지를 보내면 Actor B의 mailbox에 들어가고, B는 자기 페이스로 처리합니다. 두 actor의 state는 절대 공유되지 않습니다. 상태 공유가 없으므로 *락 없음*, *데이터 레이스 없음*입니다.

![Actor 모델 — state + mailbox + receive](/images/blog/seven-concurrency-models/diagrams/ch04-actor-model.svg)

이 모델은 Chapter 2의 스레드·락 모델과 정반대 지점에 있습니다. 락은 같은 메모리를 *순서대로 만지기 위해* 필요했습니다. Actor는 *애초에 메모리를 공유하지 않으니까* 락이 필요 없습니다.

| 항목 | OS Thread (Ch 2) | Erlang Process |
|------|------------------|----------------|
| 메모리 | 공유 힙 | 격리된 힙 |
| 통신 | 공유 변수 | 메시지 |
| 동기화 | 락 / 원자 연산 | mailbox 순차 처리 |
| 생성 비용 | 수 MB 스택 | ~2 KB 초기 힙 |
| 컨텍스트 스위치 | 수 µs (커널) | 매우 빠름 (BEAM) |
| 격리 수준 | 같은 프로세스 안 | 완전 격리 |
| 장애 전파 | 전체 다운 가능 | 격리된 종료 |

100만 개의 OS 스레드는 현실적이지 않지만, 100만 개의 Erlang process는 그렇지 않습니다. 이 가벼움이 BEAM의 첫째 무기입니다.

## Day 1 — Messages and Mailboxes

### 4.2 첫 actor — spawn, send, receive

가장 짧은 예제부터 봅니다. Paul Butcher는 talker라는 actor를 등장시킵니다. 메시지를 받으면 콘솔에 찍는 단순한 프로세스입니다.

아래 코드는 우체국 비유 그대로입니다. `Talker`라는 사람을 한 명 고용하고(`spawn`), 그 사람의 우편함에 세 통의 편지를 던져 넣습니다(`send`). 그 사람은 자기 페이스로 편지를 하나씩 열어보고(`receive`) 콘솔에 답을 적습니다.

```elixir
defmodule Talker do
  def loop do
    receive do
      {:greet, name} ->
        IO.puts("Hello, #{name}")
        loop()
      {:praise, name} ->
        IO.puts("#{name}, you are amazing.")
        loop()
      {:celebrate, name, age} ->
        IO.puts("#{name}, happy #{age}th birthday!")
        loop()
    end
  end
end

pid = spawn(&Talker.loop/0)
send(pid, {:greet, "Huey"})
send(pid, {:praise, "Dewey"})
send(pid, {:celebrate, "Louie", 16})
```

세 가지 핵심 프리미티브가 보입니다.

- `spawn/1` — 새 프로세스를 만들고 pid를 돌려줍니다
- `send(pid, msg)` — 비동기 전송. 호출 즉시 반환합니다
- `receive do ... end` — mailbox에서 패턴에 맞는 메시지를 꺼냅니다

![spawn → send → receive sequence](/images/blog/seven-concurrency-models/diagrams/ch04-spawn-send-receive.svg)

`receive`는 *블로킹*입니다. 매치되는 메시지가 mailbox에 없으면 도착할 때까지 기다립니다. 매치되면 그 메시지를 꺼내 해당 절을 실행하고, 끝에서 `loop()`를 재귀 호출해 다음 메시지를 기다립니다. 함수형 언어에서 가변 상태를 흉내내는 표준 패턴입니다.

### 4.3 패턴 매칭 receive

`receive` 블록의 본질은 패턴 매칭입니다. 하나의 mailbox에 여러 종류의 메시지가 섞여 있어도 형태로 구분합니다.

```elixir
receive do
  {:user, name}       -> handle_user(name)
  {:admin, name, key} -> handle_admin(name, key)
  msg                 -> log_unknown(msg)
end
```

마지막 절의 `msg`는 *어떤 메시지든* 매치되는 와일드카드입니다. 디버깅 단계에서는 유용하지만 운영 코드에서는 신중해야 합니다. 의도치 않은 메시지가 *조용히* 소비될 수 있습니다.

### 4.4 양방향 — echo와 self()

응답을 받으려면 *내 pid*를 메시지에 동봉해야 합니다. Erlang에는 "리턴 값" 같은 것이 없으니까요. 책의 echo 예제입니다.

우체국 비유로 보면 *반송용 봉투를 동봉*하는 것과 같습니다. 편지에 "답장은 이 주소로 보내주세요"라고 쓰여 있어야 echo가 답을 어디로 보낼지 압니다.

```elixir
defmodule Echo do
  def loop do
    receive do
      {sender, msg} ->
        send(sender, {:response, msg})
        loop()
    end
  end
end

pid = spawn(&Echo.loop/0)
send(pid, {self(), "hello"})

receive do
  {:response, msg} -> IO.puts("got: #{msg}")
end
```

`self()`는 현재 프로세스의 pid를 돌려줍니다. echo는 받은 sender에게 답을 보냅니다. 호출자는 자기 mailbox에서 응답을 꺼냅니다. 이 *request-reply* 패턴이 actor 시스템의 기본 단위입니다.

### 4.5 상태 있는 actor — counter

actor의 state는 *루프 함수의 인자*로 표현합니다. 다음 메시지를 처리할 때 갱신된 값을 인자로 넘겨 재귀 호출합니다.

여기서 "state는 우편함 주인의 *기억*"이라고 생각하면 편합니다. 편지를 한 통 읽을 때마다 그 사람의 기억이 갱신되고, 다음 편지를 열 때 갱신된 기억을 가지고 행동합니다. 가변 변수 없이도 상태가 시간에 따라 변합니다.

```elixir
defmodule Counter do
  def start(initial), do: spawn(fn -> loop(initial) end)

  def loop(state) do
    receive do
      {:inc, sender} ->
        new_state = state + 1
        send(sender, {:ok, new_state})
        loop(new_state)
      {:get, sender} ->
        send(sender, {:value, state})
        loop(state)
    end
  end
end

pid = Counter.start(0)
send(pid, {:inc, self()})
send(pid, {:inc, self()})
send(pid, {:get, self()})

receive do {:ok, n}    -> IO.puts("inc → #{n}") end
receive do {:ok, n}    -> IO.puts("inc → #{n}") end
receive do {:value, n} -> IO.puts("get → #{n}") end
```

state는 *루프 인자*입니다. 가변 변수가 아닙니다. 새 상태를 만들고 다음 호출에 넘기는 *함수형 스타일*입니다. 이렇게 하면 actor 내부에도 공유 가변 상태가 없습니다.

### 4.6 selective receive

mailbox에는 여러 메시지가 쌓일 수 있습니다. `receive`는 *맨 앞의 메시지부터* 시도하면서 패턴에 맞는 첫 번째를 꺼냅니다. 맞지 않는 메시지는 mailbox에 그대로 남습니다. 이를 *selective receive*라고 부릅니다.

우편함 비유로 보면, 우편함 주인이 안을 들여다보고 *원하는 모양의 편지만* 꺼내는 것과 같습니다. 청구서가 보고 싶으면 청구서만, 광고지는 우편함 안에 그대로 두고 다음에 꺼냅니다. 편리하지만 *영영 꺼내지 않는 편지*가 쌓이면 우편함이 폭발합니다.

```elixir
receive do
  {:priority, msg} -> handle_priority(msg)
end

receive do
  {:normal, msg} -> handle_normal(msg)
end
```

위 두 블록은 *순서대로 실행*됩니다. 두 번째 receive가 시작될 때, mailbox에 priority 메시지가 남아 있으면 무시되고 normal부터 찾습니다. 이 의미론은 강력하지만 함정도 있습니다. 매치되지 않는 메시지가 *영원히* 쌓이면 mailbox가 자랍니다. 책은 unmatched 메시지를 처리하는 catch-all 절을 두는 습관을 권합니다.

### 4.7 메시지 패싱 의미론

Erlang의 메시지 패싱은 네 가지 보장을 합니다. *네 번째*가 fault tolerance의 진짜 핵심입니다. 메시지가 *복사*되기 때문에 actor 하나가 망가져도 다른 actor가 가진 데이터는 멀쩡합니다. 우체국에서 편지를 보내면 *원본은 내 손에 남고 사본이 상대방에게 가는* 것과 같습니다. 상대 사서함이 통째로 불타도 내 원본은 그대로입니다.

1. **비동기** — `send`는 즉시 반환합니다
2. **신뢰성** — 같은 노드 안에서는 메시지 손실이 없습니다
3. **부분 순서** — 같은 sender → 같은 receiver의 메시지 순서는 보존됩니다
4. **격리** — 메시지는 *복사*됩니다. 양쪽 actor는 같은 메모리를 보지 않습니다

세 번째가 미묘합니다. 서로 다른 두 sender가 같은 receiver에게 보낸 메시지의 *상대 순서*는 보장되지 않습니다. 분산 시스템에서는 *어떤 순서*도 기대해서는 안 됩니다.

## Day 2 — Error Handling and Resilience

### 4.8 Let It Crash 철학

전통적 시스템은 모든 에러를 잡으려 합니다. try-catch가 곳곳에 박힙니다. Erlang은 반대로 갑니다. 에러가 났으면 *해당 프로세스만* 죽이고 새로 시작합니다.

가게 비유로 다시 봅니다. 직원이 손님 주문을 잘못 받았다고 합시다. 일반적인 시스템은 그 직원을 *어떻게든 고쳐 쓰려고* 매뉴얼을 다시 외우게 하고 사과 편지를 쓰게 합니다. Erlang의 입장은 다릅니다. *"그냥 새로 고용하라."* 직원을 보내고 새 사람을 그 자리에 앉힙니다. 새 사람은 깨끗한 상태로 일을 시작합니다. 가게는 단 몇 초도 멈추지 않습니다.

이게 바보 같아 보일 수 있지만, 정확히 *분산 시스템에서 통하는* 전략입니다. 망가진 상태를 디버깅하려고 매달리는 것보다, 망가진 actor를 버리고 깨끗한 actor를 띄우는 게 훨씬 빠르고 안전합니다.

```elixir
defmodule Worker do
  def loop do
    receive do
      :work ->
        do_dangerous_thing!()
        loop()
    end
  end
end
```

`do_dangerous_thing!`이 예외를 던지면 Worker는 종료됩니다. 다른 actor는 영향받지 않습니다. 누가 새 Worker를 시작할까요? Supervisor입니다.

방어적 코딩의 *반대*입니다. 비즈니스 로직은 *행복 경로*만 다루고, 실패 처리는 *상위 수준*에 위임합니다. 코드가 짧아지고, 진짜 버그가 숨지 않습니다.

### 4.9 link와 monitor

두 actor를 *생사 동행*시키는 것이 `Process.link/1`입니다. 한쪽이 죽으면 다른 쪽도 죽습니다 (또는 종료 신호를 받습니다).

다시 우체국 비유로. **link**는 *부부*입니다. 한쪽이 사라지면 다른 쪽도 함께 떠납니다. **monitor**는 *친구*입니다. 친구가 떠났다는 *소식*만 받지, 본인이 따라 떠나지는 않습니다. link는 강한 결합, monitor는 약한 관찰입니다.

```elixir
parent = self()
child = spawn_link(fn ->
  receive do
    :crash -> exit(:boom)
  end
end)

send(child, :crash)
# parent도 :boom 이유로 종료됨
```

`spawn_link`는 spawn + link를 한 번에 합니다. link는 *대칭*입니다. 양방향으로 연결됩니다.

`Process.monitor/1`은 비대칭입니다. 감시하는 쪽만 알립니다. 죽었다는 메시지를 mailbox로 받지만, 본인이 같이 죽지는 않습니다.

```elixir
ref = Process.monitor(child)
receive do
  {:DOWN, ^ref, :process, _pid, reason} ->
    IO.puts("child died: #{inspect reason}")
end
```

| 비교 | link | monitor |
|------|------|---------|
| 대칭성 | 양방향 | 단방향 |
| 사건 알림 | 종료 신호 (trap_exit로 메시지화) | `:DOWN` 메시지 |
| 자기 종료 여부 | 기본은 함께 종료 | 종료 안 함 |
| 주 용도 | supervisor ↔ child | 임시 관찰, 일회성 작업 |

![link (양방향) vs monitor (단방향)](/images/blog/seven-concurrency-models/diagrams/ch04-link-vs-monitor.svg)

Supervisor는 link 기반입니다. 자식이 죽으면 supervisor가 알게 되고, 재시작 정책을 적용합니다.

### 4.10 Supervisor — 프로세스 트리

Supervisor는 *자식 actor들을 감독하는 actor*입니다. OTP의 핵심 구성요소입니다.

이름이 거창하지만 역할은 단순합니다. **가게 매니저**입니다. 매니저는 직접 손님을 받지 않습니다. 직원들이 일하는 동안 *지켜보다가*, 누가 그만두면 그 자리에 새 사람을 채용합니다. 매니저 위에 *지점장*이 있고, 지점장 위에 *본부장*이 있습니다. 이렇게 트리가 만들어집니다. 아래쪽에서 작은 사고가 나면 매니저 선에서 처리되고, 매니저 전체가 흔들리면 지점장이 매니저를 새로 세웁니다.

아래 코드는 매니저 한 명에게 *세 명의 직원*(Cache, DBConnection, Worker)을 맡기는 그림입니다.

```elixir
defmodule MyApp.Supervisor do
  use Supervisor

  def start_link(_opts) do
    Supervisor.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  def init(:ok) do
    children = [
      {Cache, []},
      {DBConnection, [url: "..."]},
      {Worker, [id: 1]}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end
```

각 child는 *child spec*으로 기술됩니다. 모듈, 시작 인자, 재시작 정책(`:permanent`, `:transient`, `:temporary`), 종료 타임아웃 등을 담습니다. 대부분의 경우 모듈 이름만 주면 GenServer가 합리적 기본값을 채워줍니다.

### 4.11 재시작 전략

자식이 죽었을 때 supervisor가 *얼마나 멀리* 손을 댈지 결정하는 것이 전략입니다.

가게 비유로 풀어 봅니다. 주방에 *재료 손질 → 조리 → 플레이팅* 세 직원이 있다고 합시다. 조리 담당이 갑자기 그만뒀습니다.

- `:one_for_one` — 조리 담당만 새로 고용. 손질·플레이팅은 그대로.
- `:one_for_all` — 셋 다 새로 고용. 손발이 안 맞을까 봐 팀을 통째로 교체.
- `:rest_for_one` — 조리·플레이팅을 새로 고용. 손질은 이미 끝난 일이라 유지.

어떤 전략을 고르냐는 *상태가 얼마나 얽혀 있는지*에 달렸습니다.

| 전략 | 동작 | 적합한 경우 |
|------|------|------------|
| `:one_for_one` | 죽은 child만 재시작 | child가 서로 독립적일 때 |
| `:one_for_all` | child 하나가 죽으면 *모두* 재시작 | child가 강하게 결합되어 일관성이 필요할 때 |
| `:rest_for_one` | 죽은 child + 그 뒤에 선언된 child 재시작 | 시작 순서에 의존성이 있을 때 |

Supervisor 아래 Worker A, B, C가 *이 순서로* 선언되어 있고 B가 죽었다고 합시다.

- `:one_for_one` — B만 재시작
- `:one_for_all` — A, B, C 모두 재시작
- `:rest_for_one` — B, C 재시작 (A는 그대로)

![supervisor 재시작 전략 3가지](/images/blog/seven-concurrency-models/diagrams/ch04-supervisor-strategies.svg)

여기에 *max_restarts*와 *max_seconds* 한도가 붙습니다. 짧은 시간 안에 너무 자주 재시작되면 supervisor 자신도 종료합니다. 그러면 *그 위의* supervisor가 트리 전체를 손봅니다. 장애를 위로 *전염*시키는 게 의도입니다.

장애 격리와 자동 복구의 결합이 BEAM 시스템의 극단적 가용성을 만들어냅니다. 책은 이를 "supervisor tree가 시스템의 *척추*"라고 표현합니다.

### 4.12 GenServer — 표준 서버 패턴

매번 손으로 receive 루프를 짜면 보일러플레이트가 쌓입니다. OTP의 `GenServer`는 그 뼈대를 제공합니다. Day 2의 마지막에 책이 가볍게 소개합니다.

```elixir
defmodule Counter do
  use GenServer

  # 클라이언트 API
  def start_link(initial), do: GenServer.start_link(__MODULE__, initial, name: __MODULE__)
  def increment, do: GenServer.call(__MODULE__, :inc)
  def get,       do: GenServer.call(__MODULE__, :get)

  # 서버 콜백
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

`GenServer.call`은 동기, `GenServer.cast`는 비동기입니다. 콜백은 `handle_call`, `handle_cast`, `handle_info`로 갈립니다. `handle_info`는 GenServer 외부에서 그냥 `send`로 도착한 메시지를 받습니다. Supervisor child spec과 자연스럽게 맞물려서, 손으로 receive 루프를 쓰는 일은 운영 코드에서는 거의 없습니다.

## Day 3 — Distributed

### 4.13 노드와 분산 — 위치 투명성

Erlang 분산의 출발점은 *노드*입니다. 노드는 이름을 가진 BEAM 인스턴스입니다.

분산이라고 하면 갑자기 어려워지는 느낌이지만, 우체국 비유로는 자연스럽습니다. 한 도시 안에 있는 우체국들끼리 *우편물을 교환*하는 것과 같습니다. 같은 우체국 안의 사서함끼리 편지를 주고받든, 옆 도시 우체국으로 편지를 보내든, *쓰는 사람의 코드는 똑같습니다.* 주소만 다를 뿐입니다.

```bash
# 셸 두 개를 띄워서 각각 실행
iex --sname one --cookie secret
iex --sname two --cookie secret
```

`--sname`은 short name으로 노드를 띄웁니다. `--cookie`는 같은 클러스터에 속한다는 약한 인증입니다. 두 노드를 연결합니다.

```elixir
# 노드 one에서
Node.connect(:"two@hostname")
Node.list()  # => [:"two@hostname"]
```

연결되면 위치는 *세부 사항*이 됩니다. 같은 노드의 pid를 부르듯 원격 pid에도 메시지를 보냅니다.

```elixir
# 로컬
pid = spawn(fn -> Talker.loop() end)
send(pid, {:greet, "Huey"})

# 원격 — 같은 API
pid = Node.spawn(:"two@hostname", fn -> Talker.loop() end)
send(pid, {:greet, "Huey"})
```

이 *location transparency*가 Erlang 분산의 매력입니다. 코드는 노드 경계를 모릅니다.

![Node.connect로 묶인 클러스터 토폴로지](/images/blog/seven-concurrency-models/diagrams/ch04-distributed-nodes.svg)

### 4.14 글로벌 이름 — :global

pid는 노드를 재시작하면 바뀝니다. 이름으로 부르고 싶을 때 `:global` 레지스트리를 씁니다.

```elixir
:global.register_name(:cache_server, self())

# 다른 노드에서
pid = :global.whereis_name(:cache_server)
send(pid, {:lookup, "key"})
```

`:global`은 클러스터 전체에서 이름을 공유합니다. 내부에서는 노드 간 동기화를 처리합니다.

### 4.15 분산 key-value 저장소

책 Day 3의 메인 예제는 분산 key-value store입니다. 여러 노드에 데이터를 복제해 한 노드가 죽어도 데이터를 살립니다. 핵심 흐름만 옮기면 다음과 같습니다.

```elixir
defmodule KVStore do
  use GenServer

  def start_link, do: GenServer.start_link(__MODULE__, %{}, name: {:global, __MODULE__})

  def put(key, value), do: GenServer.cast({:global, __MODULE__}, {:put, key, value})
  def get(key),        do: GenServer.call({:global, __MODULE__}, {:get, key})

  def init(state), do: {:ok, state}

  def handle_cast({:put, key, value}, state) do
    # 다른 노드에 복제
    Enum.each(Node.list(), fn node ->
      send({__MODULE__, node}, {:replicate, key, value})
    end)
    {:noreply, Map.put(state, key, value)}
  end

  def handle_call({:get, key}, _from, state) do
    {:reply, Map.get(state, key), state}
  end

  def handle_info({:replicate, key, value}, state) do
    {:noreply, Map.put(state, key, value)}
  end
end
```

이 코드는 *eventually consistent*입니다. put이 모든 복제본에 닿기 전에 get이 오면 옛 값을 볼 수 있습니다.

### 4.16 Partial Failure — 네트워크 분할

분산 시스템의 본질적 어려움은 *부분 실패*입니다. 노드가 죽었는지, 네트워크가 느려진 건지, 응답이 곧 올지를 구분할 수 없습니다.

다시 우체국 비유로. 옆 도시 우체국에 편지를 보냈는데 답장이 오지 않습니다. 그 우체국이 *불에 탄 것*인지, *우편 트럭이 막힌 것*인지, *답장이 곧 도착할 것*인지를 *내가 있는 자리에서는 알 수 없습니다.* 분산 시스템의 모든 어려움이 이 한 문장에서 출발합니다. Erlang은 *이 사실을 숨기지 않습니다.* `:nodedown` 같은 신호로 *모른다는 사실을 알려*주고, 그다음 정책은 애플리케이션에 맡깁니다.

Erlang은 노드 간 연결이 끊기면 `:nodedown` 이벤트를 알립니다. `Node.monitor/2`로 구독합니다.

```elixir
:net_kernel.monitor_nodes(true)
receive do
  {:nodedown, node} -> IO.puts("lost #{node}")
  {:nodeup,   node} -> IO.puts("joined #{node}")
end
```

네트워크가 분할되어 두 그룹이 *각자* 동작하는 split-brain 상황도 가능합니다. 양쪽에서 같은 키에 다른 값을 쓰면, 재결합 시 충돌이 납니다. Erlang은 이를 *직접 해결하지 않습니다*. 정책은 애플리케이션의 몫입니다.

### 4.17 AP 시스템 — CP가 아님

CAP 정리에서 Erlang은 명백히 **AP**(가용성 + 분할 내성)를 선택합니다. 강한 일관성(C)을 보장하려고 합의 프로토콜을 내장하지 않습니다. *항상 응답하지만, 그 응답이 최신이 아닐 수 있다*는 입장입니다.

| 측면 | Erlang의 선택 |
|------|---------------|
| 가용성 | 우선 |
| 분할 내성 | 우선 |
| 강한 일관성 | 애플리케이션이 결정 |
| 합의 알고리즘 | 내장 안 함 (Raft/Paxos는 라이브러리로 추가) |

이 입장이 *부적합한* 도메인도 있습니다. 금융 원장, 분산 잠금처럼 절대적 일관성이 필요한 곳에서는 별도의 합의 계층을 올려야 합니다.

## Wrap-Up

### 4.17a 왜 Actor가 fault tolerance에 강한가 — 정리

여기까지 오면 Actor가 *왜* 장애에 강한지 분명해집니다. 세 가지 이유가 겹칩니다.

1. **격리.** 메모리를 공유하지 않으니 한 actor가 망가져도 다른 actor의 데이터는 *물리적으로* 안전합니다. C++의 segfault 같은 사고가 옆 actor를 끌고 들어갈 수 없습니다.
2. **메시지 복사.** actor 간 데이터가 *사본*으로 전달됩니다. 받은 쪽이 망가뜨려도 보낸 쪽의 원본은 그대로입니다.
3. **Supervisor.** 망가진 actor를 *자동으로 다시 띄우는* 매니저가 언어 레벨에 내장되어 있습니다. 재시작 코드를 *애플리케이션이 짤 필요가 없습니다.*

스레드와 락 모델에서는 이 세 가지가 모두 *애플리케이션 개발자의 책임*입니다. 그러니 같은 안정성을 내려면 코드가 훨씬 두꺼워지고, 그만큼 버그도 늘어납니다. Erlang은 *언어가 fault tolerance를 떠맡겠다*고 선언한 거의 유일한 주류 런타임입니다.

### 4.18 강점

Actor 모델이 잘 풀어주는 것들입니다.

- **격리** — 한 actor의 실패가 다른 actor를 망가뜨리지 않습니다
- **fault tolerance** — supervisor가 실패를 흡수합니다. 9의 개수가 늘어납니다
- **location transparency** — 같은 코드가 로컬과 분산에서 동작합니다
- **hot upgrade** — BEAM은 무중단 코드 교체를 지원합니다. 통신 교환기를 24/7 돌리려고 만든 기능입니다
- **massive concurrency** — 100만 프로세스가 평범한 규모입니다
- **단순한 모델** — 락이 없습니다. 메시지만 있습니다

### 4.19 약점

같은 모델이 어려워지는 지점입니다.

- **공유 상태 없음** — 큰 데이터를 actor 사이에 공유해야 할 때 복사 비용이 큽니다 (ETS가 탈출구)
- **debug 난이도** — 메시지 흐름이 시간·공간에 흩어져 추적이 어렵습니다
- **메시지 순서 보장의 한계** — 서로 다른 sender 사이는 순서가 없습니다
- **mailbox overflow** — 생산자가 소비자보다 빠르면 큐가 자랍니다. backpressure가 자동이 아닙니다
- **deadlock의 새로운 얼굴** — 두 actor가 서로 동기 call을 하면 멈춥니다
- **분산의 비용** — 위치 투명성에도 직렬화·네트워크·partial failure는 남습니다

mailbox overflow는 우체국 비유로 보면 *우편함이 가득 차서 새 편지를 못 받는* 상황입니다. 사서함 주인이 일을 너무 천천히 처리하면 편지가 계속 쌓이고, 결국 우체국 전체가 그 사서함 때문에 메모리를 잃습니다. backpressure (생산자 속도 조절)를 *직접 설계*해야 한다는 뜻입니다.

### 4.19a 실제로 누가 쓰는가

이 모델이 *대규모 실전*에서 얼마나 통하는지, 잘 알려진 사례 몇 가지를 봅니다.

- **WhatsApp** — Erlang 위에서 *9명의 엔지니어가 1억 명 동시 접속*을 처리한 일화는 거의 전설이 되었습니다. 한 노드 안에서 수백만 actor를 띄우고, 각 actor가 한 사용자의 세션을 들고 있는 구조입니다. 2014년 Facebook이 190억 달러에 인수했습니다.
- **Discord** — Elixir/Phoenix로 게이트웨이와 채팅 인프라를 운영합니다. 천만 명이 같은 채널에 들어오는 상황을 Elixir의 actor + Rust의 NIF 조합으로 풀었습니다.
- **RabbitMQ** — Erlang으로 작성된 메시지 브로커. 메시지 브로커 자체가 actor 모델과 자연스럽게 맞물립니다. queue 하나하나가 Erlang process입니다.
- **Pinterest 알림 시스템** — 매일 수십억 건의 푸시 알림을 Elixir로 처리합니다.
- **Klarna, Bleacher Report, Heroku의 라우팅 레이어** — 모두 Erlang/Elixir 기반입니다.
- **CockroachDB의 Actor-like 패턴** — Go로 작성되었지만, range replica마다 *Raft 리더*가 actor처럼 메시지를 처리합니다. Erlang은 아니지만 *모델*은 유사합니다.

공통점은 *접속이 많고, 한 접속이 작은 상태를 들고 있고, 일부 접속이 끊겨도 전체가 멀쩡해야 하는* 도메인입니다. 정확히 Actor 모델이 잘 풀어주는 모양입니다.

### 4.20 Day별 요약

| Day | 주제 | 핵심 프리미티브 | 결과물 |
|-----|------|----------------|--------|
| Day 1 | Messages and Mailboxes | `spawn`, `send`, `receive`, `self()` | talker, echo, counter actor |
| Day 2 | Error Handling and Resilience | `link`, `monitor`, `Supervisor`, `GenServer` | 자동 재시작되는 worker pool |
| Day 3 | Distributed | `Node.connect`, `:global`, `Node.spawn` | 노드 간 복제 KV store |

### 4.21 다음 chapter와의 다리 — CSP

Chapter 5는 CSP(Communicating Sequential Processes)를 다룹니다. Actor와 비슷하지만 결정적 차이가 있습니다.

| 항목 | Actor | CSP |
|------|-------|-----|
| 통신 매개 | mailbox (수신자 소유) | channel (독립 객체) |
| 주소 지정 | pid (named receiver) | channel (anonymous) |
| 송신 | 비동기 send | 동기 send (기본) |
| 결합도 | sender가 receiver를 앎 | channel만 공유, sender·receiver 서로 모름 |
| 대표 언어 | Erlang / Elixir | Go (goroutine + channel) |

Actor가 *수신자에게* 메시지를 보낸다면, CSP는 *채널에* 메시지를 흘립니다. 같은 메시지 패싱 가족이지만 결합도가 다릅니다. 둘 다 공유 메모리 동시성의 대안으로 강력합니다.

## 정리

- **Actor** = 격리된 상태 + 메시지 + 순차 처리
- **Day 1** — `spawn`, `send`, `receive`. selective receive, request-reply
- **Day 2** — let it crash, link/monitor, supervisor, one_for_one / one_for_all / rest_for_one, GenServer
- **Day 3** — 노드, location transparency, `:global`, 분산 KV, partial failure, AP 시스템
- **강점** — 격리, fault tolerance, hot upgrade, massive concurrency
- **약점** — debug, mailbox overflow, 일관성 보장은 직접

## 한국 개발자의 함정

다음은 한국 커뮤니티에서 자주 보이는 오해입니다.

1. ***Erlang = 통신사 전용*이라는 편견** — WhatsApp, Discord, Pinterest 알림이 모두 Erlang/Elixir 위에 섰습니다. 실시간 서비스 전반에 적합합니다
2. ***Actor = 무거운 OS thread*라는 오해** — Erlang 프로세스는 OS 프로세스가 아닙니다. 수백만 개가 가능한 *경량* 구조입니다
3. ***let it crash = 에러 무시*라는 오해** — 정확히는 *국소화된 실패 + 자동 복구*입니다. 시스템 차원의 안정성이 목표입니다
4. ***Actor는 항상 분산에 좋다*는 가정** — 직렬화 비용, 메시지 순서, partial failure가 따라옵니다. 위치 투명성도 *공짜가 아닙니다*
5. ***Elixir는 함수형이라 어렵다*는 인상** — 패턴 매칭과 파이프(`|>`)만 익히면 Ruby와 비슷한 가독성을 가집니다

## 자기 점검

- [ ] Actor의 세 가지 본질 속성은 무엇인가요?
- [ ] Erlang process가 OS thread보다 가벼운 이유는 무엇인가요?
- [ ] selective receive란 무엇이고, 어떤 함정이 있나요?
- [ ] link와 monitor의 차이는 무엇인가요?
- [ ] one_for_one과 rest_for_one은 언제 다른 결과를 만드나요?
- [ ] location transparency가 *해결하지 못하는* 분산 문제는 무엇인가요?
- [ ] Erlang이 CAP에서 AP를 택한 이유와 그 한계는 무엇인가요?
- [ ] Actor와 CSP는 어떻게 다른가요?

## 다음 장 예고

Chapter 5는 **CSP**를 다룹니다. Actor와 같은 가족이지만 채널이 중심입니다. Go의 goroutine과 channel이 가장 익숙한 구현입니다. Actor에서 익힌 메시지 패싱 직관을 가지고 가면 됩니다.

## 관련 항목

- [Ch 3: The Clojure Way](/blog/parallel/seven-concurrency-models/ch03-the-clojure-way) — STM이라는 또 다른 공유 상태 대안
- [Ch 5: CSP](/blog/parallel/seven-concurrency-models/ch05-csp) — 채널 기반 메시지 패싱
- [AMP Ch 1: Introduction](/blog/parallel/parallel-principles/ch01-introduction)
- [DDIA Ch 8: The Trouble with Distributed Systems](/blog/parallel/designing-data-intensive-applications/chapter01-reliable-scalable-maintainable) — partial failure의 일반론
