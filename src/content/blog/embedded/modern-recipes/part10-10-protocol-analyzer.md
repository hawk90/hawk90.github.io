---
title: "통신 프로토콜 분석 — Logic Analyzer와 Protocol Decoder"
slug: "embedded/modern-recipes/part10-10-protocol-analyzer"
date: 2026-04-19T09:09:00
description: "logic analyzer 캡처를 protocol decoder로 풀 때 설정이 결과를 어떻게 바꾸는지 Icarus로 만든 UART·SPI 파형과 Python decoder로 직접 보이고, SPI flash BUSY·I2C NACK·CAN·오실로스코프 판단 기준을 데이터시트로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 120
tags: [recipes, debugging, logic-analyzer]
topics: ["embedded"]
---

## 한 줄 요약

> **"Sender와 receiver가 *다른 메시지를 보고 있을 때*, 코드 측에서 답은 안 나옵니다."** Logic analyzer로 *전선 위*의 진짜 비트를 잡아 둘 중 누가 맞는지를 결정합니다.

## 어떤 상황에서 쓰나

UART RX가 가끔 깨진 바이트를 받거나, SPI flash가 이상한 값을 돌려주거나, I2C 센서가 NACK을 줄 때입니다. 이때 먼저 정할 것은 선 위의 신호가 맞는데 코드가 잘못 읽는지, 선 위의 신호부터 틀렸는지입니다. logic analyzer는 선 위의 0과 1을 시간과 함께 기록하고, protocol analyzer(decoder)가 그 기록을 설정한 규칙대로 바이트로 풉니다. 그래서 decoder 결과는 *설정이 맞을 때만* 의미가 있습니다. 이 글은 그 점을 실제 파형 파일로 보여 줍니다.

## 캡처를 설정할 때 정하는 것

1. probe의 GND를 측정하려는 신호 가까운 보드 GND에 연결합니다.
2. 신호선에 probe를 겁니다.
3. sample rate를 정합니다. 측정하려는 가장 짧은 펄스나 비트보다 샘플 간격이 충분히 짧아야 합니다. 115200 baud UART의 비트는 8.68 µs, 10 MHz SPI의 SCK 반주기는 50 ns입니다.
4. trigger와 pre-trigger 길이를 정합니다(아래 Trigger 절).
5. protocol analyzer를 붙이고 baud·비트 수·패리티(UART), CPOL/CPHA·비트 순서(SPI), 주소 길이(I2C)를 대상과 똑같이 맞춥니다.

장비별 sample rate·채널 수·입력 임계값은 제조사 사양서로 고르고, 이 글에서는 특정 제품의 수치를 싣지 않습니다.

## Decoder 설정이 틀리면 무엇이 보이나

보드 대신 Icarus Verilog 13.0으로 파형을 만들었습니다. 한 테스트벤치가 115200 baud 8N1로 `Hello\r\n`을 보내고, 이어서 SPI mode 0(10 MHz)으로 W25Q32JV의 JEDEC ID 읽기(MOSI `9F 00 00 00`, MISO `-- EF 40 16`, [1-05](/blog/embedded/modern-recipes/part1-05-spi-hardware))를 흉내 낸 뒤, 모든 신호를 VCD 파일로 남깁니다. 그 파일을 50여 줄짜리 Python decoder로 풀었습니다. UART decoder는 falling edge를 start bit로 보고 1.5비트 뒤부터 비트 가운데를 읽으며, SPI decoder는 CS가 low인 동안 CPHA에 맞는 SCK edge에서 데이터를 읽습니다.

```python
def uart(ev, baud):
    s = series(ev, 'tx'); bit = 1e12 / baud; out = []   # VCD time unit is 1 ps
    falls = [t for (t, v), (pt, pv) in zip(s[1:], s) if pv == 1 and v == 0]
    t_end = -1
    for f in falls:
        if f < t_end: continue
        b = 0
        for k in range(8):
            b |= level_at(s, f + bit * (1.5 + k)) << k
        stop = level_at(s, f + bit * 9.5)
        out.append((b, stop)); t_end = f + bit * 9.5
    return out

def spi(ev, cpha, sig):
    sck, d, cs = series(ev, 'sck'), series(ev, sig), series(ev, 'cs_n')
    edges = [t for (t, v), (pt, pv) in zip(sck[1:], sck) if pv != v and v == (1 if cpha == 0 else 0)]
    bits = [level_at(d, t) for t in edges if level_at(cs, t) == 0]
    return [sum(b << (7 - i) for i, b in enumerate(bits[j:j + 8])) for j in range(0, len(bits) - 7, 8)]
```

같은 캡처를 맞는 설정과 틀린 설정으로 풀었습니다.

```bash
iverilog -g2012 -o tb tb.v && vvp -n tb && python3 decode.py cap.vcd
```

```text
UART @115200: 48 65 6C 6C 6F 0D 0A  framing errors: 0
UART @57600: 82 C6 47 F3  framing errors: 3
SPI CPHA=0: MOSI 9F 00 00 00 | MISO 00 EF 40 16
SPI CPHA=1: MOSI 3E 00 00 00 | MISO 01 DE 80 2C
```

UART를 실제 baud(115200)로 풀면 `48 65 6C 6C 6F 0D 0A`, 즉 `Hello\r\n`이 나오고 framing error가 없습니다. 절반인 57600으로 풀면 바이트 수부터 다르고 stop bit 자리가 0이라 framing error가 세 번 납니다. SPI는 CPHA = 0(mode 0)으로 풀면 MISO에서 `EF 40 16`이 나오지만, CPHA = 1로 풀면 같은 선에서 `DE 80 2C`가 나옵니다. 한 비트씩 밀린 값입니다(0xEF를 한 칸 왼쪽으로 밀고 다음 바이트의 첫 비트가 들어오면 0xDE). 파형은 그대로인데 decoder 설정만 틀려도 이렇게 그럴듯한 다른 바이트가 나오므로, 이상한 값을 보면 코드나 배선보다 먼저 decoder 설정을 대상의 설정과 대조합니다.

## UART decode

신호 한 개(TX 또는 RX)와 GND를 잡고, baud·데이터 비트·패리티·stop 비트를 대상과 맞춥니다. 위 실행처럼 설정이 맞으면 보낸 바이트가 그대로 나옵니다. framing error가 섞이면 baud부터 대조하고, baud가 맞는데도 드물게 깨지면 [10-05](/blog/embedded/modern-recipes/part10-05-uart-not-printing)의 오차 예산과 전기적 상태(아래 오실로스코프 절)를 봅니다.

## SPI decode

![SPI capture decoded by protocol analyzer](/images/blog/modern-recipes/diagrams/part10-10-spi-capture.svg)

SCK·MOSI·MISO·CS 네 선을 잡고 CPOL·CPHA·비트 순서를 대상과 맞춥니다. W25Q32JV는 mode 0과 3을 지원하고 MSB first입니다(1-05). 위 실행처럼 CPHA만 틀려도 바이트가 한 비트씩 밀린 값으로 나옵니다.

### SPI flash가 busy에서 안 빠질 때

flash에 erase를 보낸 뒤 Read Status Register-1(05h)을 반복해 읽는 캡처에서 BUSY 비트(S0)가 계속 1이면, 먼저 그 명령에 걸리는 시간이 얼마인지 봅니다. W25Q32JV 데이터시트(Revision G)는 BUSY가 Sector Erase 등 명령 실행 중에 1이고 그동안 다른 명령을 무시한다고 적고, AC 특성 표에서 4 KB Sector Erase 시간 t_SE를 typ 45 ms, max 400 ms로 적습니다. 코드의 timeout이 400 ms보다 짧으면, 칩이 정상이어도 timeout이 납니다.

## I2C decode

SDA와 SCL 두 선을 잡고 주소 길이(7비트·10비트)를 맞춥니다. decoder는 START, 주소와 R/W, ACK/NACK, 데이터, repeated START, STOP을 차례로 보여 줍니다. 주소 바이트에서 NACK이 나오면 그 주소에 응답하는 디바이스가 없다는 뜻이고, 데이터 바이트의 NACK은 수신 측이 받지 않았거나 controller-receiver(master)가 마지막 바이트를 표시한 것입니다(UM10204 3.1.6, [1-06](/blog/embedded/modern-recipes/part1-06-i2c-hardware)). 주소 NACK이면 데이터시트의 7비트 주소와 주소 선택 핀의 연결을 대조합니다. MPU-6050의 경우 Linux 드라이버의 DT 예제가 0x68을 씁니다(1-06).

## CAN decode

transceiver 앞단의 logic-level 신호(CAN_TX나 CAN_RX) 하나를 잡고 bitrate를 맞춥니다. ACK 슬롯이 recessive로 남은 프레임은 그 프레임을 받은 다른 노드가 없다는 뜻입니다. 비트 시간이 예상과 다르면 BTR 설정을 다시 계산합니다. 42 MHz bxCAN의 1 Mbit/s 분할과 그 BTR 값은 [1-10](/blog/embedded/modern-recipes/part1-10-can-electrical)에 계산과 빌드 확인이 있습니다. CAN_H·CAN_L의 차동 전압 같은 전기적 상태는 logic analyzer가 아니라 오실로스코프로 봅니다.

## Trigger — 가끔 일어나는 사건 잡기

간헐적인 문제는 trigger 조건을 사건 자체로 겁니다. 예를 들면 SPI MOSI의 특정 명령 바이트, UART의 특정 패턴, I2C NACK, CAN의 특정 ID입니다. protocol trigger를 지원하는지는 장비마다 다르므로 장비 설명서로 확인합니다. pre-trigger를 함께 두면 trigger *전*의 파형도 남으므로, 깨진 바이트 직전에 무슨 일이 있었는지를 볼 수 있습니다.

## 오실로스코프 — 전기적 분석

logic analyzer는 임계값을 기준으로 0과 1만 기록하므로, 그 사이의 전압 모양은 남지 않습니다. 다음은 오실로스코프로 봅니다.

- 엣지 뒤 ringing과 overshoot: 반사·종단 문제([1-01](/blog/embedded/modern-recipes/part1-01-digital-signal-basics)의 반사 계산)
- 느린 상승: 드라이버 강도와 선로·probe 용량([1-03](/blog/embedded/modern-recipes/part1-03-gpio-internals)의 rise time 계산)
- high·low 레벨이 상대 칩의 V_IH·V_IL 안에 드는지(1-01의 레벨 표)

## 자주 보는 함정

> probe GND를 멀리 잡기

Tektronix *ABCs of Probes*(60W-6053-11)는 probe ground lead가 회로에 인덕턴스를 더하고, 길수록 빠른 펄스에서 ringing이 보일 가능성이 커진다고 적습니다(1-01). 측정에 보이는 ringing이 회로의 것인지 probe의 것인지 가리려면 GND를 신호 가까이 짧게 잡고 다시 봅니다.

> 입력 레벨 확인 없이 연결

analyzer 입력의 허용 전압과 임계값은 장비마다 다릅니다. 5 V 신호를 잴 때는 장비 사양에서 입력 최대 전압을 먼저 확인합니다.

> probe가 회로를 바꿈

probe를 연결하면 그 입력 용량과 저항이 신호선에 더해집니다(*ABCs of Probes*의 probe loading). 빠른 신호에서 probe를 걸었을 때와 뗐을 때 동작이 다르면 probe 영향부터 의심합니다.

> decoder 설정 오류

위 실행처럼 CPHA 하나, baud 하나가 틀려도 그럴듯한 다른 바이트가 나옵니다.

## 정리

- decoder 결과는 설정이 맞을 때만 의미가 있습니다. 같은 VCD를 CPHA = 1로 풀면 `EF 40 16`이 `DE 80 2C`로, 57600으로 풀면 `Hello`가 깨진 바이트와 framing error로 바뀝니다(실행 결과).
- sample 간격은 가장 짧은 비트·펄스보다 충분히 짧게 잡습니다.
- 간헐적인 사건은 그 사건을 trigger로 걸고 pre-trigger로 직전을 남깁니다.
- 전압 모양(ringing, 레벨)은 오실로스코프로 봅니다.
- SPI flash의 BUSY는 데이터시트의 erase 시간(W25Q32JV 4 KB: max 400 ms)과 비교합니다.

다음 편은 **로깅 시스템 설계**입니다.

## 관련 항목

- [10-05: UART 안 찍힐 때](/blog/embedded/modern-recipes/part10-05-uart-not-printing)
- [10-09: 타이밍/race 진단](/blog/embedded/modern-recipes/part10-09-timing-race-diag)
