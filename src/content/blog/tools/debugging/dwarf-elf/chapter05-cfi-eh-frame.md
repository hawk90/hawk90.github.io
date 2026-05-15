---
title: "Ch 5: CFI — .debug_frame / .eh_frame"
date: 2025-09-02T05:00:00
description: "콜스택 풀기의 정체. CIE/FDE, CFA, register rule, .eh_frame_hdr 이진 탐색."
tags: [dwarf, cfi, unwinding, eh_frame, exception]
series: "DWARF and ELF Internals"
seriesOrder: 5
draft: false
---

GDB의 `bt`가 어떻게 콜스택을 *거꾸로* 풀어 갈까요. 답은 `.eh_frame` (또는 `.debug_frame`) 섹션의 **CFI**(Call Frame Information). 각 PC 위치에서 *어디가 호출자 측 프레임인지*, *어떤 레지스터가 어떻게 보존됐는지*를 표로 기술한 데이터.

이 장은 그 정체를 다룹니다. CFI 모델, CIE/FDE 구조, register rule, CFA 계산, `.eh_frame_hdr`의 이진 탐색 인덱스, 그리고 C++ 예외와의 관계.

## 한 줄 요약

각 PC에서 *현재 프레임의 CFA*와 *호출자 측 레지스터 위치*를 표로 기술한 데이터. 콜스택 unwinding의 기반.

## 왜 필요한가

```c
void f() { g(); }
void g() { h(); }
void h() { /* crash */ }
```

`h`에서 죽었을 때 GDB가 `bt`로 `f → g → h`를 보여 주려면 *각 단계*에서:

1. *호출자 PC* 어디에 저장됐나? (보통 스택)
2. *호출자 SP* 얼마나 위에 있나?
3. *호출자 BP / FP* 얼마나 위에?
4. 다른 callee-saved 레지스터 (x86-64의 rbx/r12-r15)는 어디?

각 함수마다 *프롤로그/에필로그*가 다르고, *PC 위치에 따라* 답이 달라집니다 (프롤로그 진행 중과 본문 안이 다름). 이 모든 경우를 표현하는 게 CFI.

## 모델 — CFA와 Register Rule

각 PC 위치에서.

```
CFA (Canonical Frame Address) = 호출자 측 SP의 값

호출자 측 각 레지스터의 위치 (register rule):
  Same     - 값이 같다 (변경 안 됨)
  Offset N - CFA + N 주소에 저장됨
  Register R - 다른 레지스터에 있음
  Expression - DWARF expression
  Undefined - 알 수 없음 (보존 안 됨)
```

`bt`의 *한 단계 위로 올라가기*.

1. 현재 PC의 CFI table을 lookup.
2. 호출자 측 PC = `*(CFA + return_address_offset)` 또는 register rule로 계산.
3. 호출자 측 SP = CFA.
4. 호출자 측 BP/FP, 다른 callee-saved도 register rule로 복원.
5. 1로 — 호출자 측 PC로 다시.

이 반복으로 콜스택의 모든 프레임을 풀어 갑니다.

## 한 예 — main 함수의 CFI

```bash
$ llvm-dwarfdump --debug-frame my_prog | head -30
.debug_frame contents:
00000000 00000014 ffffffff CIE
  Format:                DWARF32
  Version:               4
  Augmentation:          ""
  Address size:          8
  Segment desc size:     0
  Code alignment factor: 1
  Data alignment factor: -8
  Return address column: 16
  
  DW_CFA_def_cfa: r7 +8
  DW_CFA_offset: r16 -8
  DW_CFA_nop
  DW_CFA_nop

00000018 0000001c 00000000 FDE cie=00000000 pc=00401130...0040115e
  DW_CFA_advance_loc: 1 to 0x00401131
  DW_CFA_def_cfa_offset: +16
  DW_CFA_offset: r6 -16
  DW_CFA_advance_loc: 3 to 0x00401134
  DW_CFA_def_cfa_register: r6
  DW_CFA_advance_loc: 38 to 0x0040115a
  DW_CFA_def_cfa: r7 +8
```

각 PC 위치마다 *CFA 정의*가 바뀝니다 (프롤로그 진행).

```
PC          CFA         rbp (r6) 위치     rip (r16) 위치
0x401130    rsp+8       (still in caller)  CFA-8
0x401131    rsp+16      CFA-16             CFA-8     ← push rbp 후
0x401134    rbp+16      CFA-16             CFA-8     ← mov rbp,rsp 후
0x40115a    rsp+8       ...                CFA-8     ← pop rbp 후
```

이 표를 *동적으로 재구성*하는 게 CFI 바이트코드.

## CIE — Common Information Entry

같은 호출 규약을 공유하는 함수들의 *공통 정보*. 보통 ABI별 한 개.

```c
struct CIE {
    uint32_t length;            // 이후 데이터 길이
    uint32_t cie_id;            // 0xFFFFFFFF (DWARF) 또는 0 (eh_frame)
    uint8_t  version;
    string   augmentation;      // ABI별 추가 정보
    uint8_t  address_size;      // DWARF 4+
    uint8_t  segment_size;
    uleb128  code_alignment_factor;     // CFA 명령의 offset multiplier
    sleb128  data_alignment_factor;     // register rule offset multiplier
    uleb128  return_address_register;   // PC가 어느 column에?
    augmentation_data[];               // augmentation별 추가 데이터
    byte     initial_instructions[];   // 모든 FDE에 적용되는 초기 CFI 명령
};
```

augmentation은 *문자열*. 일반적인 값.

| augmentation | 의미 |
|--------------|------|
| `""` | 표준 DWARF |
| `"zR"` | FDE에 augmentation data 있음, 인코딩 형식 (eh_frame) |
| `"zP"` | personality function (C++ exception) |
| `"zL"` | LSDA (Language Specific Data Area) |
| `"zPLR"` | 위 셋 다 |

x86-64 System V의 일반 augmentation은 `"zR"` 또는 `"zPLR"`.

### initial_instructions

CIE 안에도 *CFI 명령*이 있어 *모든 FDE의 시작 상태*를 정의.

```
CIE:
  DW_CFA_def_cfa: r7 +8       ← 초기 CFA = rsp + 8
  DW_CFA_offset: r16 -8       ← rip는 CFA - 8에 (call 명령이 push한 것)
```

함수 *진입 직후*의 상태. 모든 함수가 *call에 의해 호출됨* → rsp+8이 호출자 SP, rsp+0이 return address.

## FDE — Frame Description Entry

함수 하나당 한 개. CIE를 가리키고 *함수의 PC 범위* + *그 함수만의 추가 CFI 명령*.

```c
struct FDE {
    uint32_t length;
    uint32_t cie_pointer;       // 이 FDE가 참조하는 CIE의 위치
    address  pc_begin;           // 함수 시작 PC
    address  pc_range;
    augmentation_data[];
    byte     instructions[];     // 함수의 PC 진행에 따른 CFI 변경
};
```

instructions가 *PC 차분*과 *register rule 변경*을 표현합니다 — 함수의 프롤로그/에필로그를 따라 *어떻게 CFA가 바뀌고 register가 어디 저장되는지*.

## CFI 명령 카탈로그

PC 진행 (`DW_CFA_advance_loc*`)와 *register/CFA 변경*이 섞임.

### PC 진행

| Opcode | 인자 | 의미 |
|--------|------|------|
| `DW_CFA_advance_loc <delta>` | 6-bit | PC 진행 (compact) |
| `DW_CFA_advance_loc1 <delta>` | u1 | 1바이트 |
| `DW_CFA_advance_loc2 <delta>` | u2 | 2바이트 |
| `DW_CFA_advance_loc4 <delta>` | u4 | 4바이트 |
| `DW_CFA_set_loc <addr>` | address | 절대 주소 |

PC 진행만 표시 → 그 PC 직전까지의 CFI는 *이전 명령*까지 유효.

### CFA 정의

| Opcode | 인자 | 의미 |
|--------|------|------|
| `DW_CFA_def_cfa <reg> <off>` | uleb128, uleb128 | CFA = reg + off |
| `DW_CFA_def_cfa_register <reg>` | uleb128 | CFA의 base register 변경 |
| `DW_CFA_def_cfa_offset <off>` | uleb128 | CFA의 offset만 변경 |
| `DW_CFA_def_cfa_expression <expr>` | block | CFA를 DWARF expression으로 |

`DW_CFA_def_cfa: r7 +8`이 *초기* (rsp+8). `DW_CFA_def_cfa_register: r6` (rbp 사용 시작) → 이후 `DW_CFA_def_cfa_offset` 갱신.

### Register Rule

| Opcode | 인자 | 의미 |
|--------|------|------|
| `DW_CFA_offset <reg> <off>` | reg + uleb128 | reg는 CFA + off * data_alignment_factor 주소에 저장 |
| `DW_CFA_offset_extended` | uleb128, uleb128 | 위와 같지만 큰 reg |
| `DW_CFA_register <reg> <reg2>` | uleb128, uleb128 | reg는 reg2에 있음 |
| `DW_CFA_restore <reg>` | 6-bit | CIE 초기 규칙으로 복원 |
| `DW_CFA_undefined <reg>` | uleb128 | reg는 알 수 없음 |
| `DW_CFA_same_value <reg>` | uleb128 | reg는 변경 안 됨 |
| `DW_CFA_expression <reg> <expr>` | uleb128, block | DWARF expression으로 |
| `DW_CFA_val_expression <reg>` | uleb128, block | 값 자체가 expression 결과 |

`DW_CFA_offset`이 가장 일반적 — *callee-saved 레지스터가 스택의 어디에 저장됐는지*.

### 스택

| Opcode | 의미 |
|--------|------|
| `DW_CFA_remember_state` | 현재 CFI 상태를 스택에 push |
| `DW_CFA_restore_state` | pop해서 상태 복원 |

`if`/`else` 분기로 *프롤로그/에필로그*가 갈리는 함수에서 사용. 컴파일러가 두 경로의 CFI를 별도로 encoding 없이 *공통 상태 push + 각 분기 변경 + pop*으로 압축.

## CFI 인코딩 — 압축의 트릭

`DW_CFA_advance_loc`이 *6-bit 인라인*. opcode 한 바이트의 *상위 2비트 = 0x40* + 하위 6비트가 delta.

```
0x40 | (delta & 0x3F)  → DW_CFA_advance_loc with small delta
```

작은 PC 차분 (< 64)이 *한 바이트*로 끝납니다. 큰 delta가 흔하지 않으므로 압축비 매우 큼.

`DW_CFA_offset`도 비슷하게 *6-bit 인라인 register*:

```
0x80 | (reg & 0x3F), uleb128 offset
```

opcode 한 바이트 + offset LEB128 = 보통 2-3 바이트.

## 실제 디스어셈블 + CFI

```bash
$ objdump -d --disassembler-options=intel my_prog | head -20
0000000000401120 <main>:
  401120: push   rbp
  401121: mov    rbp,rsp
  401124: sub    rsp,0x10
  401128: mov    DWORD PTR [rbp-0x4],edi
  ...
  40115a: leave
  40115b: ret

$ llvm-dwarfdump --debug-frame my_prog
00000018 0000001c 00000000 FDE cie=00000000 pc=00401120...0040115c
  DW_CFA_advance_loc: 1 to 0x00401121     # push rbp 후
  DW_CFA_def_cfa_offset: +16
  DW_CFA_offset: r6 -16                    # rbp는 CFA-16에
  DW_CFA_advance_loc: 3 to 0x00401124     # mov rbp,rsp 후
  DW_CFA_def_cfa_register: r6              # CFA는 rbp 기준
  DW_CFA_advance_loc: 54 to 0x0040115a    # leave 직전
  DW_CFA_def_cfa: r7 +8                    # rsp 기준으로 복원
```

각 *프롤로그 명령*이 끝난 직후 CFI 상태가 변경됩니다 — *push rbp* 후엔 SP가 8 줄었으니 CFA offset이 +16, rbp가 새 SP 위치에 저장. *mov rbp,rsp* 후엔 rbp가 frame base가 됐으므로 CFA의 base register를 변경.

## .eh_frame vs .debug_frame

| | `.debug_frame` | `.eh_frame` |
|---|----------------|--------------|
| 용도 | 디버깅 전용 | C++ 예외 + 디버깅 |
| 포함 조건 | `-g` 필요 | *항상* (stripped 빌드에도) |
| 인코딩 | 표준 DWARF | 약간 다른 인코딩 |
| length=0xFFFFFFFF | DWARF64 | terminator |

`.eh_frame`이 *항상 있다*는 게 중요합니다 — `-O2 -s` (strip) 빌드에도 unwinding 가능. 그래서 *stripped* 바이너리의 `bt`도 (함수명은 ??지만) 콜스택 구조는 복원됩니다.

`-fno-asynchronous-unwind-tables`로 `.eh_frame`을 *없앨 수도* 있지만, libstdc++ 예외가 동작 안 함. 임베디드에서 *flash 절감* 목적으로 가끔 사용.

## .eh_frame_hdr — 이진 탐색 인덱스

`.eh_frame`에 *수천 FDE*가 있을 때 PC로 빠르게 찾으려면 인덱스 필요. `.eh_frame_hdr`이 그 역할.

```
.eh_frame_hdr 구조:
  version  (1바이트, 보통 1)
  eh_frame_ptr_enc  (1바이트, 인코딩 종류)
  fde_count_enc     (1바이트)
  table_enc         (1바이트)
  eh_frame_ptr      (.eh_frame 시작 주소)
  fde_count         (FDE 개수)
  table[]:
    (initial_pc, fde_ptr)        ← PC로 정렬된 (PC, FDE) 쌍
```

PC가 주어지면 `table`에서 *이진 탐색*. O(log n)로 FDE 찾기. libgcc·libunwind의 `_Unwind_Find_FDE`가 이 인덱스 사용.

```bash
$ readelf -SW my_prog | grep eh_frame
[19] .eh_frame_hdr     PROGBITS  ...
[20] .eh_frame         PROGBITS  ...
```

PT_GNU_EH_FRAME 세그먼트가 `.eh_frame_hdr`의 주소를 가리킴 → 로더가 *런타임에 즉시* 찾아갈 수 있습니다.

## libunwind / glibc backtrace

C 표준 `backtrace()` 함수가 `.eh_frame`의 CFI를 사용:

```c
#include <execinfo.h>
void *buf[64];
int n = backtrace(buf, 64);
char **syms = backtrace_symbols(buf, n);
for (int i = 0; i < n; i++) puts(syms[i]);
```

내부적으로 `_Unwind_Backtrace` (libgcc) 또는 libunwind를 호출 → 각 프레임에서 CFI lookup → 호출자 PC 복원.

`__builtin_return_address(0)`은 직접 frame pointer 추적. `__builtin_return_address(N)`은 N단계 위 (CFI 없이 frame pointer만 보면 종종 깨짐).

## libgcc_s.so.1과 호환

CFI 처리가 *복잡*해 시스템마다 라이브러리가 다릅니다.

- glibc + libgcc — Linux 표준.
- musl + libgcc 또는 libunwind-llvm — Alpine.
- macOS의 libunwind는 *별도 구현*.
- 임베디드의 베어메탈은 `libgcc_eh.a`를 정적 링크.

C++ 예외를 던지는 함수는 자동으로 libgcc에 의존. 정적 링크 + 예외 사용 시 `libgcc_eh.a`가 따라옵니다.

## DWARF 5의 변화

- `DW_CFA_GNU_args_size`가 표준화.
- `DW_CFA_val_offset` 도입.
- 새 augmentation `"S"` (signal frame).

기본 메커니즘은 DWARF 2 시절과 거의 동일. 매우 안정된 표준.

## frame pointer vs CFI

`-fomit-frame-pointer`(`-O2`의 기본)로 rbp가 *frame pointer 역할을 안 함*. `bt`는 그래도 동작 — `.eh_frame`의 CFI 덕분.

다만 정밀도는 *frame pointer 있을 때*보다 떨어집니다 — 컴파일러가 CFI를 *모든 PC*에 대해 정확히 출력하지는 않거든요. 특히.

- Inline asm.
- Naked function (`__attribute__((naked))`).
- Signal handler 내부 (signal frame의 augmentation 처리 필요).

`-fno-omit-frame-pointer`가 *프로파일러*에서 권장되는 이유 — perf의 stack sample이 빠를 뿐 아니라 정확.

## CFI 변경의 시점

```c
void f() {
    push rbp                ; CFA 정의가 바뀌어야
    mov rbp, rsp            ; 또 한 번 바뀌어야
    sub rsp, 0x10           ; CFA offset 변경
    ...본문...
    add rsp, 0x10           ; CFA offset 변경
    pop rbp                 ; CFA register 변경
    ret                     ; 함수 종료
}
```

각 *명령어 끝*마다 CFI 변경. 컴파일러가 이를 *모두* 정확히 출력하는 게 핵심. GCC/Clang은 잘 하지만 인라인 어셈블리·tail call에서 가끔 빠짐.

## 자동 도구

```bash
# CFI raw
$ llvm-dwarfdump --debug-frame my_prog
$ readelf --debug-dump=frames my_prog

# 디코딩된 표 형태
$ readelf --debug-dump=frames-interp my_prog | head -20
00000018 0000001c 00000000 FDE cie=00000000 pc=00401120..0040115c
   LOC           CFA      rbx  rbp  r12  r13  r14  r15  ra
00401120 rsp+8    u    u    u    u    u    u    c-8
00401121 rsp+16   u    c-16 u    u    u    u    c-8
00401124 rbp+16   u    c-16 u    u    u    u    c-8
0040115a rsp+8    u    c-16 u    u    u    u    c-8
```

`c-8` 같은 표기가 *CFA - 8 위치*. `u` = undefined (변경 안 됨).

```python
# pyelftools
for cu in dwarf.iter_CUs():
    for entry in dwarf.CFI_entries():
        if entry.is_CIE():
            print("CIE")
        else:
            print(f"FDE pc={entry.header.initial_location:#x}")
            for instr in entry.instructions:
                print(f"  {instr.opcode}")
```

## CFI in JIT 코드

V8, JVM, .NET 같은 JIT은 *런타임에 코드를 생성*. 그 코드의 CFI도 *런타임에 등록*해야 GDB가 콜스택을 풀 수 있습니다.

- `__register_frame()` — 단일 FDE 등록.
- `__register_frame_info()` — 여러 FDE.
- Linux의 `perf_jitdump`로 perf와 통합.

JIT의 콜스택 디버깅이 어려운 이유 — 이 등록이 잘 안 됐을 때 콜스택이 *Random 주소*에서 끊깁니다.

## 시그널 frame

시그널 핸들러는 *커널이 자동으로 frame을 푸시*해 들어옵니다. 그 frame은 일반 함수 호출과 *다른 형태*.

DWARF augmentation `"S"`로 표시. 또는 `DW_CFA_GNU_args_size` 같은 GNU 확장.

GDB가 `bt`에서 `<signal handler called>`를 보여 주는 이유 — *시그널 frame*임을 인식.

## ARM64 — PAC + BTI

ARM64는 *Pointer Authentication* 기능이 있어 return address가 *서명된* 상태로 스택에 저장. CFI에서 이를 인식하려면 `DW_CFA_AARCH64_negate_ra_state` 같은 새 opcode가 필요. DWARF 5에 표준화.

BTI(Branch Target Indicator)는 직접적 CFI 영향은 없지만 *인터프리터 디버거*가 valid 진입점을 인식할 때 사용.

## 정리

- CFI = 각 PC에서 *CFA 정의* + *호출자 측 레지스터 위치*.
- CIE가 공통 정보 (호출 규약), FDE가 함수 하나당.
- `DW_CFA_*` 명령으로 PC 진행 + CFA/register rule 변경.
- 6-bit 인라인 opcode로 압축 (작은 PC delta).
- `.eh_frame` = 항상 있음 (C++ 예외 + 디버깅).
- `.debug_frame` = 디버깅 전용.
- `.eh_frame_hdr`이 이진 탐색 인덱스.
- libgcc/libunwind가 CFI 처리.
- frame pointer 없어도 `.eh_frame`만으로 unwind 가능.
- JIT은 `__register_frame()`으로 런타임 등록.
- 시그널 frame은 augmentation으로 표시.

## 다음 장 예고

Ch 6 (시리즈 마지막) — split-DWARF, dwz, debuginfod, 그리고 pyelftools로 자체 DWARF 도구 만들기.

## 관련 항목

- [Ch 4: DWARF expression VM](/blog/tools/debugging/dwarf-elf/chapter04-debug-loc)
- [Ch 6: split-DWARF / debuginfod / pyelftools](/blog/tools/debugging/dwarf-elf/chapter06-split-dwarf-tools)
- [DWARF 5 § 6.4 (Call Frame Information)](https://dwarfstd.org/doc/DWARF5.pdf)
- [Itanium C++ ABI § 5 Exception Handling](https://itanium-cxx-abi.github.io/cxx-abi/abi-eh.html)
- [LLVM libunwind](https://github.com/llvm/llvm-project/tree/main/libunwind)
- [Linux Standard Base — exception handling](https://refspecs.linuxfoundation.org/LSB_5.0.0/LSB-Core-generic/LSB-Core-generic/ehframechpt.html)
