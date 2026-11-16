---
title: "임베디드 Flash 프로그래밍 — Erase·Program·Read While Write"
slug: "embedded/modern-recipes/part4-13-flash-programming"
date: 2026-04-13T09:47:00
description: "내부 erase/write·dual bank·EEPROM emulation."
series: "Modern Embedded Recipes"
seriesOrder: 47
tags: [recipes, bare-metal, flash]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Erase가 1, write가 0. 한 번 쓴 비트는 erase 없이 다시 못 씁니다."** Flash의 핵심 한 줄.

## 어떤 상황에서 쓰나

전원이 꺼져도 설정값이 살아 있어야 하면 internal Flash에 저장합니다. calibration data, 일련번호, 새 firmware image처럼 성격이 다른 데이터는 Flash 영역을 나눠 보관합니다. 외부 EEPROM이 없는 보드에서는 Flash 일부를 EEPROM처럼 쓰는 emulation을 씁니다. ST도 STM32CubeF4에 EEPROM emulation application을 둡니다.

이 글은 STM32F407 internal Flash를 erase·write하는 절차, EEPROM emulation 패턴, dual bank Flash와 OTA bootloader의 기본을 다룹니다. register 이름은 `stm32f407xx.h`, 절차는 ST HAL v1.8.3 `stm32f4xx_hal_flash.c`/`_ex.c`, 시간·수명 수치는 DS8626 Rev 4(DocID022152)에서 가져왔습니다. QEMU의 F4 모델은 Flash interface를 unimplemented device로 두므로(`stm32f405_soc.c`의 "Flash Int"), 코드는 arm-none-eabi-gcc 16.2.0으로 `-Wall` 경고 없이 빌드되는 것까지 확인했고 실행하지 않았습니다.

## 핵심 개념

### Flash 구조 — STM32F407 기준

STM32CubeF4의 STM32F4-Discovery(F407) `FLASH/FLASH_EraseProgram` 예제 `main.h`가 sector 주소와 크기를 주석으로 적어 둡니다.

| Sector | 크기 | 시작 주소 |
| --- | --- | --- |
| 0 ~ 3 | 16 KB | `0x08000000`, `0x08004000`, `0x08008000`, `0x0800C000` |
| 4 | 64 KB | `0x08010000` |
| 5 ~ 11 | 128 KB | `0x08020000`부터 `0x080E0000`까지 `0x20000` 간격 |

sector 크기가 고르지 않습니다. 아래 EEPROM emulation 예제는 erase 단위가 가장 작은 16 KB sector 1을 씁니다. sector 0은 reset vector가 있는 `0x08000000`이므로 프로그램이 차지합니다.

### Erase / Write 규칙

1. Erase 후 모든 비트는 1
2. Write는 1 → 0만 가능
3. 0을 1로 되돌리려면 *erase 필수*
4. Erase 단위 = sector (16 KB ~ 128 KB)
5. Write 단위 = byte/halfword/word/doubleword (`FLASH_CR`의 PSIZE에 따라)

그래서 이미 쓴 값 하나를 바꾸려면 그 sector 전체를 erase하고 다시 써야 합니다. 아래 append-only 방식이 이 비용을 피하는 방법입니다.

### Programming time

DS8626 Rev 4 Table 39 "Flash memory programming"의 값입니다(min/max는 "Based on characterization, not tested in production").

| 동작 | PSIZE = x8 | x16 | x32 |
| --- | --- | --- | --- |
| Word programming (`tprog`) | 16 µs typ, 100 µs max (x8/16/32 공통) | | |
| 16 KB sector erase | 400 / 800 ms | 300 / 600 ms | 250 / 500 ms |
| 64 KB sector erase | 1200 / 2400 ms | 700 / 1400 ms | 550 / 1100 ms |
| 128 KB sector erase | 2 / 4 s | 1.3 / 2.6 s | 1 / 2 s |

(sector erase 칸은 typ / max.) 128 KB sector 하나를 지우는 데 typ 1 s가 걸리므로, 운영 중 erase는 그 시간 동안 같은 Flash에서 코드를 읽어야 하는 일이 없는지 확인한 뒤에 합니다.

### Voltage range — PSIZE 결정

HAL v1.8.3 `stm32f4xx_hal_flash_ex.h`의 `FLASH_VOLTAGE_RANGE_*` 정의와 `FLASH_Erase_Sector()`의 분기가 전압과 PSIZE를 짝지어 줍니다.

| VDD (HAL 주석) | `VoltageRange` | HAL이 고르는 PSIZE |
|------|------|-------|
| 1.8 V ~ 2.1 V | `FLASH_VOLTAGE_RANGE_1` | `FLASH_PSIZE_BYTE` |
| 2.1 V ~ 2.7 V | `FLASH_VOLTAGE_RANGE_2` | `FLASH_PSIZE_HALF_WORD` |
| 2.7 V ~ 3.6 V | `FLASH_VOLTAGE_RANGE_3` | `FLASH_PSIZE_WORD` |
| 2.7 V ~ 3.6 V + External Vpp | `FLASH_VOLTAGE_RANGE_4` | `FLASH_PSIZE_DOUBLE_WORD` |

3.3 V 보드라면 range 3, 즉 word(32-bit) 단위입니다. 아래 코드의 `(2u << 8)`이 `FLASH_PSIZE_WORD`(`FLASH_CR_PSIZE_1`)입니다.

## 코드 예제

### 1. Unlock / Lock

`FLASH_CR`은 `KEYR`에 key 두 개를 차례로 써야 풀립니다. 값은 HAL `stm32f4xx_hal_flash.h`의 `FLASH_KEY1 0x45670123U`, `FLASH_KEY2 0xCDEF89ABU`이고, `HAL_FLASH_Unlock()`도 `LOCK`이 set일 때만 두 값을 씁니다.

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
    FLASH->CR &= ~FLASH_CR_SNB;
    FLASH->CR |= FLASH_CR_SER | ((uint32_t)sector << FLASH_CR_SNB_Pos);
    FLASH->CR |= FLASH_CR_STRT;

    while (FLASH->SR & FLASH_SR_BSY);

    FLASH->CR &= ~FLASH_CR_SER;
    flash_lock();

    return (FLASH->SR & (FLASH_SR_OPERR | FLASH_SR_WRPERR | FLASH_SR_PGAERR
                       | FLASH_SR_PGPERR | FLASH_SR_PGSERR)) ? -1 : 0;   // HAL FLASH_WaitForLastOperation
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

`PG` bit를 set한 뒤 target address에 일반 store를 하면 그 값이 program됩니다. HAL `FLASH_Program_Word()`도 `PSIZE`를 word로 두고 `FLASH_CR_PG`를 set한 뒤 `*(__IO uint32_t*)Address = Data;`를 씁니다. 반환 전에 다시 읽어 비교하는 것은 이 글의 추가 확인입니다.

### 4. EEPROM emulation — append-only log

erase 횟수를 줄이려고 빈 자리에 새 값을 덧붙이기만 하고, 가득 차면 유효한 값만 다른 sector로 옮기는 compact를 합니다. 같은 key가 여러 번 나오면 가장 뒤의 것이 현재 값입니다.

| slot | key | value | magic |
| --- | --- | --- | --- |
| 0 | A | 10 | `0xDEADBEEF` |
| 1 | B | 20 | `0xDEADBEEF` |
| 2 | A | 15 | `0xDEADBEEF` |
| 3 | C | 30 | `0xDEADBEEF` |
| 4 | (erase 상태) | | `0xFFFFFFFF` |

`ee_read(A)`는 뒤에서부터 찾아 slot 2의 15를 돌려줍니다.

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
        uint32_t data = *(volatile uint32_t *)&p->key;
        if (p->magic == 0xFFFFFFFFu && data == 0xFFFFFFFFu) {
            // empty slot: data word first, magic last
            if (flash_write_word((uint32_t)&p->key, ((uint32_t)val << 16) | key) != 0)
                return -1;
            return flash_write_word((uint32_t)&p->magic, 0xDEADBEEFu);
        }
        // data written but magic still erased: torn write, skip this slot
        p++;
    }
    return -1;   // full — need compact
}
```

magic을 데이터보다 나중에 쓰므로, 두 write 사이에 전원이 끊긴 slot은 magic이 `0xFFFFFFFF`로 남아 `ee_read()`가 건너뜁니다. `ee_write()`는 두 word가 모두 `0xFFFFFFFF`인 slot만 빈 자리로 보므로, 데이터 word만 쓰인 그런 slot은 건너뛰고 compact 때 버립니다. compact는 key마다 마지막 유효 값만 다른 sector에 복사한 뒤 원래 sector를 erase합니다.

### 5. Dual bank — OTA bootloader

Flash가 두 bank인지는 F4 안에서도 칩마다 다릅니다. 두 bank 칩에서 한 bank를 실행하며 다른 bank를 쓰는 read-while-write 동작의 조건은 reference manual RM0090에 있는데, 이 글은 그 문서를 확인하지 못했습니다. HAL v1.8.3 `stm32f4xx_hal_flash_ex.h`는 `FLASH_BANK_2`와 bank별 필드(`SectorsBank2`, `BootConfig`)를 STM32F427/437/429/439/469/479에만 정의하고, F407에는 `FLASH_BANK_1`만 있습니다. F407에서 같은 구조를 만들려면 아래 표의 두 영역을 서로 다른 sector에 두고, 새 image를 쓰는 동안 실행할 코드를 RAM에 둡니다.

| 영역 | 역할 |
|------|------|
| 영역 A | 현재 실행 중인 firmware |
| 영역 B | 새 firmware를 받는 영역 |

다운로드가 끝나면 reset하고, bootloader가 B를 검증해 그쪽으로 점프합니다. 그다음 업데이트에서는 A가 받는 영역이 됩니다. image는 절대 주소로 링크되므로, 영역마다 그 주소로 따로 링크한 image를 씁니다.

bootloader는 영역마다 magic과 CRC를 확인하고 유효한 쪽으로 점프합니다. 새 image가 정상 부팅됐다는 표시를 남기기 전에 reset이 반복되면 이전 영역으로 돌아가는 rollback은 [Bootloader 17장](/blog/embedded/bootloader/chapter17-ab-update)의 bootcount 구조와 같습니다.

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

erase 시간은 위 Table 39 기준으로 16 KB sector가 x32에서 typ 250 ms입니다. 보드에서는 [4-06](/blog/embedded/modern-recipes/part4-06-systick-timer)의 `millis()`로 `flash_erase_sector()` 앞뒤를 재서 이 범위(max 500 ms) 안인지 봅니다. 이 글은 그 측정을 하지 않았습니다.

## 자주 보는 함정

> ⚠️ Erase 안 한 영역에 write

0이 된 bit는 program으로 1이 되지 않습니다. 위 `flash_write_word()`는 마지막 비교에서 -1을 돌려주므로, 쓰기 전에 그 word가 `0xFFFFFFFF`인지 확인하거나 sector를 먼저 erase합니다.

> ⚠️ Code가 실행 중인 sector를 erase

F407은 bank가 하나이므로 실행 중인 코드와 erase 대상이 같은 Flash에 있습니다. erase 대상 sector가 지금 실행 중인 코드를 담고 있으면 그 코드를 지우는 것이므로, EEPROM sector는 아래 linker script처럼 코드 영역과 분리해 예약합니다.

> ⚠️ PSIZE 잘못 설정

PSIZE는 위 HAL 표처럼 VDD 범위로 정합니다. 예를 들어 VDD가 2.7 V보다 낮은 보드에서 word를 쓰면 HAL이 그 전압에 고르는 PSIZE와 맞지 않습니다.

> ⚠️ IRQ가 erase 중 들어옴

ISR과 vector table이 Flash에 있으면 그 시간 동안 같은 Flash를 읽어야 하므로, erase 중 반응해야 하는 ISR은 RAM에 두거나 erase 구간을 그 ISR이 없어도 되는 시점으로 옮깁니다. 정확한 stall 동작은 reference manual RM0090에 있는데, 이 글은 그 문서를 확인하지 못했습니다.

> ⚠️ Linker가 reserved 영역을 안 비움

EEPROM emulation에 쓸 sector를 linker script의 `.text`가 쓰면 코드가 그 자리에 놓이고, 첫 erase가 코드를 지웁니다. linker script에서 영역을 나눠 둡니다. 아래는 F407의 1 MB를 sector 0(16 KB), sector 1~2(32 KB, EEPROM), 나머지로 나눈 예입니다.

```text
MEMORY {
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 16K   /* boot */
    EEPROM (rw) : ORIGIN = 0x08004000, LENGTH = 32K   /* reserved */
    APP (rx)    : ORIGIN = 0x0800C000, LENGTH = 976K
}
```

> ⚠️ Wear-out

DS8626 Rev 4 Table 41의 endurance `NEND`는 min 10 kcycles(TA −40 ~ +85 °C 또는 −40 ~ +105 °C 버전)이고, data retention은 1 kcycle 뒤 85 °C에서 30년, 105 °C에서 10년, 10 kcycles 뒤 55 °C에서 20년입니다. 위 예제(8 byte slot, 16 KB sector)는 erase 한 번에 2048번 write를 받으므로, 10 kcycles면 sector 하나로 약 2,048만 번의 write를 받는 셈입니다. 두 sector를 번갈아 쓰면 그 두 배입니다.

## 정리

- Flash는 **erase 1 → write 0**. 한 번 쓴 비트는 erase 없이 못 되돌림.
- **Erase 단위**는 sector(16/64/128 KB)이고, **programming width**는 VDD 범위로 정합니다(3.3 V면 word).
- **EEPROM emulation**은 append-only log와 compact로 erase 횟수를 줄입니다.
- **Dual bank**는 F427/429/437/439/469/479 같은 칩에 있고, F407은 sector를 나눠 같은 구조를 만듭니다.
- **PSIZE는 전압**에 맞추고, **코드가 있는 sector는 erase하지 않으며**, **endurance 10 kcycles**를 기준으로 write 수를 계산합니다.

다음 편부터 Part 5 — **Peripheral 제어**입니다. PWM, motor, display, sensor, CAN, USB, Ethernet, SD card, RTC를 다룹니다.

## 관련 항목

- [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)
- [4-12: 워치독 (IWDG/WWDG)](/blog/embedded/modern-recipes/part4-12-watchdog)
- [3-12: Bootloader 체인](/blog/embedded/modern-recipes/part3-12-bootloader-chain)
- [5-01: PWM 출력](/blog/embedded/modern-recipes/part5-01-pwm-output)
