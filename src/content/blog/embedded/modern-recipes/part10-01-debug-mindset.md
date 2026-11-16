---
title: "임베디드 디버깅 마인드셋 — 가설·격리·재현·이분탐색"
slug: "embedded/modern-recipes/part10-01-debug-mindset"
date: 2026-04-19T09:00:00
description: "증상·모델·가설·측정을 분리하는 사이클, git bisect run 실행 예, 간헐 버그의 반복 횟수 계산, 두 조건식의 codegen 비교로 임베디드 디버깅의 사고 도구를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 111
tags: [recipes, debugging, methodology]
topics: ["embedded"]
---

## 한 줄 요약

> **"디버깅은 코드를 고치는 일이 아니라 *가정을 깨는* 일입니다."** 증상에서 시작해 가설을 세우고, 가장 빨리 깨질 가정 하나만 측정으로 검증합니다.

## 어떤 상황에서 쓰나

"왜 안 되지?"를 30분 이상 들여다보고 있다면 이 글이 필요합니다. 임베디드는 desktop과 달리 print 한 줄 추가가 비싸고, 실행이 한 번에 몇 분씩 걸리며, 재현이 잘 안 되는 일이 일상입니다. 그래서 *추측 → 코드 수정*을 반복하는 desktop식 디버깅은 곧 한계에 부딪힙니다.

대신 *증상 → 가설 → 측정*을 한 사이클로 보고, 한 번에 *한 가정*만 검증하는 습관이 필요합니다. 이 글은 사고 흐름을 정리합니다.

## 핵심 개념

디버깅에서 다음 다섯 가지를 따로 적어 두면, 어디서 막혔는지가 보입니다.

1. **증상 (Symptom)** — 실제로 관찰된 것
2. **모델 (Model)** — 코드가 어떻게 동작한다고 *내가 믿는지*
3. **차이 (Discrepancy)** — 모델과 증상 사이의 모순
4. **가설 (Hypothesis)** — 모순을 만들 수 있는 *구체적* 원인
5. **측정 (Measurement)** — 가설을 깨거나 굳힐 단 한 번의 관찰

막힌 디버깅에서 흔히 빠지는 것은 *모델*을 의심하는 단계입니다. "이 ISR은 분명 enable 되어 있다"는 *믿음*이지 *측정*이 아닙니다. 코드를 한 번 더 읽는 대신, 디버거로 NVIC의 enable·pending 레지스터 값을 직접 읽어 봅니다(구체적인 레지스터와 읽는 법은 [10-07](/blog/embedded/modern-recipes/part10-07-interrupt-debugging)).

## 가설-검증 사이클

LED가 깜빡이지 않는 경우를 예로 한 사이클을 적어 보면 다음과 같습니다. 모델은 "main()의 while loop가 GPIOC의 LED 핀을 1 ms마다 토글한다"입니다.

| 단계 | 가설 | 측정 | 결과 |
| --- | --- | --- | --- |
| A | main()에 진입하지 못한다 | main() 첫 줄에서 LED를 켠다 | 켜짐 → 기각 |
| B | GPIOC 클럭이 꺼져 있다 | 디버거로 `RCC->AHB1ENR` bit 2(GPIOCEN)를 읽는다 | 1 → 기각 |
| C | LED가 GPIOC가 아닌 다른 포트에 있다 | 회로도를 본다 | GPIOA → 채택 |

마지막 행에서 바뀐 것은 코드가 아니라 모델입니다. 코드는 처음부터 모델대로 동작했고, 모델이 회로와 달랐습니다. STM32F4에서 `RCC_AHB1ENR`의 bit 2가 GPIOC enable이라는 것은 `cmsis_device_f4`의 `RCC_AHB1ENR_GPIOCEN_Pos`(2)에서 확인할 수 있습니다.

각 가설은 *측정 가능*하고 *YES/NO*로 답이 나와야 합니다. "뭔가 이상하다"는 가설이 아닙니다.

## Binary Search — 변경 이분 탐색

어제는 됐는데 오늘은 안 될 때 가장 빠른 길은 git bisect입니다.

```bash
git bisect start
git bisect bad                  # 현재 commit 망가짐
git bisect good v1.2.0          # 이건 정상
# git이 중간 commit으로 checkout
# 빌드·테스트
git bisect good                 # 또는 bad
# ... 반복
git bisect reset
```

판정을 스크립트로 만들 수 있으면 `git bisect run`이 반복을 대신합니다. `git help bisect`에 따르면 스크립트가 0으로 끝나면 good, 1~127(125 제외)이면 bad이고, 125는 그 commit을 건너뜁니다. 50개 commit 중 37번째에서 설정값이 바뀌는 장난감 저장소를 만들어 돌려 봤습니다(git 2.54.0).

```bash
cat test.sh
#!/bin/sh
grep -q "TIMEOUT_MS 10" config.h      # 0 = good, 1 = bad

git bisect start HEAD v1.2.0 && git bisect run ./test.sh
```

```text
Bisecting: 24 revisions left to test after this (roughly 5 steps)
running '../test.sh'
Bisecting: 12 revisions left to test after this (roughly 4 steps)
running '../test.sh'
Bisecting: 5 revisions left to test after this (roughly 3 steps)
running '../test.sh'
Bisecting: 2 revisions left to test after this (roughly 2 steps)
running '../test.sh'
Bisecting: 0 revisions left to test after this (roughly 1 step)
running '../test.sh'
78ba5b6598a9cb834d13a0f576c005b4e8de51f6 is the first bad commit
```

good(v1.2.0, 1번) 뒤의 49개 commit을 테스트 다섯 번으로 줄였습니다. log₂(49) ≈ 5.6이니 다섯~여섯 번입니다. 이 방법은 테스트가 같은 commit에서 늘 같은 답을 낼 때만 성립합니다. 간헐 버그라면 한 commit에서 good이 나와도 정말 good인지 모르므로, 아래 「재현부터 안정시키기」의 반복 횟수를 테스트 스크립트 안에 넣어야 bisect가 의미를 갖습니다.

## Code Search — 공간 이분 탐색

큰 함수가 어디서부터 잘못되는지 모를 때는 중간에 print를 박고 반으로 줄입니다.

```c
void process(uint8_t *buf, size_t n) {
    parse_header(buf);            // 절반 위
    printf("ALIVE 1\n");          // ← 중간
    decode_payload(buf + 8, n - 8); // 절반 아래
}
```

`ALIVE 1`까지 나오면 위 절반은 무사합니다. 아래쪽으로 다시 절반을 가르고, 다시 절반을 가르고. 8단계면 256줄짜리 함수의 한 줄을 찾습니다.

## Changelog 우선 확인

"어제는 됐다"가 출발점이면 가장 먼저 `git log --since=yesterday`와 `git diff HEAD@{1.day} HEAD`를 봅니다.

```bash
git log --since="2 days ago" --oneline
git diff HEAD@{2.days} -- src/
```

`HEAD@{2.days}`는 reflog 기준이라, 이틀 전에 이 저장소의 HEAD가 가리키던 commit입니다. commit 날짜가 아니라 내 작업 사본의 이력을 보므로 "어제 내 보드에서 돌던 코드"와 비교하는 데 맞습니다.

코드 변경이 없는데 결과가 달라졌다면 코드 밖의 무언가가 바뀐 것입니다. 기록해 두고 비교할 항목은 다음과 같습니다.

- toolchain 버전(`arm-none-eabi-gcc --version`)
- 외부 라이브러리·SDK 버전
- 보드 revision과 부착 부품
- 호스트 OS·디버그 프로브 펌웨어
- 전원(어댑터·USB 포트·케이블)

## Rubber Duck Debugging

문제를 *소리 내어* 다른 사람에게 설명하면 절반은 설명 도중에 답이 나옵니다. 들어 줄 사람이 없으면 노란 고무 오리에게 말합니다.

> "이 ISR이 안 들어와요. NVIC enable 했고, IRQn 번호 맞고, priority도 5로 줬고, GPIO interrupt mask 풀었고... 잠깐, EXTI line mask 풀었나? 안 풀었네."

말로 옮기는 순간 머릿속 모델의 빈 칸이 드러납니다. 위 예에서 빠진 것은 EXTI line mask였고, 이는 앞 절의 "모델" 칸에 적었어야 할 단계 하나였습니다.

## 재현부터 안정시키기

간헐 버그는 측정 한 번의 비용이 재현 빈도에 묶여 있습니다. 먼저 재현 절차를 안정시킵니다.

- [ ] 어떤 조건에서 발생?
- [ ] 발생 빈도?
- [ ] 발생 직전 일관된 행동?
- [ ] 보드 reset 후에도 재현?
- [ ] 동일 시퀀스를 자동화 가능?

자동화된 재현 스크립트가 만들어지면 디버깅의 절반은 끝난 것입니다. 1시간에 한 번 발생하던 race를 1분에 한 번으로 줄이면 측정 한 번이 60배 싸집니다.

반복 횟수도 계산합니다. 1회 실행에서 실패할 확률이 p일 때 n번 돌려 한 번이라도 실패를 볼 확률은 1 − (1 − p)^n입니다. 1000번에 3번 실패하는 버그(p = 0.003)를 95% 확률로 한 번 이상 보려면 998번이 필요합니다. 반대로 고친 뒤 n번 연속 통과했다면, 남은 실패 확률의 95% 상한은 대략 3/n입니다("rule of three").

```text
p=0.003: runs needed to see >=1 failure with 95%: 998
p=0.004: runs needed to see >=1 failure with 95%: 748
p=0.005: runs needed to see >=1 failure with 95%: 598
0 failures in 100 runs -> 95% upper bound on p = 0.02951 (rule of three 0.03000)
0 failures in 1000 runs -> 95% upper bound on p = 0.00299 (rule of three 0.00300)
0 failures in 10000 runs -> 95% upper bound on p = 0.00030 (rule of three 0.00030)
P(100 clean runs | p=0.003) = 0.74
```

p = 0.003인 버그는 고치지 않아도 100번 연속 통과할 확률이 74%입니다. 100번 통과로는 이 버그가 사라졌다고 말할 수 없고, 0.3% 수준을 배제하려면 1000번 단위가 필요합니다.

## 디버깅 노트 작성

긴 디버깅 세션은 기록이 없으면 같은 가설을 두 번 검증하게 됩니다. 노트에는 증상(빈도 포함), 환경(위 목록), 그리고 가설마다 검증 방법과 결과를 남깁니다. 아래는 SPI flash 쓰기가 간헐적으로 실패하는 경우를 가정한 양식입니다. 결과 칸은 실제로 측정한 뒤에 채우는 자리입니다.

| 가설 | 검증 방법 | 기각 조건 |
|------|-----------|-----------|
| A. SCK가 너무 빠르다 | 분주를 한 단계 낮춰 같은 횟수 반복 | 실패 빈도가 그대로 |
| B. 쓰기 뒤 WIP 비트를 기다리지 않는다 | 상태 레지스터 polling을 넣고 반복 | 실패 빈도가 그대로 |
| C. 쓰기 중 전원 전압이 떨어진다 | 스코프로 flash VCC를 trigger | 실패 시점에 변동 없음 |

각 행의 "같은 횟수 반복"은 위 계산대로 실패 빈도를 구별할 만큼이어야 합니다. 원래 1000번에 3~5번 실패했다면, 기각 판정에도 1000번 단위가 필요합니다. SCK와 WIP의 근거는 [1-05: SPI 하드웨어](/blog/embedded/modern-recipes/part1-05-spi-hardware)에 있습니다.

## "수정"이 진짜 수정인지 확인

```c
// 변경 전
if (status & 0x01) handle();

// 변경 후
if ((status & 0x01) != 0) handle();
```

C11(N1570) 6.8.4.1은 `if`의 첫 문장이 "조건식이 0과 같지 않을 때" 실행된다고 정하므로 두 줄은 같은 의미이고, 컴파일러도 같은 코드를 냅니다. `arm-none-eabi-gcc` 16.2.0 `-mcpu=cortex-m4 -mthumb`로 두 함수를 컴파일한 결과에서 비교·분기 부분만 옮겼습니다(-O0의 prologue·epilogue도 두 함수가 같습니다).

```text
-O0                              -O2
a: and.w r3, r3, #1              a: lsls r3, r0, #31
   cmp   r3, #0                     bmi.n  6 <a+0x6>
   beq.n 16 <a+0x16>                bx     lr
b: and.w r3, r3, #1              b: lsls r3, r0, #31
   cmp   r3, #0                     bmi.n  12 <b+0x6>
   beq.n 34 <b+0x16>                bx     lr
```

명령은 분기 주소만 다르고 같습니다. 이런 변경 뒤 동작이 바뀌었다면 다른 원인이 있습니다. *수정으로 문제가 사라졌다*는 것과 *수정이 원인을 고쳤다*는 것은 다릅니다. 위 확률 계산처럼 간헐 버그는 고치지 않아도 한동안 안 보일 수 있으니, 같은 조건에서 *왜* 안 일어나는지 설명할 수 있어야 진짜 수정입니다.

## 측정 도구 고르기

도구마다 프로그램의 실행을 건드리는 방식이 다릅니다. 측정이 버그를 바꾸는지를 기준으로 고릅니다.

| 도구 | 프로그램에 끼치는 것 | 함께 보는 글 |
| --- | --- | --- |
| printf / log | 출력 코드 실행 시간, 버퍼·UART 대기 | [10-11: 로깅 시스템](/blog/embedded/modern-recipes/part10-11-logging-system) |
| GPIO pulse + 스코프·logic analyzer | 레지스터 쓰기 한두 번 | [10-10: 통신 프로토콜 분석](/blog/embedded/modern-recipes/part10-10-protocol-analyzer) |
| SWO / RTT | ITM 쓰기 또는 RAM 버퍼 쓰기, 코어는 멈추지 않음 | [10-09: 타이밍/race 진단](/blog/embedded/modern-recipes/part10-09-timing-race-diag) |
| breakpoint halt + 메모리 읽기 | 코어 정지. 정지 중에도 주변장치·외부 세계는 진행 | [10-03: GDB 원격 디버깅](/blog/embedded/modern-recipes/part10-03-gdb-remote-debug) |
| ETM 명령 trace | 코어 밖 trace 하드웨어가 기록 | [10-09](/blog/embedded/modern-recipes/part10-09-timing-race-diag) |

printf를 넣었더니 race가 사라지면 GPIO pulse처럼 끼치는 것이 작은 쪽으로 옮기고, halt가 상황을 바꾸면 코어를 멈추지 않는 RTT나 trace로 옮깁니다.

## 자주 보는 함정

> 코드를 의심하기 전에 회로를 의심

GPIO 토글이 안 보이면 위 LED 예처럼 핀 배정부터 확인합니다. 회로도의 핀 이름과 코드의 포트·핀 번호를 맞춰 보고, 스코프나 멀티미터로 그 핀에 신호가 나오는지 봅니다.

> 두 가지를 동시에 바꾸기

```text
[변경 1] clock 16 MHz → 8 MHz
[변경 2] DMA enable
[결과]   동작. → 어느 쪽이 원인인지 알 수 없음.
```

한 번에 한 변수만 바꿉니다. 두 가지를 같이 바꾸고 동작하면, 원인이 변경 1인지 변경 2인지 둘의 조합인지 구별할 수 없습니다. 다음에 둘 중 하나를 되돌려야 할 때 근거가 없습니다.

> "오늘은 됐으니 됐다"

몇 번 통과했는지보다, 원래 실패 빈도를 배제할 만큼 반복했는지가 기준입니다. 위 계산대로 1000번에 3번 실패하던 버그는 100번 연속 통과해도 남아 있을 확률이 74%입니다.

> 너무 깊이 파기

같은 가설을 반복해서 들여다보고 있다면 노트의 "모델" 칸으로 돌아갑니다. 동료에게 설명하거나 잠시 다른 작업을 하다 돌아오면, 모델의 빈 칸을 다시 볼 기회가 생깁니다.

## 정리

- 디버깅은 *가설을 깨는* 일입니다. 코드를 고치기 전에 모델을 측정합니다.
- 가설은 항상 YES/NO로 답이 나와야 합니다.
- `git bisect run`은 49개 commit을 테스트 다섯 번으로 줄였습니다. 테스트가 결정적일 때만 씁니다.
- 코드가 그대로인데 결과가 바뀌면 toolchain·라이브러리·보드·전원을 기록과 비교합니다.
- 간헐 버그의 반복 횟수는 실패 확률로 정합니다. p = 0.003을 95%로 한 번 보려면 998번입니다.
- 디버깅 노트에는 가설마다 검증 방법과 기각 조건을 남깁니다.
- "수정으로 사라졌다"는 *왜 사라졌는지*를 설명할 수 있어야 진짜 수정입니다.

다음 편은 **하드폴트 분석**입니다.

## 관련 항목

- [10-04: 하드폴트 분석](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)
- [10-09: 타이밍/race 진단](/blog/embedded/modern-recipes/part10-09-timing-race-diag)
- [10-12: 포스트모템 분석](/blog/embedded/modern-recipes/part10-12-postmortem-analysis)
