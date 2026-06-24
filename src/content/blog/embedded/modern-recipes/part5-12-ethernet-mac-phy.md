---
title: "Ethernet MAC+PHY 통합 — RMII·lwIP·DMA Descriptor"
date: 2026-04-14T10:00:00
description: "RMII·MDIO·lwIP raw API·DHCP·HTTP server."
series: "Modern Embedded Recipes"
seriesOrder: 60
tags: [recipes, peripheral, ethernet]
draft: false
---

## 한 줄 요약

> **"MAC은 MCU 안, PHY는 외부 chip."** RMII로 둘이 연결되고 MDIO로 link 협상. 위에 lwIP 한 줄.

## 어떤 상황에서 쓰나

산업 IoT gateway, building automation, IP camera, smart meter, industrial PLC — 유선 Ethernet이 필요한 모든 곳. WiFi는 무선이지만 *전력*과 *latency*에 약해 산업·인프라는 *유선 Ethernet*이 표준.

이 글은 STM32F4/F7 + LAN8742 PHY + lwIP로 raw API HTTP server를 구현합니다.

## 핵심 개념

### MAC vs PHY

| 단 | 인터페이스 | 역할 |
| --- | --- | --- |
| MCU 내부 (ETH MAC) | RMII data → PHY | frame TX/RX, DMA |
| MCU ↔ PHY (LAN8742 등) | MDIO / MDC | link status, speed 협상 |
| External PHY | RJ45 + transformer | 물리 신호, encoding |
| RJ45 → 네트워크 | UTP cable | Cat5e/Cat6 |

- **MAC (Media Access Controller)**: MCU 내부. frame parsing, DMA, IP/TCP는 한 단계 위.
- **PHY (Physical layer)**: 외부 chip. transformer + RJ45와 직접 연결, voltage level, encoding 처리.

### RMII (Reduced MII)

7개 wire:

```text
REF_CLK  ←── 50 MHz reference (oscillator 또는 MCO)
CRS_DV   ←── carrier sense / data valid
RXD[1:0] ←── 2-bit RX data
TXEN     ──→ TX enable
TXD[1:0] ──→ 2-bit TX data
```

50 MHz × 2-bit = 100 Mbps. 100Base-TX (Fast Ethernet) standard.

### MDIO (Management Data Interface)

PHY의 *register set*에 접근하는 2-wire interface (MDC=clock, MDIO=data).

**주요 PHY register (IEEE 802.3 표준):**

- Reg 0  BMCR    — basic mode control (auto-neg, speed, duplex)
- Reg 1  BMSR    — basic mode status (link up?, capability)
- Reg 2-3 PHYID  — chip identification
- Reg 4-5 ANAR/ANLPAR — auto-neg advertisement / partner

이 register들을 *MDIO로 read/write*해 link speed·duplex 협상.

### lwIP 옵션

| Layer | 사용처 |
|-------|--------|
| Raw API (callback) | 단일 thread, IRQ 환경에 적합 |
| Sequential API (netconn) | RTOS task 환경 |
| Socket API | BSD-style, RTOS 필요 |
| netif | 하드웨어 driver 추상 |

이 글은 *raw API*로 작성. RTOS 없는 단순한 환경.

## 코드 예제

### 1. PHY init (LAN8742 via MDIO)

```c
#define PHY_ADDR  0x00

static uint16_t mdio_read(uint8_t reg) {
    ETH->MACMIIAR = (PHY_ADDR << 11) | (reg << 6) | ETH_MACMIIAR_MB | (4 << 2);
    while (ETH->MACMIIAR & ETH_MACMIIAR_MB);
    return ETH->MACMIIDR;
}

static void mdio_write(uint8_t reg, uint16_t val) {
    ETH->MACMIIDR = val;
    ETH->MACMIIAR = (PHY_ADDR << 11) | (reg << 6) | ETH_MACMIIAR_MW | ETH_MACMIIAR_MB | (4 << 2);
    while (ETH->MACMIIAR & ETH_MACMIIAR_MB);
}

void phy_init(void) {
    mdio_write(0, 0x8000);   // reset
    while (mdio_read(0) & 0x8000);

    mdio_write(0, 0x1200);   // auto-neg + restart
    // wait link up
    while (!(mdio_read(1) & 0x0004));   // BMSR.LINK
}

int phy_get_speed_duplex(int *speed_mbps, int *full_duplex) {
    uint16_t scsr = mdio_read(31);   // PHYSCSR
    int code = (scsr >> 2) & 0x7;
    switch (code) {
        case 1: *speed_mbps = 10;  *full_duplex = 0; break;
        case 2: *speed_mbps = 100; *full_duplex = 0; break;
        case 5: *speed_mbps = 10;  *full_duplex = 1; break;
        case 6: *speed_mbps = 100; *full_duplex = 1; break;
        default: return -1;
    }
    return 0;
}
```

### 2. MAC + DMA 초기화

상세 코드는 길어 *ST의 Cube-generated stm32f4xx_hal_eth.c*를 사용하는 게 표준. 핵심만:

```c
void eth_init(uint8_t mac[6]) {
    RCC->AHB1ENR |= RCC_AHB1ENR_ETHMACEN
                  | RCC_AHB1ENR_ETHMACTXEN
                  | RCC_AHB1ENR_ETHMACRXEN;
    RCC->APB2ENR |= RCC_APB2ENR_SYSCFGEN;
    SYSCFG->PMC |= SYSCFG_PMC_MII_RMII_SEL;     // RMII mode

    // GPIO setup (PA1, PA2, PA7, PB11, PB13, PC1, PC4, PC5 — AF11)
    // ...

    // MAC reset
    ETH->DMABMR |= ETH_DMABMR_SR;
    while (ETH->DMABMR & ETH_DMABMR_SR);

    // MAC config
    ETH->MACCR = ETH_MACCR_FES | ETH_MACCR_DM    // 100 Mbps full
               | ETH_MACCR_IPCO;
    ETH->MACA0HR = (mac[5] << 8) | mac[4];
    ETH->MACA0LR = (mac[3] << 24) | (mac[2] << 16) | (mac[1] << 8) | mac[0];

    // Setup DMA descriptors (TX/RX rings)
    setup_dma_rings();

    ETH->MACCR |= ETH_MACCR_TE | ETH_MACCR_RE;   // TX/RX enable
    ETH->DMAOMR |= ETH_DMAOMR_FTF;
    ETH->DMAOMR |= ETH_DMAOMR_ST | ETH_DMAOMR_SR;
}
```

### 3. lwIP raw API — UDP echo

```c
#include "lwip/init.h"
#include "lwip/tcpip.h"
#include "lwip/dhcp.h"
#include "lwip/udp.h"

static struct netif gnetif;
static struct udp_pcb *echo_pcb;

void udp_echo_recv(void *arg, struct udp_pcb *upcb,
                   struct pbuf *p, const ip_addr_t *addr, u16_t port) {
    udp_sendto(upcb, p, addr, port);
    pbuf_free(p);
}

void net_init(void) {
    lwip_init();

    ip_addr_t ip, netmask, gw;
    IP4_ADDR(&ip, 0, 0, 0, 0);
    IP4_ADDR(&netmask, 0, 0, 0, 0);
    IP4_ADDR(&gw, 0, 0, 0, 0);

    netif_add(&gnetif, &ip, &netmask, &gw, NULL,
              ethernetif_init,             // 사용자가 작성
              netif_input);
    netif_set_default(&gnetif);
    netif_set_up(&gnetif);
    dhcp_start(&gnetif);

    echo_pcb = udp_new();
    udp_bind(echo_pcb, IP_ADDR_ANY, 5000);
    udp_recv(echo_pcb, udp_echo_recv, NULL);
}

// main loop
while (1) {
    ethernetif_input(&gnetif);   // poll RX
    sys_check_timeouts();
}
```

### 4. HTTP server (lwIP httpd 모듈)

```c
#include "lwip/apps/httpd.h"

void web_init(void) {
    httpd_init();
}
```

`fs/` 디렉토리에 `index.html` 등을 두고 `makefsdata` tool로 *embedded filesystem*을 만들면 lwIP가 serve합니다. 동적 page는 SSI (Server-Side Include).

### 5. Link state monitoring

```c
void net_poll_link(void) {
    static int prev_link = -1;
    int link = !!(mdio_read(1) & 0x0004);
    if (link != prev_link) {
        if (link) {
            int spd, dup;
            phy_get_speed_duplex(&spd, &dup);
            printf("Link up: %d Mbps %s\n", spd, dup ? "full" : "half");
            netif_set_link_up(&gnetif);
        } else {
            printf("Link down\n");
            netif_set_link_down(&gnetif);
        }
        prev_link = link;
    }
}
```

100 ms 주기로 호출. cable plug/unplug detect.

## 측정 / 동작 확인

```bash
# PC에서
$ ping 192.168.1.100
PING 192.168.1.100: 56 data bytes
64 bytes from 192.168.1.100: icmp_seq=0 ttl=64 time=1.234 ms

# UDP echo test
$ echo "hello" | nc -u 192.168.1.100 5000
hello

# HTTP test
$ curl http://192.168.1.100/
<html>...</html>
```

DHCP가 안 되면 *static IP*로 시도. ping이 안 가면:

1. **PHY link** — RJ45 LED 확인.
2. **MAC address conflict** — unique한 값으로.
3. **RMII clock** — 50 MHz precise 확인.

스코프로 TXD/RXD를 보면 *frame burst*가 보임 (idle 95% + brief packets 5%).

## 자주 보는 함정

> ⚠️ 50 MHz RMII clock 정확도

PHY에서 OSC로 공급하거나 MCO로 공급. ±50 ppm 이내. 정확하지 않으면 frame 못 받음.

> ⚠️ MAC address 모두 같음

여러 보드 동시 사용 시 *MAC unique* 필수. 보통 STM32 96-bit UID에서 hash로 생성.

> ⚠️ TX/RX descriptor 부족

DMA ring buffer가 작으면 burst load에서 drop. RX는 5-10개, TX는 3-5개 권장.

> ⚠️ lwIP buffer 부족

`MEM_SIZE`, `PBUF_POOL_SIZE`가 작으면 packet drop. 작은 MCU도 16 KB 이상 권장.

> ⚠️ Cortex-M7 cache coherency

H7·F7에서 DMA descriptor가 cached → MAC이 stale read. *MPU non-cacheable* 영역에 배치 또는 invalidate.

> ⚠️ ESD damage

Ethernet cable에는 큰 ESD. *RJ45 magnetics integrated jack* 사용, PHY datasheet의 ESD 보호 권고 따름.

## 정리

- **MAC = MCU 안, PHY = 외부 chip**. RMII 7-wire로 연결, MDIO 2-wire로 관리.
- **PHY register**로 link state·speed·duplex 협상.
- **lwIP raw API**는 RTOS 없는 환경에 적합. UDP/TCP/HTTP 모두 callback 기반.
- **DHCP**로 IP 자동 획득, **link polling**으로 plug/unplug detect.
- **Unique MAC**, **50 MHz precise**, **충분한 buffer**가 안정성의 핵심.

다음 편은 **SD card + FatFs**입니다. SPI/SDIO interface와 file system 통합을 다룹니다.

## 관련 항목

- [4-10: DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)
- [5-11: USB Device 기초](/blog/embedded/modern-recipes/part5-11-usb-device)
- [5-13: SD card + FatFs](/blog/embedded/modern-recipes/part5-13-sd-card-fatfs)
- [12-12: Matter·Thread](/blog/embedded/modern-recipes/part12-12-matter-thread)
