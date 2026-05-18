---
title: "Part 1-04: 코드 크기 분석"
date: 2026-05-13T04:00:00
description: "size, nm, objdump, bloaty — 어디서 어떤 크기가 오는지 측정하는 도구. bloat 추적의 표준 워크플로."
series: "Embedded C++ for Real Systems"
seriesOrder: 4
tags: [cpp, embedded, code-size, bloat, tools, nm, objdump, bloaty]
type: tech
---

## 한 줄 요약

> **"측정 없이 최적화 없습니다."** `size`, `nm`, `objdump`, `bloaty` 네 도구로 어디서 크기가 오는지 추적합니다.

## 어떤 문제를 푸는가

빌드를 끝내고 ELF가 예상보다 큰 경우가 있습니다. Flash 용량을 초과하거나 PR이 갑자기 10KB 늘기도 합니다. 어디서 왔는지 모르면 해결할 수 없습니다.

bloat 추적은 추정이 아닌 측정의 영역입니다. 임베디드 표준 도구가 정확히 어느 함수가, 어느 라이브러리가, 어느 인스턴스가 자리를 먹는지 알려줍니다.

이 글은 네 도구의 사용 패턴과 bloat 추적 워크플로를 정리합니다.

## ELF 파일의 구조

크기 분석을 하려면 ELF 섹션을 알아야 합니다.

| 섹션 | 의미 | 위치 (Flash/RAM) |
| --- | --- | --- |
| `.text` | 실행 코드 | Flash |
| `.rodata` | 읽기 전용 데이터 (const, string literal) | Flash |
| `.data` | 초기값 있는 mutable 데이터 | RAM (init from Flash) |
| `.bss` | 0으로 초기화되는 데이터 | RAM |
| `.init_array` | static 생성자 포인터 | Flash |
| `.fini_array` | static 소멸자 포인터 | Flash |
| `.debug_*` | 디버그 정보 | (ELF에만, Flash X) |
| `.comment`, `.note` | 메타 | (보통 strip) |

Flash 사용량 = `.text + .rodata + .data + .init_array`.
RAM 사용량 = `.data + .bss + heap + stack`.

## 도구 1 — `size`

가장 단순한 도구입니다. 전체 섹션 크기의 합계를 보여 줍니다.

```bash
arm-none-eabi-size firmware.elf

   text    data     bss     dec     hex filename
  18432    1024    8192   27648    6c00 firmware.elf
```

- `text`: 코드 + read-only 데이터
- `data`: 초기값 있는 RAM 데이터
- `bss`: 0 초기화 RAM 데이터
- `dec`: 위 셋의 합계 (decimal)

첫 점검에 유용합니다. 자주 보는 사용은 다음과 같습니다.

```bash
# Berkeley 형식 (위와 같음)
arm-none-eabi-size firmware.elf

# SystemV 형식 (섹션별 자세히)
arm-none-eabi-size -A firmware.elf
arm-none-eabi-size -A -d firmware.elf   # decimal

# 여러 파일 비교
arm-none-eabi-size *.o
```

CI에 추가해 두면 PR마다 크기 변화를 추적할 수 있습니다. 임계치를 넘으면 fail로 처리합니다.

```bash
# CI script 예시
size firmware.elf | awk 'NR==2 {if ($4 > 65536) exit 1}'
```

## 도구 2 — `nm`

각 심볼(함수, 변수)의 크기와 위치를 보여 줍니다.

```bash
arm-none-eabi-nm --size-sort --print-size firmware.elf | tail -20

00000034 t reset_handler
00000080 T main
000000a8 t setup_clock
00000118 T HAL_GPIO_Init
00000234 T HAL_UART_Init
00000820 r .rodata.constprop_table
000018f0 T __libc_init_array
```

각 줄의 형식은 `<주소> <크기> <type> <심볼>`입니다.

- 대문자 type(T, R, D)은 global을 의미합니다
- 소문자(t, r, d)는 local을 의미합니다
- T/t는 code(.text)입니다
- R/r은 read-only data(.rodata)입니다
- D/d는 data입니다
- B/b는 bss입니다
- U는 undefined(외부 심볼)입니다

자주 쓰는 옵션은 다음과 같습니다.

```bash
# 크기 내림차순
nm --size-sort -S firmware.elf | sort -k 2 -r | head -30

# C++ 데맹글링
nm --demangle firmware.elf

# 특정 섹션만
nm firmware.elf | grep " T "   # .text 함수만
```

C++ 디맹글링이 결정적입니다. 다음과 같이 원래 이름이 보입니다.

```text
# nm 그대로
00000234 T _ZN6Logger7log_intEPKci

# nm --demangle
00000234 T Logger::log_int(char const*, int)
```

## 도구 3 — `objdump`

가장 강력한 도구입니다. 디스어셈블, 섹션 헤더, 심볼 테이블을 모두 다룰 수 있습니다.

```bash
# 전체 디스어셈블 (큼)
arm-none-eabi-objdump -d firmware.elf > disasm.txt

# 한 함수만
arm-none-eabi-objdump -d firmware.elf --disassemble=main

# C++ 디맹글
arm-none-eabi-objdump -d -C firmware.elf

# 소스 라인 mapping (with -g)
arm-none-eabi-objdump -dS firmware.elf

# 섹션 헤더
arm-none-eabi-objdump -h firmware.elf
```

자주 쓰는 패턴은 최적화 결과를 확인하는 용도입니다.

```bash
# 어셈블리에서 함수의 정확한 크기와 명령
arm-none-eabi-objdump -d -C firmware.elf --disassemble=Logger::log_int
```

출력:

```text
00000234 <Logger::log_int(char const*, int)>:
 234:   b510            push    {r4, lr}
 236:   4604            mov     r4, r0
 238:   f7ff fffe       bl      400 <printf>
 23c:   bd10            pop     {r4, pc}
```

함수가 8바이트의 ARM Thumb 명령으로 구성됩니다. 코드 리뷰에서 "이 추상화의 비용"을 정확히 보여줍니다.

## 도구 4 — `bloaty`

Google이 만든 현대적 크기 분석기입니다. 사용자 친화적입니다.

```bash
# 설치 (macOS)
brew install bloaty

# 기본 — 섹션별 크기
bloaty firmware.elf

# 심볼별 (큰 순서)
bloaty -d symbols firmware.elf | head -30

# 컴파일 유닛별
bloaty -d compileunits firmware.elf | head -30

# 두 차원 동시
bloaty -d sections,symbols firmware.elf | head -30

# C++ 데맹글
bloaty -d symbols --demangle=full firmware.elf
```

가장 강력한 사용은 두 빌드 비교입니다.

```bash
# 어느 함수가 자랐는가?
bloaty -d symbols --demangle=full firmware_new.elf -- firmware_old.elf
```

출력:

```text
    FILE SIZE        VM SIZE
 --------------  --------------
  +1.8%  +312    +1.8%  +312    [Diff]  Logger::log_full(...)
  +0.7%  +120    +0.7%  +120    [Diff]  vtable for ConcreteDevice
  -0.2%   -32    -0.2%   -32    [Diff]  main
```

PR이 크기를 늘렸을 때 어느 함수 때문인지 즉시 식별할 수 있습니다. CI에 통합할 만한 가치가 큽니다.

## 워크플로 1 — 어디서 크기가 오는가

새 프로젝트에서 처음 ELF가 큰 경우의 추적 절차입니다.

```bash
# 1단계: 전체 크기 확인
arm-none-eabi-size firmware.elf

# 2단계: 큰 함수 식별
arm-none-eabi-nm --size-sort --print-size --demangle firmware.elf | tail -30

# 3단계: 큰 함수의 어셈블리 확인
arm-none-eabi-objdump -d -C firmware.elf --disassemble='<큰 함수 이름>'

# 4단계: 라이브러리 의존성 확인
arm-none-eabi-nm --undefined-only firmware.elf
```

자주 보는 큰 함수 후보는 다음과 같습니다.

- `__cxa_throw`, `__cxa_begin_catch`: 예외 관련입니다. `-fno-exceptions` 누락 가능성이 있습니다
- `_dtoa_r`, `_printf_float`: float printf입니다. 정수 printf로 대체합니다
- `vfprintf`: printf 전체입니다. 단순 출력 함수로 대체합니다
- `__divdi3`, `__moddi3`: 64-bit divmod입니다. 알고리즘을 재검토합니다
- `operator new`, `malloc`: 동적 할당입니다. 정적 할당을 우선합니다
- `std::__throw_*`: STL 예외입니다. `-fno-exceptions`가 켜지지 않은 상태입니다

## 워크플로 2 — PR 크기 변화 추적

```bash
# CI에서
git checkout main
make firmware && cp firmware.elf firmware_main.elf

git checkout pr-branch
make firmware && cp firmware.elf firmware_pr.elf

bloaty -d symbols --demangle=full firmware_pr.elf -- firmware_main.elf > size-diff.txt
```

`size-diff.txt`를 PR 코멘트에 자동으로 첨부합니다. 예상치 않은 크기 증가를 리뷰 단계에서 발견할 수 있습니다.

## 워크플로 3 — 템플릿 bloat 추적

C++ 템플릿은 각 type 인스턴스마다 코드를 생성합니다. 무심하게 쓰면 코드가 중복됩니다.

```cpp
template<typename T>
void process(T value) {
    // 100 lines
}

process<int>(1);
process<long>(2);
process<int8_t>(3);
// → 100 lines * 3 = 300 lines (각 type별)
```

확인 방법은 다음과 같습니다.

```bash
nm --size-sort --print-size --demangle firmware.elf | grep "process<"

00000064 T void process<int>(int)
00000064 T void process<long>(long)
00000064 T void process<signed char>(signed char)
```

세 인스턴스가 보입니다. 대안은 다음과 같습니다.

- 공통 부분을 type-erased 함수로 추출합니다
- concept이나 `if constexpr`로 분기를 통합합니다
- non-template helper와 thin template wrapper를 결합합니다

자세한 내용은 [Part 2-07: Templates 비용 분석](/blog/embedded/embedded-cpp/part2-07-templates-cost)에서 다룹니다.

## 워크플로 4 — vtable 크기 추적

각 virtual 클래스가 vtable을 만듭니다.

```bash
nm --size-sort --print-size --demangle firmware.elf | grep "vtable for"

00000020 V vtable for Logger
00000040 V vtable for ConcreteDevice
00000018 V vtable for INotifier
```

각 vtable은 virtual 함수 수 × 4바이트입니다. 50개 클래스에 평균 5개 virtual이면 1KB가 됩니다. 극소형 MCU에서는 무시할 수 없습니다.

대안은 CRTP, `std::variant` + `std::visit`입니다. 자세한 내용은 [Part 2-08](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)에서 다룹니다.

## 워크플로 5 — Flash vs RAM 균형

```bash
arm-none-eabi-size -A firmware.elf

section            size      addr
.isr_vector         460   8000000
.text             18432   80001cc
.rodata            4096   80043cc
.data              1024  20000000
.bss               8192  20000400
.heap              4096  20002400
.stack             8192  20003400
```

확인 항목은 다음과 같습니다.

- Flash 사용 = `.isr_vector + .text + .rodata + .data` = 약 24 KB
- RAM 사용 = `.data + .bss + .heap + .stack` = 약 21.5 KB
- 보드 사양(예: STM32F407 = 1MB Flash, 192 KB RAM)과 비교하면 여유가 큽니다

RAM이 부족하면 다음을 검토합니다.

- `.bss`를 분석해 큰 정적 buffer를 줄입니다
- `static` 객체는 stack이나 동적으로 옮깁니다
- 컴파일 시 `-fstack-usage`로 함수별 stack 사용을 측정합니다

```bash
arm-none-eabi-g++ -fstack-usage -c file.cpp
# file.su 파일 생성
```

## 라이브러리 추적 — 어느 .o 파일이 큰가

```bash
# .o 파일별 크기
arm-none-eabi-size build/*.o | sort -k4 -n

# 정적 라이브러리 안 .o 파일 별
arm-none-eabi-size -t libfoo.a
```

또는 link map을 활용합니다.

```bash
# 링크 시 map 파일 생성
LDFLAGS += -Wl,-Map=firmware.map

# map 파일 분석
grep "\.text" firmware.map | head -30
```

map 파일은 모든 심볼의 link 결정을 보여줍니다. 예상치 않은 함수가 들어오면 그 호출 chain을 추적합니다.

## 자주 보는 함정과 안티패턴

### 1. 디버그 정보를 포함한 크기로 비교

`size`는 디버그를 제외하고 보여줍니다. `ls -l firmware.elf`는 포함한 크기입니다. 혼동에 주의합니다. Flash에 실제로 들어가는 크기는 `arm-none-eabi-objcopy -O binary` 결과를 봅니다.

### 2. strip 후 분석

`strip`된 ELF는 심볼 정보가 없습니다. nm과 objdump가 무의미해집니다. strip 전 ELF로 분석합니다.

### 3. 함수가 인라인으로 사라진 뒤 찾음

nm에 없는 함수는 인라인된 상태입니다. `-fno-inline-functions`를 임시로 켜서 확인할 수 있습니다(디버깅 목적).

### 4. .o 파일 크기 합계는 ELF 크기와 다름

링커가 gc-sections와 LTO로 크기를 줄입니다. .o 합계는 상한일 뿐입니다.

### 5. RAM 부족인데 Flash만 분석

`.bss`가 큽니다. `size`로 RAM도 함께 확인합니다.

### 6. bloaty 없이 nm만 사용

복잡한 프로젝트에서는 비교가 어렵습니다. PR 변화 추적에는 bloaty를 권장합니다.

## 측정 — 한 임베디드 프로젝트의 분석

실제 STM32F4 + FreeRTOS + UART 프로젝트의 Flash 사용 분포입니다.

```text
arm-none-eabi-size firmware.elf
   text    data     bss     dec     hex filename
  68192    2048   24576   94816   1722c firmware.elf

bloaty -d symbols --demangle=full firmware.elf | head -10
    FILE SIZE        VM SIZE
 --------------  --------------
  18.4%  12552   18.4%  12552    HAL driver functions (STM32 HAL)
  14.2%   9696   14.2%   9696    FreeRTOS internals
   8.1%   5520    8.1%   5520    USB stack
   6.5%   4432    6.5%   4432    printf (정수 only)
   5.8%   3952    5.8%   3952    .rodata strings
   3.2%   2180    3.2%   2180    Application logic (C++)
   2.9%   1978    2.9%   1978    libgcc helpers
   2.1%   1432    2.1%   1432    Logger (vtable + impl)
   1.8%   1228    1.8%   1228    Ring buffer
  ...
```

HAL과 FreeRTOS가 절반을 차지합니다. application 자체는 3%에 불과합니다. 임베디드에서는 프레임워크 비용이 가장 큽니다.

## 정리

- 측정 도구는 네 가지입니다 — `size`(총량), `nm`(심볼), `objdump`(어셈블리), `bloaty`(분석/비교).
- C++ 심볼은 mangled되므로 `--demangle`(`-C`)로 디맹글이 필수입니다.
- 큰 함수 후보는 예외, float printf, 64-bit divmod, dynamic alloc, STL throw입니다.
- PR 크기 변화는 `bloaty`로 두 ELF를 비교하고 CI에 통합합니다.
- Flash와 RAM을 따로 추적합니다. `.bss`가 자주 잊혀지는 RAM 소비 원인입니다.

## 관련 항목

- [Part 1-02: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags) — 크기 줄이는 플래그
- [Part 1-03: 런타임 요구사항](/blog/embedded/embedded-cpp/part1-03-runtime-requirements) — libstdc++/newlib 크기 기여
- [Part 2-07: Templates 비용 분석](/blog/embedded/embedded-cpp/part2-07-templates-cost) — 템플릿 bloat 추적
- [Part 4-02: ETL 라이브러리](/blog/embedded/embedded-cpp/part4-02-etl-library) — heap 없이 STL 대체

## 다음 글

[Part 1-05: ABI 호환성](/blog/embedded/embedded-cpp/part1-05-abi-compatibility) — C와 C++가 같이 살 때 name mangling과 ABI가 만드는 함정과 해결책을 다룹니다.
