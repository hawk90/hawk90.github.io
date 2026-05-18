---
title: "Ch 8: UART 심화 — RTS/CTS, DMA + IDLE, FIFO, Multi-Drop"
date: 2027-03-01T08:00:00
description: "흐름 제어로 overrun 방지, DMA + IDLE 라인 인터럽트로 가변 길이 프레임 수신."
series: "Embedded Protocols 심화"
seriesOrder: 8
tags: [uart, flow-control, dma, fifo, idle-line, rts-cts]
draft: true
---

## 한 줄 요약

> **"DMA + IDLE 인터럽트가 모던 UART RX의 표준"** — 가변 길이 프레임을 CPU 부담 없이 수신.

## Hardware Flow Control — RTS/CTS

RX 버퍼가 차오르면 송신자에게 "잠깐 멈춰" 신호를 *하드웨어 라인*으로.

```text
A (송신)    B (수신)
 TX ─────────► RX
 RX ◄───────── TX
RTS ─────────► CTS    (A: "보낼 데이터 있음")
CTS ◄───────── RTS    (B: "받을 준비 됨")
```

### 핀 의미 — 헷갈리는 점

규약상:
- **RTS** (Request To Send) — *나*가 송신 권한 요청
- **CTS** (Clear To Send) — *상대*가 송신 OK

그래서 A의 RTS는 B의 CTS와 연결. **CTS는 입력**, RTS는 *출력*.

STM32 UART는 `HwFlowCtl = UART_HWCONTROL_RTS_CTS` 설정 한 줄로 페리퍼럴이 자동 처리.

### 언제 쓰나

- 921600+ 고속 UART — 버퍼 작은 임베디드는 overrun 빈발
- Bluetooth HCI UART (블루투스 모듈 ↔ MCU)
- *전압 안 맞으면 동작 안 함* — 모듈과 같은 logic level 보장

## Software Flow Control — XON/XOFF

송신 도중 *특정 바이트* (XOFF = 0x13, XON = 0x11) 보내 "정지/재개" 신호. **단점**:
- 데이터에 0x11·0x13 못 씀 (이스케이프 필요)
- 응답성 늦음 (이미 보낸 바이트는 버려야)
- 모던 시스템에서 거의 미사용

레거시 (PPP, 옛 모뎀)에서만.

## FIFO — Overrun 회피의 1차 방어

기본 UART는 *시프트 레지스터 1개* — 한 바이트 수신하는 동안 다음 바이트 오면 손실. FIFO가 그 사이 *버퍼*.

| FIFO 크기 | MCU 예 | 한계 |
| --- | --- | --- |
| 1 (없음) | 아주 작은 MCU | 매 바이트 인터럽트 |
| 8 | STM32F1 | 충분치 않음 (115200 = 86 µs/byte) |
| 16 | STM32F4 USART | 인터럽트 latency 1.4 ms 견딤 |
| 32 | STM32H7 LPUART | 2.8 ms 견딤 |
| 256 | NS16550 (PC) | 22 ms 견딤 |

FIFO 임계값 — STM32는 1/4, 1/2, 3/4, 7/8 선택 가능. `RXFT` 인터럽트로 *FIFO가 X% 차면 깨움*.

## DMA + IDLE 인터럽트 — 모던 RX의 표준

가변 길이 프레임 (예: GPS NMEA "$GPGGA,...\r\n")을 받을 때:

### 옛 방식 — 매 바이트 인터럽트

```c
void USART1_IRQHandler(void) {
    if (USART1->ISR & USART_ISR_RXNE) {
        char c = USART1->RDR;
        buffer[idx++] = c;
        if (c == '\n') {
            process_line(buffer); idx = 0;
        }
    }
}
```

115200 baud × 매 바이트 인터럽트 = **11.5k IRQ/s**. 작은 MCU에선 부담.

### 모던 방식 — DMA Circular + IDLE 인터럽트

```c
uint8_t rx_buf[256];
volatile size_t old_pos = 0;

void uart_dma_start(void) {
    // DMA를 circular mode로 RX 채널에 연결
    HAL_UART_Receive_DMA(&huart1, rx_buf, sizeof(rx_buf));
    // IDLE 인터럽트 활성화
    __HAL_UART_ENABLE_IT(&huart1, UART_IT_IDLE);
}

void USART1_IRQHandler(void) {
    if (__HAL_UART_GET_FLAG(&huart1, UART_FLAG_IDLE)) {
        __HAL_UART_CLEAR_IDLEFLAG(&huart1);

        // 현재 DMA 포지션
        size_t new_pos = sizeof(rx_buf) -
                         __HAL_DMA_GET_COUNTER(huart1.hdmarx);

        if (new_pos > old_pos) {
            process_chunk(&rx_buf[old_pos], new_pos - old_pos);
        } else if (new_pos < old_pos) {
            // wrap around
            process_chunk(&rx_buf[old_pos], sizeof(rx_buf) - old_pos);
            process_chunk(&rx_buf[0], new_pos);
        }
        old_pos = new_pos;
    }
    HAL_UART_IRQHandler(&huart1);
}
```

핵심:
- **DMA**가 자동으로 RX FIFO → 메모리 버퍼.
- **IDLE 인터럽트**가 *라인 idle (1 char time idle)* 시 발화 → 프레임 경계.
- CPU는 한 프레임 끝날 때 *한 번* 깨어남.

NMEA 80 바이트 = 80 byte × 1 인터럽트 = **115배 효율적**.

## DMA TX

송신도 마찬가지. 큰 버퍼를 DMA에 맡기고 *complete callback*만 잡음.

```c
HAL_UART_Transmit_DMA(&huart1, msg, len);

void HAL_UART_TxCpltCallback(UART_HandleTypeDef *huart) {
    // 송신 완료 — 다음 메시지 준비 가능
}
```

## Multi-Drop UART (Half-Duplex)

여러 슬레이브가 같은 RX 라인 공유. *주소 비트* (9th bit)로 구분.

```text
Master → ────[Addr=3]────[Data]────[Data]──── Bus
                ↓
              Slave 3만 응답
```

9-bit UART (`UART_WORDLENGTH_9B`) 모드 + *주소 매칭 인터럽트*. STM32에 내장. 산업용·자동차 ECU에서 흔함.

## LIN — UART 위의 자동차 버스

Local Interconnect Network — UART 기반 (보통 19200 baud) + *single-wire*. 자동차 도어·시트·창문 같은 *저속 기능*에 사용.

- 1 master + N slaves (15 max)
- 전압 7-18V (자동차 12V 배터리 직결)
- LIN transceiver IC (TJA1020 등) 필요
- 프레임 = SYNC + ID + Data + Checksum

CAN보다 *훨씬 싸서* 자동차 보조 버스로 보급.

## 자주 하는 실수

> ⚠️ DMA RX를 *circular*로 안 함

Linear DMA + half-complete 인터럽트로 처리하려다 *복잡도 폭발*. **Circular + IDLE**이 표준.

> ⚠️ FIFO 활성화 안 함

STM32H7는 FIFO 기본 *비활성*. `huart.FifoMode = UART_FIFOMODE_ENABLE` 명시 필요.

> ⚠️ RTS/CTS 라인 floating

연결 안 했는데 페리퍼럴은 active — *CTS가 High에 묶임* 가정 못 함 → 송신 안 됨. 안 쓰면 명시적 disable.

> ⚠️ printf overhead

DMA-less HAL printf는 *128 byte format buffer* 사용 — 큰 메시지에서 stack 부담. 디버그 로그용도면 `uart_tx_dma_queue()` 같은 ring buffer + DMA 패턴 권장.

## 정리

- **RTS/CTS**가 하드웨어 흐름 제어 — 고속·신뢰성 필수.
- **FIFO** 크기가 인터럽트 latency 견딤 한계 결정.
- **DMA Circular + IDLE 인터럽트**가 RX 표준 패턴 — 가변 길이 프레임.
- **9-bit + 주소 매칭**으로 multi-drop.
- **LIN**은 UART 기반 자동차 저속 버스.

다음 편은 **RS-232 / RS-485** — 전기 사양과 differential signaling.

## 관련 항목

- [Ch 7: UART 기초](/blog/embedded/protocols/embedded-serial/chapter07-uart-basics)
- [Ch 9: RS-232 / RS-485](/blog/embedded/protocols/embedded-serial/chapter09-rs232-rs485)
