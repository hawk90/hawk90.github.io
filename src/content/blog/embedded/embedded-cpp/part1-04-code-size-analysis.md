---
title: "C++ 코드 크기 분석 — 가상 함수·템플릿·예외 비용 추적"
slug: "embedded/embedded-cpp/part1-04-code-size-analysis"
date: 2026-04-28T09:04:00
description: "size, nm, objdump, bloaty — 어디서 어떤 크기가 오는지 측정하는 도구. bloat 추적의 표준 워크플로."
series: "Embedded C++ for Real Systems"
seriesOrder: 4
tags: [cpp, embedded, code-size, bloat, tools, nm, objdump, bloaty]
type: tech
topics: ["embedded"]
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

일반적인 Flash 실행 구성에서는 코드·읽기 전용 데이터와 `.data` 초기화 이미지가 Flash를 사용합니다. 벡터 테이블, unwind 정보, 사용자 섹션과 정렬 간격도 포함해야 하므로 위 섹션만 더한 값은 완전한 Flash 예산이 아닙니다. 최종 링크 map의 메모리 영역과 LMA(load address)를 확인합니다.

정적 RAM의 첫 근사는 `.data + .bss`입니다. heap·각 태스크 stack·DMA 예약 영역 등을 별도로 합산하되, `.bss` 안에 잡은 heap 배열을 다시 더하지 않습니다.

## 도구 1 — `size`

가장 단순한 도구입니다. 전체 섹션 크기의 합계를 보여 줍니다.

```text
$ arm-none-eabi-size firmware.elf

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

`dec`는 `text + data + bss`이므로 Flash 임계치로 쓰면 RAM의 `.bss`까지 Flash 사용량으로 오판합니다. 아래 재현 예제에서는 Flash의 첫 근사인 `text + data`와 정적 RAM인 `data + bss`를 별도로 제한합니다. 실제 펌웨어 CI에서는 보드의 linker map으로 영역별 예산을 검사해야 합니다.

## 도구 2 — `nm`

각 심볼(함수, 변수)의 크기와 위치를 보여 줍니다.

```bash
arm-none-eabi-nm -S --size-sort --reverse-sort --demangle firmware.elf
```

각 줄의 형식은 `<주소> <크기> <type> <심볼>`입니다.

- T/R/D 같은 대문자는 일반적으로 외부 심볼을 나타냅니다. `u`, `v`, `w` 등에는 별도 의미가 있습니다
- 소문자(t, r, d)는 local을 의미합니다
- T/t는 code(.text)입니다
- R/r은 read-only data(.rodata)입니다
- D/d는 data입니다
- B/b는 bss입니다
- U는 undefined(외부 심볼)입니다

자주 쓰는 옵션은 다음과 같습니다.

```bash
# 크기 내림차순
arm-none-eabi-nm --size-sort --reverse-sort -S firmware.elf | head -30

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
 238:   .... ....       bl      <printf>
 23c:   bd10            pop     {r4, pc}
```

위 출력은 명령 길이를 읽는 **설명용 예시**입니다. 16비트 명령 세 개와 32비트 `bl` 하나이므로 합계는 10바이트입니다. 호출 대상의 코드와 literal pool 등까지 포함한 비용은 별도로 조사해야 합니다. 실제 ELF에서는 relocation 해소 여부도 확인합니다.

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

형식 설명용 출력(실측 결과 아님):

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
arm-none-eabi-nm --undefined-only build/suspect.o
# 최종 ELF에 포함된 archive 멤버와 참조 원인은 firmware.map에서 확인
```

자주 보는 큰 함수 후보는 다음과 같습니다.

- `__cxa_throw`, `__cxa_begin_catch`: 예외 관련입니다. `-fno-exceptions` 누락 가능성이 있습니다
- `_dtoa_r`, `_printf_float`: float printf입니다. 정수 printf로 대체합니다
- `vfprintf`: printf 전체입니다. 단순 출력 함수로 대체합니다
- `__divdi3`, `__moddi3`: 64-bit divmod입니다. 알고리즘을 재검토합니다
- `operator new`, `malloc`: 동적 할당입니다. 정적 할당을 우선합니다
- `std::__throw_*`: 라이브러리의 오류 처리 경로일 수 있습니다. 이 심볼만으로 애플리케이션의 `-fno-exceptions` 누락을 단정하지 말고 라이브러리 빌드 설정과 호출 경로를 확인합니다

## 워크플로 2 — PR 크기 변화 추적

두 revision을 별도 CI 작업의 독립된 소스·빌드 디렉터리에서 같은 도구 버전과 옵션으로 빌드합니다. 빌드 산출물을 `firmware_main.elf`, `firmware_pr.elf`로 모은 뒤 비교합니다. 소스만 checkout하고 이전 object를 재사용하면 비교가 오염될 수 있습니다.

```bash
bloaty -d symbols --demangle=full firmware_pr.elf -- firmware_main.elf > size-diff.txt
```

`size-diff.txt`를 PR 코멘트에 자동으로 첨부합니다. 예상치 않은 크기 증가를 리뷰 단계에서 발견할 수 있습니다.

## 워크플로 3 — 템플릿 bloat 추적

템플릿의 서로 다른 인스턴스가 코드를 늘릴 수 있습니다. 하지만 소스 줄 수와 기계어 크기는 비례하지 않습니다. 인라인, 사용하지 않는 인스턴스 제거, COMDAT 중복 제거와 링커의 동일 코드 병합 등에 따라 최종 결과가 달라집니다.

```cpp
template<typename T>
void process(T value) {
    // 100 lines
}

process<int>(1);
process<long>(2);
process<int8_t>(3);
// 서로 다른 인스턴스. 최종 코드 크기는 ELF로 확인합니다.
```

확인 방법은 다음과 같습니다.

```bash
arm-none-eabi-nm -S --size-sort --demangle firmware.elf | grep 'process<'
```

인스턴스가 실제로 별도 심볼로 남았는지 확인하고, 큰 공통 경로가 반복될 때 다음 대안을 비교합니다.

- 공통 부분을 type-erased 함수로 추출합니다
- `if constexpr`로 불필요한 분기를 제거합니다. concept 자체는 코드 공유나 크기 감소를 보장하지 않습니다
- non-template helper와 thin template wrapper를 결합합니다

자세한 내용은 [Part 2-07: Templates 비용 분석](/blog/embedded/embedded-cpp/part2-07-templates-cost)에서 다룹니다.

## 워크플로 4 — vtable 크기 추적

가상 호출에 필요한 vtable이 실제로 남았는지 심볼 크기로 확인합니다. 클래스 선언이 있다는 이유만으로 항상 별도 테이블이 최종 ELF에 남지는 않습니다.

```bash
arm-none-eabi-nm -S --size-sort --demangle firmware.elf | grep 'vtable for'
```

vtable 크기를 `virtual 함수 수 × 4`로 계산하면 안 됩니다. 포인터 폭, offset-to-top·typeinfo 등의 ABI 항목, 가상 소멸자의 여러 진입점, 다중 상속의 보조 테이블이 영향을 줍니다. 객체 안의 vptr이 차지하는 RAM과 테이블이 차지하는 저장 공간도 구분합니다. [Itanium C++ ABI의 vtable 구성](https://itanium-cxx-abi.github.io/cxx-abi/abi.html#vtable-components)을 참고하되, 타깃 ABI와 실제 심볼을 우선합니다.

대안은 CRTP, `std::variant` + `std::visit`입니다. 자세한 내용은 [Part 2-08](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)에서 다룹니다.

## 워크플로 5 — Flash vs RAM 균형

다음은 합산 방법을 설명하는 가상 배치입니다. 실제 보드 측정값이 아닙니다.

```text
$ arm-none-eabi-size -A firmware.elf

section            size      addr
.isr_vector         460   8000000
.text             18432   80001cc
.rodata            4096   80049cc
.data              1024  20000000
.bss               8192  20000400
.heap              4096  20002400
.stack             8192  20003400
```

확인 항목은 다음과 같습니다.

- Flash 사용 = `.isr_vector + .text + .rodata + .data` = 24,012바이트(약 23.45 KiB), 다른 섹션·간격이 없다는 가정
- RAM 사용 = `.data + .bss + .heap + .stack` = 21,504바이트(21 KiB)
- 실제 MCU 품번의 메모리 뱅크별 용량과 비교합니다. `.data`의 위 주소는 RAM VMA이므로 Flash 초기화 이미지의 LMA도 map에서 확인합니다

RAM이 부족하면 다음을 검토합니다.

- `.bss`를 분석해 큰 정적 buffer를 줄입니다
- 객체 수명과 동시 사용량을 확인합니다. static을 stack이나 heap으로 옮겨도 총 RAM 요구량이 자동으로 줄지는 않습니다
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

```makefile
# Makefile: 최종 C++ 드라이버 링크 명령이 LDFLAGS를 사용해야 합니다
LDFLAGS += -Wl,-Map=firmware.map,--cref
```

```bash
grep "\.text" firmware.map | head -30
```

map 파일은 모든 심볼의 link 결정을 보여줍니다. 예상치 않은 함수가 들어오면 그 호출 chain을 추적합니다.

## 자주 보는 함정과 안티패턴

### 1. 디버그 정보를 포함한 크기로 비교

`size`는 디버그를 제외하고 보여줍니다. `ls -l firmware.elf`는 포함한 크기입니다. 혼동에 주의합니다. `objcopy -O binary` 결과도 LMA 사이의 간격을 포함할 수 있습니다. sparse HEX 이미지의 파일 크기나 ELF의 디스크 크기를 Flash 사용량과 동일시하지 않습니다.

### 2. strip 후 분석

strip 옵션에 따라 디버그 정보만 지우거나 심볼 테이블도 지웁니다. 심볼을 제거해도 기계어 디스어셈블은 가능하지만 이름·소스 대응은 어려워집니다. 분석용 원본 ELF를 보관합니다.

### 3. 함수가 인라인으로 사라진 뒤 찾음

nm에 없는 함수는 인라인됐거나, 미사용으로 제거됐거나, 처음부터 emit되지 않았거나, 심볼이 strip됐을 수 있습니다. `-fno-inline-functions`를 임시로 켜서 확인할 수 있습니다(디버깅 목적).

### 4. .o 파일 크기 합계는 ELF 크기와 다름

링커가 gc-sections와 LTO로 크기를 줄입니다. .o 합계를 최종 크기의 엄밀한 상한으로 보아서는 안 됩니다. 링크 시 정렬·stub·추가 메타데이터도 생길 수 있습니다.

### 5. RAM 부족인데 Flash만 분석

`.bss`가 큽니다. `size`로 RAM도 함께 확인합니다.

### 6. bloaty 없이 nm만 사용

복잡한 프로젝트에서는 비교가 어렵습니다. PR 변화 추적에는 bloaty를 권장합니다.

## 재현 — `.bss` 증가를 Flash 증가로 오판하지 않기

아래는 보드 실측 대신 ELF object의 섹션을 직접 확인하는 작은 실험입니다. Clang의 Linux ELF 타깃과 LLVM 도구를 사용하며 시스템 헤더나 ELF 링커는 필요하지 않습니다. 최종 펌웨어의 배치·GC·LTO 효과는 이 실험의 범위 밖입니다.

```cpp title="sections.cpp"
#ifndef BSS_COUNT
#define BSS_COUNT 32
#endif
int initialized[4] = {1, 2, 3, 4};
int zeroed[BSS_COUNT];
int read_value(unsigned index) { return initialized[index & 3] + zeroed[0]; }
```

```bash
clang++ --target=x86_64-unknown-linux-gnu -O2 -g -c sections.cpp -o small.o
clang++ --target=x86_64-unknown-linux-gnu -O2 -g -DBSS_COUNT=1024 -c sections.cpp -o large.o
llvm-size --format=berkeley small.o large.o
llvm-nm -S --size-sort --reverse-sort --demangle small.o
llvm-objdump -h -d small.o
llvm-objcopy --strip-debug small.o small-stripped.o
llvm-size --format=berkeley small.o small-stripped.o
```

이 실험에서 확인할 관계는 세 가지입니다.

- `.bss`는 128 → 4,096바이트, `.data`는 양쪽 모두 16바이트입니다.
- 코드가 같은 이 예제에서는 `text + data`는 그대로이고, `data + bss`가 144 → 4,112바이트가 됩니다. `dec`를 Flash 제한에 쓰면 오판합니다.
- `--strip-debug`는 이 예제의 디버그 정보를 제거하지만, `text/data/bss`는 바꾸지 않습니다. ELF 파일 크기 감소를 Flash 절약으로 세지 않습니다.

이 관계는 저장소의 `scripts/verify-embedded-cpp-size-examples.mjs`로 검사합니다. 이 object 예제에 한정된 검증이며, Bloaty 비교나 실기기 Flash 사용량을 측정한 결과가 아닙니다.

## 1차 자료

- [GNU size: Berkeley/System V 형식](https://sourceware.org/binutils/docs/binutils/size.html)
- [GNU nm: 심볼 종류와 크기 정렬](https://sourceware.org/binutils/docs/binutils/nm.html)
- [GNU objcopy: binary 형식과 strip](https://sourceware.org/binutils/docs/binutils/objcopy.html)

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
