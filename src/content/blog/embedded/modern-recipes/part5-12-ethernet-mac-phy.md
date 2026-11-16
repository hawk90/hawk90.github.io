---
title: "Ethernet MAC+PHY 통합 — RMII·MDIO·lwIP Raw API"
slug: "embedded/modern-recipes/part5-12-ethernet-mac-phy"
date: 2026-04-14T10:00:00
description: "STM32F407 ETH MAC과 LAN8742 PHY를 RMII·MDIO로 잇고, lwIP 2.2.0 raw API UDP echo를 host에서 실제 packet으로 돌려 봅니다."
series: "Modern Embedded Recipes"
seriesOrder: 60
tags: [recipes, peripheral, ethernet]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"MAC은 MCU 안, PHY는 바깥 chip입니다."** frame data는 RMII로, PHY 설정과 link 상태는 MDIO로 오가고, 그 위에서 lwIP가 IP·UDP를 처리합니다.

## 어떤 상황에서 쓰나

유선 Ethernet으로 장비를 망에 붙일 때입니다. STM32F407은 Ethernet MAC과 DMA를 갖고 있고, 선로 신호를 만드는 PHY(여기서는 Microchip LAN8742)는 바깥에 둡니다.

이 글은 F407과 LAN8742 사이의 RMII·MDIO 배선, MDIO로 PHY를 reset하고 link·속도를 읽는 코드, 그리고 lwIP 2.2.0 raw API로 만든 UDP echo를 다룹니다. MDIO 코드는 arm-none-eabi-gcc 16.2.0으로 `-Wall -Wextra` 경고 없이 빌드되고, UDP echo는 lwIP core를 host(macOS, clang)에 올려 손으로 만든 IPv4 packet을 넣어 응답 packet을 확인했습니다. 보드와 PHY로 한 측정은 없습니다. QEMU에는 STM32 ETH MAC model이 없습니다.

## 핵심 개념

### MAC과 PHY

| 부분 | 어디에 | 하는 일 |
| --- | --- | --- |
| ETH MAC + DMA | STM32F407 안 | frame 송수신, descriptor ring으로 RAM과 주고받기 |
| RMII | MAC ↔ PHY | frame data (2 bit씩) |
| MDC / MDIO | MAC ↔ PHY | PHY register 읽기·쓰기 |
| PHY (LAN8742) | 보드 위 chip | 선로 부호화, auto-negotiation, link 감지 |

### F407의 RMII·MDIO 핀

ST의 STM32F417 GPIO 표(STM32CubeMX `STM32F417_gpio_v1_0.xml`)에서 Ethernet 신호를 낼 수 있는 핀입니다. 모두 AF11입니다.

| 신호 | 방향(MAC 기준) | 핀 |
|---|---|---|
| REF_CLK (50 MHz) | 입력 | PA1 |
| CRS_DV | 입력 | PA7 |
| RXD0, RXD1 | 입력 | PC4, PC5 |
| TX_EN | 출력 | PB11 또는 PG11 |
| TXD0, TXD1 | 출력 | PB12 / PB13 또는 PG13 / PG14 |
| MDC | 출력 | PC1 |
| MDIO | 양방향 | PA2 |

data 신호가 7개, 관리 신호가 2개입니다. MII 대신 RMII를 고르는 것은 `SYSCFG->PMC`의 `MII_RMII_SEL` bit이고, HAL `HAL_ETH_Init()`은 이 bit를 바꾼 뒤 `DMABMR`의 SR로 MAC을 reset합니다.

### MDIO와 PHY register

MAC의 `MACMIIAR`에 PHY 주소(PA, bit 15:11), register 번호(MR, bit 10:6), MDC 분주(CR, bit 4:2), 쓰기(MW), busy(MB)를 쓰고, data는 `MACMIIDR`로 주고받습니다. CR 값은 HCLK에 따라 정해지고, `stm32f407xx.h`는 `ETH_MACMIIAR_CR_Div102`를 "HCLK:150-168 MHz; MDC clock= HCLK/102"로 정의합니다. [4-04](/blog/embedded/modern-recipes/part4-04-clock-setup)의 HCLK 168 MHz에서 MDC는 168 / 102 ≈ 1.65 MHz입니다.

이 글이 쓰는 PHY register는 ST의 LAN8742 component driver(`stm32-lan8742`의 `lan8742.h`) 정의를 따릅니다.

| reg | 이름 | bit |
|---|---|---|
| 0 | BCR | 15 SOFT_RESET, 12 AUTONEGO_EN, 9 RESTART_AUTONEGO |
| 1 | BSR | 2 LINK_STATUS |
| 18 | SMR | PHY 주소 |
| 31 | PHYSCSR | 4:2 속도·duplex (`HCDSPEEDMASK` 0x001C), 12 AUTONEGO_DONE |

PHYSCSR 4:2는 0x04 = 10BASE-T half, 0x14 = 10BASE-T full, 0x08 = 100BASE-TX half, 0x18 = 100BASE-TX full입니다. ST driver의 `LAN8742_GetLinkState()`는 BSR을 두 번 연달아 읽고 두 번째 값으로 link를 판단하므로, 아래 코드도 그렇게 합니다.

### lwIP raw API

lwIP는 `NO_SYS = 1`로 RTOS 없이 돌 수 있고, 그때는 raw API(callback)만 씁니다. `udp_recv()`로 등록한 callback은 받은 `pbuf`를 넘겨받고, `udp.h`의 설명대로 "The callback is responsible for freeing the pbuf"입니다.

## 코드 예제

### 1. MDIO와 PHY 설정

```c
#define PHY_ADDR  0u                                // LAN8742 SMR address
#define MDC_CR    ETH_MACMIIAR_CR_Div102            // HCLK 150-168 MHz

static uint16_t mdio_read(uint8_t reg) {
    ETH->MACMIIAR = (PHY_ADDR << ETH_MACMIIAR_PA_Pos) | ((uint32_t)reg << ETH_MACMIIAR_MR_Pos)
                  | MDC_CR | ETH_MACMIIAR_MB;
    while (ETH->MACMIIAR & ETH_MACMIIAR_MB) { }
    return (uint16_t)ETH->MACMIIDR;
}

static void mdio_write(uint8_t reg, uint16_t val) {
    ETH->MACMIIDR = val;
    ETH->MACMIIAR = (PHY_ADDR << ETH_MACMIIAR_PA_Pos) | ((uint32_t)reg << ETH_MACMIIAR_MR_Pos)
                  | MDC_CR | ETH_MACMIIAR_MW | ETH_MACMIIAR_MB;
    while (ETH->MACMIIAR & ETH_MACMIIAR_MB) { }
}

void phy_init(void) {
    mdio_write(0, 0x8000);                          // BCR.SOFT_RESET
    while (mdio_read(0) & 0x8000) { }               // self-clearing
    mdio_write(0, 0x1000 | 0x0200);                 // AUTONEGO_EN | RESTART_AUTONEGO
}

int phy_link_up(void) {
    (void)mdio_read(1);                             // first read: latched value
    return (mdio_read(1) & 0x0004) != 0;            // BSR.LINK_STATUS
}

int phy_get_speed_duplex(int *speed_mbps, int *full_duplex) {
    switch (mdio_read(31) & 0x001C) {               // PHYSCSR speed indication
    case 0x0004: *speed_mbps = 10;  *full_duplex = 0; return 0;
    case 0x0014: *speed_mbps = 10;  *full_duplex = 1; return 0;
    case 0x0008: *speed_mbps = 100; *full_duplex = 0; return 0;
    case 0x0018: *speed_mbps = 100; *full_duplex = 1; return 0;
    default:     return -1;
    }
}
```

`phy_init()`은 link를 기다리지 않고 돌아옵니다. cable이 빠져 있으면 link는 오지 않으므로, link는 아래 5절처럼 주기적으로 봅니다.

### 2. MAC과 DMA

MAC 설정, descriptor ring, 송수신 buffer는 길어서 직접 쓰지 않고 STM32CubeF4 HAL의 `stm32f4xx_hal_eth.c`(`HAL_ETH_Init()`, `HAL_ETH_Start()`)를 씁니다. HAL v1.8.3의 `HAL_ETH_Init()`은 RMII 선택(`SYSCFG->PMC`), `DMABMR`의 software reset, `ETH_MACDMAConfig()`로 MAC·DMA 기본 설정을 차례로 합니다. MDC 분주는 별도 함수 `HAL_ETH_SetMDIOClockRange()`가 `HAL_RCC_GetHCLKFreq()`에 따라 `ETH_MACMIIAR_CR_Div16`~`Div102` 중 하나를 고르고, 위 1절의 `MDC_CR`은 이 함수가 168 MHz에서 고르는 값과 같습니다. lwIP와의 연결은 lwIP 저장소의 `contrib/examples/ethernetif/ethernetif.c` 틀을 채워 `low_level_output()`에서 HAL 송신을, `ethernetif_input()`에서 HAL 수신을 부르는 방식입니다.

### 3. lwIP raw API — UDP echo

```c
/* udp_echo.c */
#include "lwip/udp.h"

static void udp_echo_recv(void *arg, struct udp_pcb *upcb,
                          struct pbuf *p, const ip_addr_t *addr, u16_t port) {
    (void)arg;
    udp_sendto(upcb, p, addr, port);   // send the same payload back
    pbuf_free(p);                      // recv callback owns p
}

void udp_echo_init(u16_t port) {
    struct udp_pcb *pcb = udp_new();
    udp_bind(pcb, IP_ADDR_ANY, port);
    udp_recv(pcb, udp_echo_recv, NULL);
}
```

보드에서는 `lwip_init()` 뒤 `netif_add(&gnetif, ..., ethernetif_init, netif_input)`로 Ethernet netif를 붙이고, main loop에서 `ethernetif_input()`과 `sys_check_timeouts()`를 부른 다음 `udp_echo_init(5000)`을 부릅니다. echo 자체는 netif 종류와 상관없으므로 아래 host 실행에서 그대로 씁니다.

### 4. Link 감시

```c
void net_poll_link(struct netif *nif) {
    static int prev = -1;
    int link = phy_link_up();
    if (link == prev) return;
    prev = link;
    if (link) netif_set_link_up(nif);
    else      netif_set_link_down(nif);
}
```

link가 올라오면 `phy_get_speed_duplex()`의 결과대로 MAC의 속도·duplex 설정(`MACCR`의 FES·DM)을 맞춰야 합니다. HAL v1.8.3에서는 `HAL_ETH_SetMACConfig()`로 바꿉니다.

## 측정 / 동작 확인

### host에서 UDP echo 돌리기

lwIP 2.2.0 core(IPv4, UDP)를 `NO_SYS = 1`로 host에 빌드하고, Ethernet 대신 IP packet을 그대로 주고받는 netif를 만들었습니다. 192.168.1.10:40000에서 192.168.1.100:5000으로 "hello"를 담은 IPv4/UDP packet을 손으로 만들어 넣고, lwIP가 netif로 내보내는 packet을 찍습니다.

```c
/* lwipopts.h */
#define NO_SYS                 1
#define LWIP_NETCONN           0
#define LWIP_SOCKET            0
#define LWIP_TCP               0
#define LWIP_ARP               0
#define LWIP_ETHERNET          0
#define LWIP_IPV6              0
#define LWIP_DHCP              0
#define MEM_ALIGNMENT          4
#define MEM_SIZE               8192
#define SYS_LIGHTWEIGHT_PROT  0
```

```c
/* arch/cc.h */
#include <stdio.h>
#include <stdlib.h>
#define LWIP_DONT_PROVIDE_BYTEORDER_FUNCTIONS   /* host libc has htons() */
#define LWIP_PLATFORM_DIAG(x)   do { printf x; } while (0)
#define LWIP_PLATFORM_ASSERT(x) do { printf("assert: %s\n", x); abort(); } while (0)
```

```c
/* echo_host.c */
#include <stdio.h>
#include <string.h>
#include "lwip/init.h"
#include "lwip/netif.h"
#include "lwip/ip.h"
#include "lwip/inet_chksum.h"
#include "lwip/timeouts.h"

void udp_echo_init(u16_t port);
u32_t sys_now(void) { return 0; }

static struct netif nif;

/* netif output: print the IPv4 packet lwIP wants to send */
static err_t out_ip4(struct netif *n, struct pbuf *p, const ip4_addr_t *dst) {
    (void)n; (void)dst;
    u8_t b[128];
    u16_t len = pbuf_copy_partial(p, b, sizeof b, 0);
    printf("TX %u bytes: %u.%u.%u.%u:%u -> %u.%u.%u.%u:%u payload \"%.*s\"\n", len,
           b[12], b[13], b[14], b[15], (b[20] << 8) | b[21],
           b[16], b[17], b[18], b[19], (b[22] << 8) | b[23], len - 28, (char *)b + 28);
    return ERR_OK;
}

static err_t nif_init(struct netif *n) { n->output = out_ip4; n->mtu = 1500; return ERR_OK; }

int main(void) {
    lwip_init();
    ip4_addr_t ip, mask, gw;
    IP4_ADDR(&ip, 192, 168, 1, 100); IP4_ADDR(&mask, 255, 255, 255, 0); IP4_ADDR(&gw, 0, 0, 0, 0);
    netif_add(&nif, &ip, &mask, &gw, NULL, nif_init, ip_input);
    netif_set_default(&nif);
    netif_set_up(&nif);
    netif_set_link_up(&nif);
    udp_echo_init(5000);

    /* hand-built IPv4/UDP packet 192.168.1.10:40000 -> 192.168.1.100:5000 "hello" */
    const char *msg = "hello";
    u16_t ulen = 8 + 5, tlen = 20 + ulen;
    u8_t pkt[64] = {0x45, 0, tlen >> 8, tlen & 0xFF, 0, 1, 0, 0, 64, 17, 0, 0,
                    192, 168, 1, 10, 192, 168, 1, 100,
                    40000 >> 8, 40000 & 0xFF, 5000 >> 8, 5000 & 0xFF, 0, ulen, 0, 0};
    memcpy(pkt + 28, msg, 5);
    u16_t c = inet_chksum(pkt, 20);           /* IPv4 header checksum */
    pkt[10] = c & 0xFF; pkt[11] = c >> 8;     /* UDP checksum 0 = not used (IPv4) */

    struct pbuf *p = pbuf_alloc(PBUF_RAW, tlen, PBUF_POOL);
    pbuf_take(p, pkt, tlen);
    printf("RX %u bytes to 192.168.1.100:5000\n", tlen);
    nif.input(p, &nif);
    return 0;
}
```

```bash
git clone --depth 1 --branch STABLE-2_2_0_RELEASE https://github.com/lwip-tcpip/lwip.git
L=lwip/src
clang -O2 -Wall -I . -I $L/include -o echo_host echo_host.c udp_echo.c \
  $L/core/init.c $L/core/def.c $L/core/mem.c $L/core/memp.c $L/core/netif.c \
  $L/core/pbuf.c $L/core/stats.c $L/core/timeouts.c $L/core/udp.c $L/core/ip.c \
  $L/core/inet_chksum.c $L/core/raw.c $L/core/ipv4/ip4.c $L/core/ipv4/ip4_addr.c \
  $L/core/ipv4/icmp.c $L/core/ipv4/ip4_frag.c
./echo_host
```

```text
RX 33 bytes to 192.168.1.100:5000
TX 33 bytes: 192.168.1.100:5000 -> 192.168.1.10:40000 payload "hello"
```

lwIP가 IP header checksum을 확인하고 port 5000의 pcb로 넘기고, callback이 같은 payload를 보낸 쪽 주소·port로 돌려보냅니다. 응답의 source가 192.168.1.100:5000, destination이 192.168.1.10:40000입니다.

### 보드에서

보드에서는 PC에서 `nc -u <보드 IP> 5000`으로 같은 시험을 합니다. 응답이 없으면 `phy_link_up()`, `phy_get_speed_duplex()`의 값과 MAC의 속도·duplex 설정이 같은지, REF_CLK가 PA1에 들어오는지를 봅니다. 이 글은 보드로 이 단계를 실행하지 않았습니다.

## 자주 보는 함정

> ⚠️ MDC 분주를 HCLK에 안 맞춤

`MACMIIAR`의 CR은 HCLK 범위마다 정해져 있습니다. 168 MHz에서 CMSIS 주석이 "HCLK:60-100 MHz"용이라 적은 `Div42`를 쓰면 MDC가 168 / 42 = 4 MHz로, `Div102`의 1.65 MHz보다 2.4배 빨라집니다.

> ⚠️ BSR을 한 번만 읽음

ST LAN8742 driver의 `LAN8742_GetLinkState()`는 BSR을 "Read Status register", "Read Status register again" 두 번 읽고 두 번째 값으로 판단합니다. 위 `phy_link_up()`도 같은 순서를 따릅니다.

> ⚠️ PHY 속도와 MAC 설정 불일치

auto-negotiation 결과가 100 Mbit/s full duplex인데 MAC이 10 Mbit/s half로 남아 있으면 frame이 깨집니다. link가 오를 때마다 PHYSCSR을 읽어 MAC을 다시 설정합니다.

> ⚠️ 보드마다 같은 MAC 주소

같은 망에 같은 MAC 주소가 둘 있으면 ARP가 엉킵니다. 보드마다 다른 주소를 씁니다.

> ⚠️ recv callback에서 pbuf를 안 풂

callback이 pbuf를 받았으면 해제도 callback 몫입니다. 위 echo처럼 `udp_sendto()` 뒤 `pbuf_free()`를 부르지 않으면 pool이 줄어듭니다.

## 정리

- MAC은 F407 안, PHY는 바깥. **RMII data 7개(AF11) + MDC/MDIO**.
- MDIO는 **`MACMIIAR`(PA·MR·CR·MW·MB) + `MACMIIDR`**, 168 MHz에서 **CR = Div102**.
- LAN8742는 **BCR reset → auto-negotiation**, link는 **BSR을 두 번 읽어** 판단, 속도는 **PHYSCSR 4:2**.
- MAC·DMA는 **HAL `HAL_ETH_Init()`**, lwIP 연결은 **`ethernetif.c` 틀**.
- lwIP raw UDP echo는 **host에서 packet을 넣어** 응답을 확인했습니다.

다음 편은 **SD 카드 SPI 모드 + FatFs**입니다. SPI 모드 초기화와 FatFs disk I/O 연결을 다룹니다.

## 관련 항목

- [4-10: DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)
- [5-11: USB Device 기초](/blog/embedded/modern-recipes/part5-11-usb-device)
- [5-13: SD 카드 SPI 모드 + FatFs](/blog/embedded/modern-recipes/part5-13-sd-card-fatfs)
- [12-13: Matter·Thread](/blog/embedded/modern-recipes/part12-13-matter-thread)
