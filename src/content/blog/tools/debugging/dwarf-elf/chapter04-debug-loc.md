---
title: "DWARF .debug_loc 분석 — Variable Location Expression VM"
slug: "tools/debugging/dwarf-elf/chapter04-debug-loc"
date: 2026-05-23T09:04:00
description: "변수가 어디 있는지의 표현. 스택 머신 opcode, location list, DW_OP_entry_value."
tags: [dwarf, debug-loc, expression-vm, optimization]
series: "DWARF and ELF Internals"
seriesOrder: 4
draft: false
topics: ["tools", "tools/debugging"]
---

`print x`라고 했을 때 GDB는 `x`가 *지금 어디 있는지* 어떻게 알까요. DW_AT_location은 DIE에 직접 넣은 표현식이나 .debug_loc (DWARF 4)/.debug_loclists (DWARF 5)의 목록을 가리킬 수 있습니다. 표현식은 레지스터 위치·메모리 주소·값·조각을 기술합니다.

이 장은 그 VM의 정체를 다룹니다. 왜 변수 위치가 *식*이어야 하는지, 주요 `DW_OP_*` opcode의 의미, location list로 *PC 구간별* 다른 위치를 표현하는 법, 그리고 DWARF 5의 `DW_OP_entry_value`가 어떻게 "optimized out" 문제를 줄였는지.

## 왜 표현식인가

단순히 *주소만* 저장하면 안 될까? 안 됩니다. 같은 변수가 *코드 위치에 따라* 다른 곳에 있을 수 있기 때문.

```c
int main(int argc, char *argv[]) {
    int x = argc + 1;   // x는 어디? rax 레지스터일 수도, 스택일 수도
    printf("%d\n", x);  // x는 또 어디? rsi에 들어갔다가 함수 호출 후 사라짐
    x++;                // 다시 rax? 또는 스택? 또는 *사라짐*?
    return x;
}
```

컴파일러가 `-O2`로 최적화하면 변수가 *PC 위치별로 다른 곳*에 있거나, *어디에도 없거나*, *여러 조각으로 쪼개져* 있을 수 있습니다. 이를 표현하려면 단순 주소가 아닌 *식*이 필요.

## 스택 머신

DWARF expression은 *스택 머신*의 명령어 시퀀스.

- 명령이 *스택*을 조작 (push, pop, 산술 등).
- 마지막에 스택 top이 *결과* — 그 변수의 *주소* (또는 *값* 자체).
- 평가 끝에 스택이 비어 있을 수도 있음 (특수 opcode).

![DWARF expression 스택 머신 — 각 opcode 후의 스택 상태](/images/blog/tools/diagrams/dwarf-expr-vm.svg)

| Expression | 의미 |
|------------|------|
| `DW_OP_reg5` | 값이 `r5` 레지스터에 있음 |
| `DW_OP_fbreg -16` | frame base + (−16) 주소에 있음 |
| `DW_OP_addr 0x600000` | 절대 주소 |
| `DW_OP_breg6 -8` | `r6 + (−8)` 주소에 있음 |
| `DW_OP_constu 42 DW_OP_stack_value` | 값이 42 (메모리 어디에도 없음) |
| `DW_OP_reg3 DW_OP_piece 4 DW_OP_reg5 DW_OP_piece 4` | low 4바이트는 `r3`, high 4바이트는 `r5` |

각 줄이 한 변수의 위치 표현. 단순한 경우는 1-2 opcode, 복잡한 경우 10+.

## Opcode 카탈로그

100+ opcode가 있지만 자주 보이는 것 정리.

### Literal — 상수 push

| Opcode | 인자 | 동작 |
|--------|------|------|
| `DW_OP_lit0..31` | - | 0~31 push |
| `DW_OP_const1u` | u1 | 1바이트 unsigned push |
| `DW_OP_const2u` | u2 | 2바이트 |
| `DW_OP_const4u` | u4 | 4바이트 |
| `DW_OP_const8u` | u8 | 8바이트 |
| `DW_OP_const1s..8s` | signed | signed 버전 |
| `DW_OP_constu` | uleb128 | LEB128 unsigned |
| `DW_OP_consts` | sleb128 | LEB128 signed |
| `DW_OP_addr` | address | 절대 주소 push |
| `DW_OP_addrx` (DWARF 5) | uleb128 | `.debug_addr` 인덱스로 주소 |

### 레지스터 — 값이 레지스터에

| Opcode | 인자 | 동작 |
|--------|------|------|
| `DW_OP_reg0..31` | - | 변수가 reg0~31에 |
| `DW_OP_regx` | uleb128 | 임의 레지스터 (>= 32) |
| `DW_OP_breg0..31` | sleb128 | reg + offset 주소를 push |
| `DW_OP_bregx` | uleb128, sleb128 | 임의 reg + offset |
| `DW_OP_fbreg` | sleb128 | frame_base + offset 주소 |

### 메모리 접근

| Opcode | 인자 | 동작 |
|--------|------|------|
| `DW_OP_deref` | - | 스택 top 주소를 dereference (full word) |
| `DW_OP_deref_size` | u1 | n 바이트만 |
| `DW_OP_deref_type` | 1-byte unsigned 크기, unsigned LEB128 타입 DIE offset | typed deref (DWARF 5 §2.5.1.3) |
| `DW_OP_xderef` | - | 다중 주소 공간 deref |

### 산술

| Opcode | 의미 |
|--------|------|
| `DW_OP_plus` | a + b |
| `DW_OP_minus` | a - b |
| `DW_OP_mul` | a * b |
| `DW_OP_div` | a / b |
| `DW_OP_mod` | a % b |
| `DW_OP_and`/`or`/`xor`/`not` | 비트 연산 |
| `DW_OP_shl`/`shr`/`shra` | 시프트 |
| `DW_OP_abs` | abs(a) |
| `DW_OP_neg` | -a |
| `DW_OP_plus_uconst` | uleb128, top += operand |

### 스택 조작

| Opcode | 의미 |
|--------|------|
| `DW_OP_dup` | top 복제 |
| `DW_OP_drop` | top 제거 |
| `DW_OP_swap` | top 두 개 교환 |
| `DW_OP_over` | top-1을 복제해 top에 |
| `DW_OP_rot` | top 3개 회전 |
| `DW_OP_pick` | u1, n번째 push |

### 비교 / 제어

| Opcode | 의미 |
|--------|------|
| `DW_OP_eq`/`ne`/`lt`/`le`/`gt`/`ge` | 비교, 1 또는 0 push |
| `DW_OP_skip` | 2-byte signed 고정 폭 변위, 무조건 점프 |
| `DW_OP_bra` | 2-byte signed 고정 폭 변위, 조건부 점프 |

### 결과 표현 — 메모리 / 값 / 조각

| Opcode | 의미 |
|--------|------|
| `DW_OP_stack_value` | 스택 top이 *값 자체* (주소 아님) |
| `DW_OP_piece` | uleb128, 이전 표현이 *n바이트 조각* |
| `DW_OP_bit_piece` | 이전 표현이 *비트 조각* |
| `DW_OP_implicit_value` | block, 값이 *block bytes* (DWARF 4) |
| `DW_OP_implicit_pointer` (DWARF 5) | reference + offset, 사라진 포인터 |
| `DW_OP_entry_value` (DWARF 5) | block, 함수 진입 시 표현식 값 |

기본적으로 *스택 top = 메모리 주소*. `DW_OP_stack_value`가 있으면 *스택 top = 값 자체*. `DW_OP_piece`는 *조각*을 표현.

## 실제 예 — 단순한 케이스

```text
DW_AT_location = DW_OP_fbreg -16
```

frame base (보통 CFA) - 16 주소에 변수. 스택 변수의 가장 일반적 표현.

```text
DW_AT_location = DW_OP_reg5
```

값이 r5 레지스터. *주소가 아니라 값 자체*. 함수 인자에 흔함.

```text
DW_AT_location = DW_OP_addr 0x600100
```

`.data` 또는 `.bss`에 있는 전역 변수.

```text
DW_AT_location = DW_OP_breg6 -8
```

DWARF register 6의 값에서 8을 뺀 주소입니다. 레지스터 번호의 의미는 psABI를 따르며 x86-64에서는 rbp입니다. frame pointer로 쓰이는지와 별개로 계산할 수 있습니다.

## 복잡한 예 — 조각난 변수

little-endian ARM 32-bit를 예로 들면 64-bit `long long`은 *두 레지스터*에 쪼개질 수 있음.

```text
DW_AT_location = DW_OP_reg0 DW_OP_piece 4 DW_OP_reg1 DW_OP_piece 4
```

- 저 4바이트: r0.
- 위 4바이트: r1.

GDB가 `print my_ll`하면 두 레지스터를 읽어 8바이트로 조합.

## 더 복잡 — implicit value

값이 *컴파일 시 결정*되어 메모리/레지스터 어디에도 없음.

```text
DW_AT_location = DW_OP_constu 42 DW_OP_stack_value
```

`x = 42`로 *상수 폴딩*된 경우. GDB는 `print x`에 `42`로 답.

또는 *block of bytes* (DWARF 4).

```text
DW_AT_location = DW_OP_implicit_value 8 0x01 0x02 0x03 0x04 0x05 0x06 0x07 0x08
```

8바이트 값 `0x0807060504030201` (little-endian). 큰 `struct`나 SIMD vector가 *컴파일 시 알려진* 경우.

## DW_OP_entry_value — DWARF 5의 게임 체인저

함수 진입 시 인자가 r0에 있지만, 본문 중간에 r0이 *다른 용도*로 재사용되면 *원래 인자값*이 사라집니다. 이전 DWARF는 그 시점부터 "optimized out".

DWARF 5의 entry_value는 함수 진입 시 표현식의 값을 기술합니다. 실행 중 이력을 자동 저장하는 기능은 아닙니다:

```text
DW_AT_location = DW_OP_entry_value <block: DW_OP_reg0> DW_OP_stack_value
```

"이 변수의 값은 *함수 진입 시 r0의 값*". 디버거는 호출자와 call-site의 DW_AT_call_value 등 사용 가능한 정보를 이용해 복원을 시도합니다. CFI만으로 임의의 과거 인자값을 알아낼 수는 없습니다.

```text
(gdb) print arg
$1 = 42
```

복원에 필요한 호출 정보가 없으면 여전히 optimized out일 수 있습니다. 컴파일러·최적화·소비자의 지원을 실제 출력으로 확인하며 발생률 감소를 측정 없이 수치화하지 않습니다.

## DW_OP_implicit_pointer — 포인터가 사라짐

```c
void f() {
    int x = 10;
    int *p = &x;       // p는 &x를 가리키지만 컴파일러가 *p를 인라인해 p 변수 자체를 제거
    use(*p);
}
```

`p`는 *변수로 존재하지 않지만* GDB로 `print p` 또는 `print *p`를 의미 있게 답하고 싶을 때.

```text
DW_AT_location = DW_OP_implicit_pointer ref(x_DIE) 0
```

"p는 x의 DIE를 가리키는 포인터, offset 0". GDB는 `*p`에 `x`의 위치에서 값을 가져옵니다.

## DW_OP_call_frame_cfa

```text
DW_AT_location = DW_OP_call_frame_cfa DW_OP_consts -16 DW_OP_plus
```

"CFA - 16". CFA(Canonical Frame Address) = 현재 프레임의 *호출자 측 SP*. DW_AT_frame_base에 자주 사용.

## Location List

PC 위치별로 *다른 위치*를 가지는 변수.

**.debug_loc (DWARF 4):**

- [0x401120, 0x40112f): DW_OP_reg0      ← r0에
- [0x40112f, 0x401140): DW_OP_fbreg -16  ← 스택으로 spill
- [0x401140, 0x401160): (empty)          ← 사라짐
- [0x401160, 0x401180): DW_OP_reg5      ← r5로 다시

`DW_AT_location`이 *list*면 `.debug_loc`로의 offset (DW_FORM_sec_offset). GDB가 PC를 보고 적절한 entry 선택.

빈 entry `(empty)` 구간이 *optimized out*. `-O2` + 변수 추적이 어려운 경우 흔함.

### DWARF 5 — .debug_loclists

DWARF 4의 `.debug_loc`은 *모든 location list*를 한 섹션에 둠. DWARF 5는 *CU별 인덱스*로 분리 + 더 압축된 형식.

**.debug_loclists:**

- CU offset → list 시작

**각 entry:**

- DW_LLE_offset_pair: low_pc, high_pc (CU base 기준)
- DW_LLE_base_address: 새 base 설정
- DW_LLE_start_end: 절대 주소
- DW_LLE_default_location: PC와 무관, default
- DW_LLE_end_of_list: 끝

base address 트릭이 핵심 — *대부분의 PC는 가까이*에 있으므로 *상대 offset*만 저장. 같은 범위라도 선택한 entry 인코딩과 base에 따라 크기가 달라지므로 실제 결과를 비교합니다.

## DW_AT_location 평가 흐름

```c
// 의사 코드
Value evaluate_location(DIE var_die, uint64_t pc) {
    auto loc = var_die.attr(DW_AT_location);
    
    if (loc.form == DW_FORM_exprloc) {
        // 단일 표현식
        return run_expr_vm(loc.expr);
    } else if (loc.form == DW_FORM_sec_offset) {
        // location list
        auto entry = find_entry_for_pc(loc.offset, pc);
        if (entry.empty) return Value::optimized_out();
        return run_expr_vm(entry.expr);
    }
}

Value run_expr_vm(Bytes expr) {
    // 완전한 구현이 아닌 조각 처리의 개요
    // reg*는 즉시 반환하지 않고 현재 조각의 register location을 설정
    // stack_value는 현재 조각을 값으로 표시
    // piece는 현재 location/value를 누적하고 다음 조각의 평가 상태를 초기화
    // 모든 opcode 처리 후 단일 location 또는 piece 모음을 반환
    return evaluate_all_operations_and_pieces(expr);
}
```

레지스터 위치는 메모리 주소와 다른 결과 종류입니다. reg*에서 곧바로 반환하면 뒤의 piece를 처리할 수 없습니다. 위 코드는 상태 구분의 개요이며 stack_value·piece·typed opcode 전체를 구현한 평가기가 아닙니다.

## Type-aware 표현 (DWARF 5)

기본 generic 타입의 폭은 address_size에 관련되며 항상 64-bit인 것은 아닙니다. DWARF 5는 *typed* opcode:

```text
DW_OP_const_type    <type_die>, <byte_size>, <bytes>
DW_OP_regval_type   <reg>, <type_die>
DW_OP_deref_type    <byte_size>, <type_die>
DW_OP_convert       <type_die>
DW_OP_reinterpret   <type_die>
```

float, int8, int16 등 *정확한 타입*으로 산술 가능 → 더 정확한 표현. 잘 안 쓰이지만 일부 컴파일러는 활용.

## frame_base 표현

함수의 `DW_AT_frame_base`도 expression.

```text
DW_AT_frame_base = DW_OP_reg6     ← rbp 그대로
DW_AT_frame_base = DW_OP_call_frame_cfa   ← CFI의 CFA
DW_AT_frame_base = DW_OP_breg7 16  ← rsp + 16
```

`DW_OP_fbreg`가 이걸 평가한 결과를 base로 사용.

## DW_OP_GNU_* — 벤더 확장

DWARF 5에 들어오기 전 GCC가 먼저 도입한 opcode들.

| GNU opcode | DWARF 5 표준 |
|-----------|---------------|
| `DW_OP_GNU_entry_value` | `DW_OP_entry_value` |
| `DW_OP_GNU_implicit_pointer` | `DW_OP_implicit_pointer` |
| `DW_OP_GNU_parameter_ref` | (없음) |
| `DW_OP_GNU_const_type` | `DW_OP_const_type` |
| `DW_OP_GNU_addr_index` | `DW_OP_addrx` |

오래된 GDB는 GNU만 알고, 최신은 둘 다. 호환성을 위해 컴파일러가 한쪽을 출력.

## 디코딩 도구

```bash
# 한 변수의 location
$ llvm-dwarfdump --debug-info my_prog | grep -A 5 'DW_TAG_variable'

# 모든 location list
$ llvm-dwarfdump --debug-loclists my_prog | head -50
$ llvm-dwarfdump --debug-loc my_prog | head -50      # DWARF 4

# raw expression bytes
$ readelf --debug-dump=info my_prog | grep -A 2 DW_AT_location
```

pyelftools.

아래 직접 확인의 locations.py가 파일 열기와 DWARF 객체 생성을 포함한 pyelftools 0.32 예제입니다. 목록을 파싱하는 것과 대상 프로세스 레지스터·메모리에서 실제 값을 평가하는 것은 별개입니다.

자체 도구로 *변수가 어디 살아 있는지* 코드 영역별 통계를 낼 수 있습니다 — *최적화로 인한 가시성 분석*.

## 진단 — "optimized out"

```text
(gdb) print x
$1 = <optimized out>
```

원인 셋.

1. *현재 PC*에 해당하는 location list entry가 비어 있음.
2. 변수가 *spill됐는데* DWARF가 그 시점을 안 표시.
3. 컴파일러가 *완전히 제거*해 location 자체가 없음.

해법.

- `-Og` 빌드 → 더 많은 PC에 location 표시.
- g3의 매크로 정보가 최적화로 사라진 값을 되살리는 것은 아닙니다. 필요한 경우 최적화 수준과 변수 추적 지원을 별도로 확인합니다.
- DWARF 5의 `DW_OP_entry_value`로 함수 진입값 보존.
- 정 안되면 *어셈블리 보고 레지스터 직접* (GDB Ch 11).

## DWARF 5의 implicit value 활용

```c
constexpr int kMax = 100;
```

`constexpr`은 *컴파일 시 결정*. 컴파일러는 *변수 자체를 안 만들고* 사용 위치에 *상수*로 인라인. 상수 값은 DW_AT_const_value나 값 표현식으로 남을 수 있습니다. DW_OP_implicit_value는 DWARF 4부터 있으며 아래 두 예제가 모두 그 opcode인 것은 아닙니다.

```text
DW_TAG_variable [kMax]
  DW_AT_name = "kMax"
  DW_AT_const_value = 100
```

또는

```text
  DW_AT_location = DW_OP_constu 100 DW_OP_stack_value
```

`print kMax`가 100을 답.

## 직접 확인 — 위치 목록과 typed 인자 파싱

locals.c를 DWARF 4/5와 O0/O2로 만들어 전역 변수의 단일 표현식과 지역 변수의 위치 표현을 비교합니다. O2의 위치 목록은 컴파일러 출력에 따라 달라지며 특정 레지스터 배치를 고정하지 않습니다.

```c title="locals.c"
int global = 7;
extern int consume(int);
int sample(int input) {
    int tracked = input + 3;
    consume(tracked);
    return tracked + input + global;
}
```

```python title="locations.py"
import sys
from elftools.elf.elffile import ELFFile
from elftools.dwarf.locationlists import LocationParser

with open(sys.argv[1], "rb") as stream:
    dwarf = ELFFile(stream).get_dwarf_info()
    parser = LocationParser(dwarf.location_lists())
    for cu in dwarf.iter_CUs():
        for die in cu.iter_DIEs():
            if die.tag != "DW_TAG_variable":
                continue
            attr = die.attributes.get("DW_AT_location")
            if attr is None:
                continue
            name = die.attributes.get("DW_AT_name")
            location = parser.parse_from_attribute(attr, cu["version"], die=die)
            print(name.value.decode() if name else "<unnamed>", type(location).__name__)
```

```python title="expr-bytes.py"
from elftools.dwarf.dwarf_expr import DWARFExprParser
from elftools.dwarf.structs import DWARFStructs

structs = DWARFStructs(little_endian=True, dwarf_format=32, address_size=8)
parser = DWARFExprParser(structs)
ops = parser.parse_expr([0xa6, 4, 0x40, 0x9f])
assert ops[0].op_name == "DW_OP_deref_type"
assert ops[0].args == [4, 64]
assert ops[1].op_name == "DW_OP_stack_value"
print("typed size=4 type_offset=64")
```

```bash
clang --target=x86_64-unknown-linux-gnu -g -gdwarf-5 -O2 -c locals.c -o locals.o
llvm-dwarfdump --debug-info --debug-loclists locals.o
python3 locations.py locals.o
python3 expr-bytes.py
```

typed 예제는 크기 1바이트와 unsigned LEB128 offset 64를 읽고 다음 opcode까지 정확히 이동하는지 검사합니다. 타입 DIE가 실제로 있는 대상에서 메모리를 dereference한 실행은 아닙니다.

## 정리

- DWARF expression이 *스택 머신* 바이트코드.
- `DW_OP_reg*`/`DW_OP_breg*`/`DW_OP_fbreg`/`DW_OP_addr`이 가장 흔함.
- `DW_OP_stack_value`로 *값 자체* 표현.
- `DW_OP_piece`로 *조각난 변수* (32-bit 환경의 64-bit 등).
- `DW_OP_implicit_value`로 컴파일 시 결정된 상수.
- `DW_OP_entry_value` (DWARF 5)가 *함수 진입값* 보존 → `optimized out` 감소.
- Location list로 PC 구간별 다른 위치.
- DWARF 5의 `.debug_loclists`가 더 압축된 형식.
- pyelftools로 자체 가시성 분석.

## 다음 장 예고

Ch 5 — CFI (`.debug_frame` / `.eh_frame`). 콜스택을 *어떻게* 거꾸로 풀어 가는지의 답.

## 관련 항목

- [Ch 3: .debug_line 바이트코드 VM](/blog/tools/debugging/dwarf-elf/chapter03-debug-line)
- [Ch 5: CFI — .debug_frame / .eh_frame](/blog/tools/debugging/dwarf-elf/chapter05-cfi-eh-frame)
- [DWARF 5 § 2.5 (DWARF Expressions)](https://dwarfstd.org/doc/DWARF5.pdf)
- [`DW_OP_*` 카탈로그 — DWARF 5 § 2.5.1](https://dwarfstd.org/doc/DWARF5.pdf)
- [pyelftools location parser](https://github.com/eliben/pyelftools/blob/main/elftools/dwarf/locationlists.py)
