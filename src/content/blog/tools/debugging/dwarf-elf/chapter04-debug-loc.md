---
title: "Ch 4: .debug_loc — DWARF Expression VM"
date: 2025-09-02T04:00:00
description: "변수가 어디 있는지의 표현. 스택 머신 opcode, location list, DW_OP_entry_value."
tags: [dwarf, debug-loc, expression-vm, optimization]
series: "DWARF and ELF Internals"
seriesOrder: 4
draft: false
---

`print x`라고 했을 때 GDB는 `x`가 *지금 어디 있는지* 어떻게 알까요. 답은 `.debug_loc` (DWARF 4) 또는 `.debug_loclists` (DWARF 5) 안의 **DWARF expression** — 또 하나의 바이트코드 *스택 머신*.

이 장은 그 VM의 정체를 다룹니다. 왜 변수 위치가 *식*이어야 하는지, 모든 `DW_OP_*` opcode의 의미, location list로 *PC 구간별* 다른 위치를 표현하는 법, 그리고 DWARF 5의 `DW_OP_entry_value`가 어떻게 "optimized out" 문제를 줄였는지.

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

```text
DW_OP_reg5            ← 값이 r5 레지스터에 있음
DW_OP_fbreg -16       ← frame base + (-16) 주소에 있음
DW_OP_addr 0x600000   ← 절대 주소
DW_OP_breg6 -8        ← r6 + (-8) 주소에 있음
DW_OP_constu 42 DW_OP_stack_value
                      ← 값이 42 (메모리 어디에도 없음)
DW_OP_reg3 DW_OP_piece 4 DW_OP_reg5 DW_OP_piece 4
                      ← low 4바이트는 r3, high 4바이트는 r5
```

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
| `DW_OP_deref_type` | uleb128, sleb128 | typed deref (DWARF 5) |
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
| `DW_OP_skip` | sleb16, 무조건 점프 |
| `DW_OP_bra` | sleb16, 조건부 (top != 0) 점프 |

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

r6 - 8 *주소*에 변수. r6이 frame pointer가 아닐 때.

## 복잡한 예 — 조각난 변수

ARM의 32-bit 아키텍처에서 64-bit `long long`은 *두 레지스터*에 쪼개질 수 있음.

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

DWARF 5는 *함수 진입 시점의 표현식 값*을 보존:

```text
DW_AT_location = DW_OP_entry_value <block: DW_OP_reg0> DW_OP_stack_value
```

"이 변수의 값은 *함수 진입 시 r0의 값*". 디버거는 콜스택의 *호출자 측 정보*에서 r0이 그 시점에 무엇이었는지 알아내 (CFI 또는 호출 사이트 메타) 값을 복원.

```text
(gdb) print arg
$1 = 42         ← 본문에선 r0이 사라졌어도 entry value로 복원
```

GCC 8+ / Clang 11+가 광범위 사용. `<optimized out>` 발생률이 크게 줄어듭니다.

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

```
.debug_loc (DWARF 4):
  [0x401120, 0x40112f): DW_OP_reg0      ← r0에
  [0x40112f, 0x401140): DW_OP_fbreg -16  ← 스택으로 spill
  [0x401140, 0x401160): (empty)          ← 사라짐
  [0x401160, 0x401180): DW_OP_reg5      ← r5로 다시
```

`DW_AT_location`이 *list*면 `.debug_loc`로의 offset (DW_FORM_sec_offset). GDB가 PC를 보고 적절한 entry 선택.

빈 entry `(empty)` 구간이 *optimized out*. `-O2` + 변수 추적이 어려운 경우 흔함.

### DWARF 5 — .debug_loclists

DWARF 4의 `.debug_loc`은 *모든 location list*를 한 섹션에 둠. DWARF 5는 *CU별 인덱스*로 분리 + 더 압축된 형식.

```
.debug_loclists:
  CU offset → list 시작
  각 entry:
    DW_LLE_offset_pair: low_pc, high_pc (CU base 기준)
    DW_LLE_base_address: 새 base 설정
    DW_LLE_start_end: 절대 주소
    DW_LLE_default_location: PC와 무관, default
    DW_LLE_end_of_list: 끝
```

base address 트릭이 핵심 — *대부분의 PC는 가까이*에 있으므로 *상대 offset*만 저장. 같은 long range를 표현하는 데 *바이트가 절반*.

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
    Stack<Value> stack;
    while (expr.has_more()) {
        Opcode op = expr.next_byte();
        switch (op) {
        case DW_OP_lit0..lit31:
            stack.push(op - DW_OP_lit0); break;
        case DW_OP_reg0..reg31:
            return Value::in_register(op - DW_OP_reg0);
        case DW_OP_breg0..breg31: {
            int64_t offset = decode_sleb128(expr);
            uint64_t reg_val = read_register(op - DW_OP_breg0);
            stack.push(reg_val + offset);
            break;
        }
        case DW_OP_fbreg: {
            int64_t offset = decode_sleb128(expr);
            uint64_t fb = evaluate_frame_base();
            stack.push(fb + offset);
            break;
        }
        case DW_OP_plus:
            stack.push(stack.pop() + stack.pop()); break;
        case DW_OP_stack_value:
            return Value::implicit(stack.pop());
        case DW_OP_piece: {
            uint64_t size = decode_uleb128(expr);
            // 누적 — 위에서 본 표현식이 size 바이트 조각
            ...
        }
        ...
        }
    }
    return Value::at_address(stack.top());
}
```

평가 끝에 스택 top이 *주소* (그 주소를 deref해 값). `DW_OP_stack_value` 만나면 *값 자체*. `DW_OP_piece` 누적되면 *여러 조각의 모음*.

## Type-aware 표현 (DWARF 5)

이전 DWARF는 *모든 산술이 generic 64-bit*. DWARF 5는 *typed* opcode:

```
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

```python
from elftools.dwarf.descriptions import describe_attr_value
from elftools.dwarf.locationlists import LocationParser

for cu in dwarf.iter_CUs():
    parser = LocationParser(dwarf.location_lists())
    for die in cu.iter_DIEs():
        if die.tag != 'DW_TAG_variable': continue
        loc_attr = die.attributes.get('DW_AT_location')
        if not loc_attr: continue
        loc = parser.parse_from_attribute(loc_attr, cu['version'], die=die)
        # loc은 LocationExpr 또는 LocationList
        print(die.attributes['DW_AT_name'].value.decode(), '@', loc)
```

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
- `-g3` → 매크로 정보 + 더 풍부한 DWARF.
- DWARF 5의 `DW_OP_entry_value`로 함수 진입값 보존.
- 정 안되면 *어셈블리 보고 레지스터 직접* (GDB Ch 11).

## DWARF 5의 implicit value 활용

```c
constexpr int kMax = 100;
```

`constexpr`은 *컴파일 시 결정*. 컴파일러는 *변수 자체를 안 만들고* 사용 위치에 *상수*로 인라인. DWARF 5의 `DW_OP_implicit_value`로 *그래도 디버거가 보이게* 표현.

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
