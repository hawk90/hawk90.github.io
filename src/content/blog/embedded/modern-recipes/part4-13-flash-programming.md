---
title: "4-13: Flash 프로그래밍"
date: 2026-05-13T23:00:00
description: "내부 erase/write·dual bank·EEPROM emulation."
series: "Modern Embedded Recipes"
seriesOrder: 47
tags: [recipes, bare-metal, flash]
draft: false
---

## 한 줄 요약

> **"Erase가 1, write가 0. 한 번 쓴 비트는 erase 없이 다시 못 씁니다."** Flash의 핵심 한 줄.

## 어떤 상황에서 쓰나

전원이 꺼져도 설정값이 살아 있어야 하면 *internal Flash에 저장*합니다. WiFi credential, calibration data, 일련번호, OTA bootloader image — 모두 Flash 영역을 쪼개 보관합니다. 외부 EEPROM이 없는 보드에서는 *Flash 일부 영역을 EEPROM처럼* 쓰는 emulation 기법이 필수입니다.

이 글은 STM32F4 internal Flash를 erase·write하는 절차, EEPROM emulation 패턴, dual bank Flash와 OTA bootloader의 기본을 다룹니다.

## 핵심 개념

### Flash 구조 — STM32F411 기준

```text
Sector  Size    Address range
0       16KB    0x0800 0000 ~ 0x0800 3FFF
1       16KB    0x0800 4000 ~ 0x0800 7FFF
2       16KB    0x0800 8000 ~ 0x0800 BFFF
3       16KB    0x0800 C000 ~ 0x0800 FFFF
4       64KB    0x0801 0000 ~ 0x0801 FFFF
5       128KB   0x0802 0000 ~ 0x0803 FFFF
6       128KB   0x0804 0000 ~ 0x0805 FFFF
7       128KB   0x0806 0000 ~ 0x0807 FFFF
                                          (512 KB total)
```

sector size가 *불균등*합니다. EEPROM emulation은 보통 sector 1, 2 (16KB)를 씁니다 — 작은 단위로 erase 가능.

### Erase / Write 규칙

1. Erase 후 모든 비트는 1
2. Write는 1 → 0만 가능
3. 0을 1로 되돌리려면 *erase 필수*
4. Erase 단위 = sector (16KB ~ 128KB)
5. Write 단위 = byte/halfword/word/doubleword (PSIZE에 따라)

이 규칙 때문에 *한 byte 수정*도 *해당 sector 전체 erase 후 재기록*이 필요합니다.

### Programming time

**Erase:**

- 16 KB sector:   ~400 ms
- 64 KB sector:   ~1.1 s
- 128 KB sector:  ~2.5 s

**Write:**

- word (4 bytes): ~16 µs (V_dd 2.7~3.6 V)
- doubleword:     ~30 µs

erase는 *수십 ms*, 다른 모든 IRQ가 막힙니다 (CPU stall). 운영 중 erase는 신중히 결정.

### Voltage range — PSIZE 결정

| V_dd | PSIZE | Width |
|------|-------|-------|
| 1.8 - 2.1 | 00 | byte |
| 2.1 - 2.7 | 01 | halfword |
| 2.7 - 3.6 | 10 | word |
| 2.7 - 3.6 + ext Vpp | 11 | doubleword |

대부분의 보드는 3.3 V → PSIZE = 10 (word). 잘못 설정하면 *write 실패 또는 corruption*.

## 코드 예제

### 1. Unlock / Lock

Flash는 *PIN 두 개 sequence*로 unlock합니다.

```c
#define FLASH_KEY1  0x45670123u
#define FLASH_KEY2  0xCDEF89ABu

static void flash_unlock(void) {
    if (FLASH->CR & FLASH_CR_LOCK) {
        FLASH->KEYR = FLASH_KEY1;
        FLASH->KEYR = FLASH_KEY2;
    }
}

static void flash_lock(void) {
    FLASH->CR |= FLASH_CR_LOCK;
}
```

### 2. Sector erase

```c
int flash_erase_sector(uint8_t sector) {
    while (FLASH->SR & FLASH_SR_BSY);
    FLASH->SR = FLASH_SR_EOP | FLASH_SR_OPERR | FLASH_SR_WRPERR
              | FLASH_SR_PGAERR | FLASH_SR_PGPERR | FLASH_SR_PGSERR;

    flash_unlock();
    FLASH->CR &= ~FLASH_CR_PSIZE;
    FLASH->CR |= (2u << 8);             // PSIZE = word (3.3V)
    FLASH->CR &= ~(0x1F << 3);
    FLASH->CR |= FLASH_CR_SER | (sector << 3);
    FLASH->CR |= FLASH_CR_STRT;

    while (FLASH->SR & FLASH_SR_BSY);

    FLASH->CR &= ~FLASH_CR_SER;
    flash_lock();

    return (FLASH->SR & 0xF0) ? -1 : 0;
}
```

### 3. Word write

```c
int flash_write_word(uint32_t addr, uint32_t data) {
    while (FLASH->SR & FLASH_SR_BSY);

    flash_unlock();
    FLASH->CR &= ~FLASH_CR_PSIZE;
    FLASH->CR |= (2u << 8);             // word
    FLASH->CR |= FLASH_CR_PG;

    *(volatile uint32_t *)addr = data;

    while (FLASH->SR & FLASH_SR_BSY);

    FLASH->CR &= ~FLASH_CR_PG;
    flash_lock();

    return (*(volatile uint32_t *)addr == data) ? 0 : -1;
}
```

`PG` bit를 set한 후 *target address에 직접 store*하면 write가 일어납니다.

### 4. EEPROM emulation — append-only log

erase 횟수를 최소화하기 위해 *append만 하고*, 가득 차면 *compact*합니다.

```text
Sector 1 (16 KB):
+--------+--------+--------+--------+--------+
| key=A  | key=B  | key=A  | key=C  | empty  |
| val=10 | val=20 | val=15 | val=30 | 0xFFFF |
+--------+--------+--------+--------+--------+

read(A) → 마지막에서 역방향 search → val=15
```

```c
typedef struct {
    uint16_t key;
    uint16_t value;
    uint32_t magic;   // 0xDEAD_BEEF when written
} ee_entry_t;

#define EE_SECTOR    1
#define EE_BASE      0x08004000UL
#define EE_END       0x08008000UL

uint16_t ee_read(uint16_t key) {
    ee_entry_t *p = (ee_entry_t *)(EE_END - sizeof(ee_entry_t));
    while ((uint32_t)p >= EE_BASE) {
        if (p->magic == 0xDEADBEEFu && p->key == key) {
            return p->value;
        }
        p--;
    }
    return 0xFFFF;   // not found
}

int ee_write(uint16_t key, uint16_t val) {
    ee_entry_t *p = (ee_entry_t *)EE_BASE;
    while ((uint32_t)p < EE_END) {
        if (p->magic == 0xFFFFFFFFu) {
            // empty slot
            ee_entry_t entry = {.key=key, .value=val, .magic=0xDEADBEEFu};
            flash_write_word((uint32_t)&p->key,
                             ((uint32_t)val << 16) | key);
            flash_write_word((uint32_t)&p->magic, 0xDEADBEEFu);
            return 0;
        }
        p++;
    }
    return -1;   // full — need compact
}
```

compact는 *valid entry만 새 sector에 copy* 후 원본 sector erase하는 방식. STM32CubeF4의 EEPROM emulation library가 표준 구현.

### 5. Dual bank — OTA bootloader

STM32F4 일부 (F427/429/437/439), F7, H7는 *bank A + bank B*로 나뉜 Flash를 가집니다. 한 bank에서 실행하면서 *다른 bank에 새 firmware를 쓸* 수 있습니다.

```text
Bank 1: 현재 실행 중인 firmware
Bank 2: 새 firmware OTA download 영역
       ↓ 완료 후 reset
Bank 2에서 boot, Bank 1을 다음 download 영역으로
```

bootloader는 *boot magic*과 *firmware CRC*를 확인하고 valid한 bank로 jump합니다. roll-back 메커니즘으로 *새 firmware가 한 번도 안 booted면* 자동 이전 bank 복귀.

## 측정 / 동작 확인

```c
// 일관성 확인
flash_erase_sector(EE_SECTOR);

// erase 후 모두 0xFF
for (uint32_t a = EE_BASE; a < EE_END; a += 4) {
    if (*(volatile uint32_t *)a != 0xFFFFFFFFu) {
        printf("Erase failed at %08lx\n", a);
        break;
    }
}

// write + read back
flash_write_word(EE_BASE, 0xDEADBEEFu);
if (*(volatile uint32_t *)EE_BASE != 0xDEADBEEFu) {
    printf("Write failed\n");
}
```

erase가 *수백 ms* 걸리므로 SysTick으로 측정합니다.

```text
Sector 1 (16 KB) erase: 412 ms
Word write × 4096: 76 ms total (18 µs each)
```

## 자주 보는 함정

> ⚠️ Erase 안 한 영역에 write

이미 0이 있는 비트를 1로 다시 쓰려는 것 → write 실패, PGAERR/PGSERR set. *erase가 선행*되어야 합니다.

> ⚠️ Code가 실행 중인 sector를 erase

자기 sector를 지우면 fetch 자체가 깨져 hardfault. *반대편 bank*나 *RAM 실행* 필요. EEPROM emulation은 항상 code와 분리된 sector를 씁니다.

> ⚠️ PSIZE 잘못 설정

3.3V 보드에 PSIZE = byte로 두면 write 실패. datasheet의 voltage 표 확인.

> ⚠️ IRQ가 erase 중 들어옴

erase 중 IRQ는 들어올 수 있지만 *그 ISR이 Flash read를 시도하면 stall*. ISR을 RAM에 배치하거나 erase 동안 critical section.

> ⚠️ Linker가 reserved 영역을 안 비움

EEPROM emulation에 쓸 sector를 linker script의 .text가 사용해 버리면 *코드가 덮어 씁니다*. linker script에서 명시적으로 reserve.

```text
MEMORY {
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 16K   /* boot */
    EEPROM (rw) : ORIGIN = 0x08004000, LENGTH = 32K   /* reserved */
    APP (rx)    : ORIGIN = 0x0800C000, LENGTH = 464K
}
```

> ⚠️ Wear-out

Flash는 *10,000 ~ 100,000회 erase* 한도. 매 초마다 EEPROM write하면 *몇 달 만에 마모*. wear leveling이 필요한 사용 시나리오면 append-only + compact 패턴.

## 정리

- Flash는 **erase 1 → write 0**. 한 번 쓴 비트는 erase 없이 못 되돌림.
- **Erase 단위 = sector** (16K~128K), **write 단위 = word** (3.3V) 기준.
- **EEPROM emulation**은 append-only log + compact 패턴이 표준.
- **Dual bank**는 OTA에 핵심 — 한 bank 실행 + 다른 bank write.
- **PSIZE는 voltage**에 맞춰, **자기 sector erase 금지**, **wear-out** 고려.

다음 편부터 Part 5 — **Peripheral 제어**입니다. PWM, motor, display, sensor, CAN, USB, Ethernet, SD card, RTC를 다룹니다.

## 관련 항목

- [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)
- [4-12: 워치독 (IWDG/WWDG)](/blog/embedded/modern-recipes/part4-12-watchdog)
- [3-09: Bootloader 체인](/blog/embedded/modern-recipes/part3-09-bootloader-chain)
- [5-01: PWM 출력](/blog/embedded/modern-recipes/part5-01-pwm-output)
