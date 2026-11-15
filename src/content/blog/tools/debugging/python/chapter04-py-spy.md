---
title: "py-spy 운영 분석 — 코드 수정 없이 프로세스 검사"
slug: "tools/debugging/python/chapter04-py-spy"
date: 2026-05-30T09:04:00
description: "py-spy로 콜스택 dump, 샘플링 프로파일링, flamegraph, 외부 attach."
tags: [python, debugging, py-spy, profiling]
series: "Python Debugging"
seriesOrder: 4
draft: false
topics: ["tools", "tools/debugging"]
---

`pdb`/`debugpy`는 *프로세스 안*에서 동작합니다. 운영 서비스에 디버그 코드를 넣을 수 없을 때, 또는 *이미 멈춘 듯한* 프로세스를 진단할 때 [py-spy](https://github.com/benfred/py-spy)가 답입니다. Rust로 작성된 외부 도구로, 대상 프로세스의 메모리를 *읽기 전용*으로 들여다보며 콜스택을 재구성합니다. 대상 코드에 계측을 추가하지 않고 샘플을 수집합니다. 오버헤드가 0이라는 뜻은 아니며 이 글에서는 실제 py-spy 실행·성능을 측정하지 않았습니다.

## 설치

```bash
$ pip install py-spy
# 또는
$ cargo install py-spy
```

Linux는 `ptrace` 권한, macOS는 `taskinfo for pid` 권한이 필요합니다.

```bash
# Linux의 현재 attach 정책 확인
$ sysctl kernel.yama.ptrace_scope
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

샘플 분포는 조사할 함수를 고르는 단서입니다. 원인이 밝혀지는 시간을 보장하거나 이 표를 특정 서비스의 실측값으로 해석하지 않습니다.

### record — Flamegraph

```bash
$ py-spy record -o profile.svg --pid 12345 --duration 30
$ open profile.svg
```

30초간 샘플링 후 [flamegraph](https://www.brendangregg.com/flamegraphs.html) SVG. 박스 폭은 수집된 샘플의 비중이며 가로 위치가 시간 순서를 뜻하지는 않습니다. 부모 프레임의 폭에는 자식 호출의 샘플도 포함됩니다. 다른 표현 형식도 지원.

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

기본 스택 수집이 대상을 전혀 멈추지 않는다는 가정은 틀립니다. upstream은 샘플링 중 정지를 피하는 --nonblocking 옵션을 별도로 설명하며, 그 경우 메모리를 일관된 한 시점에 읽지 못해 일부 샘플이 불완전할 수 있습니다. [upstream 설명](https://github.com/benfred/py-spy#how-can-i-avoid-pausing-the-python-program)을 확인합니다.

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

스레드의 Python 프레임 수집과 대기 중인 모든 asyncio 태스크의 논리적 awaiter 체인 수집을 구분합니다. Python 3.11 이상이라는 조건만으로 후자를 보장하지 않습니다. 다만 *await로 잠시 떠난* 코루틴은 콜스택에 안 잡힙니다 (실행 중인 것만). 그래서 "idle" 스레드도 무엇을 *기다리는지* 보려면 GIL holder만 봐서는 부족하고 `dump`로 *전체* 스레드를 봐야 합니다.

## --idle / --gil

```bash
$ py-spy top --pid 12345 --idle      # idle 스레드도 표시
$ py-spy top --pid 12345 --gil       # GIL을 잡은 스레드만
```

--gil은 전통적인 GIL 기반 CPython에서 GIL을 보유한 스레드로 샘플을 제한하는 필터입니다. GIL을 해제한 네이티브 코드의 CPU 사용이나 free-threaded Python 전체를 대표하지 않습니다.

## C 확장 같이 보기

```bash
$ py-spy record -o profile.svg --pid 12345 --native
```

--native는 지원되는 OS·아키텍처에서 네이티브 스택을 요청합니다. upstream의 지원 표와 설치한 버전을 확인해야 하며 macOS에서 dsymutil만 실행하면 지원된다고 설명하지 않습니다. [네이티브 지원 범위](https://github.com/benfred/py-spy#can-py-spy-profile-native-extensions)를 참고합니다.

## 권한 문제

Linux에서 가장 자주 만남.

```text
Error: Failed to find python process
```

원인.

1. `kernel.yama.ptrace_scope` — 같은 사용자라도 attach 제한.
   ```bash
   $ sysctl kernel.yama.ptrace_scope  # 현재 정책을 읽고 허용된 실행 방식 선택
   ```
2. 컨테이너 — `--cap-add SYS_PTRACE` 필요.
   ```bash
   $ docker run --cap-add SYS_PTRACE ...
   ```
3. 다른 사용자 — `sudo py-spy`.

macOS에서는 별도 설치 Python이라고 해서 attach 권한이 자동으로 확보되지 않습니다. 대상과 권한 조건을 확인합니다. 이 글의 macOS 환경에서 py-spy attach를 성공시킨 기록은 없습니다.

## attach vs spawn

```bash
$ py-spy record -o p.svg -- python my_script.py    # spawn — 시작부터 추적
$ py-spy record -o p.svg --pid 12345               # attach — 이미 도는 프로세스
```

`--` 뒤는 그냥 명령. CI에서 짧은 스크립트의 전체 프로파일을 잡을 때 spawn이 편합니다.

## 재현 입력 준비 — 프로파일러와 프로그램 결과 분리

다음 파일은 CPython 3.15.0·macOS에서 결과만 확인한 CPU 작업입니다. py-spy를 실행하지 않은 기본 결과와 프로파일링한 결과를 비교하기 위한 입력이며, 샘플러 검증을 대신하지 않습니다.

```python title="workload.py"
import argparse

def checksum(rounds):
    total = 0
    for _ in range(rounds):
        total += sum(n * n for n in range(10000))
    return total

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--rounds", type=int, default=20)
    args = parser.parse_args()
    print(f"checksum={checksum(args.rounds)}")
```

`python3 workload.py --rounds 2`는 checksum=666566670000을 출력합니다. py-spy가 설치되고 대상 인터프리터와 권한이 지원되는 환경에서는 다음 명령으로 프로파일을 생성합니다.

```bash
py-spy --version
py-spy record -o profile.svg -- python3 workload.py --rounds 2000
```

실행 후 프로파일 파일의 생성, 정상 종료 상태, 동일 rounds의 기본 실행과 checksum 일치를 각각 확인합니다. 이 글의 수정 과정에서는 py-spy 바이너리·attach·SVG 수집을 실행하지 않았으므로 프로파일 생성 성공이나 오버헤드를 관측 결과로 적지 않습니다.

## 비교 — cProfile vs py-spy

| | cProfile | py-spy |
|---|----------|--------|
| 작동 방식 | 함수 호출에 훅(deterministic) | 외부에서 샘플링 |
| 비용 비교 | 호출 훅 비용을 해당 프로그램에서 측정 | 샘플링 빈도와 수집 조건별로 측정 |
| 코드 수정 | python -m cProfile로 수정 없이 실행 가능 | 대상 코드의 계측 추가 없이 수집 |
| 운영 환경 | X | O |
| C 확장 | 부분 | `--native`로 보임 |
| asyncio | 동기 함수 프로파일과 태스크 대기 해석 구분 | 실행 중 프레임과 대기 태스크 구분 |

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

장기 슬로우 다운 분석에 유용. 특정 상용 제품이 같은 구현을 사용한다고 확인한 근거는 이 글에 포함하지 않습니다.

## 정리

- py-spy는 외부 샘플러입니다. 대상의 일시 정지 여부는 수집 옵션과 구분합니다.
- `dump`(한 번) / `top`(실시간) / `record`(flamegraph) 셋이 메뉴 전부.
- subprocess·asyncio·C 확장(`--native`)까지 합성.
- 권한이 자주 막힘 — `ptrace_scope`, `SYS_PTRACE` cap.
- 운영 환경의 첫 번째 디버깅 도구.

## 다음 장 예고

Ch 5(시리즈 마지막) — `faulthandler`, `tracemalloc`, `objgraph`. 세그폴트와 메모리 누수의 진단법.

## 관련 항목

- [Ch 3: asyncio 디버깅](/blog/tools/debugging/python/chapter03-asyncio)
- [Ch 5: faulthandler / tracemalloc / objgraph](/blog/tools/debugging/python/chapter05-faulthandler-tracemalloc)
- [CMake 타겟과 라이브러리](/blog/tools/build/cmake/chapter03-targets) — 심볼을 포함한 검사 대상 빌드 설정의 출발점
- [py-spy GitHub](https://github.com/benfred/py-spy)
- [Brendan Gregg — Flamegraphs](https://www.brendangregg.com/flamegraphs.html)
