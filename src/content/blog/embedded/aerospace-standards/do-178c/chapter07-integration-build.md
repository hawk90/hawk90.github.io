---
title: "Ch 7: Integration·Build·Executable Object Code 검증"
date: 2026-05-18T08:00:00
description: "통합 빌드 절차, linker script, memory map 분석, EOC traceability, deactivated code, target에서의 검증."
tags: [do-178c, integration, build, eoc, linker, memory-map, deactivated-code]
series: "DO-178C"
seriesOrder: 7
draft: false
---

코드가 *모듈별로 컴파일*되면 *Linker*가 *합쳐 Executable Object Code (EOC)*를 만든다. DO-178C는 *EOC*를 *별도의 verification 대상*으로 본다. 이 장은 *통합·빌드·EOC 검증*까지.

## 통합 빌드의 위치

```
Source Code (.c, .h)
   ↓ Compile (gcc)
Object files (.o)
   ↓ Archive (ar) — 옵션
Library files (.a)
   ↓ Link (ld)
Executable Object Code (.elf, .bin, .hex)
   ↓ Convert / Strip
Final image (.bin for flash)
   ↓ Program
Target hardware
```

각 단계가 *검증 대상*. *Linker가 만든 결과*가 *정확히 Source Code의 컴파일*인지.

## A-2-7 — Executable Object Code Generation

> "Executable Object Code is produced."

EOC가 *정상적으로 생성*. 빌드 시스템이 *deterministic + reproducible*해야.

### Reproducible Build

같은 source + 같은 toolchain → *bit-identical EOC*. *심사관이 재현 가능*해야.

```bash
# Build 1
$ ./build.sh
$ md5sum output.elf
abc123def456...  output.elf

# Build 2 (다른 머신, 같은 toolchain)
$ ./build.sh
$ md5sum output.elf
abc123def456...  output.elf       ← 같아야 함!
```

차이 원인:
- *Timestamp* (`__DATE__`, `__TIME__` 매크로) → 제거
- *Build path* → relative path로
- *Random seed* (일부 컴파일러) → 고정
- *Toolchain 버전* → SECI에 명시

### Build Configuration — SCI

```
=== Software Configuration Index (SCI) ===

Software Item:        FMS v2.0.0
Build Date:           2024-06-12
Build ID:             FMS-v2.0.0-build-12345
Source Baseline:      DOORS baseline FMS-2024-06-12
Source Hash:          SHA-256: abc...

Files (with SHA-256):
  src/main.c                    : abc...
  src/flight_ctrl.c              : def...
  src/can_driver.c               : ghi...
  ...

Build Tools (with version):
  Compiler: arm-none-eabi-gcc 12.2.1
  Assembler: arm-none-eabi-as 2.40
  Linker:    arm-none-eabi-ld 2.40
  Library:   newlib 4.3.0
  Make:      GNU Make 4.3

Build Options:
  CFLAGS:   -std=c99 -O2 -g -Wall -Werror
  LDFLAGS:  -T linker.ld -nostdlib

Output:
  output.elf                     : SHA-256: xyz...
  output.bin                     : SHA-256: pqr...

Build Environment:
  OS: Ubuntu 22.04
  CPU: x86_64

Reproducibility Verified: YES (matched build on backup machine)
```

이 *SCI*가 *Configuration Management 산출물*. 모든 build가 *추적 가능*.

## Build System — 항공 표준

```
Make / GNU Make           : 가장 많이 사용. 단순, deterministic.
CMake                     : 점진 채택. cross-compilation 강함.
Bazel                     : Google, 일부 항공 신생.
Scons                     : Python 기반. 일부 OEM.
GHS MULTI                 : Green Hills 자체 빌드 시스템.

Vendor IDE 사용 (선호 X):
  Eclipse CDT             : 자동 빌드 의존성 추적 어려움
  IAR EW                  : project-specific
  Wind River Workbench    : RTOS 통합용
```

CI에서는 *command-line 빌드*. IDE는 *개발자 편의*만.

### Makefile 예 — 항공 프로젝트

```makefile
# Makefile
# Build for ARM Cortex-A53, FreeRTOS

# Toolchain
CC = arm-none-eabi-gcc
LD = arm-none-eabi-ld
AS = arm-none-eabi-as
AR = arm-none-eabi-ar
OBJCOPY = arm-none-eabi-objcopy
OBJDUMP = arm-none-eabi-objdump

# Build configuration
TARGET   = fms.elf
SRC_DIR  = src
INC_DIR  = include
BUILD_DIR = build
LDSCRIPT = linker/cortex_a53.ld

# Compiler flags
CFLAGS  = -mcpu=cortex-a53 -mfloat-abi=hard
CFLAGS += -std=c99 -pedantic
CFLAGS += -O2 -g3
CFLAGS += -ffunction-sections -fdata-sections   # 미사용 코드 stripping
CFLAGS += -Wall -Wextra -Werror
CFLAGS += -Wmissing-prototypes -Wstrict-prototypes
CFLAGS += -Wconversion -Wsign-conversion
CFLAGS += -fno-builtin -nostdinc
CFLAGS += -DBUILD_ID=\"$(shell git describe --always)\"
CFLAGS += -DBUILD_DATE=\"$(shell date -u +%Y-%m-%d)\"

# Reproducibility
CFLAGS += -fdebug-prefix-map=$(PWD)=.
CFLAGS += -frandom-seed=$(SRC_DIR)

# Include paths
CFLAGS += -I$(INC_DIR) -I$(INC_DIR)/HAL -I$(INC_DIR)/freertos

# Linker flags
LDFLAGS  = -T $(LDSCRIPT)
LDFLAGS += -Map $(BUILD_DIR)/$(TARGET).map
LDFLAGS += --gc-sections                         # 미사용 섹션 제거
LDFLAGS += -Wl,--start-group $(LIBS) -Wl,--end-group

# Source files
SRCS  = $(wildcard $(SRC_DIR)/*.c)
SRCS += $(wildcard $(SRC_DIR)/HAL/*.c)
SRCS += $(wildcard $(SRC_DIR)/freertos/*.c)

OBJS = $(SRCS:$(SRC_DIR)/%.c=$(BUILD_DIR)/%.o)

LIBS = $(BUILD_DIR)/libhal.a

.PHONY: all clean lint

all: $(BUILD_DIR)/$(TARGET) verify

$(BUILD_DIR)/%.o: $(SRC_DIR)/%.c
	@mkdir -p $(@D)
	$(CC) $(CFLAGS) -c $< -o $@

$(BUILD_DIR)/$(TARGET): $(OBJS) $(LIBS)
	$(CC) $(CFLAGS) $(LDFLAGS) $(OBJS) -o $@

# 검증 단계
verify: $(BUILD_DIR)/$(TARGET)
	@echo "Verifying EOC..."
	@$(OBJDUMP) -h $< > $(BUILD_DIR)/sections.txt
	@$(OBJDUMP) -t $< > $(BUILD_DIR)/symbols.txt
	@$(OBJDUMP) -S $< > $(BUILD_DIR)/disassembly.txt
	@python3 scripts/verify_memory.py $(BUILD_DIR)/$(TARGET).map
	@python3 scripts/verify_stack.py $(BUILD_DIR)/$(TARGET)
	@python3 scripts/verify_unused.py $(BUILD_DIR)/$(TARGET).map
	@sha256sum $< | tee $(BUILD_DIR)/checksum.txt

lint:
	helix-qac.exe -prj qac/fms.prj
	clang-tidy --checks='*' src/*.c -- $(CFLAGS)

clean:
	rm -rf $(BUILD_DIR)
```

이 Makefile이 *완전 reproducible*. 모든 *경고 활성화* + *post-build 검증* 자동.

## Linker Script — Memory Layout

가장 *aerospace-specific* 영역. *수동 작성*.

```ld
/* linker/cortex_a53.ld */

MEMORY {
    /* Boot ROM */
    BOOTROM   (rx)  : ORIGIN = 0x00000000, LENGTH = 64K

    /* Internal SRAM */
    SRAM      (rw)  : ORIGIN = 0x20000000, LENGTH = 256K

    /* DDR3 RAM */
    DDR       (rw)  : ORIGIN = 0x80000000, LENGTH = 1024M

    /* Non-Volatile Memory (FRAM) */
    NVM       (rw)  : ORIGIN = 0xA0000000, LENGTH = 128K

    /* MMIO regions */
    MMIO_UART (rw)  : ORIGIN = 0xFE000000, LENGTH = 64K
    MMIO_GPIO (rw)  : ORIGIN = 0xFE010000, LENGTH = 64K
    MMIO_CAN  (rw)  : ORIGIN = 0xFE020000, LENGTH = 64K
}

SECTIONS {
    /* Boot vectors */
    .vectors : {
        KEEP(*(.vectors))
    } > BOOTROM

    /* Boot code (Stage 1) */
    .boot : {
        boot/*.o(.text .rodata)
    } > BOOTROM

    /* Main application code */
    .text : ALIGN(4) {
        _text_start = .;
        *(.text)
        *(.text.*)
        *(.gnu.linkonce.t.*)
        _text_end = .;
    } > DDR

    /* Read-only data */
    .rodata : ALIGN(4) {
        _rodata_start = .;
        *(.rodata)
        *(.rodata.*)
        _rodata_end = .;
    } > DDR

    /* Initialized data */
    .data : ALIGN(4) {
        _data_start = .;
        *(.data)
        *(.data.*)
        _data_end = .;
    } > SRAM AT > DDR        /* SRAM에 로드, DDR에 image */

    /* BSS (zero-initialized) */
    .bss : ALIGN(4) {
        _bss_start = .;
        *(.bss)
        *(.bss.*)
        *(COMMON)
        _bss_end = .;
    } > SRAM

    /* Stacks (per task) */
    .stacks : ALIGN(16) {
        _stack_start = .;
        . += 4K;  /* T1: Main */
        . += 2K;  /* T2: Fault */
        . += 2K;  /* T3: BIT */
        . += 2K;  /* T4: Comms */
        . += 1K;  /* T5: Logger */
        . += 4K;  /* idle */
        _stack_end = .;
    } > SRAM

    /* Event log in NVM */
    .nvm_log : {
        _log_start = .;
        . += 128K;
        _log_end = .;
    } > NVM

    /* No heap region (no malloc post-init) */
    /* No dynamic relocation (.dynsym, .got 등 제외) */

    /* Discard sections */
    /DISCARD/ : {
        *(.comment)
        *(.note.GNU-stack)
        *(.dynsym)
        *(.dynstr)
    }
}

/* Symbols for runtime */
PROVIDE(__text_size__   = SIZEOF(.text));
PROVIDE(__data_size__   = SIZEOF(.data));
PROVIDE(__bss_size__    = SIZEOF(.bss));
PROVIDE(__stack_size__  = SIZEOF(.stacks));

ASSERT(__text_size__ + __rodata_size__ < 1024*1024, "DDR overflow")
ASSERT(__data_size__ + __bss_size__ + __stack_size__ < 256*1024, "SRAM overflow")
```

`ASSERT`로 *build 시 메모리 over-allocation 검출*. *FAA가 좋아하는 패턴*.

## Memory Map 분석

Build 후 *.map 파일*이 *전체 메모리 layout*. 검증 도구가 분석.

```
=== output.elf.map (linker output) ===

Memory Configuration:
Name        Origin        Length        Attributes
BOOTROM     0x00000000    0x00010000    xr
SRAM        0x20000000    0x00040000    xrw
DDR         0x80000000    0x40000000    xrw
NVM         0xA0000000    0x00020000    xrw

Section sizes:
  .vectors     :  0x100   in BOOTROM
  .boot        :  0x4000  in BOOTROM
  .text        :  0x32000 in DDR  (200 KB)
  .rodata      :  0x8000  in DDR  ( 32 KB)
  .data        :  0x2000  in SRAM (  8 KB), AT DDR
  .bss         :  0x6000  in SRAM ( 24 KB)
  .stacks      :  0x3C00  in SRAM ( 15 KB)
  .nvm_log     : 0x20000  in NVM  (128 KB)

Memory Utilization:
  BOOTROM      :  16640/65536      ( 25%) ✓
  SRAM         :  48128/262144     ( 18%) ✓
  DDR          : 270336/1073741824 (0.03%) ✓ (huge margin)
  NVM          : 131072/131072     (100%) WARNING: full

Symbol map (top 10 by size):
  flight_ctrl_main      : .text   0x4200 bytes
  navigation_compute    : .text   0x3800 bytes
  freertos_scheduler    : .text   0x2A00 bytes
  ...

Unresolved symbols    : 0
Cross-section refs    : 0
Multiple definitions  : 0
```

심사관이 *.map 파일*을 review. *SAD에 명시한 budget*과 *일치하는지*.

### Memory Verification Script

```python
# scripts/verify_memory.py
import sys, re

def parse_map(file):
    sizes = {}
    with open(file) as f:
        for line in f:
            m = re.match(r'\s+\.(\w+)\s+0x([0-9A-Fa-f]+)\s+0x([0-9A-Fa-f]+)', line)
            if m:
                section = m.group(1)
                size = int(m.group(3), 16)
                sizes[section] = sizes.get(section, 0) + size
    return sizes

def main():
    map_file = sys.argv[1]
    sizes = parse_map(map_file)

    # Budget from SAD
    BUDGETS = {
        'text':   384*1024,  # 384 KB
        'data':    16*1024,
        'bss':     32*1024,
        'stacks':  20*1024,
    }

    failed = False
    for section, used in sizes.items():
        if section in BUDGETS:
            budget = BUDGETS[section]
            pct = used / budget * 100
            status = "OK" if used <= budget else "OVER"
            print(f"  .{section}: {used:6d} / {budget:6d} ({pct:.1f}%) {status}")
            if used > budget:
                failed = True

    sys.exit(1 if failed else 0)

if __name__ == '__main__':
    main()
```

CI에서 *build 후 자동 실행*. *budget 초과 시 빌드 실패*.

## Stack Usage Analysis

각 task의 *worst-case stack usage*. 도구로 정적 분석.

```bash
# StackAnalyzer (AbsInt) — DO-178C 인증
stackanalyzer --target arm-cortex-a53 \
              --entries "main,fault_task,bit_task,comms_task" \
              --map build/fms.elf.map \
              build/fms.elf > stack_report.txt
```

출력:

```
=== Stack Analysis Report ===

Task: main (T1)
  Worst-case stack depth: 2856 bytes
  Allocated:              4096 bytes
  Safety margin:          1240 bytes (30%)
  Status: PASS

  Deepest call path:
    main → flight_ctrl_step → compute_pid → mat_mul → ...

Task: fault_task (T2)
  Worst-case: 1248 bytes
  Allocated:  2048 bytes
  Safety:      800 bytes (40%)
  Status: PASS

Task: bit_task (T3)
  Worst-case: 1856 bytes
  Allocated:  2048 bytes
  Safety:      192 bytes (10%)  ← LOW
  Status: WARNING (margin < 20%)

  Recommendation: increase T3 stack to 2560 bytes.
```

*Stack overflow는 catastrophic*. *20%+ margin* 권장.

## Deactivated Code & Dead Code

### Deactivated Code

*컴파일됐지만 *현재 production에서 실행 안 됨*. 미래 활성화 또는 옵션 기능.

```c
#ifdef FEATURE_AUTO_LAND
void autoland_init(void) {
    /* ... */
}
#endif

// 빌드 시 FEATURE_AUTO_LAND 미정의 → 코드 제외
```

DO-178C는 *deactivated code 자체는 허용*하지만 *정당화 필요*. SAD에 *어떤 기능이 비활성화*되었는지 명시.

### Dead Code

*컴파일됐고 binary에 포함*되지만 *어떤 입력으로도 실행 안 됨*. *NOT 허용*.

```c
// 위반 — dead code
int compute(int x) {
    if (x > 0) {
        return x;
    } else {
        return -x;
    }
    return 0;       // dead — 도달 불가
}
```

정적 분석기가 *dead code 검출*. *FAA 의무 제거*.

### Unused Code (Unused Functions)

LLR에 없는 함수. *별도 정당화* 필요.

```c
// helper.c
static int debug_dump_state(void) {  // 어디서 호출?
    /* ... */
}
```

`-ffunction-sections -fdata-sections` + `--gc-sections` linker flag로 *미사용 함수 자동 제거*. 그래도 *남은 unused*는 *SCS-DR로 정당화*.

## EOC ↔ Source Code Traceability

A-5-5: *모든 source code가 EOC에 통합*.

**도구 검증:**


**1. ELF symbol table에 *모든 source 함수* 포함**


**2. .text 섹션에 *모든 source 코드 컴파일 결과* 포함**


**3. Linker가 *추가하지 않은 코드 없음* (예외: vendor library)**


**4. Compiler가 *최적화로 제거하지 않은 함수 없음***

```bash
# 함수 별 source ↔ binary 매핑
arm-none-eabi-objdump -t output.elf | grep ' F .text' | sort > binary_funcs.txt
ctags -x --c-kinds=f src/*.c | awk '{print $1}' | sort > source_funcs.txt
diff source_funcs.txt binary_funcs.txt
```

차이가 있으면 *조사*. *예상치 못한 함수*가 binary에 있으면 *침입 코드* 가능성.

## Compiler Optimization Level

*Optimization*은 *기능 변화*시키지 않으나 *코드 구조*는 크게 바꿈. 검증 대상.

```
-O0 (none)     : 디버그용. 큰 binary, 느림.
-O1 (basic)    : 안전한 최적화.
-O2 (default)  : 권장. inline + loop opt.
-O3 (aggressive): inline 광범위, 일부 vectorization.
-Os (size)     : 코드 크기 우선.
-Ofast         : -O3 + math 부정확 — 항공 금지.
```

대부분 항공 = *-O2*. *-O3는 검증 부담* 증가.

### Optimization vs Source Traceability

```c
// Source
int x = 10;
if (x > 5) {
    do_a();
}
```

-O2 결과 (단순화 disassembly):

```asm
; if (x > 5) 가 컴파일 시 true로 평가 → 그냥 do_a 호출
bl  do_a
```

`if (x > 5)` 분기가 *binary에 없음*. *coverage 분석*에서 *branch coverage 100%* 어떻게 입증?

해결:
1. *Source에서 conditional compile* — `if (kAlways) { ... }`
2. *Coverage 도구가 source-level analysis*
3. *Disable specific optimizations* — `-fno-aggressive-loop-optimizations`

도구 (VectorCAST, LDRA)가 *optimization 안전 모드*. 검증.

## Object Code Verification (DAL A 추가)

DAL A 의무. *Object code가 source와 일치*하는지 *직접 검증*.

```
방법 1: Source-to-Object analysis
  컴파일러가 *추가한 코드*가 없는지 (예: stack check, security)
  추가됐다면 정당화 (다른 verification 추가)

방법 2: Object code review (Boeing 787 일부 사용)
  실제 assembly를 *line-by-line review*
  비용 매우 큼

방법 3: Compiler qualification
  TQL-1 컴파일러는 *output 신뢰 가능*하다는 가정
  방법 1, 2 일부 면제
```

대부분의 DAL A = *Compiler qualification* + *방법 1*.

## Build Verification — A-5-6

> "Output of the integration process is complete and correct."

빌드 결과의 *완전성 검증*:

- [ ] EOC가 *모든 source*를 포함
- [ ] EOC가 *모든 LLR를 구현*
- [ ] Memory layout이 *SAD와 일치*
- [ ] Stack budget 충족
- [ ] Code section read-only
- [ ] Data section read-write (per task with MPU)
- [ ] Linker script가 *correct memory map*
- [ ] Unused functions/sections 제거됨
- [ ] Optimization 결과가 *expected behavior 유지*
- [ ] Reproducible build 확인

이 *체크리스트가 build verification*. CI에서 자동 + 인간 review.

## Cross-compilation Issues

```
Host: Linux x86_64 (개발 머신)
Target: ARM Cortex-A53 (FCC)

위험:
1. Endianness — ARM은 little-endian 기본, big도 가능
2. Word size — Linux x86_64는 long = 8 bytes, ARM은 4 (대개)
3. Float ABI — soft vs hard
4. ABI — armhf vs aarch64
5. Pointer size — 32 vs 64 bit
```

*Cross-compile + host test*는 *항상 일치하지 않음*. *Target에서의 test 의무*.

## Target에서 검증

A-6-5: *Test가 target hardware에서 실행*.

**검증 흐름:**


**1. Source code 작성**


**2. Host (Linux x86_64)에서 unit test**


**3. Cross-compile to ARM**


**4. Target board에 program**


**5. Target에서 unit test 재실행**


**6. HIL에서 integration test**


**7. Aircraft에서 final test (Flight test)**

**Host vs Target 차이 발견 시:**

- Bug investigation
- Source 수정
- 위 단계 모두 다시

*Host에서 통과한 test가 target에서 실패*는 *흔하다*. *항공의 큰 비용 요소*.

## CI/CD Pipeline — 항공

```yaml
# .gitlab-ci.yml

stages:
  - lint
  - build
  - test_host
  - test_target
  - verify
  - report

variables:
  TOOLCHAIN: "arm-none-eabi-12.2"

lint:
  stage: lint
  script:
    - clang-format --dry-run -Werror src/*.c
    - helix-qac.exe -prj qac/fms.prj
    - python3 scripts/check_naming.py
    - python3 scripts/check_complexity.py

build_target:
  stage: build
  script:
    - make TARGET=arm-cortex-a53
    - md5sum build/fms.elf
  artifacts:
    paths:
      - build/

build_reproducibility:
  stage: build
  needs: ["build_target"]
  script:
    - make clean && make TARGET=arm-cortex-a53
    - diff build/fms.elf build/fms.elf.backup || (echo "NOT REPRODUCIBLE"; exit 1)

unit_test_host:
  stage: test_host
  script:
    - make CONFIG=host_test
    - ./build/unit_tests
    - lcov --capture --directory build/ --output-file coverage.info
    - genhtml coverage.info --output-directory coverage_html
  artifacts:
    paths:
      - coverage_html/

unit_test_target:
  stage: test_target
  needs: ["build_target"]
  tags: ["target-board"]
  script:
    - openocd -f cfg/target.cfg &
    - gdb-multiarch -ex "target remote :3333" build/fms.elf < scripts/run_tests.gdb

memory_verification:
  stage: verify
  needs: ["build_target"]
  script:
    - python3 scripts/verify_memory.py build/fms.elf.map
    - python3 scripts/verify_stack.py build/fms.elf
    - python3 scripts/verify_unused.py build/fms.elf.map

coverage_analysis:
  stage: verify
  needs: ["unit_test_target"]
  script:
    - vectorcast analyze --target-coverage build/cov.dat
    - python3 scripts/coverage_report.py > coverage_report.html
  artifacts:
    paths:
      - coverage_report.html

soi_report:
  stage: report
  needs: ["lint", "build_target", "unit_test_target", "memory_verification", "coverage_analysis"]
  script:
    - python3 scripts/generate_soi_report.py
  artifacts:
    paths:
      - reports/
```

매 commit이 *full verification pipeline*. 평균 *1-4시간 빌드*. 신생 회사는 *수십 분*까지 단축.

## Common Findings — Build/Integration

**1. "Build이 reproducible 아님 (timestamp 포함)"**

- → __DATE__/__TIME__ 매크로 제거

**2. "Stack budget 초과 (T1 사용 5KB > 4KB 할당)"**

- → Stack 증가 또는 코드 줄임

**3. "Memory map에 alloc 안 한 region 0x80FF0000~0x81000000 누락"**

- → linker script update

**4. "Function debug_dump_state 어디서도 호출 안 됨 (unused)"**

- → 제거 또는 SCS-DR-XXX 정당화

**5. "Compiler 12.2 → 12.3 업그레이드 시 EOC bit-different"**

- → SECI 업데이트 + 재인증 일부

**6. "Optimization -O2 → -O3 변경, branch behavior 변화 detected"**

- → -O2로 유지 또는 -O3 정당화 (verification 추가)

## 정리

- Build는 *deterministic + reproducible*해야 — 같은 source = 같은 binary.
- SCI가 *모든 toolchain, source, hash* 기록.
- Linker script가 *memory layout* 정의. ASSERT로 over-allocation 자동 검출.
- Memory map 분석으로 *budget 충족* 확인.
- Stack analyzer로 *worst-case 사용량* 정적 분석.
- Deactivated code는 *허용* (정당화 시), dead code는 *금지*.
- LLR ↔ Code ↔ EOC traceability 100%.
- Optimization은 *-O2 권장*. -O3는 검증 부담.
- DAL A는 *Object Code Verification*.
- Cross-compile + target test 의무.
- CI/CD 자동화: lint → build → test_host → test_target → verify → report.

## 다음 장 예고

8장은 *Verification — Review, Analysis, Test (RAT)* — 3 종류 검증 방법, test level, HIL/SIL 환경.

## 관련 항목

- [Ch 6 — Source Code Standards](/blog/embedded/aerospace-standards/do-178c/chapter06-source-code-standards)
- [Ch 8 — Verification (RAT)](/blog/embedded/aerospace-standards/do-178c/chapter08-verification-rat)
- [Ch 9 — Coverage Analysis (MC/DC)](/blog/embedded/aerospace-standards/do-178c/chapter09-coverage-mcdc)
- [Ch 10 — Configuration Management](/blog/embedded/aerospace-standards/do-178c/chapter10-cm-sqa)
- [AbsInt StackAnalyzer](https://www.absint.com/stackanalyzer/)
- [GNU Linker Documentation](https://sourceware.org/binutils/docs/ld/)
