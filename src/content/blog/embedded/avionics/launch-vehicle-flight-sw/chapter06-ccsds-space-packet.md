---
title: "Ch 6: CCSDS Space Packet — Primary Header·APID·Sequence·Data Field"
date: 2026-05-18T06:00:00
description: "CCSDS 133.0-B space packet. Primary header·APID·sequence count·TC/TM. NASA·ESA·KARI 표준."
series: "Launch Vehicle Flight Software"
seriesOrder: 6
tags: [avionics, ccsds, space-packet, telemetry, tm, tc]
draft: true
---

## 한 줄 요약

> **"CCSDS Space Packet = 우주 표준 메시지 단위"** — 모든 LV·위성 telemetry·command.

## CCSDS — Consultative Committee for Space Data Systems

```text
CCSDS:
  1982년 설립
  NASA·ESA·JAXA·KARI·CNES·국가 우주국 협력
  Blue Book — 표준
  Magenta Book — 권장
  Yellow Book — 사례

Standards:
  133.0-B  Space Packet Protocol
  133.1-B  Encapsulation Service
  232.0-B  TC Space Data Link Protocol
  132.0-B  TM Space Data Link Protocol
  727.0-B  CFDP (File Delivery Protocol)
  301.0-B  Time Code Formats
```

전세계 우주 데이터 표준 — *벤더 독립*.

## Space Packet 구조

```text
+--------+--------+--------+--------+--------+
|     Primary Header (6 byte)              |
+--------+--------+--------+--------+--------+
|    Secondary Header (optional, ≤ 65528)  |
+--------+--------+--------+--------+--------+
|    User Data Field (1 - 65528 byte)     |
+--------+--------+--------+--------+--------+

Total packet: 7 byte - 64 KB
```

## Primary Header — 6 byte

```c
typedef struct __attribute__((packed)) {
    uint16_t packet_id;        /* version·type·sec_hdr·APID */
    uint16_t packet_seq;       /* seq_flags·sequence_count */
    uint16_t packet_data_len;  /* user data length - 1 */
} ccsds_primary_t;
```

### packet_id 16-bit

```text
Bit 15-13: Version (always 0)
Bit 12:    Type (0=TM, 1=TC)
Bit 11:    Sec Header flag (0/1)
Bit 10-0:  APID (Application Process Identifier)
```

```c
#define CCSDS_TYPE_TM   0
#define CCSDS_TYPE_TC   1

uint16_t make_packet_id(int type, int sec_hdr, uint16_t apid) {
    return (0 << 13) | (type << 12) | (sec_hdr << 11) | (apid & 0x7FF);
}
```

### packet_seq 16-bit

```text
Bit 15-14: Seq flags (00=cont, 01=first, 10=last, 11=standalone)
Bit 13-0:  Sequence count (0-16383, wrap)
```

```c
typedef enum {
    SEQ_CONT       = 0,
    SEQ_FIRST      = 1,
    SEQ_LAST       = 2,
    SEQ_STANDALONE = 3,
} seq_flag_t;
```

### packet_data_len 16-bit

```text
Length = data field size - 1
0 = 1 byte data
65535 = 65536 byte data
```

> ⚠️ 헷갈리기 쉬움 — *length - 1*.

## APID — Application Process Identifier

```text
11-bit, 0x000 - 0x7FF
각 APID = 별도 producer·consumer
역할:
  Routing
  Filtering
  Telemetry channel 구분

예 (가상):
  0x100  Flight Control Computer (TM)
  0x101  GPS data
  0x102  IMU data
  0x110  Engine telemetry
  0x200  Ground command (TC)
  0x7FF  Idle pattern
```

KARI·NASA — *APID allocation document* 명시.

## Sequence Count — Drop·Reorder 감지

```c
static uint16_t tx_seq[1024];   /* per APID */

void send_packet(uint16_t apid, uint8_t *data, int len) {
    ccsds_primary_t hdr;
    hdr.packet_id = htons(make_packet_id(TM, 0, apid));
    hdr.packet_seq = htons((SEQ_STANDALONE << 14) | (tx_seq[apid] & 0x3FFF));
    hdr.packet_data_len = htons(len - 1);
    
    tx_seq[apid] = (tx_seq[apid] + 1) & 0x3FFF;
    
    transmit(&hdr, sizeof(hdr), data, len);
}
```

Ground side — *gap 검출*.

```python
expected = last_seq + 1
if received_seq != expected:
    print(f"APID {apid}: gap! expected {expected}, got {received_seq}")
```

## Secondary Header — Time·Ancillary

```text
Mission-specific format:
  Time code (CCSDS 301.0-B)
  Packet subtype
  Source/destination
  Ancillary data
```

```c
typedef struct __attribute__((packed)) {
    uint64_t time_us;        /* CCSDS time code */
    uint8_t  subtype;
    uint8_t  flags;
} secondary_header_t;
```

## CCSDS Time Code

```text
CDS (CCSDS Day Segmented):
  Days from epoch (16-bit)
  ms of day (32-bit)
  µs of ms (16-bit)
  
CUC (CCSDS Unsegmented):
  seconds from epoch (32-bit)
  fraction (32-bit)
  
Epoch:
  Mission-specific (보통 J2000.0 또는 launch time)
```

LV·satellite — *수십 시간 mission*. CUC 표준.

## Packet Validation

```c
bool parse_ccsds(uint8_t *buf, int buf_len, ccsds_packet_t *out) {
    if (buf_len < 6) return false;
    
    ccsds_primary_t *hdr = (ccsds_primary_t*)buf;
    uint16_t id = ntohs(hdr->packet_id);
    uint16_t seq = ntohs(hdr->packet_seq);
    uint16_t len = ntohs(hdr->packet_data_len) + 1;
    
    int total = 6 + len;
    if (buf_len < total) return false;
    
    out->version = (id >> 13) & 0x7;
    out->type    = (id >> 12) & 0x1;
    out->sec_hdr = (id >> 11) & 0x1;
    out->apid    = id & 0x7FF;
    out->seq_flag = (seq >> 14) & 0x3;
    out->seq_count = seq & 0x3FFF;
    out->data = buf + 6;
    out->data_len = len;
    
    if (out->version != 0) return false;
    
    return true;
}
```

## TC — Telecommand (Uplink)

```text
TC packet structure:
  Primary header (type = TC)
  Secondary header (option):
    PUS Service·Subservice (ECSS-E-ST-70-41)
    Sequence·ack flags
  TC data:
    Command parameters
    
Routing:
  Ground → uplink → spacecraft TC system
  TC system → APID-based routing → target subsystem
```

ECSS PUS (Packet Utilization Standard) — *standardized TC services* (1·3·5·6·17·...).

## TM — Telemetry (Downlink)

```text
TM packet:
  Primary header (type = TM)
  Secondary header:
    Time stamp
    PUS Service·Subservice
  TM data:
    HK (housekeeping) values
    Event reports
    Memory dump
    Calibration data
```

LV — *주기적 HK telemetry*. Mission event time-stamped.

## NASA cFE — CFS Foundation

```c
/* cFE Software Bus */
#include "cfe.h"

CFE_SB_PipeId_t pipe;
CFE_SB_CreatePipe(&pipe, 16, "MY_PIPE");

CFE_SB_Subscribe(MY_APID, pipe);

CFE_SB_Buffer_t *msg;
CFE_SB_ReceiveBuffer(&msg, pipe, CFE_SB_PEND_FOREVER);

uint16_t apid = CFE_MSG_GetMsgId(...);
```

NASA cFE — *Apache 2.0*. Mars Rover·ISS·LV 채택.

## ESA PUS — Service-Based

```text
PUS Service ID:
  1   Telecommand verification
  3   Housekeeping & diagnostic
  5   Event reporting
  6   Memory management
  8   Function management
  9   Time management
  11  Onboard operations scheduling
  12  Onboard monitoring
  13  Large data transfer
  14  Packet routing
  15  Mass storage
  17  Test
  18  Onboard control procedures
  19  Event-action service
  20  Onboard parameter management
  21  Onboard storage·retrieval
  ...
```

각 service = *별도 APID 또는 sub-APID*. Standardized command verification·event log.

## CCSDS Stack 통합

```text
Application layer:
  CCSDS Space Packet (133.0-B)
  
Data Link layer:
  CCSDS TC SDLP (232.0-B) for uplink
  CCSDS TM SDLP (132.0-B) for downlink
  
Physical layer:
  RF (S/X/Ka band)
  Optical (DSOC)
```

LV launch — *S-band telemetry*. 200 kbps - 10 Mbps.

## Virtual Channel — Data Link

```text
TM frame contains 1+ packets
TM frame has:
  Virtual Channel ID (VC, 0-7 or more)
  Used for routing different data streams
  
예:
  VC 0 — Real-time telemetry (high priority)
  VC 1 — Stored data dump
  VC 2 — Memory access response
```

Multiple VC = *prioritized data streams* over single RF.

## Idle Packet

```c
/* Always-on filler when no data */
ccsds_idle_packet_t idle = {
    .packet_id = htons(make_packet_id(TM, 0, 0x7FF)),
    .packet_seq = htons(SEQ_STANDALONE << 14),
    .packet_data_len = htons(IDLE_DATA - 1),
    .data = { /* zero-filled or pattern */ },
};
```

Continuous downlink — *idle packet*으로 link 유지.

## KARI Adaptation

```text
KARI standards:
  KARI-SPEC-001 (Space Packet)
  KARI-SPEC-002 (TM/TC)
  KARI-SPEC-003 (Time Code)
  
KSLV-II 누리 적용:
  CCSDS Space Packet 기반
  APID allocation table
  PUS service subset
  Mission-specific extensions
```

한국형 — *CCSDS + KARI extensions*.

## 자주 하는 실수

> ⚠️ packet_data_len 헷갈림

```c
hdr->packet_data_len = htons(len);   /* ✗ — should be len - 1 */
```

→ `len - 1`.

> ⚠️ Endian 무시

```c
hdr->packet_id = id;   /* host endian */
```

CCSDS는 *big-endian*. `htons`/`htonl` 필수.

> ⚠️ APID 충돌

```text
Subsystem A: APID 0x100 (telemetry)
Subsystem B: APID 0x100 (own data)
→ Ground filter 혼란
```

→ APID allocation document·design 명확.

> ⚠️ Sequence count wrap

```c
seq = (seq + 1) % 16384;   /* 0-16383 wrap */
```

Ground side — *wrap-around* 인지.

## 정리

- CCSDS Space Packet = **6 byte header + data**.
- **APID** = packet routing·filtering.
- **Sequence count** = drop·reorder 감지.
- **TM (downlink)·TC (uplink)** + secondary time.
- **PUS service** (ECSS) = standardized command·event.
- **NASA cFE** = open-source CCSDS framework.
- KARI·NASA·ESA·JAXA — 모두 채택.

다음 편은 **CCSDS Data Link**.

## 관련 항목

- [Ch 5: FPGA-SW](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter05-fpga-sw-interface)
- [Ch 7: CCSDS Data Link](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter07-ccsds-data-link)
- [Ch 8: NASA cFS](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter08-cfs)
