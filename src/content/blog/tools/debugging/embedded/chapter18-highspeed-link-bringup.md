---
title: "SerDes bring-up — loopback·PRBS·eye로 물리 계층부터 살리기"
slug: "tools/debugging/embedded/chapter18-highspeed-link-bringup"
date: 2026-10-05T10:18:00
description: "고속 링크가 안 올라올 때 loopback·PRBS·BER·eye 측정으로 물리 계층을 먼저 살리고 LTSSM 진단으로 넘기는 흐름."
series: "Embedded Debugging"
seriesOrder: 18
tags: [serdes, prbs, loopback, eye-diagram, bring-up]
draft: true
topics: ["tools", "tools/debugging"]
---

고속 링크는 상대방이 있어서 디버깅이 두 배로 어렵습니다. PCIe, 이더넷, USB 같은 링크가 안 올라올 때, 문제가 우리 칩인지, 상대 장치인지, 그 사이의 채널(패키지·보드 배선·커넥터·케이블)인지부터 가려야 합니다. 이 장은 그 판정을 **물리 계층부터 아래에서 위로** 하는 방법을 다룹니다.

링크 상태 머신(LTSSM)이 어느 상태에서 멈췄는지 보는 방법은 이미 다른 글에서 다뤘습니다. PCIe Deep Dive의 트러블슈팅 시나리오북과 이 시리즈 Ch 8의 CXL 링크 디버깅 글이 그 주제입니다. 이 장은 그보다 한 층 아래, **SerDes**(serializer/deserializer, 칩 안의 병렬 데이터를 고속 직렬 신호로 바꾸고 다시 되돌리는 회로)가 비트를 제대로 주고받는지 확인하는 단계를 다룹니다. 이 층이 흔들리면 LTSSM은 원인이 아니라 증상만 보여 줍니다.

## 링크가 안 올라올 때 어디서부터 볼까

전화를 걸었는데 상대 목소리가 안 들린다고 해 봅시다. 내 수화기가 고장일 수도, 전화선이 끊겼을 수도, 상대 전화기가 문제일 수도 있습니다. 어디부터 확인할지 순서가 없으면 셋을 번갈아 의심하며 시간을 보냅니다. 고속 링크도 같습니다.

먼저 SW 쪽에서 보이는 증상과 HW 쪽에서 확인할 것을 나란히 놓아 봅니다.

| SW 쪽 증상 | HW 쪽에서 확인할 것 | 먼저 의심할 곳 |
|---|---|---|
| 장치가 아예 안 보임(`lspci`에 없음) | 기준 클럭(refclk), SerDes 전원, PLL lock, 리셋 해제 | 링크 이전 단계(Ch 11의 전원·클럭·리셋) |
| LTSSM이 초기 상태(Detect, Polling)에서 반복 | TX 출력이 나오는지, 수신 쪽이 신호를 감지하는지 | 물리 계층의 기본 신호 경로 |
| 링크는 올라오지만 lane 수나 속도가 낮음 | lane별 신호 품질, 특정 lane의 배선 | 특정 lane의 채널이나 equalization |
| 링크는 올라오지만 에러 카운터가 계속 증가 | eye 크기, 마진, 온도에 따른 변화 | 마진 부족(equalization·채널 손실) |

표의 첫 행은 이 장보다 아래 칸의 문제입니다. 기준 클럭이 없거나 SerDes PLL이 lock되지 않으면 아무리 상위 계층을 들여다봐도 소용이 없습니다. bring-up 계단을 건너뛰지 않는다는 원칙은 링크에서도 그대로입니다. 클럭과 PLL이 확실하다면, 이제 비트가 실제로 오가는지를 확인할 차례입니다. 이때 쓰는 두 도구가 loopback과 PRBS입니다.

## loopback으로 범위 좁히기

**loopback**은 보낸 신호를 어딘가에서 되돌려 받아 보는 시험입니다. 녹음기에 내 목소리를 녹음해 들어 보면 내 목소리와 녹음기가 정상인지 알 수 있고, 상대에게 들은 말을 그대로 따라 해 달라고 하면 전화선과 상대 수화기까지 확인할 수 있습니다. 어디서 되돌리느냐에 따라 시험 범위가 달라집니다.

![Loopback 지점 — 근단 PCS loopback은 디지털 경로만, 근단 PMA loopback은 SerDes 아날로그까지, 원단 loopback은 채널과 상대 장치의 수신부까지 포함한다](/images/blog/debugging/embedded/diagrams/ch18-loopback-points.svg)

그림의 용어를 간단히 풀면, **PCS**(physical coding sublayer)는 비트 인코딩과 정렬 같은 디지털 처리를 하는 부분이고, **PMA**(physical medium attachment)는 실제 아날로그 신호를 만들고 받는 부분입니다. SerDes의 아날로그 회로가 PMA에 해당합니다.

| loopback 종류 | 되돌리는 위치 | 통과하면 확인되는 것 | 실패하면 의심할 곳 |
|---|---|---|---|
| 근단 PCS | 우리 칩의 PCS 안쪽 | 컨트롤러와 디지털 경로 | 컨트롤러·PCS 설정이나 설계 |
| 근단 PMA | 우리 칩의 SerDes 아날로그 끝 | 우리 칩의 송수신 회로 전체 | SerDes 설정·전원·PLL 또는 칩 자체 |
| 원단(far-end) | 상대 장치의 수신부 | 채널과 상대 장치 수신부까지 | 보드 채널·커넥터 또는 상대 장치 |

시험 순서는 안쪽에서 바깥쪽으로 갑니다. 근단 PCS가 통과하면 근단 PMA를 보고, 그것도 통과하면 원단으로 넓힙니다. 처음 실패하는 지점이 문제의 경계가 됩니다. 근단 PMA까지는 깨끗한데 원단에서만 실패한다면, 우리 칩보다는 채널이나 상대 쪽을 봐야 합니다.

주의할 점이 있습니다. loopback의 이름과 지원 범위는 SerDes IP와 칩마다 다릅니다. 어떤 칩은 PMA 안에서도 여러 지점을 고를 수 있고, 어떤 칩은 원단 loopback을 지원하지 않습니다. 원단 loopback은 상대 장치가 그 모드를 지원해야 하므로, 시험용 장비나 같은 칩 두 개를 마주 보게 붙인 보드를 쓰는 경우가 많습니다. 어떤 loopback을 쓸 수 있는지는 해당 칩의 SerDes 문서에서 확인해야 합니다.

## PRBS와 BER 테스트

loopback으로 신호를 되돌렸다면, 무엇을 보내고 어떻게 채점할지가 필요합니다. 여기서 쓰는 것이 **PRBS**(pseudo-random binary sequence, 정해진 규칙으로 만드는 무작위처럼 보이는 비트열)입니다. 무작위처럼 보이니 다양한 비트 조합이 고르게 나오고, 규칙이 정해져 있으니 받는 쪽도 기대값을 똑같이 만들어 비교할 수 있습니다. 받아쓰기 시험에서 선생님이 문장을 미리 알고 있으니 채점할 수 있는 것과 같습니다. PRBS7, PRBS31처럼 다항식 길이에 따라 이름이 붙고, 긴 PRBS일수록 더 다양한 패턴을 담습니다.

채점 결과는 **BER**(bit error rate, 보낸 비트 중 틀린 비트의 비율)로 나타냅니다. 고속 링크는 아주 낮은 BER을 목표로 합니다. 예를 들어 1조 비트에 한 번 틀리는 수준인 $10^{-12}$ 정도를 목표로 두는 규격이 많습니다. 정확한 목표값은 사용하는 링크 규격과 속도를 기준으로 확인해야 합니다.

문제는 이렇게 낮은 BER을 "증명"하려면 엄청나게 많은 비트를 보내야 한다는 점입니다. 에러가 0개라는 결과도, 몇 비트를 보냈는지에 따라 의미가 다릅니다. 통계적으로 에러 없이 N비트를 보냈을 때, 신뢰 수준 CL로 BER이 목표값 이하라고 말하려면 다음 관계가 필요합니다.

$$
N \geq \frac{-\ln(1 - CL)}{\text{BER}_{\text{target}}}
$$

아래 스크립트는 이 식으로 필요한 비트 수와 측정 시간을 계산합니다. lane 속도를 넣으면 몇 초 동안 에러 0개를 유지해야 하는지 알 수 있습니다.

```python
import math

def bits_needed(ber_target, confidence=0.95):
    return -math.log(1.0 - confidence) / ber_target

def seconds_needed(ber_target, gbps, confidence=0.95):
    return bits_needed(ber_target, confidence) / (gbps * 1e9)

for gbps in (8.0, 16.0, 32.0):
    n = bits_needed(1e-12)
    t = seconds_needed(1e-12, gbps)
    print(f"{gbps:5.1f} Gb/s: {n:.2e} bits, {t:6.1f} s with zero errors")
```

95% 신뢰 수준이면 대략 $3 \times 10^{12}$비트가 필요합니다. lane 속도가 수십 Gb/s라면 수십 초에서 몇 분이면 되지만, 여러 온도와 전압 조건, 여러 lane에서 반복하면 시간이 금방 쌓입니다. 그래서 bring-up 초반에는 짧게 돌려 큰 문제를 걸러 내고, 마진 확인 단계에서 길게 돌리는 방식으로 나눕니다.

PRBS 시험을 켜고 끄는 방법은 칩마다 다릅니다. 아래 코드는 흐름만 보여 주는 **예시**입니다. 레지스터 이름과 비트 정의는 가상이며, 실제로는 해당 SerDes의 레지스터 문서나 벤더 진단 도구를 따릅니다.

```c
/* 예시 흐름: 레지스터 이름은 가상 */
void prbs_check_lane(int lane, uint32_t seconds)
{
    serdes_write(lane, SD_LOOPBACK_SEL, LOOPBACK_NEAR_PMA);  /* 근단 PMA loopback */
    serdes_write(lane, SD_PRBS_GEN_CTRL, PRBS31 | GEN_EN);    /* 송신: PRBS31 생성 */
    serdes_write(lane, SD_PRBS_CHK_CTRL, PRBS31 | CHK_EN);    /* 수신: 같은 규칙으로 비교 */
    serdes_write(lane, SD_PRBS_ERR_CLR, 1);

    if (!(serdes_read(lane, SD_PRBS_CHK_STAT) & CHK_LOCKED)) {
        log_lane(lane, "checker not locked");                  /* 패턴 동기부터 실패 */
        return;
    }
    sleep_s(seconds);
    log_lane_count(lane, serdes_read(lane, SD_PRBS_ERR_CNT));  /* lane별 에러 수 기록 */
}
```

코드에서 checker가 lock되지 않는 경우를 따로 본 것은 의미가 있습니다. 에러 카운트가 크다는 것은 "신호는 오는데 자주 틀린다"는 뜻이고, lock조차 안 된다는 것은 "알아볼 수 있는 신호가 거의 안 온다"는 뜻입니다. 앞의 경우는 마진이나 equalization 문제일 가능성이 크고, 뒤의 경우는 신호 경로 자체가 끊겼거나 설정이 완전히 틀렸을 가능성이 큽니다.

## eye 측정과 equalization

BER은 "얼마나 틀리는가"를 알려 주지만 "왜 틀리는가"는 알려 주지 않습니다. 그 답을 보려면 신호의 모양을 봐야 합니다. 이때 쓰는 그림이 **eye diagram**(수많은 비트의 파형을 한 비트 주기 폭으로 겹쳐 그린 그림)입니다. 겹쳐 그린 선들 사이에 눈 모양의 빈 공간이 생기는데, 이 눈이 크게 뜨여 있을수록 수신기가 0과 1을 가를 여유가 큽니다.

![Eye diagram 읽기 — 겹쳐 그린 신호 사이의 빈 공간이 eye이고, 그 높이와 폭이 클수록 여유가 크며, 신호가 규격 마스크를 침범하면 실패다](/images/blog/debugging/embedded/diagrams/ch18-eye-anatomy.svg)

| eye 모양 | 의미 | 흔한 원인 |
|---|---|---|
| 높이가 낮음 | 0과 1의 전압 차이가 작음 | 채널 손실이 큼, 송신 세기 부족 |
| 폭이 좁음 | 비트 경계의 타이밍이 흔들림 | 지터(클럭·전원 노이즈), 반사 |
| 위아래가 비대칭 | 신호 기준점이 틀어짐 | 종단·DC 레벨 문제 |
| 특정 lane만 작음 | 그 lane의 채널만 나쁨 | 배선·비아·커넥터 접촉 |

eye는 고속 오실로스코프로 직접 측정하기도 하고, 칩 안의 SerDes가 제공하는 eye 모니터 기능으로 대략 그려 보기도 합니다. 많은 SerDes IP가 수신기의 판정 시점과 기준 전압을 조금씩 옮겨 가며 에러를 세는 방식으로 eye를 추정하는 기능을 제공합니다. 다만 이 기능의 유무와 정밀도는 IP마다 다르므로, 같은 칩에서 같은 방식으로 잰 값끼리만 비교해야 합니다.

eye가 작다면 **equalization**(채널을 지나며 생긴 신호 왜곡을 송신기나 수신기에서 보정하는 기술)을 조정합니다. 고속 신호는 보드 배선을 지나면서 고주파 성분이 더 많이 깎여 모서리가 뭉개집니다. 먹먹한 방에서 음악을 들을 때 오디오 이퀄라이저로 고음을 올려 주는 것과 같은 원리로, 깎일 성분을 미리 키우거나 받은 뒤 되살립니다.

- **송신 쪽:** 비트가 바뀌는 순간을 강조하고 같은 값이 이어질 때는 세기를 낮춥니다. 규격에 따라 de-emphasis, pre-shoot 같은 이름으로 부릅니다.
- **수신 쪽:** **CTLE**(continuous-time linear equalizer, 고주파 성분을 키워 채널 손실을 보상하는 회로)와 **DFE**(decision feedback equalizer, 앞서 판정한 비트를 이용해 그 비트가 남긴 간섭을 빼 주는 회로)를 씁니다.

이 조정을 사람이 손으로만 하던 시대는 지났습니다. 예를 들어 PCIe는 3.0 세대부터 링크 training 과정에 equalization 절차를 넣어서, 양쪽 장치가 서로의 송신 설정을 조정해 가며 최적점을 찾게 했습니다. 그래서 bring-up에서는 자동 equalization이 고른 결과를 기록하고, 그 결과가 lane마다 비슷한지 보는 일이 중요한 단서가 됩니다. 한 lane만 극단적인 설정에 가 있다면 그 lane의 채널이 유난히 나쁘다는 신호입니다. 또 PCIe 6.0처럼 신호 하나에 네 가지 전압 레벨을 쓰는 PAM4 방식에서는 eye가 위아래로 세 개 생기므로, 여유가 더 좁아지고 측정도 더 까다로워집니다.

## 물리 계층이 살아난 뒤 — LTSSM으로 넘기기

모든 lane에서 원단 loopback과 PRBS가 목표 시간 동안 깨끗하고, eye가 lane끼리 고르다면 물리 계층은 확인됐다고 볼 수 있습니다. 이제 다시 정상 모드로 돌아가 링크 training을 돌리고, LTSSM이 어디까지 가는지 봅니다. 이 단계의 진단은 PCIe Deep Dive의 물리 계층·트러블슈팅 글과 이 시리즈 Ch 8에서 다룬 흐름을 따르면 됩니다.

물리 계층 확인을 마치고 프로토콜 쪽으로 넘길 때는 다음 정보를 함께 남깁니다. 나중에 링크 문제가 다시 생겼을 때, 물리 계층이 그때도 정상이었는지 판단할 기준이 됩니다.

- lane별 loopback 종류와 PRBS 시험 시간, 에러 수
- lane별 eye 높이·폭(같은 방법으로 잰 값)
- 자동 equalization이 고른 송수신 설정값
- 시험한 온도·전압 조건과 보드·칩 식별자

이 정보가 있으면 LTSSM 단계에서 문제가 생겨도 "물리 계층은 이미 확인됐다"고 말할 근거가 생깁니다. 반대로 이 기록 없이 LTSSM 로그만 보면, 원인이 물리 계층인지 프로토콜인지 계속 헷갈리게 됩니다.

## 작은 예시 — x4가 x2로 내려앉을 때

x4로 설계한 링크가 x2로만 올라오는 사례를 근단에서 원단 순서로 따라가 보겠습니다. 보드 이름과 수치는 가상입니다.

1. **증상:** x4로 설계한 PCIe 링크가 항상 x2로만 올라옵니다. SW 쪽에서는 링크 폭이 2로 보이고 성능이 절반입니다.
2. **근단 시험:** lane 0~3 모두 근단 PMA loopback에서 PRBS31이 에러 없이 통과합니다. 우리 칩의 송수신 회로는 정상으로 보입니다.
3. **원단 시험:** 상대 장치를 원단 loopback 모드로 두자 lane 0~1은 깨끗하고, lane 2~3에서 에러가 쏟아집니다. 문제는 채널이나 상대 쪽으로 좁혀집니다.
4. **eye와 equalization:** eye 모니터로 보니 lane 2~3의 eye 높이가 유독 낮고, 자동 equalization도 송신 강조를 최대치로 올려 놓았습니다. 채널 손실이 비정상적으로 크다는 신호입니다.
5. **HW 확인:** 다른 상대 장치로 바꿔도 같은 lane이 나쁘고, 다른 보드에서는 x4가 정상입니다. HW 팀이 해당 보드의 커넥터를 확인하니 lane 2~3 쪽 핀의 접촉이 불량이었습니다.

이 판정에서 결정적이었던 것은 근단과 원단의 결과 차이였습니다. 근단이 깨끗했기 때문에 칩과 SerDes 설정을 의심하는 데 시간을 쓰지 않았습니다.

## 자주 하는 실수

- **LTSSM 로그부터 봅니다.** 물리 계층이 불안정하면 LTSSM은 매번 다른 곳에서 멈춰서, 프로토콜 문제처럼 보이게 만듭니다.
- **짧은 PRBS 결과로 결론을 냅니다.** 몇 초 동안 에러가 없었다고 목표 BER을 만족한다고 말할 수 없습니다. 필요한 비트 수를 먼저 계산합니다.
- **다른 방법으로 잰 eye를 비교합니다.** 오실로스코프 측정과 칩 내부 eye 모니터의 값은 기준이 달라서 직접 비교하면 안 됩니다.
- **equalization 결과를 기록하지 않습니다.** 자동 조정이 매번 같은 값을 고른다고 가정하면, 간헐적으로 나쁜 설정이 선택되는 문제를 놓칩니다.
- **상대 장치를 하나만 써 봅니다.** 상대 장치 하나와의 궁합 문제를 우리 칩의 문제로 오해할 수 있습니다. 가능하면 상대를 바꿔 봅니다.

## 정리

- SerDes는 병렬 데이터를 고속 직렬 신호로 바꾸고 되돌리는 회로이고, 이 층이 흔들리면 LTSSM은 증상만 보여 줍니다.
- 링크 문제는 기준 클럭·PLL부터 확인하고, 그다음 물리 계층의 비트 전달을 확인합니다.
- loopback은 **근단 PCS → 근단 PMA → 원단** 순으로 넓혀 가며, 처음 실패하는 지점이 문제의 경계입니다.
- PRBS는 받는 쪽이 기대값을 알 수 있는 무작위 비트열이고, BER은 틀린 비트의 비율입니다. 낮은 BER을 말하려면 필요한 비트 수를 통계적으로 계산해야 합니다.
- eye diagram의 높이와 폭은 여유를 보여 주고, equalization은 채널 손실을 송수신 양쪽에서 보정합니다.
- 자동 equalization 결과가 lane마다 비슷한지 보면 나쁜 채널을 찾는 단서가 됩니다.
- 물리 계층 확인 결과를 기록으로 남긴 뒤 LTSSM 진단으로 넘깁니다.

## 다음 장 예고

다음 장에서는 post-silicon 회의에서 가장 자주 나오는 질문인 **"HW냐 SW냐"**를 다룹니다. 전압·온도·주파수를 바꿔 가며 그리는 shmoo plot, 캐시와 MMU를 켜면 죽는 문제, coherency와 메모리 순서 버그를 판정하는 방법을 정리합니다.

## 관련 항목

- [Ch 17: 메모리 bring-up triage](/blog/tools/debugging/embedded/chapter17-memory-bringup)
- [Ch 19: HW냐 SW냐](/blog/tools/debugging/embedded/chapter19-hw-or-sw-triage)
- [Ch 8: CXL Link Training 디버깅](/blog/tools/debugging/embedded/chapter08-cxl-link-debug) — LTSSM과 protocol analyzer
- [PCIe Deep Dive Ch 16: Troubleshooting](/blog/embedded/hardware/pcie/chapter16-troubleshooting) — 링크 training 실패·속도 저하 시나리오
- [PCIe Deep Dive Ch 9: Physical Layer](/blog/embedded/hardware/pcie/chapter09-physical-layer) — 물리 계층과 LTSSM 상태
- [Ch 11: 전원·클럭·리셋 디버깅](/blog/tools/debugging/embedded/chapter11-power-clock-reset) — 기준 클럭과 PLL lock
