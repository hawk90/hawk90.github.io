---
title: "Pre-silicon 실패 triage — 재현·최소화·책임 영역 판정"
slug: "tools/emulation/driver-cosim/chapter15-failure-triage"
date: 2026-10-05T09:15:00
description: "랜덤 seed와 결정론, 최소 재현 케이스 만들기, RTL 버그와 테스트벤치·모델 버그를 가르는 판정, 회귀 bisect까지의 실패 처리 흐름."
series: "Driver-RTL Co-simulation"
seriesOrder: 15
tags: [triage, regression, bisect, reproducibility, pre-silicon]
draft: true
topics: ["tools", "tools/emulation"]
---

Ch 10~14에서는 버그 *하나*를 깊이 파는 방법을 다뤘습니다. 실제 프로젝트에서는 버그가 하나씩 오지 않습니다. 밤새 돈 회귀 테스트(regression, 코드가 바뀔 때마다 기존 테스트를 다시 돌려 망가진 곳이 없는지 확인하는 것)가 아침에 수십 건의 실패를 쏟아 냅니다. 그중 몇 개가 진짜 RTL 버그이고, 몇 개가 테스트벤치 실수이며, 몇 개가 서버 디스크가 꽉 찬 탓인지 모릅니다.

이 장은 그 실패 더미를 다루는 **triage**를 정리합니다. triage는 원래 응급실에서 환자를 증상의 심각도에 따라 분류해 치료 순서와 담당을 정하는 일을 가리키는 말입니다. pre-silicon 검증에서도 같은 일을 합니다. 실패를 분류하고, 다시 일으키고, 작게 줄이고, 어느 영역의 문제인지 판정해 담당자에게 넘깁니다.

## 실패가 쏟아지는 아침

야간 회귀에서 테스트 2,000개 중 47개가 실패했다고 합시다. 47개를 하나씩 waveform부터 열어 보면 일주일이 걸립니다. 게다가 그중 30개는 같은 원인일 가능성이 큽니다. 버그 하나가 여러 테스트를 동시에 깨뜨리는 일이 흔하기 때문입니다.

그래서 triage는 *깊이*보다 *넓이*부터 시작합니다. 응급실이 도착한 환자 모두를 바로 수술하지 않고 먼저 분류하는 것과 같습니다. 분류가 끝나면, 각 묶음에서 대표 하나만 깊이 파면 됩니다.

![triage 깔때기 — 야간 회귀의 실패 수십 건을 실패 시그니처로 버킷에 나누고, 버킷마다 대표 1건을 seed로 재현하고, 최소 재현 케이스로 줄인 뒤 RTL·테스트벤치·모델·인프라 중 책임 영역을 판정하는 흐름](/images/blog/driver-cosim/diagrams/ch15-triage-funnel.svg)

이 깔때기의 각 단계는 SW 엔지니어와 HW 엔지니어가 함께 맡을 수 있습니다. 실패 로그를 분류하고 재현 스크립트를 만드는 일은 SW 쪽 기술과 가깝고, 최소 재현 케이스의 waveform을 해석하는 일은 HW 쪽 기술과 가깝습니다.

## 실패 버킷팅 — 서랍부터 정리하기

**버킷팅**(bucketing)은 깔때기의 첫 단계입니다. 실패 로그에서 핵심 메시지를 뽑아 **시그니처**(실패를 구분하는 짧은 문자열)를 만들고, 같은 시그니처끼리 묶습니다. 서랍 정리와 같습니다. 물건을 하나씩 들여다보기 전에 종류별로 서랍에 나눠 담으면, 서랍 수가 곧 실제로 살펴볼 문제 수가 됩니다.

시그니처를 만들 때는 실행마다 달라지는 값(주소, 시각, 반복 번호)을 지워야 같은 원인이 같은 버킷에 들어갑니다. 아래 코드는 실패 로그에서 첫 오류 줄을 뽑아 숫자를 정규화하고 버킷을 나눕니다.

```python
import re
from collections import defaultdict

def signature(log_lines):
    first = next((l for l in log_lines if "ERROR" in l or "FATAL" in l), "NO_ERROR_LINE")
    first = re.sub(r"0x[0-9a-fA-F]+", "0x#", first)   # 주소·값
    first = re.sub(r"\b\d+\b", "#", first)             # 시각·번호
    return first.strip()

buckets = defaultdict(list)
for run in failed_runs:                                 # run.name, run.log_lines
    buckets[signature(run.log_lines)].append(run.name)

for sig, names in sorted(buckets.items(), key=lambda kv: -len(kv[1])):
    print(f"{len(names):3d}  {sig}")
```

47개 실패가 5개 버킷으로 줄면, 오늘 할 일은 47개가 아니라 5개입니다. 가장 큰 버킷부터 대표 하나를 골라 재현하고 줄입니다.

## seed와 결정론 — 다시 일어나게 만들기

버킷을 나눴다면 다음 조건은 대표 실패를 **다시 일으킬 수 있는가**입니다. 다시 일어나지 않는 실패는 고칠 수 없고, 고쳤는지 확인할 수도 없습니다. 범죄 수사에서 현장을 보존하지 않으면 나중에 아무것도 증명할 수 없는 것과 같습니다.

pre-silicon 테스트는 대부분 무작위 입력을 씁니다. 전송 길이, 요청 간격, 주소를 난수로 뽑아야 사람이 떠올리지 못한 조합을 만날 수 있기 때문입니다. 이 난수는 **seed**(난수 생성기의 시작값)로 결정됩니다. 같은 seed로 돌리면 같은 난수가 나오고, 같은 시나리오가 다시 펼쳐집니다. 그래서 모든 테스트는 시작할 때 seed를 로그에 남기고, 실행 인자로 seed를 지정할 수 있어야 합니다.

```python
# CocoTB 테스트에서 seed를 기록하고 다시 지정할 수 있게 하는 패턴
import os, random, cocotb

@cocotb.test()
async def dma_random_stress(dut):
    seed = int(os.environ.get("TEST_SEED", random.SystemRandom().randrange(2**32)))
    dut._log.info(f"TEST_SEED={seed}")       # 실패하면 이 값으로 다시 돌린다
    rng = random.Random(seed)                # 전역 random 대신 전용 생성기
    for _ in range(500):
        length = rng.choice([rng.randint(1, 255), rng.randint(4032, 4096)])
        gap = rng.choice([0, rng.randint(1, 15), rng.randint(16, 200)])
        await run_dma(dut, length=length, gap_cycles=gap)
```

Verilator 실행 파일은 `+verilator+seed+<n>` 같은 실행 인자로 시뮬레이터 쪽 난수를 고정할 수 있고, CocoTB도 실행 시작 때 자체 seed를 출력하고 환경 변수로 다시 지정할 수 있습니다. 변수 이름은 버전마다 조금 다르니 쓰는 버전의 문서를 확인합니다.

seed를 고정해도 결과가 달라진다면 어딘가에 **비결정성**이 숨어 있습니다. 자주 보이는 원인은 다음과 같습니다.

- **실제 시각:** 테스트나 하네스가 현재 시각을 읽어 타임아웃이나 동작을 결정합니다.
- **스레드 스케줄링:** Ch 8의 하네스는 IRQ 주입을 별도 스레드에서 했습니다. 스레드가 깨어나는 순서가 실행마다 달라지면 인터럽트가 들어오는 cycle도 달라집니다. 시뮬레이션 시각 기준으로 동기화하도록 바꿔야 합니다.
- **초기화하지 않은 메모리:** C 참조 모델이 초기화하지 않은 변수를 읽으면 실행마다 값이 달라집니다.
- **해시 순서:** Python의 `set`에 문자열을 넣고 순회하면, 문자열 해시가 실행마다 무작위화되기 때문에 순서가 바뀔 수 있습니다. 순서가 중요하면 정렬하거나 `PYTHONHASHSEED`를 고정합니다.

## 최소 재현 케이스로 줄이기

재현에 성공한 실패는 대개 깁니다. 무작위 전송 500번 중 어딘가에서 실패했다면, 원인과 상관없는 전송이 499번 섞여 있습니다. 이 상태로 waveform을 보면 Ch 10의 역추적 거리가 불필요하게 깁니다. 그래서 **실패를 유지하면서 입력을 최대한 줄이는** 단계를 거칩니다.

조각 그림 맞추기에 비유할 수 있습니다. 상자 안의 조각 중 그림과 상관없는 조각을 하나씩 빼 보고, 빼도 그림이 그대로면 버립니다. 남은 조각만으로 그림이 완성되면 그것이 최소 재현 케이스입니다.

이 과정을 자동화한 대표적인 기법이 Andreas Zeller가 제안한 **delta debugging**입니다. 입력을 덩어리로 나눠 하나씩 빼 보고, 빼도 실패하면 그 덩어리를 버리고, 더 이상 줄지 않으면 덩어리를 더 잘게 쪼개는 방식입니다. 아래 코드는 테스트 시나리오(트랜잭션 목록)에 그 아이디어를 단순하게 적용했습니다.

```python
def reduce_steps(steps, still_fails):
    """steps: 트랜잭션 목록, still_fails(cand): cand로 돌렸을 때 실패하면 True"""
    n = 2
    while len(steps) >= 2:
        size = max(1, len(steps) // n)
        for i in range(0, len(steps), size):
            cand = steps[:i] + steps[i + size:]        # 덩어리 하나를 빼 본다
            if cand and still_fails(cand):
                steps, n = cand, max(n - 1, 2)         # 빼도 실패하면 버린다
                break
        else:
            if size == 1:
                break                                  # 더 쪼갤 수 없음
            n = min(n * 2, len(steps))                 # 더 잘게 나눈다
    return steps
```

`still_fails()`는 후보 시나리오로 시뮬레이션을 한 번 돌리는 함수라 비용이 큽니다. 그래도 사람이 손으로 줄이는 것보다 훨씬 빠르고, 밤새 자동으로 돌려 둘 수 있습니다. 500번의 전송이 Ch 9에서 본 것처럼 "4KB 근처 전송 하나, 그리고 바로 이어지는 짧은 전송 하나"로 줄어들면, 원인이 거의 보이는 상태가 됩니다.

줄일 때 하나 주의할 점이 있습니다. 실패 *종류*가 바뀌지 않았는지 확인해야 합니다. 원래는 인터럽트 타임아웃이었는데 줄이다 보니 다른 assertion이 실패하기 시작했다면, 다른 버그로 갈아탔다는 뜻입니다. `still_fails()`는 "실패했는가"뿐 아니라 "같은 시그니처로 실패했는가"를 확인해야 합니다.

## RTL 버그냐, 테스트벤치·모델 버그냐

최소 재현 케이스를 손에 쥐었다면 책임 영역을 판정합니다. pre-silicon에서 실패의 원인은 RTL만이 아닙니다. 테스트벤치(자극을 넣고 결과를 검사하는 검증 코드), 참조 모델, 그리고 서버·라이선스·도구 같은 인프라도 실패를 만듭니다. 경험상 회귀 실패 중 상당수는 RTL이 아닌 쪽에서 나옵니다.

| 신호 | 의심할 영역 | 확인할 것 |
|---|---|---|
| RTL 내부 assertion이 실패 | RTL | 그 assertion이 스펙의 규칙을 올바르게 옮겼는지 |
| 인터페이스 assertion이 *테스트벤치 쪽* 신호에서 실패 | 테스트벤치(BFM) | BFM이 프로토콜을 어긴 자극을 넣었는지 |
| scoreboard(결과를 기대값과 비교하는 검증 부품)에서 기대값과 결과가 다름 | RTL 또는 참조 모델 | Ch 14의 순서로 스펙부터 확인 |
| 테스트가 스펙상 불가능한 설정을 씀 | 테스트 | 무작위 제약 조건의 빈틈 |
| 라이선스 오류, 시간 초과, 디스크 부족, 도구 크래시 | 인프라 | 같은 테스트를 다른 서버에서 다시 실행 |

판정에서 중요한 태도는 **"RTL 버그"를 기본값으로 두지 않는 것**입니다. RTL 팀에 넘긴 버그가 테스트벤치 실수로 밝혀지는 일이 반복되면 신뢰가 깎이고, 진짜 RTL 버그가 넘어갔을 때 반응이 늦어집니다. 반대로 SW 엔지니어가 작성한 드라이버 기반 테스트에서 실패가 났다면, 드라이버가 스펙에 없는 순서를 가정하지 않았는지부터 확인합니다.

## 회귀 bisect

어제까지 통과하던 테스트가 오늘 실패했다면 **bisect**가 가장 빠른 길입니다. 마지막으로 통과한 커밋과 처음 실패한 커밋 사이를 반으로 나눠 가운데 커밋을 시험하고, 결과에 따라 절반을 버리기를 반복합니다. 스무고개에서 "그건 동물인가요?"처럼 후보를 절반씩 줄이는 질문을 던지는 것과 같습니다.

![회귀 bisect — 커밋 c1~c9 중 c1은 통과, c9는 실패일 때 c5(통과), c7(실패), c6(실패) 순서로 세 번 시험해 c6을 범인 커밋으로 찾는 그림](/images/blog/driver-cosim/diagrams/ch15-bisect.svg)

git의 `bisect run`을 쓰면 이 과정이 자동으로 돕니다. 재현 스크립트가 통과하면 0, 실패하면 1, 빌드가 안 돼서 판단할 수 없으면 125를 돌려주도록 만들어 두면 됩니다.

```bash
# 범위 지정: 나쁜 커밋, 좋은 커밋 순서
git bisect start main rtl-rc6
# 커밋마다 재현 스크립트를 돌린다. 0=통과, 125=건너뜀, 그 외=실패
git bisect run ./scripts/repro.sh --test dma_back_to_back --seed 4242
git bisect reset
```

RTL, 테스트벤치, 펌웨어가 서로 다른 저장소에 있다면 bisect 대상을 하나로 고정해야 합니다. 예를 들어 RTL만 bisect할 때는 테스트벤치와 펌웨어를 실패가 처음 보고된 시점의 버전으로 고정합니다. 여러 저장소가 동시에 바뀌면 범인을 특정할 수 없습니다.

## 작은 예시 — 47개 실패의 아침

앞의 47개 실패에 이 장의 흐름을 적용해 보겠습니다.

버킷팅 스크립트를 돌리자 다섯 개 버킷이 나왔습니다. 가장 큰 버킷(31개)의 시그니처는 `ERROR dma irq timeout after # cycles`, 두 번째(9개)는 `FATAL license checkout failed`, 세 번째(4개)는 `ERROR scoreboard mismatch addr=0x# exp=0x# got=0x#`였습니다. 나머지 두 버킷은 각각 2개와 1개였습니다.

두 번째 버킷은 인프라 문제였습니다. 라이선스 서버가 한동안 응답하지 않던 시간대의 실패였고, 다시 돌리자 모두 통과했습니다. 첫 번째 버킷에서 대표 하나를 골라 로그의 `TEST_SEED`로 재현했더니 같은 시그니처로 실패했습니다. delta debugging으로 500개 트랜잭션을 2개로 줄였고, Ch 9와 같은 set/clear 우선순위 문제로 확인됐습니다. RTL 버그로 판정해 RTL 팀에 넘겼습니다.

세 번째 버킷은 어제부터 시작된 실패라 bisect를 돌렸습니다. 범인 커밋은 RTL이 아니라 테스트벤치의 참조 모델에서 나왔습니다. 누군가 바이트 순서 처리를 바꾸면서 특정 정렬 조건에서 기대값을 잘못 계산하게 됐습니다. 이 버킷은 검증 팀으로 넘어갔습니다.

결과적으로 47개 실패는 RTL 버그 1건, 참조 모델 버그 1건, 인프라 문제 1건, 그리고 아직 조사 중인 작은 버킷 2개로 정리됐습니다. 오전 회의에서 이 다섯 줄만 공유하면 됩니다.

## 실제 사례 — bisect와 자동 축소의 계보

bisect는 하드웨어 검증만의 도구가 아닙니다. 리눅스 커널 커뮤니티는 회귀 버그를 보고할 때 `git bisect`로 범인 커밋을 찾아 함께 보고하는 문화가 자리 잡았고, 커널 문서에도 bisect 방법을 안내하는 문서가 있습니다. 한 릴리스에 수천 명이 기여하는 프로젝트에서 "어느 커밋부터 깨졌는가"를 몇 번의 빌드로 찾을 수 있다는 점이 그 이유입니다.

입력을 자동으로 줄이는 기법도 소프트웨어 쪽에서 먼저 자리 잡았습니다. delta debugging은 2000년대 초 Zeller와 Hildebrandt의 논문으로 널리 알려졌고, University of Utah 연구진이 만든 **C-Reduce**는 컴파일러를 깨뜨리는 거대한 C 프로그램을 몇 줄짜리로 줄여 주는 도구로 컴파일러 버그 보고에 많이 쓰였습니다. pre-silicon 검증에서 트랜잭션 목록을 줄이는 일은 같은 아이디어를 하드웨어 테스트에 옮긴 형태입니다.

## 자주 하는 실수

- **분류 없이 첫 실패부터 깊이 팝니다.** 47개 중 31개가 같은 원인일 수 있습니다. 버킷부터 나눕니다.
- **seed를 남기지 않습니다.** 무작위 테스트가 seed 없이 실패하면 사실상 재현할 수 없습니다.
- **줄이다가 다른 버그로 갈아탑니다.** 최소화 과정에서 실패 시그니처가 유지되는지 확인합니다.
- **모든 실패를 RTL 버그로 넘깁니다.** 테스트벤치, 모델, 인프라도 실패를 만듭니다. 판정 근거를 함께 넘깁니다.
- **여러 저장소를 동시에 bisect합니다.** 한 번에 하나만 움직이고 나머지는 고정합니다.

## 정리

- triage는 실패를 분류하고, 재현하고, 줄이고, 책임 영역을 판정해 넘기는 과정입니다. 깊이보다 넓이부터 시작합니다.
- 무작위 테스트는 seed를 기록하고 다시 지정할 수 있어야 합니다. seed를 고정해도 결과가 달라지면 실제 시각, 스레드, 초기화 안 된 메모리, 해시 순서 같은 비결정성을 찾습니다.
- delta debugging처럼 입력을 덩어리로 빼 보는 방식으로 최소 재현 케이스를 만듭니다. 실패 시그니처가 유지되는지 확인합니다.
- 실패 원인은 RTL만이 아니라 테스트벤치, 참조 모델, 테스트 제약, 인프라에도 있습니다. RTL 버그를 기본값으로 두지 않습니다.
- 시그니처로 버킷을 나누면 실제로 살펴볼 문제 수가 드러납니다.
- bisect는 커밋이 N개일 때 약 log₂N번의 시험으로 회귀 커밋을 찾습니다.
- bisect할 때는 한 저장소만 움직이고 나머지는 고정합니다.

## 다음 장 예고

다음 장은 pre-silicon 파트의 마지막입니다. 실리콘이 나온 뒤에 "이 신호를 볼 수 있었으면" 하고 후회하지 않도록, 테이프아웃 전에 심어 둘 **디버그 훅**과 pre-silicon 테스트를 실리콘까지 가져가는 방법을 정리합니다.

## 관련 항목

- [Ch 14: 모델과 RTL이 다를 때](/blog/tools/emulation/driver-cosim/chapter14-virtual-platform-hybrid) — scoreboard 불일치의 판정 순서
- [Ch 16: Pre-silicon에서 Post-silicon으로](/blog/tools/emulation/driver-cosim/chapter16-pre-to-post-handoff)
- [Ch 4: CocoTB](/blog/tools/emulation/driver-cosim/chapter04-cocotb) — Python 테스트벤치 기본
- [Debugging: The 9 Indispensable Rules Ch 2: Make It Fail](/blog/tools/debugging/agans-9-rules/chapter02-make-it-fail) — 재현이 먼저라는 원칙
- [Embedded Debugging Ch 19: HW냐 SW냐](/blog/tools/debugging/embedded/chapter19-hw-or-sw-triage) — 실리콘 단계의 책임 영역 판정
