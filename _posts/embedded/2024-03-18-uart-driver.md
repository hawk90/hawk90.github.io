---
layout: post
title: "UART 디바이스 드라이버 구현"
date: 2024-03-18
categories: [Embedded]
tags: [embedded, uart, driver, bare-metal]
---

# UART 디바이스 드라이버 구현

임베디드 시스템에서 UART 통신을 위한 베어메탈 드라이버 구현 방법입니다.

## UART 레지스터 구조

```c
typedef struct {
    volatile uint32_t DR;    // Data Register
    volatile uint32_t SR;    // Status Register
    volatile uint32_t CR;    // Control Register
    volatile uint32_t BRR;   // Baud Rate Register
} UART_TypeDef;

#define UART0_BASE    0x40000000
#define UART0         ((UART_TypeDef*)UART0_BASE)
```

## 초기화 함수

```c
void uart_init(uint32_t baudrate) {
    // 클럭 활성화
    RCC->APB1ENR |= RCC_APB1ENR_UART0EN;

    // 보드레이트 설정
    uint32_t clock = SystemCoreClock / 4;  // APB1 clock
    UART0->BRR = clock / baudrate;

    // 8N1 설정
    UART0->CR = UART_CR_TE | UART_CR_RE | UART_CR_UE;
}
```

## 송수신 함수

```c
void uart_send_byte(uint8_t data) {
    // TX 버퍼가 비길 때까지 대기
    while(!(UART0->SR & UART_SR_TXE));
    UART0->DR = data;
}

uint8_t uart_receive_byte(void) {
    // 데이터 수신 대기
    while(!(UART0->SR & UART_SR_RXNE));
    return (uint8_t)(UART0->DR & 0xFF);
}
```

## 인터럽트 핸들러

```c
void UART0_IRQHandler(void) {
    if(UART0->SR & UART_SR_RXNE) {
        uint8_t data = UART0->DR;
        // 수신 데이터 처리
        buffer_push(data);
    }
}
```

베어메탈 환경에서 효율적인 UART 통신이 가능합니다.