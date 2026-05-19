---
title: "Ch 7: CCSDS TM/TC Space Data Link — Frame·Virtual Channel·COP-1"
date: 2026-05-18T07:00:00
description: "CCSDS 132.0-B/232.0-B. Transfer frame, virtual channel, AOS, COP-1 FARM/FOP, Reed-Solomon·LDPC."
series: "Launch Vehicle Flight Software"
seriesOrder: 7
tags: [avionics, ccsds, tm, tc, virtual-channel, cop-1]
draft: true
---

## 한 줄 요약

> **"Data Link = packet → frame → 무선 송신"** — TM downlink·TC uplink 표준.

## Frame 구조 (TM)

```text
+------------+-------------+--------+---------+
| TM Primary | Sec Header  | Data   | OCF/CRC |
| Header     | (optional)  | Field  |         |
| 6 byte     | 0-64 byte   | varies | 4 byte  |
+------------+-------------+--------+---------+

Total: typical 256-2048 byte
```

CCSDS Space Packet들이 *frame data field* 안에 포함.

## TM Primary Header

```c
typedef struct __attribute__((packed)) {
    uint16_t version_scid;        /* version·scid·VC·ocf flag */
    uint8_t  master_count;        /* 0-255 */
    uint8_t  vc_count;             /* 0-255 */
    uint16_t data_field_status;   /* sec hdr·sync flag·packet order·seg·1st hdr ptr */
} tm_primary_t;
```

### version_scid 16-bit

```text
Bit 15-14: Version (00)
Bit 13-4:  Spacecraft Identifier (SCID, 10-bit)
Bit 3-1:   Virtual Channel ID (VC, 3-bit, 0-7)
Bit 0:     OCF flag (operational control field)
```

### SCID — Spacecraft ID

각 mission *unique 10-bit SCID*. NASA·ESA·KARI 등록·관리.

### VC — Virtual Channel

```text
한 RF link 안 여러 VC 다중화:
  VC 0  Real-time telemetry (high priority)
  VC 1  Stored data (playback)
  VC 2  Memory dump
  VC 3  Idle (filler)
  VC 4-7: mission-specific
```

각 VC = *별도 queue*. 하나가 busy해도 다른 VC 진행.

## TC Frame

```text
TC Primary Header (5 byte):
  Bit 15-14: Version
  Bit 13:    Bypass flag (Type A·B)
  Bit 12:    Control command flag
  Bit 11-10: reserved
  Bit 9-0:   SCID
  + VC ID (6-bit)
  + Frame Length (10-bit)
  + Frame Sequence Number (8-bit)
  
TC Data Field:
  TC packets 또는 control commands
```

TC는 *짧고 안전* 우선. Frame seq num + ACK.

## AOS — Advanced Orbiting Systems

```text
AOS (CCSDS 732.0-B):
  TM 확장 — 더 큰 frame, 더 많은 VC
  
  Frame: 1024 byte 표준
  VC: 64개 (6-bit)
  Insert Service — fixed-position data
  Bitstream Service — raw bits per frame
  Async Insert Service — async data
  
Use:
  ISS·Mars Rover·Big mission
```

AOS = *큰 mission 표준*. KSLV·소형 위성은 일반 TM.

## Virtual Channel Multiplexing

```text
VC 0:  Real-time 1 Hz HK telemetry        ────┐
VC 1:  Engineering data 100 Hz             ────┤
VC 2:  Payload science                      ────┼─→ Frame Mux → RF
VC 3:  Memory dump (one-shot)               ────┤
VC 4:  Idle                                  ────┘
```

각 VC priority — frame muxer가 *bandwidth allocation*.

```c
typedef struct {
    int priority;
    int rate;
    queue_t packet_queue;
} virtual_channel_t;

virtual_channel_t vc[8];

void frame_mux_task(void) {
    while (1) {
        for (int i = 0; i < 8; i++) {
            if (vc[i].has_data && bw_budget_ok(i)) {
                build_frame(i, &vc[i]);
                transmit_rf(frame);
            }
        }
    }
}
```

## OCF — Operational Control Field

```c
typedef struct __attribute__((packed)) {
    uint8_t  cop_in_effect;
    uint8_t  vcfn;        /* virtual channel frame number */
    uint8_t  no_rf_avail;
    uint8_t  flags;
} clcw_t;
```

CLCW (Communications Link Control Word) — uplink 상태 ground에 보고.

## COP-1 — Communication Operation Procedure

```text
COP-1 (CCSDS 232.1-B):
  Sliding window protocol
  FOP (Frame Operation Procedure) — ground side
  FARM (Frame Acceptance·Reporting Mechanism) — spacecraft side
  
Type A: confirmed (retransmit)
Type B: unconfirmed (best-effort)
```

TCP-like reliable command transfer.

## COP-1 State Machine

```text
FARM states:
  D1: open (accepting)
  D2: wait
  D3: lockout
  
FOP states:
  Active (sending)
  Retransmit (lost frame)
  Init (begin)
  
Sliding window:
  N(R) — next expected
  N(S) — next to send
  Window size: 1-256
```

복잡 — *COP-1 reference implementation* 사용 (KARI·NASA).

## Frame Sync Marker

```c
#define ASM 0x1ACFFC1D   /* attached sync marker */

uint8_t frame[FRAME_SIZE];
memcpy(frame, &asm, 4);
build_tm_header(frame + 4);
copy_packets(frame + HEADER_SIZE);
add_fec(frame);
```

ASM — *frame 경계* 검출. Bit-sync 후 frame-sync.

## Reed-Solomon — Outer Coding

```text
RS(255, 223):
  - 223 byte info + 32 byte parity
  - Correct up to 16 byte errors per block
  - Concatenated with convolutional inner
  
CCSDS 131.0-B:
  RS(255, 223) interleaved depth I=1 to 8
```

```c
/* Reed-Solomon encoding */
rs_encode(info_bytes, 223, parity_bytes, 32);
```

LV·deep space — RS 표준.

## LDPC — Modern Coding

```text
CCSDS 131.0-B:
  LDPC rate 1/2, 2/3, 4/5
  Frame: AR4JA codes
  Better than RS+Conv
  
Apply:
  Lunar Reconnaissance·Mars Reconnaissance Orbiter
  ESA·NASA modern missions
```

LDPC — *near Shannon limit*. SDR로 decode.

## Turbo Coding

```text
CCSDS 131.0-B Turbo:
  Rate 1/2, 1/3, 1/4, 1/6
  CDMA2000·LTE도 같은 기술
  Iterative decoding
```

Turbo·LDPC — *modern deep space*. RS는 *backward compatibility*.

## Frame Building — SW Implementation

```c
typedef struct {
    uint8_t buffer[FRAME_SIZE];
    int packet_offset;   /* 다음 packet 위치 */
    int packets_in_frame;
} frame_builder_t;

void add_packet(frame_builder_t *fb, ccsds_packet_t *pkt) {
    if (fb->packet_offset + pkt->size > FRAME_SIZE - TRAILER) {
        /* Frame full — finalize and send */
        finalize_frame(fb);
        send_frame(fb);
        reset_frame(fb);
    }
    
    memcpy(fb->buffer + fb->packet_offset, pkt, pkt->size);
    fb->packet_offset += pkt->size;
    fb->packets_in_frame++;
}
```

Packet → frame packing — *bandwidth efficiency*.

## Idle Data — Continuous RF

```c
/* Frame이 비면 fill */
if (fb->packet_offset < FRAME_SIZE - TRAILER) {
    fill_idle_pattern(fb->buffer + fb->packet_offset,
                       FRAME_SIZE - TRAILER - fb->packet_offset);
}
```

LV — *RF link 항상 active*. Idle 없으면 ground receiver lose sync.

## Frame Loss·Retransmit

```text
Ground receives frame N=42:
  Expected N=40 → gap! lost 41
  
Action:
  TM (downlink): just log gap, can't retransmit
  TC (uplink): re-send via COP-1
  
Critical data:
  Stored on spacecraft
  Re-downlink via dump command (별도 VC)
```

LV mission — *짧음, retransmit 한정*. Reed-Solomon으로 *FEC 우선*.

## Time Stamping

```c
/* Each packet timestamped (sec hdr) */
ccsds_time_t now = get_mission_time();

/* Ground reconstructs:
   - reception time
   - flight time
   - clock offset
*/
```

Mission analysis — *각 telemetry packet 정확 시간*.

## SDR — Ground Station

```text
Ground SDR (Software Defined Radio):
  GNU Radio·USRP·Ettus Research
  
Decode chain:
  RF receive → demodulate → bit sync → frame sync (ASM) →
  Convolutional decode → RS decode → frame parse → packet extract
  
KARI·NASA Deep Space Network — 사용
```

오픈소스 SDR로도 *학생·hobbyist*가 CCSDS decode 가능.

## KSLV-II Telemetry

```text
누리 telemetry:
  S-band downlink ~1 Mbps
  CCSDS TM frames
  Mission timeline·sensor·engine·attitude
  Ground station (Naro·Daejeon)
  
Public release:
  발사 후 KARI가 data 공개
  Educational use
```

## 자주 하는 실수

> ⚠️ Frame size 결정 잘못

```text
너무 작음 → header overhead 비율 ↑
너무 큼 → frame error rate ↑ (FEC budget)
```

→ link margin·BER·overhead trade-off.

> ⚠️ VC priority 무시

```text
모든 VC 같은 priority → high-priority 데이터 지연
```

→ explicit priority·bandwidth budget.

> ⚠️ COP-1 not implemented

```text
TC unreliable → command lost → mission impact
```

→ Type A COP-1.

> ⚠️ Endian wrong

```text
Earth ground software bug → all frame parse fail
```

→ big-endian, htons·htonl.

## 정리

- TM frame = **header + packets + FEC**.
- **Virtual Channel** = single RF, multiple data streams.
- **AOS** = 큰 mission용 확장.
- **COP-1** = TC reliable sliding window.
- **Reed-Solomon·LDPC·Turbo** outer/inner coding.
- KARI·NASA·ESA 모두 채택.
- KSLV-II 누리 — S-band CCSDS telemetry.

다음 편은 **NASA cFS**.

## 관련 항목

- [Ch 6: CCSDS Space Packet](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter06-ccsds-space-packet)
- [Ch 8: NASA cFS](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter08-cfs)
