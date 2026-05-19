---
title: "Ch 11: Linux SocketCAN — BSD Socket으로 CAN 다루기"
date: 2026-05-16T11:00:00
description: "AF_CAN socket — Raw·BCM·ISO-TP·J1939 4 종류. can-utils + vcan으로 PC에서도 시험."
series: "CAN Bus 심화"
seriesOrder: 11
tags: [socketcan, can-utils, linux, candump, vcan, j1939]
draft: true
---

## 한 줄 요약

> **"socket(AF_CAN, ...)"** — Linux 표준. CAN 트랜잭션이 *TCP/UDP와 같은 API*로.

## SocketCAN의 위치

Linux 2.6.25+ 표준 *서브시스템*. 옛 방식 (캐릭터 디바이스 ioctl)을 대체.

- 노드: `/sys/class/net/can0` (Ethernet처럼)
- API: BSD socket — `AF_CAN`, `PF_CAN`
- 도구: `can-utils` 패키지 — `candump`, `cansend`, `cangen`, `cansniffer`

> 💡 *Ethernet과 같은 인터페이스 모델* — `ip link set can0 up type can bitrate 500000` 으로 enable.

## 4 가지 Socket Protocol

| Protocol | 설명 | 사용처 |
| --- | --- | --- |
| **CAN_RAW** | 원시 frame send/recv | 디버깅·로깅 |
| **CAN_BCM** (Broadcast Manager) | cyclic 송신·필터링 by ID | 정기 메시지 |
| **CAN_ISOTP** | ISO 15765-2 자동 분할 (UDS) | OBD-II 진단 |
| **CAN_J1939** | J1939 stack (Address Claim, TP 자동) | 상용차 |

## CAN_RAW — 가장 기본

```c
#include <linux/can.h>
#include <linux/can/raw.h>

int sock = socket(PF_CAN, SOCK_RAW, CAN_RAW);

struct ifreq ifr;
strcpy(ifr.ifr_name, "can0");
ioctl(sock, SIOCGIFINDEX, &ifr);

struct sockaddr_can addr = {
    .can_family = AF_CAN,
    .can_ifindex = ifr.ifr_ifindex,
};
bind(sock, (struct sockaddr*)&addr, sizeof(addr));

// 송신
struct can_frame frame = {
    .can_id = 0x123,
    .can_dlc = 8,
    .data = {0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88},
};
write(sock, &frame, sizeof(frame));

// 수신
struct can_frame rx;
ssize_t n = read(sock, &rx, sizeof(rx));
printf("ID=0x%X DLC=%d\n", rx.can_id, rx.can_dlc);
```

### CAN FD 변형 — `canfd_frame`

```c
int enable = 1;
setsockopt(sock, SOL_CAN_RAW, CAN_RAW_FD_FRAMES, &enable, sizeof(enable));

struct canfd_frame fd;
fd.can_id = 0x123;
fd.len = 64;                                      // FD 페이로드
fd.flags = CANFD_BRS | CANFD_ESI;                 // BRS on
write(sock, &fd, sizeof(fd));
```

## Filter — 관심 ID만

```c
struct can_filter rfilter[2];
rfilter[0].can_id = 0x123;
rfilter[0].can_mask = CAN_SFF_MASK;
rfilter[1].can_id = 0x200;
rfilter[1].can_mask = 0x700;                      // 0x200-0x2FF 매치

setsockopt(sock, SOL_CAN_RAW, CAN_RAW_FILTER,
           rfilter, sizeof(rfilter));
```

페리퍼럴 단에서 필터링 → CPU 부담 ↓.

## Timestamp

```c
int enable = 1;
setsockopt(sock, SOL_SOCKET, SO_TIMESTAMP, &enable, sizeof(enable));

// recvmsg로 ancillary 데이터 추출
struct msghdr msg = {...};
struct cmsghdr *cmsg;
struct timeval tv;

recvmsg(sock, &msg, 0);
for (cmsg = CMSG_FIRSTHDR(&msg); cmsg; cmsg = CMSG_NXTHDR(&msg, cmsg)) {
    if (cmsg->cmsg_type == SO_TIMESTAMP) {
        tv = *(struct timeval*)CMSG_DATA(cmsg);
        printf("rx @ %ld.%06ld\n", tv.tv_sec, tv.tv_usec);
    }
}
```

µs 정확도. CAN frame이 *언제 수신됐는지* 정확히. 진단·기록에 필수.

## can-utils

### candump — 캡처

```bash
$ candump can0
  can0  123   [8]  11 22 33 44 55 66 77 88
  can0  7E8   [8]  03 41 0C 1F 40 00 00 00
  can0  18EEFF00  [8]  ...                  # J1939 29-bit
```

옵션:
- `-t a` — absolute timestamp
- `-l` — log to file (rotation)
- `-x` — extended view (DLC, flags)
- `123#` — ID 0x123 필터링
- `,#FFFFFFFF~~~` — error frame 캡처

### cansend — 한 메시지

```bash
$ cansend can0 123#1122334455667788
$ cansend can0 123#R                # Remote frame
$ cansend can0 123##8.1122334455667788   # CAN FD, BRS on
```

### cangen — 부하 생성

```bash
$ cangen can0 -g 4 -I 123 -L 8 -D random
                  ↑       ↑   ↑   ↑
                  4ms 간격  ID  8B  random data
```

부하 시험·penetration test에 필수.

### cansniffer — 변화 표시

같은 ID의 *데이터 변화*만 highlight. 디버깅에 강력.

```bash
$ cansniffer can0
  delta  ID    data
   1.0   123   11 22 33 44 55 66 77 88
   ----  ...
```

## 인터페이스 설정 — `ip link`

```bash
# bitrate 설정 + up
sudo ip link set can0 type can bitrate 500000 sample-point 0.875
sudo ip link set up can0

# CAN FD
sudo ip link set can0 type can \
    bitrate 500000 sample-point 0.875 \
    dbitrate 2000000 dsample-point 0.75 fd on
sudo ip link set up can0

# Listen-only mode
sudo ip link set can0 type can listen-only on

# Berr counters
sudo ip -s -d link show can0
```

`-s -d link show` — 통계 (TX/RX frames, errors, bus-off events).

## Virtual CAN — vcan

물리 CAN 인터페이스 없이 *시뮬레이션*. PC 개발·테스트에 필수.

```bash
sudo modprobe vcan
sudo ip link add dev vcan0 type vcan
sudo ip link set up vcan0

# 다른 터미널 — 통상 candump처럼
candump vcan0
# 또 다른 터미널
cansend vcan0 123#1122
```

CI/CD 자동 테스트에 활용 — 가상 CAN으로 *유닛 테스트*.

## 커널 CAN 드라이버

```bash
# 어떤 driver 사용 중?
dmesg | grep -i can
lsmod | grep can
```

| Driver | 칩 |
| --- | --- |
| `mcp251x` | Microchip MCP2515/MCP25625 SPI |
| `flexcan` | NXP i.MX, S32K |
| `peak_pci` | PEAK PCAN-PCI |
| `kvaser_pciefd` | Kvaser PCIe |
| `slcan` | Serial-Line CAN (USB-Serial adapter) |
| `can-cdc-acm` | USB CDC ACM 모드 일부 |

### DT 예 — MCP2515 (Raspberry Pi)

```dts
&spi0 {
    can0: mcp2515@0 {
        compatible = "microchip,mcp2515";
        reg = <0>;
        spi-max-frequency = <10000000>;
        clocks = <&can_osc>;              // 외부 8 MHz osc
        interrupt-parent = <&gpio>;
        interrupts = <25 2>;              // GPIO25, falling edge
    };
};
```

## ISO-TP socket — UDS 진단

UDS (ISO 14229) 메시지 전송 시 *프로토콜이 자동 분할*. `CAN_ISOTP` 사용.

```c
#include <linux/can/isotp.h>

int sock = socket(PF_CAN, SOCK_DGRAM, CAN_ISOTP);

struct sockaddr_can addr = {
    .can_family = AF_CAN,
    .can_ifindex = if_nametoindex("can0"),
    .can_addr.tp = {
        .tx_id = 0x7E0,        // OBD-II 진단 request
        .rx_id = 0x7E8,
    },
};
bind(sock, (struct sockaddr*)&addr, sizeof(addr));

// 큰 메시지 송신 (ISO-TP가 자동 분할)
uint8_t uds_req[] = {0x22, 0xF1, 0x90};   // Read VIN
write(sock, uds_req, sizeof(uds_req));

// 응답 받음 (분할 자동 재조합)
uint8_t resp[4096];
ssize_t n = read(sock, resp, sizeof(resp));
```

VIN(17 byte), DTC 리스트 등 *8 byte 초과* 데이터를 *raw socket으로 분할 코드 작성 안 하고* 받음.

## J1939 socket

10편에서 본 J1939 stack. 5.4+ 커널.

```c
int sock = socket(PF_CAN, SOCK_DGRAM, CAN_J1939);
// ... bind, send/recv (TP 자동, Address Claim 자동)
```

## Python 사용

`python-can` 라이브러리 — SocketCAN·virtual·USB-CAN 어댑터 모두 추상화.

```python
import can

bus = can.interface.Bus(channel='can0', bustype='socketcan', fd=True)

# 송신
msg = can.Message(arbitration_id=0x123, data=[0x11, 0x22],
                  is_extended_id=False, is_fd=True, bitrate_switch=True)
bus.send(msg)

# 수신
for msg in bus:
    print(msg)
```

## 자주 하는 실수

> ⚠️ `ip link set up` 빼먹음

`bitrate` 설정만 하고 `up` 안 하면 *조용히 안 됨*. `ip link show can0`로 *UP* 상태 확인.

> ⚠️ Filter mask 잘못

`can_mask = 0` 이면 *모든 ID 매치*. `CAN_SFF_MASK` (0x7FF, 11-bit) 또는 `CAN_EFF_MASK` (0x1FFFFFFF, 29-bit) 사용.

> ⚠️ CAN FD 명시 안 함

기본 socket은 *CAN 2.0 frame*만 받음. FD 사용 시 `CAN_RAW_FD_FRAMES = 1` 설정.

> ⚠️ vcan에서 CAN FD가 안 됨

vcan 모듈은 CAN FD frame 처리 가능 — *그러나 일부 도구가 인식 안 함*. `cansend vcan0 123##8.11...`로 명시.

## 정리

- SocketCAN = **BSD socket으로 CAN** — Ethernet과 같은 모델.
- 4 가지 protocol: **CAN_RAW · CAN_BCM · CAN_ISOTP · CAN_J1939**.
- `can-utils` — candump · cansend · cangen · cansniffer 4 도구.
- `vcan`이 시뮬레이션 표준 — PC 개발 + CI.
- `ip link` 로 bitrate · FD · listen-only 등 설정.
- python-can 라이브러리로 추상화.

다음 편 (마지막) — **CAN 디버깅** — CANalyzer, hardware scope, 시나리오별 도구.

## 관련 항목

- [Ch 10: J1939](/blog/embedded/protocols/can-bus/chapter10-j1939)
- [Ch 12: 디버깅](/blog/embedded/protocols/can-bus/chapter12-debugging)
