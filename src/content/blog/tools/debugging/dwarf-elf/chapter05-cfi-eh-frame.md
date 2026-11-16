---
title: "DWARF Call Frame Information — .debug_frame과 .eh_frame 분해"
slug: "tools/debugging/dwarf-elf/chapter05-cfi-eh-frame"
date: 2026-05-23T09:05:00
description: "콜스택 풀기의 정체. CIE/FDE, CFA, register rule, .eh_frame_hdr 이진 탐색."
tags: [dwarf, cfi, unwinding, eh_frame, exception]
series: "DWARF and ELF Internals"
seriesOrder: 5
draft: false
topics: ["tools", "tools/debugging"]
---

GDB의 `bt`가 어떻게 콜스택을 *거꾸로* 풀어 갈까요. 답은 `.eh_frame` (또는 `.debug_frame`) 섹션의 **CFI**(Call Frame Information). 각 PC 위치에서 *어디가 호출자 측 프레임인지*, *어떤 레지스터가 어떻게 보존됐는지*를 표로 기술한 데이터.

이 장은 그 정체를 다룹니다. CFI 모델, CIE/FDE 구조, register rule, CFA 계산, `.eh_frame_hdr`의 이진 탐색 인덱스, 그리고 C++ 예외와의 관계입니다. x86-64 예제는 macOS의 Homebrew LLVM 23.1.5로 만든 ELF 오브젝트, AArch64 예제는 Debian 13 arm64 게스트의 GCC 14.2·binutils 2.44·GDB 16.3·glibc 2.41에서 얻었습니다. 규칙은 [DWARF 5 §6.4](https://dwarfstd.org/doc/DWARF5.pdf) "Call Frame Information"을, `.eh_frame` 고유 형식은 [LSB Core 5.0 "Exception Frames"](https://refspecs.linuxfoundation.org/LSB_5.0.0/LSB-Core-generic/LSB-Core-generic/ehframechpt.html)를 따릅니다.

:::tldr
각 PC에서 *현재 프레임의 CFA*와 *호출자 측 레지스터 위치*를 표로 기술한 데이터. 콜스택 unwinding의 기반.
:::

## 왜 필요한가

```c
void f() { g(); }
void g() { h(); }
void h() { /* crash */ }
```

`h`에서 죽었을 때 GDB가 `bt`로 `f → g → h`를 보여 주려면 *각 단계*에서:

1. *호출자 PC*(반환 주소)는 어디 있나? (x86-64는 `call`이 스택에, AArch64는 `bl`이 `x30`에 둡니다)
2. *호출자 SP* 얼마나 위에 있나?
3. *호출자 BP / FP* 얼마나 위에?
4. 다른 callee-saved 레지스터 (x86-64의 rbx/r12-r15)는 어디?

함수마다 프롤로그·에필로그가 다르고, 같은 함수 안에서도 PC에 따라 답이 다릅니다. 프롤로그를 반쯤 실행한 시점과 본문 안의 시점이 다르기 때문입니다. 이 모든 경우를 표로 적은 것이 CFI입니다. 등산로 표지판에 비유하면, 지점마다 "여기서 출발점까지는 이 길로 몇 걸음"이 적혀 있어 어디서 길을 잃어도 되돌아갈 수 있습니다.

## 모델 — CFA와 Register Rule

각 PC 위치에서.

**CFA**(Canonical Frame Address)는 현재 프레임을 식별하는 스택 주소입니다. DWARF 5 §6.4는 CFA를 보통 이전 프레임의 호출 지점에서의 스택 포인터 값으로 정의하고, 이 값이 현재 프레임에 들어온 직후의 SP와 다를 수 있다고 덧붙입니다. x86-64에서는 `call`이 반환 주소 8바이트를 push하므로 함수 진입 직후 CFA = `rsp + 8`입니다. 또 §6.4는 CFA 값 자체는 함수 안에서 변하지 않고, 그것을 계산하는 규칙만 프롤로그·에필로그를 따라 바뀐다고 적습니다.

호출자 측 각 레지스터의 위치(**register rule**):

| Rule | 의미 (§6.4.1) |
|------|------|
| `undefined` | 이전 프레임의 값을 복원할 수 없음 (관례상 callee가 보존하지 않는 레지스터) |
| `same value` | 이전 프레임에서 바뀌지 않음 (callee-saved인데 이 함수가 건드리지 않음) |
| `offset(N)` | CFA + N 주소에 저장됨 |
| `val_offset(N)` | 값 자체가 CFA + N |
| `register(R)` | 다른 레지스터 R에 있음 |
| `expression(E)` | 식 E가 만든 주소에 저장됨 |
| `val_expression(E)` | 값 자체가 식 E의 결과 |
| `architectural` | augmenter(ABI)가 정의 |

`bt`의 *한 단계 위로 올라가기*.

1. 현재 PC의 CFI table을 lookup.
2. 호출자 측 PC = `*(CFA + return_address_offset)` 또는 register rule로 계산.
3. 호출자 측 SP = CFA.
4. 호출자 측 BP/FP, 다른 callee-saved도 register rule로 복원.
5. 1로 — 호출자 측 PC로 다시.

이 반복으로 콜스택의 모든 프레임을 풀어 갑니다.

## 한 예 — 프레임 포인터를 쓰는 함수의 CFI

![CFI 표 — 프롤로그 진행에 따른 CFA·register rule 변경](/images/blog/tools/diagrams/dwarf-cfi-table.svg)

배열을 스택에 두는 `frame.c`를 clang 23.1.5 `--target=x86_64-unknown-linux-gnu -g -O0`로 컴파일했습니다.

```c title="frame.c"
extern int work(int *);
int frame(int n) {
    int buf[4] = {n, n + 1, n + 2, n + 3};
    return work(buf);
}
```

```text
$ llvm-dwarfdump --eh-frame frame.o
00000000 00000014 00000000 CIE
  Format:                DWARF32
  Version:               1
  Augmentation:          "zR"
  Code alignment factor: 1
  Data alignment factor: -8
  Return address column: 16
  Augmentation data:     1B

  DW_CFA_def_cfa: RSP +8
  DW_CFA_offset: RIP -8
...
00000018 0000001c 0000001c FDE cie=00000000 pc=00000000...0000003b
  Format:       DWARF32
  DW_CFA_advance_loc: 1 to 0x1
  DW_CFA_def_cfa_offset: +16
  DW_CFA_offset: RBP -16
  DW_CFA_advance_loc: 3 to 0x4
  DW_CFA_def_cfa_register: RBP
  DW_CFA_advance_loc: 54 to 0x3a
  DW_CFA_def_cfa: RSP +8
...
  0x0: CFA=RSP+8: RIP=[CFA-8]
  0x1: CFA=RSP+16: RBP=[CFA-16], RIP=[CFA-8]
  0x4: CFA=RBP+16: RBP=[CFA-16], RIP=[CFA-8]
  0x3a: CFA=RSP+8: RBP=[CFA-16], RIP=[CFA-8]
```

아래쪽 네 줄이 `llvm-dwarfdump`가 명령을 실행해 재구성한 표입니다. 같은 함수의 디스어셈블과 맞춰 보면 이렇습니다.

| PC | 명령 | CFA | `rbp` | 반환 주소 |
|----|------|-----|-------|-----------|
| 0x0 | `pushq %rbp` 실행 전 | `rsp+8` | 호출자 값 그대로 | `[CFA-8]` |
| 0x1 | `movq %rsp, %rbp` 실행 전 | `rsp+16` | `[CFA-16]` | `[CFA-8]` |
| 0x4 | `subq $0x20, %rsp` ~ `popq %rbp` | `rbp+16` | `[CFA-16]` | `[CFA-8]` |
| 0x3a | `retq` | `rsp+8` | `[CFA-16]` | `[CFA-8]` |

`push`가 SP를 8 줄였으므로 0x1부터 CFA는 `rsp+16`이고, `mov`로 `rbp`가 고정되자 0x4부터는 `rbp+16`입니다. 그 뒤 `subq $0x20, %rsp`·`addq $0x20, %rsp`는 CFA 규칙을 바꾸지 않습니다. 기준이 이미 `rbp`라서 `rsp`가 움직여도 CFA 계산이 그대로이기 때문입니다. `popq %rbp`(0x39)가 끝난 0x3a에서 기준이 다시 `rsp+8`로 돌아옵니다.

## CIE — Common Information Entry

여러 FDE가 공유하는 공통 정보입니다. augmentation이나 초기 규칙이 다른 함수가 섞이면 CIE가 여럿 생깁니다. 아래 C++ 예제에서 personality가 필요한 함수는 C 함수와 다른 CIE(`"zPLR"`)를 썼습니다.

```c
struct CIE {
    uint32_t length;            // 이후 데이터 길이
    uint32_t cie_id;            // 0xFFFFFFFF (DWARF) 또는 0 (eh_frame)
    uint8_t  version;
    string   augmentation;      // ABI별 추가 정보
    uint8_t  address_size;      // .debug_frame version 4+만
    uint8_t  segment_size;      // .debug_frame version 4+만
    uleb128  code_alignment_factor;     // CFA 명령의 offset multiplier
    sleb128  data_alignment_factor;     // register rule offset multiplier
    uleb128  return_address_register;   // PC가 어느 column에?
    augmentation_data[];               // augmentation별 추가 데이터
    byte     initial_instructions[];   // 모든 FDE에 적용되는 초기 CFI 명령
};
```

`.eh_frame`의 CIE는 LSB 규정대로 CIE ID가 0이고 version이 1이며, `address_size`·`segment_size` 필드가 없습니다. 위 `frame.o`의 CIE가 그대로입니다. 반대로 `.debug_frame`의 CIE는 CIE ID가 `0xffffffff`이고 version 4에서 두 필드가 있습니다(아래 `.debug_frame` 출력).

augmentation은 *문자열*이고, 글자마다 augmentation data의 한 필드를 뜻합니다(LSB 10.6.1.1.1 "Augmentation String Format").

| 글자 | 의미 |
|------|------|
| `z` | 첫 글자. augmentation data 길이 필드가 있음 |
| `R` | FDE 주소의 포인터 인코딩 바이트 |
| `P` | personality 루틴의 포인터 인코딩과 포인터 (C++ 예외) |
| `L` | FDE의 LSDA(Language Specific Data Area) 포인터 인코딩 |

`frame.o`의 `"zR"`은 augmentation data `1B`, 곧 FDE 주소가 `DW_EH_PE_pcrel | DW_EH_PE_sdata4`(0x10 | 0x0b) 인코딩이라는 뜻입니다. `try`/`catch`가 있는 C++ 함수를 같은 clang으로 컴파일하자 CIE가 `"zPLR"`로 바뀌고 FDE에 `LSDA Address`가 붙었습니다.

```cpp title="exc.cpp"
int risky(int v);
int guard(int v) {
    try { return risky(v); } catch (int e) { return e; }
}
```

```text
$ llvm-dwarfdump --eh-frame exc.o
00000000 0000001c 00000000 CIE
  Augmentation:          "zPLR"
  Personality Address: ffffffffffffffed
  Augmentation data:     9B 00 00 00 00 1B 1B
00000020 00000024 00000024 FDE cie=00000000 pc=00000000...0000001b
  LSDA Address: ffffffffffffffcf
```

### initial_instructions

CIE 안에도 *CFI 명령*이 있어 *모든 FDE의 시작 상태*를 정의.

**CIE:**

- DW_CFA_def_cfa: r7 +8       ← 초기 CFA = rsp + 8
- DW_CFA_offset: r16 -8       ← rip는 CFA - 8에 (call 명령이 push한 것)

함수 *진입 직후*의 상태입니다. x86-64에서 함수는 `call`로 들어오므로 그 순간 `rsp+0`에 반환 주소가 있고 `rsp+8`이 호출 직전의 SP, 곧 CFA입니다. 반환 주소 열(column 16, `RIP`)은 x86-64 psABI의 DWARF 레지스터 번호입니다. AArch64 GCC 출력의 CIE는 `ra=30`(`x30`, link register)이고 초기 CFA가 `sp+0`이었는데, `bl`이 반환 주소를 스택이 아니라 레지스터에 두기 때문입니다.

## FDE — Frame Description Entry

FDE는 PC 범위 하나에 대한 항목입니다. CIE를 가리키는 포인터, *그 범위의 시작과 길이*, *그 범위만의 추가 CFI 명령*을 담습니다. 보통 함수 하나가 FDE 하나이고, 함수가 여러 조각(hot/cold 분리 등)으로 나뉘면 조각마다 FDE가 생깁니다. `.eh_frame`에서 `cie_pointer`는 이 필드 위치에서 CIE까지 거꾸로 잰 거리입니다. `frame.o`의 FDE가 offset 0x18에 있고 `cie` 필드가 0x1c이므로 0x18 + 4 − 0x1c = 0, 곧 offset 0의 CIE입니다.

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

`advance_loc`은 새 행을 시작합니다. 그 전까지 쌓인 규칙은 새 주소 직전까지 유효합니다(§6.4.2.1 "Row Creation Instructions").

### CFA 정의

| Opcode | 인자 | 의미 |
|--------|------|------|
| `DW_CFA_def_cfa <reg> <off>` | uleb128, uleb128 | CFA = reg + off |
| `DW_CFA_def_cfa_register <reg>` | uleb128 | CFA의 base register 변경 |
| `DW_CFA_def_cfa_offset <off>` | uleb128 | CFA의 offset만 변경 |
| `DW_CFA_def_cfa_expression <expr>` | block | CFA를 DWARF expression으로 |

`frame.o`에서는 CIE의 `DW_CFA_def_cfa: RSP +8`이 초기값이고, `push` 뒤 `def_cfa_offset: +16`, `mov` 뒤 `def_cfa_register: RBP`로 바뀌었습니다.

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

`DW_CFA_offset`은 callee-saved 레지스터가 스택 어디에 저장됐는지를 적습니다. 이 장의 출력에서 가장 많이 나온 규칙입니다.

### 스택

| Opcode | 의미 |
|--------|------|
| `DW_CFA_remember_state` | 현재 CFI 상태를 스택에 push |
| `DW_CFA_restore_state` | pop해서 상태 복원 |

§6.4.2.4 "Row State Instructions"의 두 명령은 함수 중간에 에필로그가 있을 때 쓰입니다. 에필로그 앞에서 상태를 저장하고, 에필로그의 규칙 변경을 적은 뒤, 다음 코드 앞에서 저장한 상태로 돌아가는 방식입니다. 컴파일러가 반드시 이 방식을 쓰는 것은 아닙니다. 반환 경로가 둘인 `twoexit.c`를 clang 23.1.5 x86-64 `-O2`로 컴파일했습니다.

```c title="twoexit.c"
int work(int);
int twoexit(int x) {
    if (x < 0)
        return work(-x) + 1;
    return work(x) * 3;
}
```

```text
$ llvm-objdump -d --no-show-raw-insn twoexit.o
0000000000000000 <twoexit>:
       0:      	pushq	%rax
       1:      	testl	%edi, %edi
       3:      	js	0xf <twoexit+0xf>
       5:      	callq	0xa <twoexit+0xa>
       a:      	leal	(%rax,%rax,2), %eax
       d:      	popq	%rcx
       e:      	retq
       f:      	negl	%edi
      11:      	callq	0x16 <twoexit+0x16>
      16:      	incl	%eax
      18:      	popq	%rcx
      19:      	retq
$ llvm-dwarfdump --eh-frame twoexit.o
...
  DW_CFA_advance_loc: 1 to 0x1
  DW_CFA_def_cfa_offset: +16
  DW_CFA_advance_loc: 13 to 0xe
  DW_CFA_def_cfa_offset: +8
  DW_CFA_advance_loc: 1 to 0xf
  DW_CFA_def_cfa_offset: +16
  DW_CFA_advance_loc: 10 to 0x19
  DW_CFA_def_cfa_offset: +8
...
```

첫 경로의 `popq %rcx` 뒤(0xe)에서 CFA를 `rsp+8`로 내린 다음, 둘째 경로가 시작하는 0xf에서 `DW_CFA_def_cfa_offset: +16`을 다시 적어 본문 상태로 되돌렸습니다. 바뀐 규칙이 CFA offset 하나뿐이라 그 값만 다시 적은 것이고, remember/restore는 쓰지 않았습니다.

## CFI 인코딩 — 압축의 트릭

자주 쓰는 세 명령은 opcode 바이트의 상위 2비트에 명령 종류를, 하위 6비트에 인자를 넣습니다(§7.24 "Call Frame Information", Table 7.29).

| 상위 2비트 | 명령 | 하위 6비트 |
|-----------|------|-----------|
| `0x40` | `DW_CFA_advance_loc` | delta (code_alignment_factor 단위) |
| `0x80` | `DW_CFA_offset` | 레지스터 번호, 뒤에 ULEB128 factored offset |
| `0xc0` | `DW_CFA_restore` | 레지스터 번호 |

`frame.o`의 `.eh_frame` 바이트로 확인합니다.

```text
$ llvm-objdump -s -j .eh_frame frame.o
Contents of section .eh_frame:
 0000 14000000 00000000 017a5200 01781001  .........zR..x..
 0010 1b0c0708 90010000 1c000000 1c000000  ................
 0020 00000000 3b000000 00410e10 8602430d  ....;....A....C.
 0030 06760c07 08000000                    .v......
```

| 바이트 | 해석 |
|--------|------|
| `0c 07 08` (CIE) | `DW_CFA_def_cfa` r7(RSP) 8 |
| `90 01` (CIE) | `0x80 \| 16` = `DW_CFA_offset` r16(RIP), 1 × data_alignment(-8) = −8 |
| `41` | `0x40 \| 1` = `advance_loc` 1 |
| `0e 10` | `DW_CFA_def_cfa_offset` 16 |
| `86 02` | `0x80 \| 6` = `DW_CFA_offset` r6(RBP), 2 × −8 = −16 |
| `43` | `advance_loc` 3 |
| `0d 06` | `DW_CFA_def_cfa_register` r6 |
| `76` | `0x40 \| 0x36` = `advance_loc` 54 |
| `0c 07 08` | `DW_CFA_def_cfa` r7 8 |
| `00 00 00` | `DW_CFA_nop` 패딩 |

FDE의 명령 전체가 15바이트입니다. 64 미만의 주소 증분은 1바이트, offset은 data alignment factor(−8)로 나눈 값을 ULEB128로 적어 −16이 `02` 한 바이트가 됩니다.

## 실제 디스어셈블 + CFI

AArch64에서는 프롤로그 모양이 다릅니다. 게스트에서 `bt.c`(아래 libunwind 절의 소스)를 GCC 14.2 `-g -O0 -fno-omit-frame-pointer`로 컴파일한 `g`입니다.

```text
$ objdump -d --no-show-raw-insn bt-fp.o
0000000000000034 <g>:
  34:	stp	x29, x30, [sp, #-16]!
  38:	mov	x29, sp
  3c:	bl	0 <h>
  40:	nop
  44:	ldp	x29, x30, [sp], #16
  48:	ret
$ readelf --debug-dump=frames-interp bt-fp.o
...
00000034 000000000000001c 00000038 FDE cie=00000000 pc=0000000000000034..000000000000004c
   LOC           CFA      x29   ra
0000000000000034 sp+0     u     u
0000000000000038 sp+16    c-16  c-8
0000000000000048 sp+0     u     u
```

`stp x29, x30, [sp, #-16]!` 한 명령이 SP를 16 줄이면서 두 레지스터를 저장하므로, 0x38부터 CFA = `sp+16`, `x29`는 `CFA-16`, 반환 주소(`x30`)는 `CFA-8`입니다. `mov x29, sp` 뒤에도 GCC는 CFA 기준을 `x29`로 옮기지 않고 `sp`로 유지했습니다. 이 함수는 그 뒤로 SP를 움직이지 않기 때문입니다. `ldp`(0x44)가 끝난 0x48에서 규칙이 진입 상태로 돌아갑니다. GNU readelf는 `undefined` 규칙을 `u`, `same value`를 `s`로 표시합니다. §6.4.1은 CIE의 초기 명령을 해석하기 전 모든 열의 기본 규칙을 undefined로 두고 ABI가 다른 기본값을 정할 수 있다고 하므로, 함수 시작 행의 `u`는 이 CIE가 x29·x30에 아무 규칙도 주지 않았다는 표시입니다. 실제로 `.cfi_undefined x19` 뒤 `nop`, `.cfi_same_value x19`를 넣은 AArch64 어셈블리를 GNU readelf로 보면 x19 열이 0x0에서 `u`, 0x4에서 `s`로 바뀌었습니다.

## .eh_frame vs .debug_frame

| | `.debug_frame` | `.eh_frame` |
|---|----------------|--------------|
| 정의 | DWARF 5 §6.4 | LSB Core "Exception Frames" |
| 용도 | 디버거 | C++ 예외·`backtrace()` 등 런타임 unwind, 디버거도 읽음 |
| 메모리 | 로드 안 됨 (ALLOC 아님) | 로드됨 (`A` 플래그, 첫 `LOAD`에 포함) |
| CIE ID | `0xffffffff` (DWARF32) | `0` |
| CIE version | 4 (`address_size`·`segment_size` 있음) | 1 |
| FDE의 CIE 포인터 | `.debug_frame` 시작 기준 offset | 이 필드에서 CIE까지의 거리 |
| 주소 인코딩 | 대상 주소 크기 그대로 | augmentation `R`이 정한 인코딩 (보통 pcrel sdata4) |
| 끝 표시 | 섹션 끝 | 길이 0인 항목 (확장 길이 `0xffffffff`도 정의됨) |

어느 쪽이 생기는지는 컴파일러 옵션이 정합니다. `frame.c`를 clang 23.1.5 x86-64에서 `-g -fno-asynchronous-unwind-tables`로 컴파일하자 `.eh_frame`이 사라지고 같은 FDE가 `.debug_frame`(0x40바이트)에 들어갔습니다. 기본값(`-g`만)일 때는 `.eh_frame`(0x38바이트)만 있었습니다. 게스트의 GCC 14.2 aarch64는 `-Q --help=common`에서 `-fasynchronous-unwind-tables`와 `-funwind-tables`가 기본 `[enabled]`였고, 2장에서 본 GCC의 `DW_AT_producer`에도 `-fasynchronous-unwind-tables`가 찍혀 있었습니다.

이런 차이 때문에 `strip --strip-debug`는 `.debug_frame`을 지우지만 `.eh_frame`은 남깁니다. 1장의 stripped `/usr/bin/ls`에도 `.eh_frame`(0x38b0바이트)과 `.eh_frame_hdr`가 그대로 있었습니다.

## .eh_frame_hdr — 이진 탐색 인덱스

`.eh_frame`에 *수천 FDE*가 있을 때 PC로 빠르게 찾으려면 인덱스 필요. `.eh_frame_hdr`이 그 역할.

![.eh_frame_hdr 이진 탐색으로 FDE 찾기](/images/blog/tools/diagrams/eh-frame-hdr-search.svg)

LSB 10.6.2 "The .eh_frame_hdr section"이 정한 형식은 1바이트 필드 넷, 인코딩된 포인터 둘, 그리고 (초기 PC, FDE 주소) 쌍의 binary search table입니다. 게스트에서 `bt`를 링크하고 앞부분을 덤프했습니다.

```text
$ readelf -x .eh_frame_hdr bt
Hex dump of section '.eh_frame_hdr':
  0x00000b10 011b033b 54000000 09000000 f0fdffff ...;T...........
  0x00000b20 4c010000 30feffff 6c000000 90feffff L...0...l.......
...
$ readelf -lW bt | grep EH_FRAME
  GNU_EH_FRAME   0x000b10 0x0000000000000b10 0x0000000000000b10 0x000054 0x000054 R   0x4
```

| 바이트 | 필드 | 값 |
|--------|------|-----|
| `01` | version | 1 |
| `1b` | eh_frame_ptr_enc | `DW_EH_PE_pcrel \| DW_EH_PE_sdata4` |
| `03` | fde_count_enc | `DW_EH_PE_udata4` |
| `3b` | table_enc | `DW_EH_PE_datarel \| DW_EH_PE_sdata4` |
| `54000000` | eh_frame_ptr | 이 필드(0xb14)에서 +0x54 = 0xb68, `readelf -S`의 `.eh_frame` 주소 |
| `09000000` | fde_count | 9 |
| `f0fdffff 4c010000` | 첫 항목 | 초기 PC = 0xb10 − 0x210 = 0x900(`main`), FDE = 0xb10 + 0x14c |

표의 PC는 `.eh_frame_hdr` 시작 기준 상대값(datarel)이고 오름차순으로 정렬되어 있어, PC 하나로 FDE를 이진 탐색할 수 있습니다. 실행 중인 프로세스에서는 프로그램 헤더 `PT_GNU_EH_FRAME`이 이 섹션의 위치를 알려 주므로 섹션 헤더 없이도 찾을 수 있습니다.

## libunwind / glibc backtrace

glibc의 `backtrace()`는 GNU 확장이고([backtrace(3)](https://man7.org/linux/man-pages/man3/backtrace.3.html)), 런타임 unwind 정보로 콜스택을 셉니다. 게스트에서 `h → g → f → main`을 부르는 `bt.c`를 GCC 14.2 `-g -O2 -rdynamic`으로 빌드했습니다.

```c title="bt.c"
#include <execinfo.h>
#include <stdio.h>
#include <unistd.h>
__attribute__((noinline)) void h(void) {
    void *buf[16];
    int n = backtrace(buf, 16);
    backtrace_symbols_fd(buf, n, STDOUT_FILENO);
}
__attribute__((noinline)) void g(void) { h(); __asm__ volatile(""); }
__attribute__((noinline)) void f(void) { g(); __asm__ volatile(""); }
int main(void) { f(); return 0; }
```

```text
$ ./bt
./bt(h+0x1c) [0xaaaabbfd0a9c]
./bt(g+0xc) [0xaaaabbfd0acc]
./bt(f+0xc) [0xaaaabbfd0aec]
./bt(main+0xc) [0xaaaabbfd090c]
/lib/aarch64-linux-gnu/libc.so.6(+0x2225c) [0xffff96c0225c]
/lib/aarch64-linux-gnu/libc.so.6(__libc_start_main+0x9c) [0xffff96c0233c]
./bt(_start+0x30) [0xaaaabbfd0970]
```

`ldd bt`에는 `libc.so.6`과 로더뿐이었는데, `LD_DEBUG=libs ./bt`를 보면 libc 초기화 뒤 `find library=libgcc_s.so.1`과 `calling init: /lib/aarch64-linux-gnu/libgcc_s.so.1`이 찍혔습니다. glibc가 libgcc의 unwinder를 실행 중에 동적으로 불러온 것입니다. 게스트의 `libgcc_s.so.1`은 `_Unwind_Backtrace`·`_Unwind_Find_FDE`·`__register_frame` 등을 export했고, `_Unwind_Find_FDE`가 PC로 FDE를 찾는 입구입니다.

`__builtin_return_address`는 컴파일러 내장 함수라 위의 unwinder를 거치지 않습니다. [GCC 문서](https://gcc.gnu.org/onlinedocs/gcc/Return-Address.html)는 0보다 큰 level을 주면 예측할 수 없는 결과나 크래시가 날 수 있다고 적습니다.

## libgcc_s.so.1과 C++ 예외

C++ 예외도 같은 unwinder를 씁니다. 게스트에서 `throw`/`catch`가 있는 `ex.cpp`를 g++ 14.2로 빌드하자 `ldd`에 `libstdc++.so.6`과 `libgcc_s.so.1`이 나왔습니다. `-static`으로 링크하면서 `-Wl,--trace`로 링커 입력을 찍으면 `libstdc++.a`, `libgcc.a`와 함께 `libgcc_eh.a`가 들어갔습니다. 정적 링크에서는 unwinder가 `libgcc_eh.a`로 실행 파일 안에 들어간다는 뜻입니다.

## 표준 DWARF와 ABI 확장 구분

`DW_CFA_GNU_args_size`는 GNU 확장 opcode이고 DWARF 5 표준 명령이 아닙니다. augmentation 문자 `S`(signal frame)도 LSB 표의 `z`·`R`·`P`·`L`에 들지 않는 GCC 쪽 관례입니다. AArch64의 `DW_CFA_AARCH64_negate_ra_state`는 아래 PAC 절에서 보듯 Arm ABI가 정의한 확장입니다. 반대로 `val_offset`·`val_expression` 같은 규칙은 DWARF 5 §6.4.1에 있는 표준입니다.

## frame pointer vs CFI

게스트의 GCC 14.2는 `-Q --help=optimizers -O2`에서 `-fomit-frame-pointer [enabled]`였습니다([GCC 문서](https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html)는 `-O1` 이상에서 켜진다고 적습니다). 그래도 위 `bt`처럼 콜스택이 풀리는 것은 `.eh_frame`의 CFI 덕분입니다. CFI가 정확하면 frame pointer 없이도 각 프레임의 CFA와 반환 주소를 계산할 수 있습니다.

CFI는 컴파일러가 만든 코드에 대해서만 자동으로 생깁니다. 손으로 쓴 어셈블리, `__attribute__((naked))` 함수, 런타임에 생성한 JIT 코드는 작성자가 `.cfi_*` 지시어를 넣거나 런타임에 등록해야 합니다. 이 장의 `rules.S`가 그 지시어를 직접 쓴 예입니다.

프로파일러는 두 방식을 고릅니다. [perf-record(1)](https://man7.org/linux/man-pages/man1/perf-record.1.html)의 `--call-graph fp`는 frame pointer 체인을 따라가고, `--call-graph dwarf`는 샘플마다 사용자 스택 일부를 복사해 두었다가 나중에 DWARF CFI로 풉니다. 앞쪽은 `-fno-omit-frame-pointer`로 빌드한 코드가 필요하고, 뒤쪽은 샘플마다 복사하는 스택 크기만큼 데이터가 커집니다.

## CFI 변경의 시점

프롤로그·에필로그 명령마다 CFI가 바뀌는 것은 아닙니다. CFA 계산식이 바뀌는 명령 뒤에서만 새 행이 생깁니다. `frame.c`의 x86-64 출력에서 정리하면 이렇습니다.

| 명령 | CFI 변화 |
|------|---------|
| `pushq %rbp` | CFA `rsp+16`, `rbp`를 `CFA-16`에 저장 |
| `movq %rsp, %rbp` | CFA 기준을 `rbp`로 |
| `subq $0x20, %rsp` | 없음 (CFA가 `rbp` 기준) |
| `addq $0x20, %rsp` | 없음 |
| `popq %rbp` | CFA를 `rsp+8`로 되돌림 |
| `retq` | 함수 끝 |

반대로 frame pointer 없이 `rsp` 기준으로 CFA를 잡는 함수는 `push`·`pop` 하나마다 offset이 바뀝니다. callee-saved 레지스터 셋을 쓰는 `early.c`를 clang 23.1.5 x86-64 `-O2`로 컴파일했습니다.

```c title="early.c"
long step(long);
long early(long a, long b, long c) {
    long x = step(a);
    long y = step(b + x);
    return step(c + y) + x + y;
}
```

```text
$ llvm-dwarfdump --eh-frame early.o
...
  0x0: CFA=RSP+8: RIP=[CFA-8]
  0x2: CFA=RSP+16: RIP=[CFA-8]
  0x4: CFA=RSP+24: RIP=[CFA-8]
  0x5: CFA=RSP+32: RBX=[CFA-32], R14=[CFA-24], R15=[CFA-16], RIP=[CFA-8]
  0x33: CFA=RSP+24: RBX=[CFA-32], R14=[CFA-24], R15=[CFA-16], RIP=[CFA-8]
  0x35: CFA=RSP+16: RBX=[CFA-32], R14=[CFA-24], R15=[CFA-16], RIP=[CFA-8]
  0x37: CFA=RSP+8: RBX=[CFA-32], R14=[CFA-24], R15=[CFA-16], RIP=[CFA-8]
```

`pushq %r15`·`%r14`·`%rbx`(0x0·0x2·0x4) 뒤마다 CFA offset이 +16, +24, +32로 올라가고, 에필로그의 `popq` 셋(0x32·0x33·0x35) 뒤마다 +24, +16, +8로 내려와 행이 7개입니다. 레지스터 저장 위치는 세 번째 `push` 뒤에 한꺼번에 적혔고, `pop` 뒤에도 `DW_CFA_restore` 없이 남았습니다.

## 자동 도구

```bash
# CFI raw
llvm-dwarfdump --debug-frame my_prog
llvm-dwarfdump --eh-frame my_prog
readelf --debug-dump=frames my_prog

# 디코딩된 표 형태
readelf --debug-dump=frames-interp my_prog
```

게스트에서 `bt.c`를 `-O2`로 컴파일한 오브젝트의 `frames-interp` 출력입니다.

```text
$ readelf --debug-dump=frames-interp bt.o
Contents of the .eh_frame section:

00000000 0000000000000010 00000000 CIE "zR" cf=4 df=-8 ra=30
   LOC           CFA
0000000000000000 sp+0

00000014 0000000000000020 00000018 FDE cie=00000000 pc=0000000000000000..0000000000000038
   LOC           CFA      x19   x29   ra
0000000000000000 sp+0     u     u     u
0000000000000004 sp+160   u     c-160 c-152
0000000000000010 sp+160   c-144 c-160 c-152
0000000000000034 sp+0     u     u     u
...
```

첫 FDE가 `h`입니다. `void *buf[16]`(128바이트) 때문에 프레임이 160바이트이고, `c-160`은 CFA−160 주소에 저장된 값이라는 뜻입니다. CIE의 `cf=4`는 code alignment factor 4로, AArch64 명령 하나(4바이트)가 `advance_loc` 1단위입니다.

pyelftools 0.32는 CIE/FDE 클래스로 항목을 구분합니다. `.debug_frame`은 `CFI_entries()`, `.eh_frame`은 `EH_CFI_entries()`로 읽고, 아래 직접 확인 예제처럼 `isinstance`로 종류를 가립니다.

## CFI in JIT 코드

JIT은 런타임에 코드를 만들므로 그 코드의 CFI도 런타임에 알려야 합니다. 알릴 상대가 둘입니다.

- **프로세스 안의 unwinder** — C++ 예외나 `backtrace()`가 JIT 코드를 지나가려면 libgcc에 FDE를 등록합니다. `__register_frame()`·`__register_frame_info()`가 그 입구이고, 게스트의 `libgcc_s.so.1`이 이 심볼들을 export합니다.
- **GDB** — GDB는 프로세스 안의 libgcc 등록표를 읽지 않습니다. 대신 [GDB JIT Interface](https://sourceware.org/gdb/current/onlinedocs/gdb.html/JIT-Interface.html)에 따라 JIT이 `__jit_debug_register_code()`를 부르고 `__jit_debug_descriptor`에 메모리 속 ELF 오브젝트(디버그 정보 포함)를 연결하면, GDB가 그 오브젝트를 읽습니다.
- **perf** — Linux perf는 JIT이 남기는 jitdump 파일을 `perf inject --jit`로 합쳐 심볼과 줄 정보를 붙입니다.

## 시그널 frame

시그널 핸들러는 일반 호출로 들어오지 않습니다. 커널이 사용자 스택에 시그널 프레임(레지스터 저장 영역)을 쌓고, 핸들러가 반환하면 sigreturn 트램펄린으로 돌아가 그 프레임을 복원합니다. unwinder는 이 트램펄린을 알아보고 일반 CFI 대신 저장된 레지스터에서 이전 프레임을 복원해야 합니다.

게스트에서 `raise(SIGUSR1)`로 핸들러에 들어간 뒤 GDB 16.3의 `bt`입니다. `sig.c`는 옵션 없이 `gcc -g`로 빌드했습니다.

```c title="sig.c"
#include <signal.h>
#include <stdio.h>
volatile int hits;
void handler(int sig) { hits += sig; }
void work(void) { raise(SIGUSR1); }
int main(void) { signal(SIGUSR1, handler); work(); return hits != 10; }
```

```text
$ gdb -q -batch -ex 'handle SIGUSR1 nostop noprint pass' -ex 'break handler' -ex run -ex bt ./sig
...
#0  handler (sig=10) at sig.c:4
#1  <signal handler called>
#2  0x0000fffff7e78020 in ?? () from /lib/aarch64-linux-gnu/libc.so.6
#3  0x0000fffff7e26880 [PAC] in raise () from /lib/aarch64-linux-gnu/libc.so.6
#4  0x0000aaaaaaaa082c [PAC] in work () at sig.c:5
#5  0x0000aaaaaaaa0854 in main () at sig.c:6
```

`#1 <signal handler called>`가 시그널 프레임이고, 그 위로 시그널이 난 시점의 libc 내부·`raise`·`work`·`main`이 이어집니다. 3장의 `crash` 예제에서 glibc `backtrace()`도 vdso의 `__kernel_rt_sigreturn`을 한 프레임으로 내놓은 뒤 시그널이 난 코드로 넘어갔습니다.

## ARM64 — PAC + BTI

AArch64의 Pointer Authentication(PAC)을 켜면 함수가 반환 주소(`x30`)에 서명한 뒤 스택에 저장합니다. 스택의 값을 그대로 반환 주소로 쓰면 틀리므로, unwinder는 "지금 이 PC에서 `x30`이 서명된 상태인가"를 알아야 합니다. [AArch64 DWARF ABI(aadwarf64)](https://github.com/ARM-software/abi-aa/blob/main/aadwarf64/aadwarf64.rst)가 이 상태를 뒤집는 `DW_CFA_AARCH64_negate_ra_state`를 정의합니다. 게스트에서 `-mbranch-protection=standard`로 컴파일했습니다.

```text
$ gcc -O2 -mbranch-protection=standard -S pac.c -o -
caller:
	.cfi_startproc
	hint	25 // paciasp
	.cfi_window_save
	stp	x29, x30, [sp, -16]!
...
	hint	29 // autiasp
	.cfi_window_save
	add	w0, w0, 1
	ret
$ readelf --debug-dump=frames pac.o
...
  DW_CFA_advance_loc: 4 to 0000000000000004
  DW_CFA_AARCH64_negate_ra_state
...
  DW_CFA_advance_loc: 4 to 0000000000000018
  DW_CFA_AARCH64_negate_ra_state
```

`paciasp` 뒤와 `autiasp` 뒤에 한 번씩 상태가 뒤집힙니다. 어셈블리의 `.cfi_window_save`가 AArch64에서 이 opcode로 인코딩된 것입니다. 앞의 시그널 예제에서 GDB가 `#3`·`#4` 옆에 `[PAC]`를 붙인 것도 서명된 반환 주소를 풀었다는 표시입니다. `#4`의 PC는 libc의 `raise`가 스택에 저장한 반환 주소에서 온 값입니다. `work`는 `-mbranch-protection` 없이 컴파일되어 디스어셈블에 `paciasp`가 없었고, `work`가 저장한 `main`의 반환 주소(`#5`)에는 표시가 붙지 않았습니다.

BTI(Branch Target Identification)는 간접 분기가 도착할 수 있는 명령을 제한하는 기능이라 CFI와는 관계가 없습니다. 대신 ELF에 흔적이 남습니다. 같은 `pac.o`의 `.note.gnu.property`가 `AArch64 feature: BTI, PAC`였고, 1장의 `/usr/bin/ls`도 같은 노트를 갖고 있었습니다.

## 직접 확인 — CIE/FDE와 undefined/same_value

두 규칙을 직접 만들어 봅니다. 아래 어셈블리는 `rbx`의 첫 규칙을 undefined, `nop` 다음을 same value로 바꾸고, 결과 표를 두 도구로 읽습니다.

```asm title="rules.S"
.text
.globl demo
.type demo,@function
demo:
.cfi_startproc
.cfi_undefined %rbx
nop
.cfi_same_value %rbx
ret
.cfi_endproc
.size demo, .-demo
```

```python title="cfi.py"
import sys
from elftools.elf.elffile import ELFFile
from elftools.dwarf.callframe import CIE, FDE, RegisterRule

with open(sys.argv[1], "rb") as stream:
    elf = ELFFile(stream)
    dwarf = elf.get_dwarf_info()
    entries = dwarf.EH_CFI_entries()
    print("CIE count=", sum(isinstance(e, CIE) for e in entries))
    fdes = [entry for entry in entries if isinstance(entry, FDE)]
    assert fdes
    rules = [row[3].type for entry in fdes
             for row in entry.get_decoded().table if 3 in row]
    assert RegisterRule.UNDEFINED in rules
    assert RegisterRule.SAME_VALUE in rules
    print("undefined and same_value remain distinct")
```

```bash
clang --target=x86_64-unknown-linux-gnu -c rules.S -o rules.o
llvm-dwarfdump --eh-frame rules.o
python3 cfi.py rules.o
```

```text
$ llvm-dwarfdump --eh-frame rules.o
...
00000018 00000014 0000001c FDE cie=00000000 pc=00000000...00000002
  Format:       DWARF32
  DW_CFA_undefined: RBX
  DW_CFA_advance_loc: 1 to 0x1
  DW_CFA_same_value: RBX
  DW_CFA_nop:
  DW_CFA_nop:

  0x0: CFA=RSP+8: RBX=undefined, RIP=[CFA-8]
  0x1: CFA=RSP+8: RBX=same, RIP=[CFA-8]
$ python3 cfi.py rules.o
CIE count= 1
undefined and same_value remain distinct
```

macOS의 LLVM 23.1.5와 pyelftools 0.32에서 두 규칙이 다른 값으로 나왔습니다. 디버그 정보 없이 `.eh_frame`만 있는 오브젝트도 pyelftools가 읽었습니다.

## 정리

- CFI는 PC마다 *CFA 계산식*과 *호출자 레지스터의 위치 규칙*을 적은 표입니다.
- CIE가 공통 규칙(정렬 인자·반환 주소 열·초기 명령)을, FDE가 PC 범위별 변경을 담습니다.
- `advance_loc`·`offset`·`restore`는 opcode 상위 2비트 + 하위 6비트로 1바이트에 들어갑니다. `frame.o`의 FDE 명령은 15바이트였습니다.
- CFA 계산식이 바뀌는 명령 뒤에서만 행이 생기며, `rbp` 기준이면 `sub`/`add rsp`에는 변화가 없습니다.
- `.eh_frame`은 로드되는 런타임 unwind 정보로 strip 뒤에도 남고, `-fno-asynchronous-unwind-tables -g`이면 clang이 `.debug_frame`으로 옮깁니다.
- `.eh_frame_hdr`은 PC로 정렬된 이진 탐색 표이고 `PT_GNU_EH_FRAME`이 가리킵니다.
- glibc `backtrace()`와 C++ 예외는 libgcc의 unwinder를 쓰고, 정적 링크에서는 `libgcc_eh.a`가 들어갑니다.
- JIT 코드는 libgcc에는 `__register_frame()`으로, GDB에는 JIT Interface로 따로 알립니다.
- AArch64 PAC은 `DW_CFA_AARCH64_negate_ra_state`로 반환 주소의 서명 상태를 표시합니다.

## 다음 장 예고

Ch 6 (시리즈 마지막) — split-DWARF, dwz, debuginfod, 그리고 pyelftools로 자체 DWARF 도구 만들기.

## 관련 항목

- [Ch 4: DWARF expression VM](/blog/tools/debugging/dwarf-elf/chapter04-debug-loc)
- [Ch 6: split-DWARF / debuginfod / pyelftools](/blog/tools/debugging/dwarf-elf/chapter06-split-dwarf-tools)
- [DWARF 5 § 6.4 (Call Frame Information)](https://dwarfstd.org/doc/DWARF5.pdf)
- [Itanium C++ Exception Handling ABI](https://itanium-cxx-abi.github.io/cxx-abi/abi-eh.html)
- [LLVM libunwind](https://github.com/llvm/llvm-project/tree/main/libunwind)
- [Linux Standard Base — exception handling](https://refspecs.linuxfoundation.org/LSB_5.0.0/LSB-Core-generic/LSB-Core-generic/ehframechpt.html)
