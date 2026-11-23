---
title: "메모리 정렬과 패딩 분석 — Natural·Strict Alignment·Trap"
slug: "embedded/modern-recipes/part8-02-memory-alignment"
date: 2026-04-17T09:01:00
description: "Natural alignment, struct padding 규칙, packed의 unaligned access penalty, offsetof와 alignof 사용을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 90
tags: [recipes, memory, alignment]
topics: ["embedded"]
---

## 한 줄 요약

> **타입의 정렬·객체의 수명·byte 순서는 서로 다른 계약입니다.** `packed`나 포인터 cast 하나로 전송 buffer를 안전한 객체로 만들 수는 없습니다.

## 어떤 상황에서 쓰나

UART로 받은 byte 배열은 순서가 정해진 봉투에 가깝습니다. 이를 struct 포인터로 바꿔도 수신 주소가 타입에 맞게 정렬되거나, compiler의 field 배치가 송신 규격과 같아지지는 않습니다. C의 유효 타입 규칙과 실제 받은 길이도 별도로 맞아야 합니다.

정렬은 책을 정해진 칸의 시작점에 놓는 규칙이고, padding은 다음 책의 시작점을 맞추기 위한 빈칸입니다. field를 재배치하면 빈칸은 줄일 수 있지만 외부 ABI의 약속까지 바꾸므로, 통신·파일·공유 메모리 layout을 성능 목적으로 임의 변경하면 안 됩니다.

이 글은 C11을 기준으로 합니다. GCC/Clang의 `packed` 예제만 compiler 확장을 사용하며, C++의 `struct alignas(64) Hot` 문법과 C11 선언을 섞지 않습니다. cycle 수치를 가정하는 대신 `sizeof`·`offsetof`·교차 컴파일 결과로 확인할 조건을 분리합니다.

## Natural alignment와 ABI

C는 모든 플랫폼에서 같은 숫자의 alignment를 정하지 않습니다. 아래는 [AAPCS32](https://github.com/ARM-software/abi-aa/blob/main/aapcs32/aapcs32.rst)의 기본 데이터 layout이며, 모든 32-bit CPU의 규칙이라는 뜻은 아닙니다.

| AAPCS32 타입 | 크기 | 자연 정렬 |
|---|---:|---:|
| uint8_t | 1 byte | 1 byte |
| uint16_t | 2 byte | 2 byte |
| uint32_t | 4 byte | 4 byte |
| uint64_t | 8 byte | 8 byte |
| double | 8 byte | 8 byte |
| data pointer | 4 byte | 4 byte |

64-bit 정수를 32-bit 명령 두 개로 처리하는 것과 타입의 alignment는 다른 문제입니다. compile flag·ABI가 바뀌면 layout을 재검사합니다. AAPCS32의 public interface stack 정렬과 더 강하게 정렬된 지역 객체의 시작 주소도 구분합니다.

### Padding을 줄이되 ABI 보존하기

다음 코드는 AAPCS32의 4-byte int와 자연 정렬을 전제로 field 순서에 따른 차이를 검사합니다. 외부 layout이 아닌 내부 데이터에 적용하는 예입니다.

```c title="padding-layout.c"
#include <stddef.h>
#include <stdalign.h>
#include <stdint.h>

struct s1 { char a; int b; char c; };
struct s2 { int b; char a; char c; };
struct natural_sample { char a; int b; long long c; };

_Static_assert(sizeof(int) == 4 && alignof(int) == 4, "target int ABI");
_Static_assert(sizeof(struct s1) == 12, "s1 size");
_Static_assert(offsetof(struct s1, b) == 4, "s1 b");
_Static_assert(offsetof(struct s1, c) == 8, "s1 c");
_Static_assert(sizeof(struct s2) == 8, "s2 size");
_Static_assert(offsetof(struct s2, a) == 4, "s2 a");
_Static_assert(offsetof(struct s2, c) == 5, "s2 c");
_Static_assert(sizeof(struct natural_sample) == 16, "sample size");
_Static_assert(alignof(struct natural_sample) == 8, "sample alignment");
_Static_assert(offsetof(struct natural_sample, c) == 8, "sample c");
```

이 ABI에서는 s1에서 s2로 바꾸면 한 요소당 4 byte를 줄입니다. 큰 타입을 앞에 놓는 것은 후보일 뿐이며, field의 타입·배열·용도에 따라 최종 layout을 확인합니다. 큰 배열의 절약량은 요소 수와 두 sizeof의 차이로 계산할 수 있습니다.

### `_Static_assert`가 검사하지 않는 것

다음 struct의 field 위치를 고정해도 wire byte 순서까지 정해지지는 않습니다.

```c title="frame-layout.c"
#include <stddef.h>
#include <stdint.h>

struct frame {
    uint8_t type, flags;
    uint16_t len;
    uint32_t payload;
};
_Static_assert(sizeof(struct frame) == 8, "frame layout drift");
_Static_assert(offsetof(struct frame, len) == 2, "len position");
_Static_assert(offsetof(struct frame, payload) == 4, "payload position");
```

이 검사는 compiler 쪽 layout 변경을 감지하는 울타리입니다. 입력 길이·endianness·유효한 field 값·정합성 검사가 끝났다는 뜻은 아닙니다. 외부 입력을 직접 이 타입으로 cast하는 근거도 되지 않습니다.

## Packed의 직접 접근과 포인터 경유 구분하기

`packed`는 GCC/Clang의 확장으로 member 사이의 빈칸을 줄입니다. compiler가 packed member임을 아는 직접 접근은 target에 따라 byte load 등으로 펼칠 수 있습니다. Cortex-M0에서 packed를 썼다는 이유만으로 반드시 fault한다는 설명은 정확하지 않습니다.

다음 예제는 직접 member를 읽는 함수와 일반 int 포인터를 읽는 함수를 구분합니다.

```c title="packed-access.c"
#include <stddef.h>
#include <string.h>

struct __attribute__((packed)) packed_sample { char tag; int value; };
_Static_assert(offsetof(struct packed_sample, value) == 1, "packed offset");

int packed_direct(const struct packed_sample *p) {
    return p->value;
}
int packed_copy(const struct packed_sample *p) {
    int value;
    memcpy(&value, (const unsigned char *)p +
                   offsetof(struct packed_sample, value), sizeof(value));
    return value;
}
int aligned_pointer_read(const int *p) { return *p; }
```

반면 `&p->value`를 일반 `int *`로 다른 함수에 넘기면 받는 쪽은 int의 자연 정렬을 전제로 할 수 있습니다. GCC/Clang의 `-Waddress-of-packed-member`는 이런 오용을 잡습니다. 일반 int의 정렬 요구를 지키지 않는 역참조는 C의 계약을 만족하지 않습니다. CPU가 unaligned load를 실행할 수 있다는 사실만으로 정당화할 수 없습니다.

`packed_copy`는 유효한 일반 메모리의 byte 표현을 올바르게 정렬된 실제 객체로 복사합니다. 무효 포인터·짧은 입력·MMIO·DMA와의 동시 접근을 해결하지 않으며 endianness도 바꾸지 않습니다. trap 표현이나 padding이 있는 일반 타입까지 무조건 확대하지 않고, wire format은 아래처럼 명시적으로 decode합니다.

## Wire format은 byte 단위로 decode하기

packed struct는 wire format에 필수적이지 않습니다. 여기서는 본문 예제용 25-byte format을 정의합니다. SOF는 0xA5, length는 16-byte sample 영역의 길이, timestamp와 CRC는 little-endian, sample은 16-bit two's complement 표현입니다. CRC field를 꺼낼 뿐 CRC 계산에 의한 검증은 이 함수의 범위 밖입니다.

| offset | 폭 | field |
|---:|---:|---|
| 0 | 1 | SOF |
| 1 | 2 | payload length |
| 3 | 4 | timestamp |
| 7 | 16 | signed sample 8개 |
| 23 | 2 | CRC |

다음 decoder는 짧은 입력과 잘못된 SOF/length를 거부하고 실패 시 출력을 바꾸지 않습니다.

```c title="sensor-decode.c"
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>

enum { SENSOR_WIRE_SIZE = 25, SENSOR_PAYLOAD_SIZE = 16 };
typedef struct {
    uint32_t timestamp;
    int16_t samples[8];
    uint16_t crc;
} sensor_fields;

static uint16_t read_le16(const unsigned char *p) {
    return (uint16_t)((uint16_t)p[0] | ((uint16_t)p[1] << 8));
}
static uint32_t read_le32(const unsigned char *p) {
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8) |
           ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}
bool decode_sensor_fields(const unsigned char *wire, size_t len,
                          sensor_fields *out) {
    if (!wire || !out || len < SENSOR_WIRE_SIZE || wire[0] != 0xa5 ||
        read_le16(wire + 1) != SENSOR_PAYLOAD_SIZE) return false;
    sensor_fields next;
    next.timestamp = read_le32(wire + 3);
    for (size_t i = 0; i < 8; ++i) {
        uint16_t u = read_le16(wire + 7 + 2 * i);
        int32_t signed_value = u <= INT16_MAX ? (int32_t)u : (int32_t)u - 65536;
        next.samples[i] = (int16_t)signed_value;
    }
    next.crc = read_le16(wire + 23);
    *out = next;
    return true;
}
```

수신 buffer가 정렬되지 않아도 byte 접근은 가능합니다. 음수 sample은 범위 안의 signed 값으로 계산한 뒤 int16_t로 대입하므로, 범위 밖 unsigned 값을 signed로 cast하는 동작에 의존하지 않습니다. 부분 수신의 결합, CRC 대조, timestamp 의미와 상위 계층에서 허용할 sample 범위는 실제 protocol에 추가합니다.

## C11에서 명시적 정렬 쓰기

C11의 `alignas`는 `<stdalign.h>`가 제공하는 `_Alignas`의 macro입니다. C++ 타입 선언과 같은 위치에 쓰지 않습니다. member 정렬을 지정하면 타입 자체의 정렬과 배열 stride에도 반영되며, 배열 객체 하나의 시작만 정렬하는 경우와 구별합니다.

다음은 DMA 저장소, 정렬된 타입과 지역 buffer를 선언하는 C11 코드입니다. consume_aligned는 이 예제의 호출자가 제공하는 동기 처리 함수입니다.

```c title="explicit-alignment.c"
#include <stdint.h>
#include <stddef.h>
#include <stdalign.h>

alignas(8) static unsigned char dma_buf[1024];
struct hot {
    alignas(64) uint32_t value;
};
_Static_assert(alignof(struct hot) == 64, "hot alignment");
_Static_assert(sizeof(struct hot) == 64, "hot array stride");
static struct hot hot_slots[2];

void *dma_storage(void) { return dma_buf; }
void *hot_storage(void) { return hot_slots; }

extern void consume_aligned(void *p, size_t n);
void with_local_buffer(void) {
    alignas(64) unsigned char local[64];
    consume_aligned(local, sizeof(local));
}
```

지역 buffer는 함수가 돌아오면 수명이 끝납니다. consume_aligned는 그 포인터를 보관하지 않고 호출 중에만 사용해야 하며, 비동기 DMA에 넘긴 채 return하면 안 됩니다. 정렬이 맞아도 수명이 연장되지는 않습니다.

지원하는 alignment 지정이 compiler에서 조용히 무시된다고 가정하지 않습니다. 지원하는 확장 정렬이면 만족해야 하고, 지원하지 않으면 진단과 toolchain 제한을 확인합니다. GCC의 x86용 `-mstackrealign`은 ARM의 일반적인 해결책이 아닙니다. 정적 객체는 linker의 section alignment와 최종 ELF 배치까지 봅니다.

malloc의 기본 보장보다 강한 정렬이 필요한 타입은 사용할 수 있는 aligned allocation API와 올바른 free 조합을 선택합니다. C11 `aligned_alloc`에는 size를 alignment의 배수로 지정하는 등의 계약이 있습니다. stack·heap·static 어디서든 정렬 조건과 DMA 접근 가능 영역은 별개입니다.

## 보드 없이 하는 검증과 fault 분석

Cortex-M0의 packed read가 byte load로 펼쳐지는지, Cortex-M4에서 어떤 unaligned 접근 명령이 생성되는지 target flag로 assembly를 만들어 확인합니다. 생성 명령 검사와 실기 fault·cycle 측정은 구분합니다.

| 검사 | 통과 조건 |
|---|---|
| C11 layout | static_assert의 size·offset·alignment가 일치합니다. |
| wire decode | 홀수 시작 주소·짧은 입력·음수 경계·LE 값을 처리합니다. |
| packed member pointer | 오용 예제를 경고의 error 처리로 거부합니다. |
| stack/global alignment | compiler 처리와 최종 ELF symbol 위치를 확인합니다. |
| Cortex-M fault | 실기의 명령·CCR·memory type·fault status로 원인을 확인합니다. |

ARMv6-M과 ARMv6 일반을 같은 것으로 취급하거나 ARMv7 이후를 일률적으로 2배 cycle이라고 하지 않습니다. unaligned 접근 허용은 architecture·명령·설정·memory type에 달려 있습니다. bit-field 배치도 C 구현에 의존하므로 외부 format에는 byte decode와 mask/shift를 사용합니다.

### 이번 예제 검증 결과

본문 C11 코드를 추출해 Clang 23.1.6의 ASan/UBSan으로 실행했습니다. 시작 주소를 1 byte 어긋나게 놓은 wire 입력, 0~24 byte 부분 입력, 잘못된 SOF/length, signed sample의 -32768·-1·32767 경계와 실패 시 출력 유지를 확인했습니다. packed 직접 접근과 memcpy 결과, 지역 buffer의 64-byte 정렬도 검사했습니다.

ARM GCC 16.2.0으로 Cortex-M0·M4의 size/offset/alignment assert를 통과했으며, M0의 packed 직접 read가 byte load를 사용하는 생성 코드를 확인했습니다. 일반 int 포인터로 packed member 주소를 넘기는 오용은 host compiler의 경고를 error로 처리해 거부했습니다. 최종 ARM ELF에서는 전역 buffer와 정렬된 배열의 symbol 주소도 확인했습니다. 실제 fault·cycle 측정이나 ARM libc의 런타임 검사는 수행하지 않았습니다.

## 정리

- AAPCS32의 uint64_t 자연 정렬은 8 byte이며 처리 명령 폭과 구분합니다.
- 내부 layout의 padding을 줄이되 공개 ABI는 offset과 size 검사로 보호합니다.
- packed의 직접 member 접근과 일반 typed pointer의 역참조를 구분합니다.
- memcpy는 길이·byte 순서·유효한 값·MMIO·동시 접근을 검증하지 않습니다.
- 명시적 wire decode로 alignment와 endianness를 분리합니다.
- C11/C++ alignas 문법을 섞지 않고 배열 stride와 최종 배치를 확인합니다.

다음 편은 **Cache Line Alignment**입니다. 타입 정렬에서 더 나아가 여러 객체가 공유하는 cache line과 데이터 배치를 다룹니다.

## 관련 항목

- [8-01: 동적 메모리](/blog/embedded/modern-recipes/part8-01-dynamic-memory)
- [8-03: Cache Line Alignment](/blog/embedded/modern-recipes/part8-03-cache-alignment)
- [9-09: False sharing 해결](/blog/embedded/modern-recipes/part9-09-false-sharing)
- [PE 2-05: Cache Basics](/blog/embedded/performance-engineering/part2-05-cache-basics)

## 1차 자료

- [C11 draft N1570](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf), §6.2.8·6.5·6.7.5·7.15·7.22.3: 정렬·유효 타입·alignment specifier·할당 계약입니다.
- [Arm AAPCS32](https://github.com/ARM-software/abi-aa/blob/main/aapcs32/aapcs32.rst): 기본 타입의 size/alignment, aggregate layout과 stack 규약입니다.
- [GCC type attributes](https://gcc.gnu.org/onlinedocs/gcc/Common-Type-Attributes.html): packed/aligned 확장 정의입니다.
- [GCC variable attributes](https://gcc.gnu.org/onlinedocs/gcc/Common-Variable-Attributes.html): 객체의 alignment와 linker 제한입니다.
