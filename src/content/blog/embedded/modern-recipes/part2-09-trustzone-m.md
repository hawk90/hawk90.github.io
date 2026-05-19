---
title: "2-09: TrustZone-M 기초"
date: 2026-05-12T21:00:00
description: "Cortex-M33의 Secure/Non-Secure 분리·SAU/IDAU·NSC."
series: "Modern Embedded Recipes"
seriesOrder: 21
tags: [recipes, arm, trustzone]
draft: false
---

## 한 줄 요약

> **"TrustZone-M은 하나의 코어에 두 개의 세계를 만듭니다."** Secure에 두면 NS 세계가 절대 접근할 수 없고, NS 코드가 죽어도 Secure는 살아 있습니다.

## 어떤 상황에서 쓰나

- 펌웨어 무결성 검증과 secure boot
- 키 저장과 암호 연산 격리
- 보안 인증 칩(예: 결제, 의료) 설계
- IoT 디바이스의 보안 요구 대응

## 핵심 개념

### 1) Secure / Non-Secure world

TrustZone-M은 같은 CPU에서 두 모드로 동작합니다.

```text
   Secure world (S)              Non-Secure world (NS)
   ─────────────                 ─────────────
   secure boot code              application
   crypto keys                   user task
   secure storage                일반 IRQ
   PUF / unique ID
```

각 world는 별도의 stack, MPU region, vector table, system register를 갖습니다(banked register).

### 2) Memory 분류 — Secure / NS / NSC

```text
주소 영역별 보안 속성:

S (Secure)            — NS에서 접근 불가
NS (Non-Secure)       — 누구나 접근 가능
NSC (Non-Secure       — NS가 S 함수를 호출할 수 있는
     Callable)          gateway 영역
```

`NSC` 영역은 S 코드인데 NS에서 진입을 허용합니다. SG(Secure Gateway) 명령으로 진입합니다.

### 3) SAU / IDAU — 누가 어디를 정하나

- **IDAU (Implementation Defined Attribution Unit)** — chip vendor가 고정 영역을 정합니다 (예: STM32L5).
- **SAU (Security Attribution Unit)** — 소프트웨어가 runtime에 영역을 설정합니다.

두 결과의 logical AND 또는 OR로 최종 보안 속성이 결정됩니다.

```c
// SAU region 0: 0x10000000~0x1003FFFF를 NS로
SAU->RNR = 0;
SAU->RBAR = 0x10000000;
SAU->RLAR = 0x1003FFE0 | SAU_RLAR_ENABLE_Msk;

SAU->CTRL = SAU_CTRL_ENABLE_Msk;
```

### 4) Secure Gateway — NSC

NS 코드가 S 함수를 호출하려면 NSC 영역에 있는 SG 명령을 거쳐야 합니다.

```c
// S 영역의 함수
__attribute__((cmse_nonsecure_entry))
int secure_compute(int x) {
    return x * 2 + secret_key;
}
```

`cmse_nonsecure_entry`로 attribute를 단 함수는 NSC 영역에 컴파일되고, 진입부에 `SG` 명령이 들어갑니다. NS 코드는 일반 함수 호출처럼 부르고, CPU가 자동으로 S로 전환합니다.

### 5) Banked register와 IRQ

S와 NS는 별도의 SP, control register, MPU 설정을 가집니다.

```text
Banked: MSP_S, MSP_NS, PSP_S, PSP_NS, CONTROL_S, CONTROL_NS, ...
Shared: 일반 R0~R12, PC
```

IRQ는 NVIC에서 S 또는 NS로 라우팅 됩니다. AIRCR.PRIS bit으로 S IRQ가 NS보다 절반 priority space만 차지하도록 분리할 수 있습니다.

## 코드 / 실제 사용 예

STM32L5에서 secure boot 단순 예시입니다.

```c
// S 영역의 boot code
void secure_boot(void) {
    // 1. 펌웨어 hash 검증
    if (!verify_firmware()) {
        flash_erase();
        reset();
    }
    
    // 2. SAU/IDAU 설정 — NS 영역 정의
    setup_sau();
    
    // 3. NS 영역의 reset handler 호출
    typedef void (*ns_func_t)(void) __attribute__((cmse_nonsecure_call));
    ns_func_t ns_reset = (ns_func_t)(0x08040000 + 4);
    ns_reset();
    
    // 여기로 돌아오지 않음
}
```

NS에서 S 함수 호출:

```c
// NS 측 헤더 — S에서 export된 함수 선언
extern int secure_compute(int x);

void ns_main(void) {
    int result = secure_compute(10);    // SG로 자동 진입
    printf("got %d\n", result);
}
```

빌드:

```bash
# S 빌드
arm-none-eabi-gcc -mcpu=cortex-m33 -mcmse \
    -DCORE_CM33 secure.c -o secure.elf

# NS 빌드 — S의 export library 링크
arm-none-eabi-gcc -mcpu=cortex-m33 \
    nonsecure.c secure_lib.o -o nonsecure.elf
```

## 측정 / 비교

| 동작 | Cortex-M33 cycle |
| --- | --- |
| NS → S 진입 (SG) | 4 ~ 5 cycle |
| S → NS 리턴 (BXNS) | 4 cycle |
| Banked register 접근 | 1 cycle (각 world에서) |
| Cross-world IRQ entry | ~12 ~ 15 cycle |

| Region 수 | 단위 |
| --- | --- |
| SAU region | 8 |
| MPU_S region | 8 ~ 16 |
| MPU_NS region | 8 ~ 16 |

## 자주 보는 함정

> ⚠️ NS에서 S 영역 직접 접근

NS code가 S 영역의 주소를 read/write하면 BusFault. 일부러 시도하면 빠른 secure violation 감지.

> ⚠️ SAU region overlap

SAU와 IDAU 영역이 겹치면 우선순위 규칙이 chip마다 다릅니다. 데이터시트 확인 후 비-overlap으로 설계.

> ⚠️ NSC 영역에 SG 없는 함수 두기

`cmse_nonsecure_entry` 없이 함수를 NSC 영역에 두면 NS 진입 시 SG 명령이 없어 fault. 컴파일 옵션 `-mcmse` 필수.

> ⚠️ NS 코드가 S secret를 stack에 누적

S 함수 진입 시 S stack을 쓰지만, 호출 인자는 register로 들어옵니다. callee가 결과를 반환할 때 register clean을 안 하면 NS가 S 내부 값을 볼 수 있습니다. `cmse_nonsecure_entry`가 자동으로 clean 해 줍니다.

> ⚠️ Priority bit 분배 안 함

`AIRCR.PRIS = 0`이면 S와 NS가 같은 priority space를 공유합니다. S IRQ가 NS IRQ에 묻힐 수 있습니다. `PRIS = 1`로 분리 권장.

## 정리

- TrustZone-M은 같은 코어에 S와 NS 두 세계를 만들어, 보안 코드와 일반 코드를 격리합니다.
- 메모리 영역은 S, NS, NSC로 분류되며, SAU(SW)와 IDAU(HW)가 결정합니다.
- NS → S 호출은 NSC 영역의 SG 명령을 통해 이뤄집니다(`cmse_nonsecure_entry`).
- Banked register와 IRQ 라우팅으로 두 세계의 자원이 분리됩니다.
- 컴파일러는 `-mcmse` 옵션이 필요합니다.

다음 편에서는 **Memory Barrier 실전**을 다룹니다. DMB, DSB, ISB의 정확한 사용 시점입니다.

## 관련 항목

- [2-03: ARM 레지스터 구조](/blog/embedded/modern-recipes/part2-03-arm-registers)
- [2-04: Cortex-M 예외 처리](/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions)
- [2-10: Memory Barrier 실전](/blog/embedded/modern-recipes/part2-10-memory-barrier)
- 더 깊이 — [Practical RTOS Internals: Secure RTOS](/blog/embedded/rtos/practical-internals/)
