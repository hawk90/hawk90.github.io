---
title: "Ch 4: py-spy — 운영 프로세스를 코드 수정 없이 검사"
date: 2025-08-21T04:00:00
description: "py-spy로 콜스택 dump, 샘플링 프로파일링, flamegraph, 외부 attach."
tags: [python, debugging, py-spy, profiling]
series: "Python Debugging"
seriesOrder: 4
draft: false
---

`pdb`/`debugpy`는 *프로세스 안*에서 동작합니다. 운영 서비스에 디버그 코드를 넣을 수 없을 때, 또는 *이미 멈춘 듯한* 프로세스를 진단할 때 [py-spy](https://github.com/benfred/py-spy)가 답입니다. Rust로 작성된 외부 도구로, 대상 프로세스의 메모리를 *읽기 전용*으로 들여다보며 콜스택을 재구성합니다. 측정 오버헤드가 거의 0이고 코드 수정도 필요 없습니다.

## 설치

```bash
$ pip install py-spy
# 또는
$ cargo install py-spy
```

Linux는 `ptrace` 권한, macOS는 `taskinfo for pid` 권한이 필요합니다.

```bash
# Linux — root 없이 attach
$ sudo sysctl -w kernel.yama.ptrace_scope=0
```

## 세 가지 모드

```bash
$ py-spy --help
top      현재 어떤 함수가 CPU 쓰는지 실시간
record   샘플링 후 flamegraph 출력
dump     현재 콜스택만 한 번 덤프
```

### top — 실시간

```bash
$ py-spy top --pid 12345
```

`htop` 같은 화면이 1초마다 갱신.

```text
GIL: 28.00%, Active: 100.00%, Threads: 8

%Own   %Total  OwnTime  TotalTime  Function (filename:line)
27.50% 45.00%   3.50s    5.80s     parse_json (app.py:42)
12.00% 12.00%   1.50s    1.50s     <listcomp> (app.py:78)
 8.50% 11.00%   1.10s    1.40s     hash_record (utils.py:23)
```

운영 서비스가 *왜 느린지*를 30초 안에 답합니다. `pdb` 진입 없이.

### record — Flamegraph

```bash
$ py-spy record -o profile.svg --pid 12345 --duration 30
$ open profile.svg
```

30초간 샘플링 후 [flamegraph](https://www.brendangregg.com/flamegraphs.html) SVG. 가로축이 CPU 시간, 세로축이 콜스택 깊이. *가장 넓은 박스가 가장 비싼 함수*. 다른 표현 형식도 지원.

```bash
$ py-spy record -o profile.json -f speedscope ...   # Speedscope.app
$ py-spy record -o profile.raw -f raw ...           # 원본 샘플
```

### dump — 한 번의 콜스택

```bash
$ py-spy dump --pid 12345
Process 12345: gunicorn worker [worker]
Python v3.11.0

Thread 12345 (active)
  hash_record (utils.py:23)
  process_batch (app.py:108)
  worker_loop (app.py:55)
  main (app.py:170)

Thread 12346 (idle)
  poll (selectors.py:469)
  _run_once (events.py:1869)
  ...
```

`gdb`의 `bt`와 비슷하지만 *프로세스를 멈추지 않고* 가져옵니다. hung 프로세스 진단에 가장 빠른 첫 명령.

## 실전 — hung server 진단

상황: gunicorn 서비스가 요청에 응답 안 함.

```bash
$ ps -ef | grep gunicorn
www-data 12345  ... worker 1
www-data 12346  ... worker 2

# 각 워커의 콜스택 즉시 확인
$ for pid in 12345 12346; do
    echo "=== PID $pid ==="
    sudo py-spy dump --pid $pid
done
```

대부분의 워커가 `database.execute (psycopg2/connection.py:...)`에 머물러 있으면 DB 락 의심. `acquire_lock`에서 대기 중이면 데드락 의심. `time.sleep` 안이면 의도된 백오프인지 검증.

## subprocess 추적

부모 + 자식까지 한 번에.

```bash
$ py-spy record -o profile.svg --pid 12345 --subprocesses
```

multiprocessing 워커 풀, gunicorn fork된 워커, Celery 워커 모두 합쳐 한 flamegraph로.

## ASGI / asyncio

py-spy는 `asyncio` 코루틴 콜스택도 재구성합니다 — Python 3.11+ 이면 거의 정확. 다만 *await로 잠시 떠난* 코루틴은 콜스택에 안 잡힙니다 (실행 중인 것만). 그래서 "idle" 스레드도 무엇을 *기다리는지* 보려면 GIL holder만 봐서는 부족하고 `dump`로 *전체* 스레드를 봐야 합니다.

## --idle / --gil

```bash
$ py-spy top --pid 12345 --idle      # idle 스레드도 표시
$ py-spy top --pid 12345 --gil       # GIL을 잡은 스레드만
```

Python의 한 시점에 *진짜 실행 중*인 스레드는 GIL을 잡은 1개. `--gil`로 보면 어디서 CPU가 쓰이는지 정확합니다.

## C 확장 같이 보기

```bash
$ py-spy record -o profile.svg --pid 12345 --native
```

`--native`로 C/C++/Rust 콜스택까지 합성. NumPy·Pandas·sqlite3 같은 확장의 안쪽도 보임. macOS는 `dsymutil`로 심볼이 제대로 있어야 보입니다.

## 권한 문제

Linux에서 가장 자주 만남.

```text
Error: Failed to find python process
```

원인.

1. `kernel.yama.ptrace_scope` — 같은 사용자라도 attach 제한.
   ```bash
   $ sudo sysctl -w kernel.yama.ptrace_scope=0  # 0 = 자유, 1 = 자식만, 3 = 차단
   ```
2. 컨테이너 — `--cap-add SYS_PTRACE` 필요.
   ```bash
   $ docker run --cap-add SYS_PTRACE ...
   ```
3. 다른 사용자 — `sudo py-spy`.

macOS는 SIP가 시스템 파이썬을 보호 — 별도 설치한 파이썬은 OK.

## attach vs spawn

```bash
$ py-spy record -o p.svg -- python my_script.py    # spawn — 시작부터 추적
$ py-spy record -o p.svg --pid 12345               # attach — 이미 도는 프로세스
```

`--` 뒤는 그냥 명령. CI에서 짧은 스크립트의 전체 프로파일을 잡을 때 spawn이 편합니다.

## 비교 — cProfile vs py-spy

| | cProfile | py-spy |
|---|----------|--------|
| 작동 방식 | 함수 호출에 훅(deterministic) | 외부에서 샘플링 |
| 오버헤드 | 20-100% | <1% |
| 코드 수정 | 필요 | 불필요 |
| 운영 환경 | X | O |
| C 확장 | 부분 | `--native`로 보임 |
| asyncio | 어색 | 자연스러움 |

cProfile은 *완전한* 호출 수, py-spy는 *통계적* 분포. 보통 운영은 py-spy, 개발 단위 테스트는 cProfile이 어울립니다.

## 모니터링 통합

CI/운영에서 *정기 dump*를 떨어뜨려 보관.

```bash
#!/usr/bin/env bash
# /etc/cron.hourly/py-spy-dump
for pid in $(pgrep -f gunicorn); do
    timestamp=$(date -Iseconds)
    sudo py-spy dump --pid $pid > /var/log/py-spy/$pid.$timestamp.txt
done
```

장기 슬로우 다운 분석에 유용. Datadog·Sentry의 Profiling 제품도 내부에서 py-spy 같은 샘플러를 씁니다.

## 정리

- py-spy = 외부 샘플러. 코드 수정 없이, 멈추지 않고 콜스택 추출.
- `dump`(한 번) / `top`(실시간) / `record`(flamegraph) 셋이 메뉴 전부.
- subprocess·asyncio·C 확장(`--native`)까지 합성.
- 권한이 자주 막힘 — `ptrace_scope`, `SYS_PTRACE` cap.
- 운영 환경의 첫 번째 디버깅 도구.

## 다음 장 예고

Ch 5(시리즈 마지막) — `faulthandler`, `tracemalloc`, `objgraph`. 세그폴트와 메모리 누수의 진단법.

## 관련 항목

- [Ch 3: asyncio 디버깅](/blog/tools/debugging/python-debug/chapter03-asyncio)
- [Ch 5: faulthandler / tracemalloc / objgraph](/blog/tools/debugging/python-debug/chapter05-faulthandler-tracemalloc)
- [perf + Flamegraph 시리즈](/blog/tools/perf-flamegraph/chapter01-overview)
- [py-spy GitHub](https://github.com/benfred/py-spy)
- [Brendan Gregg — Flamegraphs](https://www.brendangregg.com/flamegraphs.html)
