---
title: "10-01: 디버깅 마인드셋"
date: 2026-05-16T15:00:00
description: "가설-검증 사이클·binary search·changelog·rubber duck — 임베디드 디버깅의 사고 도구."
series: "Modern Embedded Recipes"
seriesOrder: 111
tags: [recipes, debugging, methodology]
---

## 한 줄 요약

> **"디버깅은 코드를 고치는 일이 아니라 *가정을 깨는* 일입니다."** 증상에서 시작해 가설을 세우고, 가장 빨리 깨질 가정 하나만 측정으로 검증합니다.

## 어떤 상황에서 쓰나

"왜 안 되지?"를 30분 이상 들여다보고 있다면 이 글이 필요합니다. 임베디드는 desktop과 달리 print 한 줄 추가가 비싸고, 실행이 한 번에 몇 분씩 걸리며, 재현이 잘 안 되는 일이 일상입니다. 그래서 *추측 → 코드 수정*을 반복하는 desktop식 디버깅은 곧 한계에 부딪힙니다.

대신 *증상 → 가설 → 측정*을 한 사이클로 보고, 한 번에 *한 가정*만 검증하는 습관이 필요합니다. 이 글은 사고 흐름을 정리합니다.

## 핵심 개념

좋은 디버거는 다음 다섯 가지를 항상 분리해 둡니다.

1. **증상 (Symptom)** — 실제로 관찰된 것
2. **모델 (Model)** — 코드가 어떻게 동작한다고 *내가 믿는지*
3. **차이 (Discrepancy)** — 모델과 증상 사이의 모순
4. **가설 (Hypothesis)** — 모순을 만들 수 있는 *구체적* 원인
5. **측정 (Measurement)** — 가설을 깨거나 굳힐 단 한 번의 관찰

대부분의 막다른 디버깅은 *모델*을 의심하지 않는 데서 옵니다. "이 ISR은 분명 enable 되어 있다"는 *믿음*이지 *측정*이 아닙니다. 코드를 한 번 더 읽지 말고 NVIC pending register를 직접 찍어야 합니다.

## 가설-검증 사이클

```text
[관찰] LED가 깜빡이지 않는다.

[모델] main()의 while loop가 GPIO를 1ms마다 토글한다.

[가설 A] main()에 진입조차 못한다.
  측정: 시작 직후 LED ON. → 진입은 한다.
[가설 B] GPIOC clock이 disable.
  측정: RCC->AHB1ENR bit 2 = 1. → enable 됨.
[가설 C] LED는 GPIOC가 아닌 GPIOA에 있다.
  측정: 회로도 확인. → 맞다, GPIOA.
[수정] HAL_GPIO_TogglePin(GPIOA, ...) → 동작.
```

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
# ... log2(N)번 반복
git bisect reset
```

50 commit 범위라면 log₂(50) ≈ 6번이면 범인 commit을 찾습니다. 측정 가능한 *재현 절차*가 있어야 합니다. 안정적으로 재현되지 않는 버그라면 bisect는 안 됩니다.

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

코드 변경이 없는데 문제가 생겼다면 *환경*이 바뀐 것입니다.

- Toolchain 버전
- 외부 라이브러리 update
- 하드웨어 교체
- OS 업데이트
- Power supply, USB cable

이쪽이 의외로 흔합니다. USB 케이블 한 쪽 핀이 닿지 않아 SPI flash 쓰기가 가끔 실패하는 사례, 보드를 다른 USB 포트에 꽂으니 전류 부족으로 reset 되는 사례 모두 자주 봅니다.

## Rubber Duck Debugging

문제를 *소리 내어* 다른 사람에게 설명하면 절반은 설명 도중에 답이 나옵니다. 들어 줄 사람이 없으면 노란 고무 오리에게 말합니다.

```text
"이 ISR이 안 들어와요. NVIC enable 했고, IRQn 번호 맞고,
priority도 5로 줬고, GPIO interrupt mask 풀었고...
잠깐, EXTI line mask 풀었나? 안 풀었네."
```

말로 옮기는 순간 머릿속 모델의 빈 칸이 드러납니다. 코드 리뷰 부탁 메시지를 길게 적다가 *보내기 전*에 스스로 답을 찾는 일이 잦은 이유도 같습니다.

## 재현부터 안정시키기

간헐적 버그는 *재현 가능한 최소 절차*를 찾는 데 80%의 시간이 듭니다.

```text
[ ] 어떤 조건에서 발생?
[ ] 발생 빈도?
[ ] 발생 직전 일관된 행동?
[ ] 보드 reset 후에도 재현?
[ ] 동일 시퀀스를 자동화 가능?
```

자동화된 재현 스크립트가 만들어지면 디버깅의 절반은 끝난 것입니다. 1시간에 한 번 발생하던 race를 1분에 한 번으로 줄이면 측정 한 번이 60배 싸집니다.

## "어제는 됐다"의 함정

```text
가정: 어제와 오늘 같은 코드, 같은 환경
현실: 한 가지가 다르다 — 무엇이?
```

`git status`, `git diff`, toolchain version, board revision, 충전 케이블, 외부 sensor, OS update를 모두 확인합니다. 가장 자주 잡히는 범인은 *내가 모르게 바뀐* 것입니다.

## 디버깅 노트 작성

긴 디버깅 세션은 *기록 없이는* 진척이 없습니다.

```markdown
## 2026-05-16 SPI flash 간헐 쓰기 실패

증상: 1000회 중 3~5회 erase 후 verify 불일치.
환경: STM32F407 + W25Q64, SPI1 @ 21 MHz.

가설 A: clock 너무 빠름. → 5 MHz로 낮춤. 발생함. 기각.
가설 B: WIP bit 안 기다림. → 추가. 발생함. 기각.
가설 C: VCC 전압 dip. → 오실로스코프. 3.27V → 3.05V dip 관찰.
  decoupling cap 0.1µF 추가. 1만 회 fail 없음. 해결.
```

다음에 같은 류 버그를 만나면 이 노트가 30분을 살려 줍니다.

## "수정"이 진짜 수정인지 확인

```c
// 변경 전
if (status & 0x01) handle();

// 변경 후
if ((status & 0x01) != 0) handle();
```

이 둘은 동일합니다. 동작이 바뀌었다면 다른 원인이 있습니다. *수정으로 문제가 사라졌다*는 것과 *수정이 원인을 고쳤다*는 것은 다릅니다. Heisenbug(인터럽트·timing 류)는 우연히 사라질 수 있으니, 같은 조건에서 *왜* 안 일어나는지 설명할 수 있어야 진짜 수정입니다.

## 측정 도구의 hierarchy

부담 낮음 → 부담 큼:

1. printf / log
2. LED toggle
3. GPIO pulse + 오실로스코프
4. SWO / RTT trace
5. Logic analyzer
6. JTAG halt + 메모리 dump
7. ETM trace

가장 작은 부담으로 가장 큰 정보를 얻을 도구를 고릅니다. printf로 race가 사라지면 GPIO pulse로 옮겨 갑니다. Halt가 race를 망가뜨리면 RTT로 옮겨 갑니다.

## 자주 보는 함정

> 코드를 의심하기 전에 회로를 의심

GPIO 토글이 안 보이면 *코드*보다 *핀*을 먼저 의심합니다. 멀티미터로 핀에 신호가 뜨는지부터 봅니다.

> 두 가지를 동시에 바꾸기

```text
[변경 1] clock 16 MHz → 8 MHz
[변경 2] DMA enable
[결과]   동작. → 어느 쪽이 원인인지 알 수 없음.
```

한 번에 한 변수만 바꿉니다. 두 가지를 같이 바꾸고 동작하면 *어느 쪽도 진짜 원인이 아닐* 가능성이 큽니다.

> "오늘은 됐으니 됐다"

같은 절차로 100번 동작하기 전에는 *해결되지 않은* 것입니다. 간헐 버그는 다음 주 production에서 다시 나옵니다.

> 너무 깊이 파기

10분 들여다보고 답이 안 보이면 한 발 물러섭니다. 산책, 잠깐의 다른 작업, 동료에게 설명. 머릿속 모델을 한 번 비워야 다른 가설이 보입니다.

## 정리

- 디버깅은 *가설을 깨는* 일입니다. 코드를 고치기 전에 모델을 측정합니다.
- 가설은 항상 YES/NO로 답이 나와야 합니다.
- git bisect로 *시간 이분 탐색*, print binary search로 *공간 이분 탐색*.
- 환경 변화(toolchain, 케이블, USB 포트)를 항상 먼저 의심합니다.
- 재현 절차를 자동화하면 측정 한 번이 수십 배 싸집니다.
- 디버깅 노트는 future-you를 위한 최고의 선물입니다.
- "수정으로 사라졌다"는 *왜 사라졌는지*를 설명할 수 있어야 진짜 수정입니다.

다음 편은 **하드폴트 분석**입니다.

## 관련 항목

- [10-04: 하드폴트 분석](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)
- [10-09: 타이밍/race 진단](/blog/embedded/modern-recipes/part10-09-timing-race-diag)
- [10-12: 포스트모템 분석](/blog/embedded/modern-recipes/part10-12-postmortem-analysis)
