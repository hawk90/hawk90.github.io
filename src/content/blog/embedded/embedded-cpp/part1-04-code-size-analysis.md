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

빌드를 끝내고 ELF가 예상보다 큰 경우가 있습니다. Flash 용량을 초과하거나, 작은 PR 하나가 코드 크기를 크게 늘리기도 합니다. 어디서 왔는지 모르면 해결할 수 없습니다.

bloat 추적은 추정이 아닌 측정의 영역입니다. 임베디드 표준 도구가 정확히 어느 함수가, 어느 라이브러리가, 어느 인스턴스가 자리를 먹는지 알려줍니다.

이 글은 네 도구의 사용 패턴과 bloat 추적 워크플로를 정리합니다. 출력 예는 모두 실제로 만든 작은 펌웨어 `fw.elf`에서 나왔습니다. `fw.cpp`는 가상 함수 클래스 `ConcreteDevice`, 멤버 함수 `Logger::log_int`, 함수 템플릿 `process<T>`, 1KB 수신 버퍼, 64비트 나눗셈 하나를 담고 있고, Homebrew arm-none-eabi-g++ 16.2.0(`-mcpu=cortex-m4 -mthumb -Os -g -fno-exceptions -fno-rtti -ffunction-sections -fdata-sections -Wl,--gc-sections -nostdlib -lgcc`)으로 링크해 QEMU `mps2-an386`에서 실행했습니다.

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
| `.comment`, `.ARM.attributes` | 툴체인·ABI 메타데이터 | (ELF에만, Flash X) |

Flash에서 실행하는 구성에서는 코드·읽기 전용 데이터와 `.data` 초기화 이미지가 Flash를 씁니다. 벡터 테이블(`.isr_vector`), unwind 인덱스(`.ARM.exidx`), 사용자 섹션과 정렬 간격도 Flash에 들어가므로 위 표의 섹션만 더한 값은 Flash 예산 전체가 아닙니다. 실제 배치는 최종 링크 map의 메모리 영역과 LMA(load address)가 보여 줍니다.

정적 RAM의 첫 근사는 `.data + .bss`입니다. heap·각 태스크 stack·DMA 예약 영역 등을 별도로 합산하되, `.bss` 안에 잡은 heap 배열을 다시 더하지 않습니다.

## 도구 1 — `size`

가장 단순한 도구입니다. 전체 섹션 크기의 합계를 보여 줍니다.

```text
$ arm-none-eabi-size fw.elf
   text	   data	    bss	    dec	    hex	filename
   1396	     32	   1024	   2452	    994	fw.elf
```

- `text`: 코드 + read-only 데이터. 이 ELF에서는 `.text` 1,388바이트에 `.ARM.exidx` 8바이트가 더해진 값입니다
- `data`: 초기값 있는 RAM 데이터. 이 ELF에서는 `.data` 24바이트에 `.isr_vector` 8바이트가 더해졌습니다. GNU `size`의 Berkeley 형식은 쓰기 가능한 할당 섹션을 data로 세는데, 이 실험의 벡터 테이블이 `const`가 아닌 포인터 배열이라 쓰기 가능 섹션이 됐습니다
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

`-A`(System V 형식)는 섹션마다 한 줄씩 보여 줍니다. 같은 ELF입니다(`.debug_*` 아홉 줄 중 일곱 줄 생략).

```text
fw.elf  :
section            size        addr
.isr_vector           8           0
.text              1388           8
.ARM.exidx            8        1396
.data                24   536870912
.bss               1024   536870936
.comment             18           0
.ARM.attributes      46           0
.debug_info        4005           0
...
.debug_str         2720           0
Total             17241
```

`.debug_*`·`.comment`·`.ARM.attributes`는 할당 섹션이 아니라 Berkeley 형식 합계에 들어가지 않습니다. `-A`의 `Total`은 이것까지 더하므로 Flash 사용량으로 읽지 않습니다. `size` 출력을 CI에 남겨 두면 PR마다 크기 변화를 추적할 수 있습니다.

`dec`는 `text + data + bss`이므로 Flash 임계치로 쓰면 RAM의 `.bss`까지 Flash 사용량으로 오판합니다. 아래 재현 예제에서는 Flash의 첫 근사인 `text + data`와 정적 RAM인 `data + bss`를 별도로 제한합니다. 실제 펌웨어 CI에서는 보드의 linker map으로 영역별 예산을 검사해야 합니다.

## 도구 2 — `nm`

각 심볼(함수, 변수)의 크기와 위치를 보여 줍니다.

```bash
arm-none-eabi-nm -S --size-sort --reverse-sort --demangle firmware.elf
```

각 줄의 형식은 `<주소> <크기> <type> <심볼>`입니다.

- 대문자는 전역(외부) 심볼, 소문자는 지역 심볼입니다. [GNU nm 문서](https://sourceware.org/binutils/docs/binutils/nm.html)는 예외로 소문자 `u`·`v`·`w`가 특수한 전역 심볼(unique global, weak object, weak)을 나타낸다고 적습니다
- `V`/`W`는 weak 심볼입니다. 템플릿 인스턴스·인라인 멤버 함수·vtable처럼 여러 번역 단위에 나올 수 있는 정의가 이렇게 표시됩니다
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

C++ 심볼은 디맹글해야 읽힙니다. `fw.elf`에 `nm -S --size-sort --reverse-sort --demangle`을 돌린 결과의 앞부분입니다(링커 스크립트가 정의한 `_estack`·`_ebss` 두 줄 생략).

```text
20000018 00000400 B rx_buffer
00000224 00000326 T __udivmoddi4
000000d4 000000b0 T main
00000184 000000a0 T __aeabi_ldivmod
00000054 00000074 T Reset_Handler
00000010 0000002e T sh_putu
0000055c 00000018 V vtable for ConcreteDevice
0000003e 00000016 T sh_exit
20000008 00000010 D calib
...
000000cc 00000004 W ConcreteDevice::write(int)
000000c8 00000004 W ConcreteDevice::read()
```

`--demangle` 없이는 `vtable for ConcreteDevice`가 `_ZTV14ConcreteDevice`로 보입니다. 이 작은 펌웨어에서 가장 큰 코드는 애플리케이션이 아니라 64비트 나눗셈 한 줄이 끌어온 libgcc의 `__udivmoddi4`(806바이트)와 `__aeabi_ldivmod`(160바이트)입니다. `Logger::log_int`와 `process<T>`는 목록에 없습니다. 둘 다 `main`에 인라인됐기 때문입니다.

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

자주 쓰는 패턴은 최적화 결과를 확인하는 용도입니다. `--disassemble=`에는 맹글된 이름을 줍니다. 위에서 사라진 `Logger::log_int`를 `--disassemble=_ZN6Logger7log_intEPKci`로 찾으면 아무 명령도 나오지 않습니다. `main`을 보면 그 이유가 보입니다.

```text
$ arm-none-eabi-objdump -d --disassemble=main fw.elf
000000d4 <main>:
  d4:	b538      	push	{r3, r4, r5, lr}
  d6:	4c24      	ldr	r4, [pc, #144]	@ (168 <main+0x94>)
  d8:	4824      	ldr	r0, [pc, #144]	@ (16c <main+0x98>)
  da:	2307      	movs	r3, #7
  dc:	6063      	str	r3, [r4, #4]
  de:	4b24      	ldr	r3, [pc, #144]	@ (170 <main+0x9c>)
  e0:	689a      	ldr	r2, [r3, #8]
  e2:	6859      	ldr	r1, [r3, #4]
  e4:	17d3      	asrs	r3, r2, #31
  e6:	fb81 0100 	smull	r0, r1, r1, r0
  ea:	f000 f84b 	bl	184 <__aeabi_ldivmod>
...
```

`d->write(7)`은 가상 호출이 아니라 `dev.reg`에 7을 쓰는 `str r3, [r4, #4]` 하나가 됐습니다. 컴파일러가 `d`가 `dev`를 가리킨다는 것을 알고 devirtualization한 결과입니다. 그 뒤 `smull`로 64비트 곱을 만든 다음 `__aeabi_ldivmod`를 부릅니다. 명령 폭은 2바이트(`b538`)와 4바이트(`fb81 0100`)가 섞이므로 함수 크기는 명령 수가 아니라 `nm -S`의 크기 열로 읽습니다.

## 도구 4 — `bloaty`

Google이 공개한 크기 분석기입니다([github.com/google/bloaty](https://github.com/google/bloaty)). 섹션·심볼·컴파일 유닛 단위로 파일 크기와 VM 크기를 나눠 보여 줍니다. 이 글을 쓴 Mac에는 bloaty가 설치되어 있지 않아 아래 명령은 실행하지 않았습니다.

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

`--` 뒤에 기준 파일을 주면 bloaty는 심볼별 증감을 출력합니다. PR이 크기를 늘렸을 때 어느 함수 때문인지 한 번에 보입니다.

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
- `_dtoa_r`, `_printf_float`: newlib의 float printf입니다. 정수 printf로 대체합니다
- `vfprintf`: printf 전체입니다. 단순 출력 함수로 대체합니다
- `__aeabi_ldivmod`, `__aeabi_uldivmod`, `__udivmoddi4`: ARM EABI의 64비트 나눗셈입니다. 위 `fw.elf`에서 둘이 966바이트였습니다. 64비트 피연산자가 꼭 필요한지 재검토합니다
- `operator new`, `malloc`: 동적 할당입니다. 정적 할당을 우선합니다
- `std::__throw_*`: 라이브러리의 오류 처리 경로일 수 있습니다. 이 심볼만으로 애플리케이션의 `-fno-exceptions` 누락을 단정하지 말고 라이브러리 빌드 설정과 호출 경로를 확인합니다

## 워크플로 2 — PR 크기 변화 추적

두 revision을 별도 CI 작업의 독립된 소스·빌드 디렉터리에서 같은 도구 버전과 옵션으로 빌드합니다. 빌드 산출물을 `firmware_main.elf`, `firmware_pr.elf`로 모은 뒤 비교합니다. 소스만 checkout하고 이전 object를 재사용하면 비교가 오염될 수 있습니다.

```bash
bloaty -d symbols --demangle=full firmware_pr.elf -- firmware_main.elf > size-diff.txt
```

`size-diff.txt`를 PR 코멘트에 첨부하면 크기 증가가 리뷰 단계에서 보입니다.

## 워크플로 3 — 템플릿 bloat 추적

템플릿의 서로 다른 인스턴스는 각자 코드를 만듭니다. 다만 소스 줄 수와 기계어 크기는 비례하지 않습니다. 위 `fw.elf`에서는 `process<int>`·`process<long long>`·`process<int8_t>` 세 인스턴스가 모두 `main`에 인라인되어 심볼이 하나도 남지 않았습니다. `process`에 `__attribute__((noinline))`을 붙여 다시 링크하면 세 인스턴스가 따로 나타납니다.

```text
$ arm-none-eabi-nm -S --size-sort -C fwn.elf | grep process
0000013a 0000001c W signed char process<signed char>(signed char)
000000d4 0000001c W int process<int>(int)
000000f0 0000004a W long long process<long long>(long long)
```

같은 소스가 `int`·`int8_t`에서는 28바이트, `long long`에서는 64비트 시프트·곱셈 때문에 74바이트가 됐고, ELF text는 1,396에서 1,480바이트로 늘었습니다.

`fw.cpp`의 템플릿은 다음과 같습니다.

```cpp
template <typename T> T process(T v) {
    T acc = 0;
    for (int i = 0; i < 8; ++i) acc = acc * 3 + (v >> i);
    return acc;
}
```

실제 프로젝트에서 확인하는 명령은 다음과 같습니다.

```bash
arm-none-eabi-nm -S --size-sort --demangle firmware.elf | grep 'process<'
```

큰 공통 경로가 인스턴스마다 반복되면 다음 대안을 비교합니다.

- 공통 부분을 type-erased 함수로 추출합니다
- `if constexpr`로 불필요한 분기를 제거합니다. concept 자체는 코드 공유나 크기 감소를 보장하지 않습니다
- non-template helper와 thin template wrapper를 결합합니다

자세한 내용은 [Part 2-07: Templates 비용 분석](/blog/embedded/embedded-cpp/part2-07-templates-cost)에서 다룹니다.

## 워크플로 4 — vtable 크기 추적

vtable도 심볼 크기로 보입니다. 위 `fw.elf`에서 `d->write(7)` 호출은 devirtualization됐지만, 전역 객체 `dev`의 vptr이 테이블을 가리키므로 `vtable for ConcreteDevice` 24바이트는 남았습니다.

```bash
arm-none-eabi-nm -S --size-sort --demangle firmware.elf | grep 'vtable for'
```

vtable 크기를 `virtual 함수 수 × 4`로 계산하면 틀립니다. `ConcreteDevice`의 가상 함수는 `read`·`write`·소멸자 셋인데 테이블은 24바이트, 즉 4바이트 항목 여섯 개입니다. offset-to-top과 typeinfo 포인터(`-fno-rtti`라 0) 두 항목, 가상 소멸자의 두 진입점(complete·deleting), `read`·`write`입니다. 다중 상속이면 보조 테이블이 더 붙습니다.

가상 소멸자의 deleting 진입점은 `operator delete`를 부릅니다. 그래서 이 펌웨어는 `new`를 한 번도 쓰지 않는데도, `-nostdlib`로 처음 링크했을 때 `undefined reference to 'operator delete(void*, unsigned int)'`로 실패했습니다. `fw.cpp`에 멈춤 루프만 있는 `operator delete`를 정의해 해결했습니다. 객체 안의 vptr이 차지하는 RAM과 테이블이 차지하는 저장 공간도 구분합니다. [Itanium C++ ABI의 vtable 구성](https://itanium-cxx-abi.github.io/cxx-abi/abi.html#vtable-components)을 참고하되, 타깃 ABI와 실제 심볼을 우선합니다.

대안은 CRTP, `std::variant` + `std::visit`입니다. 자세한 내용은 [Part 2-08](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)에서 다룹니다.

## 워크플로 5 — Flash vs RAM 균형

위 `size -A` 출력으로 합산하면 다음과 같습니다. 이 실험의 링커 스크립트는 `.rodata`를 `.text` 안에 넣고 heap·stack을 섹션으로 잡지 않습니다.

- Flash 사용 = `.isr_vector + .text + .ARM.exidx + .data` = 8 + 1,388 + 8 + 24 = 1,428바이트
- 정적 RAM = `.data + .bss` = 24 + 1,024 = 1,048바이트. stack은 RAM 끝(`_estack`)에서 아래로 자라며 이 합계에 없습니다
- `.data`의 주소 536870912는 `0x20000000`, 즉 RAM VMA입니다. Flash 안의 초기화 이미지 위치(LMA)는 map 파일의 `load address`에 있습니다

RAM이 부족하면 다음을 검토합니다.

- `.bss`를 분석해 큰 정적 buffer를 줄입니다
- 객체 수명과 동시 사용량을 확인합니다. static을 stack이나 heap으로 옮겨도 총 RAM 요구량이 자동으로 줄지는 않습니다
- 컴파일 시 `-fstack-usage`로 함수별 stack 사용을 측정합니다

```bash
arm-none-eabi-g++ -fstack-usage -c file.cpp
# file.su 파일 생성
```

`fw.cpp`에서 만든 `fw.su`의 일부입니다. 열은 위치·함수·바이트·종류이고, `static`은 크기가 컴파일 시 고정이라는 뜻입니다.

```text
fw.cpp:5:51:virtual int ConcreteDevice::read()	0	static
fw.cpp:5:88:virtual void ConcreteDevice::write(int)	0	static
fw.cpp:13:5:int main()	16	static
```

이 값은 함수 자신의 프레임입니다. 호출 체인 전체의 최대 stack은 호출 그래프를 따라 더해야 합니다.

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

map 파일의 첫 절은 아카이브 멤버가 왜 들어왔는지 보여 줍니다. `fw.map`의 첫 절입니다(경로 축약).

```text
Archive member included to satisfy reference by file (symbol)

<gcc>/thumb/v7e-m/nofp/libgcc.a(_aeabi_ldivmod.o)
                              <tmp>/ccMyONUO.o (__aeabi_ldivmod)
<gcc>/thumb/v7e-m/nofp/libgcc.a(_udivmoddi4.o)
                              <gcc>/thumb/v7e-m/nofp/libgcc.a(_aeabi_ldivmod.o) (__udivmoddi4)
<gcc>/thumb/v7e-m/nofp/libgcc.a(_dvmd_tls.o)
                              <gcc>/thumb/v7e-m/nofp/libgcc.a(_aeabi_ldivmod.o) (__aeabi_ldiv0)
```

`fw.cpp`의 `__aeabi_ldivmod` 참조가 첫 멤버를, 그 멤버가 다시 `__udivmoddi4`와 `__aeabi_ldiv0`을 끌어왔습니다. 예상치 않은 함수가 들어오면 이 사슬을 거꾸로 따라갑니다.

## 자주 보는 함정과 안티패턴

### 1. 디버그 정보를 포함한 크기로 비교

`size`는 디버그를 제외하고 보여줍니다. `ls -l firmware.elf`는 포함한 크기입니다. 혼동에 주의합니다. `objcopy -O binary` 결과도 LMA 사이의 간격을 포함할 수 있습니다. sparse HEX 이미지의 파일 크기나 ELF의 디스크 크기를 Flash 사용량과 동일시하지 않습니다.

### 2. strip 후 분석

strip 옵션에 따라 디버그 정보만 지우거나 심볼 테이블도 지웁니다. 심볼을 제거해도 기계어 디스어셈블은 가능하지만 이름·소스 대응은 어려워집니다. 분석용 원본 ELF를 보관합니다.

### 3. 함수가 인라인으로 사라진 뒤 찾음

nm에 없는 함수는 인라인됐거나, 미사용으로 제거됐거나, 처음부터 emit되지 않았거나, 심볼이 strip된 경우입니다. 위 `process<T>`는 `-fno-inline-functions`를 켜도 심볼이 생기지 않았고, 함수에 `__attribute__((noinline))`을 붙였을 때 나타났습니다.

### 4. .o 파일 크기 합계는 ELF 크기와 다름

링커가 gc-sections와 LTO로 크기를 줄이고, 반대로 아카이브에서 libgcc 같은 멤버를 끌어와 늘리기도 합니다. `fw.elf`의 text 1,396바이트 중 966바이트가 `.o` 파일 어디에도 없던 libgcc 코드였습니다.

### 5. RAM 부족인데 Flash만 분석

`fw.elf`의 RAM 1,048바이트 중 1,024바이트가 `.bss`의 `rx_buffer`였습니다. Flash 숫자만 보면 이 버퍼는 보이지 않습니다.

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
