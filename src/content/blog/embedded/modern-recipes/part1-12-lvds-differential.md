---
title: "LVDS 차동 신호 분석 — Common-Mode·Impedance·Eye Pattern"
slug: "embedded/modern-recipes/part1-12-lvds-differential"
date: 2026-04-10T09:12:00
description: "SN65LVDS31·SN65LVDS32 데이터시트 값으로 종단 여유, 차동 임피던스 불연속의 반사, 접지 전위차와 LVPECL·CML 직결 가능성, eye 판정 기준을 계산합니다."
series: "Modern Embedded Recipes"
seriesOrder: 12
tags: [recipes, lvds, hw-basics]
draft: false
topics: ["embedded"]
lastVerified: 2026-10-11
---

## 한 줄 요약

> **"LVDS 수신기는 차동 전압이 문턱 ±100 mV 밖에 있고 common-mode가 입력 범위 안에 들 때만 올바른 값을 냅니다."** 이 글은 SN65LVDS31 → SN65LVDS32 조합에서 이 두 조건의 여유를 데이터시트 최소·최대로 구하고, 종단·배선·접지 전위차·eye 측정이 그 여유를 얼마나 쓰는지 셉니다.

수치는 TIA/EIA-644 준수를 명시한 TI 드라이버 [SN65LVDS31 (SLLS261N, 2021-04 개정)](https://www.ti.com/lit/pdf/slls261n), 수신기 [SN65LVDS32 (SLLS262R, 2014-12 개정)](https://www.ti.com/lit/pdf/slls262r), TI(구 National) [LVDS Owner's Manual 4판 (SNLA187, 2008)](https://www.ti.com/lit/pdf/snla187)에서 가져왔습니다. 다른 부품을 쓰면 같은 계산에 그 부품의 데이터시트 값을 넣습니다. 차동 수신과 종단의 기본은 [앞 편 1-11](/blog/embedded/modern-recipes/part1-11-rs485-rs422)을, eye 가로 축이 이어지는 setup/hold는 [1-01](/blog/embedded/modern-recipes/part1-01-digital-signal-basics)을 전제로 합니다.

## 어떤 상황에서 쓰나

LVDS는 RS-422(TIA/EIA-422-B) 같은 5 V 차동 레벨을 낮춰 전력을 줄이고 스위칭 속도를 높이며 3.3 V 전원으로 동작하게 한 신호 방식입니다(SLLS261N 3절). Owner's Manual 3.6절은 parallel clock SerDes의 대표 용도로 노트북 디스플레이, 랙·셸프 간 datacom/telecom 연결, 비디오·카메라 링크를 듭니다(23쪽).

이 글의 기준 수신기 SN65LVDS32의 최대 권장 속도는 모든 수신기가 동작할 때 100 Mbps입니다(SLLS262R 6절). Owner's Manual 표 1-1(9쪽)이 LVDS 기술의 최대 데이터율로 든 3.125 Gbps와 30배 넘게 차이 나므로, 속도에 따라 달라지는 계산(eye 캡처 시간)은 100 Mbps로 셉니다. 같은 쪽에서 매뉴얼은 CML과 LVPECL이 공식 표준 기관이 관리하는 규격이 아니어서 업체마다 구현과 사양이 다르다고 씁니다. 그래서 LVPECL·CML과의 연결은 아래 "Common-mode — 접지 전위차와 다른 패밀리 직결"처럼 연결하려는 부품의 값으로 판정합니다.

## 핵심 개념

### 전류 모드 드라이버와 100 Ω 종단

LVDS 드라이버에는 nominal 3.5 mA 전류원이 있고, 수신기 입력 임피던스가 높아 이 전류가 거의 전부 100 Ω 종단으로 흐릅니다. 그래서 수신단 전압은 3.5 mA × 100 Ω = 350 mV(nominal)입니다(Owner's Manual 그림 1-1과 본문, 9~10쪽). 전류 방향을 바꾸면 크기는 같고 극성만 반대인 전압이 생기며, 이것이 1과 0입니다.

설계 판정에는 nominal이 아니라 데이터시트의 최소·최대를 씁니다. 드라이버 SN65LVDS31(SLLS261N 7.6절, 권장 동작 조건 전체)의 값입니다.

| 파라미터 | 최소 | 최대 | 조건 |
| --- | ---: | ---: | --- |
| VOD (차동 출력 전압 크기) | 247 mV | 454 mV | RL = 100 Ω, 그림 8-2 |
| VOC(SS) (정상상태 common-mode 출력) | 1.125 V | 1.375 V | 그림 8-3 |
| VOC(PP) (common-mode 출력 peak-to-peak) | — | 150 mV | 그림 8-3, −3 dB 대역 300 MHz 이상 장비로 측정 |

수신기 SN65LVDS32(SLLS262R)의 값입니다.

| 파라미터 | 최소 | 최대 | 조건 |
| --- | ---: | ---: | --- |
| VIT− / VIT+ (차동 입력 문턱) | −100 mV | +100 mV | 8.6절, 그림 7·표 1 |
| \|VID\| (차동 입력 크기) | 0.1 V | 0.6 V | 8.3절 권장 동작 조건 |
| VIC (common-mode 입력) | \|VID\|/2 | 2.4 V − \|VID\|/2 | 8.3절·그림 1, VCC > 3.15 V |

최악의 드라이버(VOD 247 mV)도 선로 손실을 빼면 수신기 문턱 100 mV보다 147 mV 큰 차동 전압을 줍니다. 이 147 mV가 선로 손실·반사·crosstalk에 쓸 수 있는 진폭 예산입니다.

종단을 50 Ω으로 잘못 달면 이 예산이 얼마나 남는지 같은 근사로 셉니다. 드라이버를 이상적인 전류원(출력 임피던스 무한대, 반사 계수 +1)으로 보면, VOD 247 mV 드라이버는 100 Ω 선로에 247 mV 파를 내보냅니다. 50 Ω 끝의 반사 계수는 (50 − 100)/(50 + 100) = −1/3이고, 반사파가 드라이버에서 다시 반사되어 돌아올 때마다 수신단 전압은 VOD의 2/3 → 4/9 → 14/27 → …로 진동하며 1/2(123.5 mV)로 수렴합니다. 최저점은 첫 왕복 뒤의 4/9 × 247 mV ≈ 109.8 mV입니다. 판정: 손실 없는 선로에서는 VIT+ 100 mV를 넘으므로 통과지만, 선로 손실과 crosstalk의 합이 9.8 mV를 넘으면 불합격입니다. 100 Ω 종단일 때의 147 mV와 비교하면 예산이 약 15분의 1로 줄어듭니다.

### 차동 임피던스 — 배선 형상이 예산을 얼마나 쓰나

결합된 두 선을 차동으로 구동하면 각 선의 임피던스가 odd-mode 임피던스이고, 두 odd-mode 임피던스의 합이 차동 임피던스 Zdiff입니다. 선폭·유전체와 함께 두 선의 간격 S가 결합을 정합니다(Owner's Manual 5.1절, 39쪽). 같은 쪽 그림 5-1의 edge-coupled 식은 다음과 같고, Z0는 같은 그림의 single-ended 식으로 선폭 W, 유전체 높이 H, 도체 두께 T, εr에서 구합니다.

- differential microstrip: Zdiff = 2 × Z0 × [1 − 0.48 × exp(−0.96 × S/H)]
- differential stripline: Zdiff = 2 × Z0 × [1 − 0.347 × exp(−2.9 × S/H)]

대괄호 항이 결합 때문에 차동 임피던스가 2 × Z0보다 작아지는 비율입니다. microstrip에서 S = 2H면 0.9296, S = H면 0.8162라서, 100 Ω을 맞추려면 단일선 Z0를 각각 53.8 Ω, 61.3 Ω으로 잡아야 합니다. stripline은 S = H에서도 0.9809라 결합이 Zdiff를 약 1.9%만 바꿉니다.

이 비율이 배선 중간에서 바뀌면 불연속이 됩니다. S = 2H로 100 Ω에 맞춘 microstrip pair에서 선폭은 그대로 두고 간격만 S = H로 좁아지는 구간이 있으면, 그 구간의 Zdiff는 100 × 0.8162/0.9296 ≈ 87.8 Ω이고 들어가는 지점의 반사 계수는 (87.8 − 100)/(87.8 + 100) ≈ −0.065입니다. 그 지점에서 반사되는 크기는 VOD 247 mV의 6.5%인 16 mV로, 147 mV 예산의 약 11%에 해당합니다. 매뉴얼이 선폭과 간격을 길이 전체에서 일정하게, 두 선을 대칭으로 두라고 하는 이유이고(39쪽), 부품 랜딩 패드와 via의 기생 용량도 같은 불일치를 만듭니다(5.4절, 42쪽).

### Common-mode — 접지 전위차와 다른 패밀리 직결

먼저 LVDS끼리입니다. 수신기 VIC 창(\|VID\|/2 ~ 2.4 V − \|VID\|/2)은 \|VID\|가 클수록 좁아집니다. 선로 손실은 \|VID\|를 줄여 창을 넓히므로, 최악은 손실이 없고 VOD가 최대 454 mV일 때이며 이때 창은 0.227~2.173 V입니다. 여기에 드라이버 VOC(SS) 1.125~1.375 V를 넣으면 두 노드의 접지 전위차 한계는 다음과 같습니다. 같은 틀의 CAN 트랜시버 계산은 [1-10](/blog/embedded/modern-recipes/part1-10-can-electrical)에 있습니다.

- 수신기 접지가 드라이버보다 높을 때: 1.125 − 0.227 = 0.898 V까지
- 수신기 접지가 드라이버보다 낮을 때: 2.173 − 1.375 = 0.798 V까지

SLLS262R 3절은 입력 common-mode 범위가 두 LVDS 노드 사이 1 V의 접지 전위차를 허용한다고 씁니다. 그러나 SN65LVDS31의 최대 VOD와 VOC(SS) 범위의 양 끝을 넣으면 두 방향 모두 1 V는 불합격이고, 이 조합의 한계는 수신기 접지가 낮은 방향의 0.80 V입니다. 전이 중의 common-mode 흔들림 VOC(PP) 최대 150 mV가 한쪽으로 모두 실리면 두 한계는 0.75 V와 0.65 V로 줄어듭니다.

다른 패밀리 출력을 SN65LVDS32에 직결할 수 있는지는 Owner's Manual 그림 4-6·4-7·4-9(35~36쪽)의 VOH/VOL로 판정합니다. \|VID\| = VOH − VOL, VOS = (VOH + VOL)/2이고, 기준은 위 수신기 표의 권장 동작 조건(VCC > 3.15 V)입니다.

| 출력 (그림) | VOH / VOL | VOS · \|VID\| | 판정 |
| --- | --- | --- | --- |
| LVDS (4-9) | 1.4 / 1.0 V | 1.2 V · 0.4 V | 통과 (허용 VIC 0.2~2.2 V) |
| LVPECL 3.3 V (4-7) | 2.3 / 1.5 V | 1.9 V · 0.8 V | 불합격: \|VID\| > 0.6 V |
| LVPECL 2.5 V (4-7) | 1.5 / 0.7 V | 1.1 V · 0.8 V | 불합격: \|VID\| > 0.6 V |
| CML 3.3 V (4-6) | 3.3 / 2.9 V | 3.1 V · 0.4 V | 불합격: VOS > 2.2 V |
| CML 2.5 V (4-6) | 2.5 / 2.1 V | 2.3 V · 0.4 V | 불합격: VOS > 2.2 V |

반면 Owner's Manual은 같은 그림에서 자사 LVDS 수신기의 입력 범위를 GND + 0.05 V ~ VDD − 0.05 V로 그리고, 넓은 입력 common-mode 범위 때문에 LVDS 입력을 "universal differential receiver"로 볼 수 있다고 씁니다(35쪽). VDD = 3.3 V라면 위 다섯 행의 VOS가 모두 그 범위 안입니다. 같은 "LVDS 수신기"라도 직결 여부는 그 수신기 데이터시트의 VIC·\|VID\| 범위로 갈립니다.

반대 방향인 LVDS → CML은 그림 4-10(37쪽)이 AC coupling으로 연결합니다. 그림의 CML 입력 범위는 VDD − 1.4 V ~ VDD라서, VDD = 3.3 V이면 1.9~3.3 V이고 LVDS VOS 1.2 V는 그 밖입니다. 매뉴얼은 AC coupling의 잠재적 단점으로 DC-balanced 데이터가 필요하다는 점을 들고, DC balance 없이 동작하는 예외로 DS64EV400 입력단을 듭니다(33쪽). blocking capacitor가 있으면 전이 때만 종단에 전류가 흐르고, 같은 비트가 길게 이어지면 두 수신 단자의 전하가 같은 값으로 수렴해 noise margin이 줄어듭니다(4.4절, 33쪽). 8b/10b 같은 부호화가 높은 수준의 DC balance를 보장합니다.

### Eye diagram으로 판정하기

Eye diagram은 여러 비트 구간을 겹쳐 rise/fall time, overshoot, ringing, 손실, zero-crossing jitter를 한 화면에 보여 줍니다(Owner's Manual 6.3절, 55쪽). SN65LVDS32 입력 단자에서 본 eye의 판정 기준은 다음과 같습니다.

- **차동 전압**: 샘플링 지점에서 eye의 위쪽 안쪽 경계가 +100 mV 위, 아래쪽 안쪽 경계가 −100 mV 아래에 있으면 통과입니다(VIT+·VIT−).
- **common-mode**: 같은 지점의 (VA + VB)/2가 위 "Common-mode — 접지 전위차와 다른 패밀리 직결"의 VIC 창 안이면 통과입니다.
- **가로 축**: SN65LVDS32는 출력에 pulse skew tsk(p)를 최대 0.4 ns 더합니다(8.8절, CL = 10 pF). 100 Mbps의 비트 10 ns에서는 4%입니다. 나머지 가로 기준은 수신기 출력을 받는 로직의 setup/hold로 정합니다.

시험 패턴에는 링크가 실제로 보내는 가장 긴 run이 들어 있어야 합니다. run이 길수록 선로의 유전체·표피 손실이 ISI 형태의 deterministic jitter를 키우기 때문입니다(55쪽). 8b/10b의 최대 run length는 5비트이고(26쪽), PRBS31에는 1이 31개 이어지는 구간이 있습니다(55쪽). 부호화하지 않은 데이터를 보내는 링크라면 PRBS31처럼 긴 run을 담은 패턴으로 봅니다.

캡처 시간도 판정에 들어갑니다. PRBS31의 최악 run은 패턴 한 주기(약 2³¹비트)에 한 번 나옵니다. 매뉴얼의 예는 3.125 Gbps에서 0.687 s이고(56쪽), 이 조합의 최대 권장 속도 100 Mbps(비트 10 ns)에서는 10 ns × 2³¹ ≈ 21.5 s입니다. 이보다 짧게 쌓은 eye는 최악 구간을 담았다는 보장이 없으므로 판정에 쓰지 않습니다.

eye가 문턱 안으로 닫히면 송신단 pre-emphasis·de-emphasis를 검토하는데, SN65LVDS31·SN65LVDS32 데이터시트에는 이 기능 항목이 없습니다. Owner's Manual 표 7-9(65쪽)에 따르면 pre-emphasis는 edge마다 overshoot를 더하고 수신 eye 열림은 PE가 없을 때와 같으며 전력이 늘고, de-emphasis는 정착 진폭을 DE 비율만큼 줄입니다. VOD 247 mV 드라이버에 표의 대표값 −3 dB de-emphasis를 걸면 정착 진폭은 247 × 10^(−3/20) ≈ 175 mV이고, 손실 없는 선로에서 남는 예산은 147 mV에서 75 mV로 줄어듭니다.

## 코드 / 실제 사용 예

LVDS 신호 레벨은 PHY나 I/O 버퍼가 만들므로, HDL이 정하는 것은 어느 핀을 어떤 I/O 표준으로 쓸지입니다. Xilinx FPGA에서는 차동 출력 버퍼 `OBUFDS`와 차동 입력 버퍼 `IBUFDS`에 `IOSTANDARD`를 지정합니다.

```verilog
OBUFDS #(
    .IOSTANDARD("LVDS_25")
) clk_out_buf (
    .O(CLK_P),
    .OB(CLK_N),
    .I(clk_int)
);

IBUFDS #(
    .IOSTANDARD("LVDS_25")
) data_in_buf (
    .O(data_int),
    .I(DATA_P),
    .IB(DATA_N)
);
```

Xilinx UNISIM 시뮬레이션 모델 [`OBUFDS.v`](https://github.com/Xilinx/XilinxUnisimLibrary/blob/1c8e05fd1e9a79ceb8b996a0996674122eed086f/verilog/src/unisims/OBUFDS.v)는 `bufif0(O, I, GTS)`와 `notif0(OB, I, GTS)`로, 전역 3-state 신호 `GTS`가 0일 때 `O`에 `I`를, `OB`에 `I`의 반전을 내보냅니다. [`IBUFDS.v`](https://github.com/Xilinx/XilinxUnisimLibrary/blob/1c8e05fd1e9a79ceb8b996a0996674122eed086f/verilog/src/unisims/IBUFDS.v)는 `I` = 1·`IB` = 0이면 `O` = 1, `I` = 0·`IB` = 1이면 `O` = 0을 내고, 두 입력이 모두 z(열림)이면 `O`를 x로 둡니다(`DQS_BIAS` = "TRUE"일 때만 0). 아래 "입력이 열렸을 때의 출력"의 SN65LVDS32처럼 열린 입력에서 HIGH를 내는 동작은 이 시뮬레이션 모델에 없습니다.

같은 라이브러리의 양방향 버퍼 모델 [`IOBUFDS.v`](https://github.com/Xilinx/XilinxUnisimLibrary/blob/1c8e05fd1e9a79ceb8b996a0996674122eed086f/verilog/src/unisims/IOBUFDS.v)는 `IOSTANDARD`가 `LVDS_25`이면 "100 Ω 차동에 최적화된 고정 임피던스 구조이고, turn-around 타이밍 요구가 없는 point-to-point 전송 전용이며, 버스 구조라면 BLVDS를 쓰라"는 DRC 경고를 냅니다. 위 "전류 모드 드라이버와 100 Ω 종단"의 100 Ω 전제가 FPGA 쪽 I/O 표준에도 들어 있습니다.

## 자주 보는 함정

> ⚠️ "LVDS"라고 적힌 출력이 TIA/EIA-644A를 만족하지 않음

Owner's Manual(9쪽)은 일부 업체 데이터시트가 LVDS(또는 pseudo-LVDS) I/O라고 하면서 common-mode 같은 중요한 파라미터가 규격을 만족하지 않는 경우가 있다고 경고합니다. 위 접지 전위차 계산에는 VOD·VOC·VIC의 최소·최대가 필요하므로, 데이터시트에 이 값이 없는 부품은 판정할 근거가 없습니다.

> ⚠️ 입력이 열렸을 때의 출력

SN65LVDS32의 fail-safe는 open-circuit만 다룹니다(SLLS262R 1절, 10.3.2절). 드라이버가 high-impedance가 되거나 케이블이 빠져 입력 전류가 거의 없으면, 각 선을 300 kΩ으로 VCC에 끌어올리고 약 2.3 V 문턱의 AND 게이트가 이를 감지해 출력을 HIGH로 둡니다. 데이터시트는 종단 Rt를 그림 10처럼 A–B 사이에 달면 이 기능에 영향이 없지만, 접지로 DC 전류를 흘리는 다른 종단 회로는 pull-up 전류를 이겨 fail-safe를 무력화할 수 있다고 씁니다(16쪽). 외부 bias로 idle 상태를 정하는 방식은 [1-11](/blog/embedded/modern-recipes/part1-11-rs485-rs422)의 fail-safe biasing을 봅니다.

## 정리

- 종단은 100 Ω입니다. 50 Ω으로 잘못 달면 SN65LVDS31 최소 VOD에서 손실 예산이 147 mV에서 9.8 mV로 줄어듭니다.
- 차동 pair의 간격을 길이 전체에서 일정하게 둡니다. microstrip에서 간격이 2H에서 H로 좁아지는 구간 하나의 입구 반사가 16 mV로, 예산의 약 11%입니다.
- SN65LVDS31 → SN65LVDS32의 접지 전위차 한계는 0.80 V이고, Owner's Manual의 LVPECL·CML 출력 예 네 가지는 SN65LVDS32에 직결할 수 없습니다.
- Eye는 샘플링 지점에서 ±100 mV 밖으로 열려 있어야 하고, 100 Mbps에서 PRBS31로 보면 21.5 s 이상 쌓아야 최악 run이 들어갑니다.

수정 이력: 2026-10-11 — 접지 전위차 한계를 VOD 최대 기준으로 다시 계산했습니다(1.0 V·0.90 V → 0.898 V·0.798 V). 50 Ω 종단 판정을 반사 진동의 최저값으로 바꾸고, eye 캡처 시간을 SN65LVDS32의 최대 권장 속도 100 Mbps로 다시 셌습니다. 차동 임피던스 식으로 계산한 형상 예와 불연속 반사를 더했습니다.

다음 편 [2-01: ARM Cortex-M 시리즈 비교](/blog/embedded/modern-recipes/part2-01-cortex-m-comparison)부터 Part 2 ARM 아키텍처로 넘어갑니다.

## 관련 항목

- [1-01: 디지털 신호 기초 — Voltage Level·Edge·Setup/Hold](/blog/embedded/modern-recipes/part1-01-digital-signal-basics)
- [1-10: CAN 버스 전기적 특성 — 종단·전압 레벨·GND 전위차](/blog/embedded/modern-recipes/part1-10-can-electrical)
- [1-11: RS-485·RS-422 차동 신호 분석](/blog/embedded/modern-recipes/part1-11-rs485-rs422)
- [11-01: FPGA 기초 분석 — LUT·FF·BRAM·DSP 자원 구조](/blog/embedded/modern-recipes/part11-01-fpga-basics) (IO Bank 절)
