---
title: "Ch 5: I²C 심화 — Repeated Start, 10-bit, Clock Stretching, Multi-Master"
date: 2027-03-01T05:00:00
description: "Repeated Start로 read, 10-bit 주소로 1024 슬레이브, clock stretching으로 느린 슬레이브 대응."
series: "Embedded Protocols 심화"
seriesOrder: 5
tags: [i2c, repeated-start, 10bit, clock-stretching, multi-master, smbus, i3c]
draft: true
---

## 한 줄 요약

> **"I²C의 진짜 어려움은 변종에 있다"** — Repeated Start, 10-bit, Clock Stretching, Arbitration. 그리고 후속 표준 SMBus·PMBus·I³C.

## Repeated Start — Read 트랜잭션의 핵심

레지스터를 *읽으려면* 두 단계:
1. **Write** — 어느 레지스터를 읽을지 슬레이브에 알림.
2. **Read** — 그 레지스터 값을 받음.

두 단계 사이에 **Stop을 보내면** 다른 마스터가 끼어들 수 있습니다. 그래서 *Stop 대신 Repeated Start* (Sr).

```text
S | addr+W | A | reg=0x75 | A |
Sr | addr+R | A | data | NA | P
```

Sr은 *원자성*을 보장 — read 도중 다른 마스터의 트랜잭션이 끼어들 수 없음.

## 10-bit Addressing

7-bit로 부족하면 10-bit 모드. 첫 바이트가 *예약된 prefix*로 시작.

```text
바이트 1:  1 1 1 1 0 A9 A8 R/W
바이트 2:  A7 A6 A5 A4 A3 A2 A1 A0
```

`1111 0xxx` prefix가 "이건 10-bit 주소" 신호. 그 다음 바이트가 하위 8비트. 1024개 주소 공간.

실무에선 거의 안 씁니다. 7-bit (112개)로 충분하고 *디바이스 지원이 드물어서*.

## Clock Stretching — 느린 슬레이브의 권한

슬레이브가 *데이터 준비가 안 됐을 때* SCL을 Low로 잡아 마스터를 기다리게 함. Open-drain이라 가능.

```text
마스터 SCL 펄스 시도 → 슬레이브가 SCL Low로 잡음
                  → 마스터는 SCL High를 못 보고 대기
                  → 슬레이브 준비 완료 → SCL 풀업으로 복귀
                  → 마스터 SCL High 감지 → 다음 비트
```

### 흔한 시나리오

- 슬레이브 MCU가 인터럽트로 데이터 준비 (지연 변동)
- 슬레이브가 EEPROM에 write 후 ACK 전 internal write cycle 대기
- ADC 변환 중

### 함정

일부 호스트 SoC (Raspberry Pi Broadcom) **clock stretching을 제대로 안 함**. 슬레이브가 stretch하면 마스터가 *바로 다음 비트 보냄* → 데이터 깨짐. 해결책 — 슬레이브 디바이스를 *non-stretching 방식*으로 운영 (예: 폴링 후 read).

## Multi-Master + Arbitration

I²C는 *원래* 멀티 마스터 가능. 두 마스터가 동시에 Start 하면 — *SDA wired-AND*가 자동 중재.

```text
Master A: SDA = 1 (전송)
Master B: SDA = 0 (전송)
실제 SDA = 0 (wired-AND)
Master A는 자기 데이터(1)와 실제(0)가 다름 감지 → 양보
```

규칙 — **자기 데이터와 실제 SDA가 다르면 양보**. 실무에선 모던 시스템에서 거의 multi-master를 안 씁니다 (CAN으로 가는 게 깔끔).

## I²C MUX·Switch — 같은 주소 슬레이브 여러 개

같은 I²C 주소를 가진 디바이스 2개 이상 — 같은 버스에 못 붙음. **I²C MUX**가 답.

### PCA9548 (TI, 8 채널 MUX)

| 동작 | 설명 |
| --- | --- |
| 마스터가 MUX 자체에 *명령 바이트* 송신 (`0x70` 기본 주소) | "지금부터 채널 X를 활성화" |
| MUX가 *선택된 채널*만 메인 버스에 연결 | 나머지 채널 isolation |
| 슬레이브 트랜잭션 정상 진행 | 슬레이브는 MUX 존재 모름 |
| 채널 변경 시 MUX 재명령 | `write(0x70, 1 << ch)` |

### 토폴로지

```text
              [Master]
                 │
              [MUX 0x70]
            ╱   │   │   ╲
       CH0  CH1  CH2  ... CH7
        │    │
    [Sensor 0x68]  [Sensor 0x68 (2nd)]   ← 같은 주소, 다른 채널
```

### PCA9548 (스위치, 격리) vs PCA9543 (스위치, 비격리) vs PCA9542 (먹스, 단일 채널만)

- **MUX** — 한 번에 *한 채널*만 (낮은 전력)
- **Switch** — 여러 채널 *동시* 가능 (broadcast 시)
- **Isolation** — 채널끼리 전기 격리 (다른 V_DD level 혼용 가능)

### Linux 지원

```dts
&i2c1 {
    pca9548@70 {
        compatible = "nxp,pca9548";
        reg = <0x70>;
        #address-cells = <1>;
        #size-cells = <0>;

        i2c@0 {  // CH 0
            #address-cells = <1>;
            #size-cells = <0>;
            reg = <0>;
            sensor_a: imu@68 {
                compatible = "invensense,mpu6050";
                reg = <0x68>;
            };
        };
        i2c@1 {  // CH 1 — 같은 주소 다른 인스턴스
            reg = <1>;
            sensor_b: imu@68 {
                compatible = "invensense,mpu6050";
                reg = <0x68>;
            };
        };
    };
};
```

각 채널이 *별도 i2c bus* — `/dev/i2c-N`이 채널별 생성.

## I³C HDR-DDR·TSP·TSL — 고속 모드 4종

I³C는 기본 *push-pull SDR 12.5 MHz*. 더 빠르려면 *HDR (High Data Rate) 모드* 4종:

| HDR 모드 | 인코딩 | 최대 속도 |
| --- | --- | --- |
| **HDR-DDR** | Double Data Rate (rising + falling 양쪽 샘플) | 25 Mbps |
| **HDR-TSP** | Ternary Symbol Pure (3-symbol) | 37.5 Mbps |
| **HDR-TSL** | Ternary Symbol Legacy (I²C-compat 보장) | 33 Mbps |
| **HDR-BT** | Bulk Transfer (SDR-과 다른 frame) | 12.5 Mbps × 멀티 |

### Mode 전환

마스터가 *Common Command Code* (CCC) `ENTHDR0/1/2/3`을 전송 → 모든 노드가 *HDR 모드 진입*. 트랜잭션 끝나면 `HDR Exit Pattern`으로 SDR 복귀.

### 사용처

- **HDR-DDR** — 가장 흔함, 25 Mbps 충분 (이미지 압축 메타데이터 등)
- **HDR-TSP** — 고대역 센서 (라이다, 카메라)
- **HDR-TSL** — I²C 슬레이브와 *공존*해야 할 때

I³C 어댑터는 *Adesto Tech ATIC32* 등 신규 IP. 임베디드 채택은 *자동차·HMD*에서 점진적.

## SMBus — I²C의 산업 변종

System Management Bus. *PC 마더보드*에서 ACPI·배터리·전원 관리에 쓰임. 기본 I²C와 호환되지만 추가 제약:

| 항목 | I²C | SMBus |
| --- | --- | --- |
| 최소 클럭 | 0 (정지 OK) | 10 kHz 이상 |
| 최대 클럭 | 100k/400k/1M/3.4M | 100 kHz (보통), 400 kHz (rev 2) |
| Timeout | 없음 | 25-35 ms (T_TIMEOUT) |
| PEC (CRC) | 없음 | 옵션 |
| Address | 7-bit | 7-bit |
| 명령 형식 | 자유 | 정형 (Quick·Byte·Word·Block) |

### 자주 만나는 SMBus 명령

- `Quick Command` — 주소 + R/W만, 데이터 없음 (디바이스 발견)
- `Read Byte` — 1 바이트
- `Read Word` — 2 바이트
- `Block Read` — N 바이트 (첫 바이트가 N)

`PMBus`는 SMBus 위에 *전원 관리*에 특화된 표준 (서버 PSU, VRM 등).

## I³C — 차세대 I²C

MIPI Alliance가 만든 후속 표준. 2017년 발표. 핵심 신기능:

| 기능 | I²C | I³C |
| --- | --- | --- |
| 클럭 | ~3.4 MHz | 12.5+ MHz (push-pull HDR 시 25 MHz) |
| 풀업 | 필수 | 옵션 (push-pull mode) |
| 주소 | 정적 7-bit | **동적 할당** (DAA) |
| In-band IRQ | 없음 (별도 INT 핀) | **있음** (슬레이브가 마스터 IRQ) |
| 호환성 | — | I²C 슬레이브 *backward compatible* |
| 명령 셋 | 자유 | **CCC** (Common Command Codes) 표준 |

자동차·HMD·고급 센서에서 채택. 보드 핀 줄이고 *동적 환경*에 강함.

## STM32 HAL — Repeated Start 예제

```c
// MPU6050 가속도 X-axis (0x3B, 0x3C) read
uint8_t reg = 0x3B;
uint8_t buf[2];

// Sr 자동 — Mem_Read 함수 내부에서
HAL_I2C_Mem_Read(&hi2c1, 0x68 << 1,
                 reg, I2C_MEMADD_SIZE_8BIT,
                 buf, 2, HAL_MAX_DELAY);

int16_t accel_x = (buf[0] << 8) | buf[1];
```

`HAL_I2C_Mem_Read`는 내부적으로 **Write addr → Sr → Read N bytes → P** 시퀀스 자동 생성.

## 자주 하는 실수

> ⚠️ Write-then-Read를 Stop으로

`Mem_Read` 대신 `Master_Transmit` + `Master_Receive`로 분리하면 *Stop이 끼어*들어 atomicity 깨짐. 일부 슬레이브는 동작하지만 *권장 아님*.

> ⚠️ Clock Stretching 미지원 보드에 stretching 슬레이브

라즈베리 파이 + EEPROM (write cycle 동안 stretch) — *간헐적 NACK*. 해결: write 후 `usleep(5000)` 폴링 또는 다른 호스트.

> ⚠️ Multi-master를 가정한 설계

I²C multi-master는 *이론*에는 있지만 *실무 신뢰성*은 낮음. 정 필요하면 CAN으로 옮기는 게 안전.

> ⚠️ I³C로 갈아탈 때 I²C 슬레이브 풀업 유지 잊음

I³C는 push-pull 모드라 풀업 없이 동작 가능 — 그러나 *I²C legacy slave*가 있으면 풀업 필수.

## 정리

- **Repeated Start**가 read 트랜잭션의 atomicity를 만든다.
- **10-bit 주소**는 거의 미사용 (7-bit로 충분).
- **Clock Stretching**으로 느린 슬레이브 대응 — 일부 호스트가 미지원.
- **Multi-master**는 가능하지만 실무에선 회피.
- SMBus·PMBus·**I³C**가 산업·차세대 변종.

다음 편은 **I²C 디버깅** — 로직 분석기 캡처 패턴, 흔한 오류 시그니처.

## 관련 항목

- [Ch 4: I²C 기초](/blog/embedded/protocols/embedded-serial/chapter04-i2c-basics)
- [Ch 6: I²C 디버깅](/blog/embedded/protocols/embedded-serial/chapter06-i2c-debugging)
