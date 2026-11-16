---
title: "GDB Python API 입문 — Value·Type·Frame 객체 활용"
slug: "tools/debugging/gdb-extension/chapter01-python-api-basics"
date: 2026-05-27T09:01:00
description: "GDB Python 인터프리터, 핵심 객체(Value/Type/Frame/Symbol), 디버기 데이터 조작."
tags: [gdb, python, api]
series: "GDB Extension and IDE"
seriesOrder: 1
draft: false
topics: ["tools", "tools/debugging"]
---

GDB는 명령줄 디버거이면서 동시에 *디버거 SDK*입니다. 그 SDK의 중심이 *내장 Python 인터프리터*입니다. libstdc++의 STL pretty-printer, GDB 자신의 DAP 서버(`gdb -i=dap`)가 모두 이 API 위에서 동작합니다. 앞의 것은 [Ch 3](/blog/tools/debugging/gdb-extension/chapter03-pretty-printers)에서, 뒤의 것은 [Ch 5](/blog/tools/debugging/gdb-extension/chapter05-mi-dap-protocol)에서 다시 봅니다.

이 시리즈는 GDB를 확장하고 IDE에 붙이는 길을 Python·MI·DAP·프런트엔드 순서로 다룹니다. 첫 장은 Python API의 기본입니다. Value, Type, Frame, Symbol 같은 핵심 객체로 *디버기 안의 데이터*를 읽고 고치는 법을 봅니다.

:::tldr
GDB가 내장한 Python 인터프리터로 디버기의 메모리·타입·콜스택을 *Python 객체*로 다룹니다. 이 장의 모든 출력은 Debian 13 arm64의 GDB 16.3(내장 Python 3.13.5)에서 실습 프로그램 `inv.cpp`를 돌려 얻은 것입니다.
:::

## 실습 환경

이 장의 세션은 모두 Debian 13 arm64 QEMU VM에서 돌렸습니다. GDB는 Debian 패키지 `gdb 16.3-1`, 컴파일러는 GCC 14.2.0입니다. 실습 프로그램은 구조체·배열·포인터·가상 함수가 있는 클래스·`std::vector`를 한 파일에 모았고, `g++ -g -O0 -o inv inv.cpp`로 빌드했습니다.

```cpp title="inv.cpp"
#include <cstdio>
#include <vector>

struct Inner { int count; };
struct MyStruct { int x; int y; Inner inner; const char *name; double ratio; unsigned char data[8]; };

struct Base { virtual ~Base() {} int id = 1; };
struct Derived : Base { int extra = 99; };

MyStruct my_struct = {3, 4, {7}, "sensor-A", 0.25, {1, 2, 3, 4, 5, 6, 7, 8}};
int my_array[10] = {10, 11, 12, 13, 14, 15, 16, 17, 18, 19};
int counter = 41;
int *ptr = &counter;
char g_buffer[64] = "boot ok; hello from inv";
const char *g_config = "release";

static int process(int a, int b, const MyStruct *s) {
    int local_var = a * b + s->x;
    std::printf("process %d\n", local_var);   // break here (22행)
    return local_var;
}

int main() {
    std::vector<int> vec = {1, 2, 3};
    Derived d;
    Base *base = &d;
    int r = process(6, 7, &my_struct);
    std::printf("%d %zu %d\n", r, vec.size(), base->id);   // 31행
    return 0;
}
```

위 목록은 실제 파일에서 `#include <cstddef>`·`<cstring>`과 첫 주석 줄을 뺀 것이라 줄 번호가 3줄 당겨져 보입니다. 본문의 줄 번호(22행, 31행)는 실제 파일 기준입니다.

## 활성화 확인

GDB가 Python과 함께 빌드됐는지는 `python` 명령 하나로 확인됩니다.

```text
(gdb) python print("hello")
hello
(gdb) python import sys; print(sys.version)
3.13.5 (main, Aug 10 2026, 12:06:59) [GCC 14.2.0]
```

GDB 16.3 매뉴얼의 Configure Options 절에 따르면 `--with-python`은 configure가 libpython을 찾으면 기본으로 켜집니다. Python 없이 빌드된 GDB에서 `python` 명령을 치면 `gdb/python/python.c`의 `Python scripting is not supported in this copy of GDB.` 오류가 납니다. cross GDB를 직접 빌드했다면 이 한 줄로 먼저 확인합니다.

내장 Python의 버전은 GDB를 빌드할 때 링크한 libpython이 정합니다. Debian 13의 GDB는 시스템 Python 3.13.5에 링크돼 있어서 `sys.path`가 이미 시스템 패키지 경로를 담고 있습니다.

```text
(gdb) python print(sys.path)
['/usr/share/gdb/python', '/usr/lib/python313.zip', '/usr/lib/python3.13', '/usr/lib/python3.13/lib-dynload', '/usr/local/lib/python3.13/dist-packages', '/usr/lib/python3/dist-packages']
```

그래서 `apt`로 설치한 Python 패키지는 바로 `import`됩니다. venv에만 깔린 순수 Python 모듈이 필요하면 그 경로를 `sys.path`에 직접 넣습니다.

```python
(gdb) python
>import sys
>sys.path.insert(0, '/path/to/venv/lib/python3.13/site-packages')
>import my_pure_python_helper
>end
```

NumPy처럼 C 확장이 든 패키지는 GDB가 링크한 Python과 같은 버전·ABI로 빌드된 것이어야 import됩니다. 경로를 추가하는 것만으로 ABI가 맞춰지지는 않습니다.

## 실행 방법

한 줄은 `python <문장>`, 여러 줄은 `python` … `end`, 외부 파일은 `source`입니다.

```text
(gdb) python print(1 + 2)
3
(gdb) python
>import os
>print(os.getpid() > 0)
>end
True
(gdb) source /root/ext/snippets.py
```

`.gdbinit`에 같은 블록을 넣으면 시작할 때마다 로드됩니다.

```text
python
import sys
sys.path.insert(0, '/home/me/gdb-helpers')
import myhelpers
myhelpers.register_all()
end
```

## 핵심 객체 한 표

GDB 16.3 매뉴얼 Python API 절의 하위 절이 객체마다 하나씩 있습니다. 이 장에서 쓰는 것만 추렸습니다.

| 객체 | 역할 | 매뉴얼 절 |
|------|------|-----------|
| `gdb.Value` | 디버기의 *값* (int/string/struct/포인터) | Values From Inferior |
| `gdb.Type` | 타입 정보 (size, fields, target) | Types In Python |
| `gdb.Frame` | 콜스택의 한 프레임 | Frames In Python |
| `gdb.Block` | 스코프 블록 | Blocks In Python |
| `gdb.Symbol` | 변수·함수 심볼 | Symbols In Python |
| `gdb.Inferior` | 디버깅 중인 프로세스 | Inferiors In Python |
| `gdb.InferiorThread` | 스레드 | Threads In Python |
| `gdb.Breakpoint` | 브레이크포인트 | Breakpoints In Python |
| `gdb.Objfile` | 로드된 ELF/공유 라이브러리 | Objfiles In Python |
| `gdb.Architecture` | 아키텍처 | Architectures In Python |
| `gdb.Progspace` | 프로그램 공간 | Progspaces In Python |

아래 세션은 모두 `break inv.cpp:22`로 `process()` 안에 멈춘 상태에서 시작합니다.

```text
(gdb) break inv.cpp:22
Breakpoint 1 at 0xd18: file inv.cpp, line 22.
(gdb) run
Breakpoint 1, process (a=6, b=7, s=0xaaaaaaac00e8 <my_struct>) at inv.cpp:22
22	    std::printf("process %d\n", local_var);   // break here
```

## gdb.Value — 디버기의 값

가장 자주 다루는 객체입니다. 디버기 메모리의 한 영역을 Python에서 다룰 수 있게 감싼 핸들이라고 보면 됩니다. 도서관 대출 카드처럼 책(메모리) 자체가 아니라 그 책이 어디 있고 어떤 종류인지를 적어 둔 표입니다.

### 만들기

`gdb.parse_and_eval()`은 `print` 명령이 받는 표현식을 그대로 받아 `gdb.Value`를 돌려줍니다. 매뉴얼은 이 함수가 현재 프레임(또는 현재 정적 문맥)에서 평가한다고 적습니다. 직접 만든 `gdb.Value`는 Python 값의 타입을 따릅니다.

```text
(gdb) python v = gdb.parse_and_eval("my_struct"); print(v['x'], v['y'], v['inner']['count'])
3 4 7
(gdb) python print(gdb.parse_and_eval("counter + 1"), gdb.parse_and_eval("counter + 1").type)
42 int
(gdb) python print(gdb.parse_and_eval("(int *)0x600000"))
0x600000
(gdb) python n = gdb.Value(42); s = gdb.Value("hello"); print(n, n.type, s, s.type)
42 long long "hello" char [6]
```

Python 정수 42는 `long long`이 되고, Python 문자열 `"hello"`는 끝의 NUL까지 포함한 `char [6]` 배열이 됩니다.

### 멤버·포인터·배열

멤버는 `v['name']`, 포인터 역참조는 `.dereference()`, 배열 원소는 `arr[i]`입니다. 배열 크기는 `type.range()`가 `(하한, 상한)`으로 알려 주므로 원소 수를 짐작하지 않아도 됩니다.

```text
(gdb) python p = gdb.parse_and_eval("ptr"); print(p, p.dereference())
0xaaaaaaac00a0 <counter> 41
(gdb) python arr = gdb.parse_and_eval("my_array"); print(arr[0], [int(arr[i]) for i in range(arr.type.range()[1] + 1)])
10 [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
(gdb) python print(arr.type, arr.type.range())
int [10] (0, 9)
```

### Python 타입으로

`int()`·`float()`는 값을 Python 숫자로 바꿉니다. `Value.string()`은 C 문자열을 Python 문자열로 바꾸며, `length`를 주면 NUL을 찾지 않고 그 길이만 읽습니다.

```text
(gdb) python print(repr(v['name'].string()), repr(v['name'].string(length=6)))
'sensor-A' 'sensor'
(gdb) python print(float(v['ratio']), type(float(v['ratio'])))
0.25 <class 'float'>
```

구조체 안의 바이트 배열을 그대로 가져오려면 그 주소와 크기로 `Inferior.read_memory()`를 부릅니다. 반환값은 `memoryview`라서 `bytes()`로 감쌉니다.

```text
(gdb) python data = v['data']; buf = bytes(gdb.selected_inferior().read_memory(int(data.address), data.type.sizeof)); print(buf, data.type.sizeof)
b'\x01\x02\x03\x04\x05\x06\x07\x08' 8
```

### 산술

`gdb.Value`끼리의 연산은 GDB의 표현식 평가기가 디버기 타입 규칙으로 계산하고, 결과도 `gdb.Value`입니다.

```text
(gdb) python a = gdb.parse_and_eval("counter"); r = a + v['x']; print(r, r.type, type(r), a * 2)
44 int <class 'gdb.Value'> 82
```

`int + int`라서 결과 타입이 `int`입니다. Python 정수로 계속 계산하려면 `int(r)`로 바꿉니다.

### Cast

`gdb.lookup_type()`으로 타입을 찾고, `.pointer()`로 포인터 타입을 만든 뒤 `.cast()`로 바꿉니다.

```text
(gdb) python p = gdb.parse_and_eval("(void *)&my_struct"); t = gdb.lookup_type("MyStruct"); pp = p.cast(t.pointer()); print(pp.type, pp.dereference()['name'])
MyStruct * 0xaaaaaaaa17d8 "sensor-A"
```

### dynamic_cast (C++ vtable 기반)

매뉴얼은 `Value.dynamic_cast()`를 C++ `dynamic_cast` 연산자처럼 동작하는 `cast`라고 설명합니다. `main()`의 31행에 멈춰 `Base *base = &d;`를 확인했습니다. `Value.dynamic_type`은 vtable을 보고 실제 타입을 알려 줍니다.

```text
(gdb) python b = gdb.parse_and_eval("base"); print(b.type, "|", b.dynamic_type)
Base * | Derived *
(gdb) python d = b.dynamic_cast(gdb.lookup_type("Derived").pointer()); print(d, d.dereference()['extra'])
0xfffffffffa68 99
(gdb) python d2 = gdb.parse_and_eval("(Base *)0").dynamic_cast(gdb.lookup_type("Derived").pointer()); print(d2, int(d2) == 0)
0x0 True
```

포인터 캐스트가 실패하면 C++과 같이 `None`이 아니라 값이 0인 포인터 `gdb.Value`가 나옵니다. 그래서 `if derived is None`이 아니라 `int(derived) == 0`으로 검사합니다.

## gdb.Type

`gdb.Type`은 크기, 태그, 종류(`code`), 필드 목록을 줍니다. `Field.bitpos`는 비트 단위 오프셋입니다.

```text
(gdb) python t = gdb.lookup_type("MyStruct"); print(t.sizeof, t.tag, t.code == gdb.TYPE_CODE_STRUCT)
40 MyStruct True
(gdb) python
>for f in gdb.lookup_type("MyStruct").fields():
>    print(f.name, f.type, f.bitpos)
>end
x int 0
y int 32
inner Inner 64
name const char * 128
ratio double 192
data unsigned char [8] 256
```

`name`이 128비트(16바이트) 위치에 있는 것은 `inner` 뒤 4바이트를 8바이트 정렬로 채웠기 때문입니다. 크기 40바이트도 같은 패딩의 결과입니다.

### TYPE_CODE 카탈로그

GDB 16.3의 `gdb` 모듈에 있는 `TYPE_CODE_*` 상수를 그대로 찍었습니다.

```text
(gdb) python print([c for c in dir(gdb) if c.startswith("TYPE_CODE_")])
['TYPE_CODE_ARRAY', 'TYPE_CODE_BITSTRING', 'TYPE_CODE_BOOL', 'TYPE_CODE_CHAR', 'TYPE_CODE_COMPLEX', 'TYPE_CODE_DECFLOAT', 'TYPE_CODE_ENUM', 'TYPE_CODE_ERROR', 'TYPE_CODE_FIXED_POINT', 'TYPE_CODE_FLAGS', 'TYPE_CODE_FLT', 'TYPE_CODE_FUNC', 'TYPE_CODE_INT', 'TYPE_CODE_INTERNAL_FUNCTION', 'TYPE_CODE_MEMBERPTR', 'TYPE_CODE_METHOD', 'TYPE_CODE_METHODPTR', 'TYPE_CODE_MODULE', 'TYPE_CODE_NAMELIST', 'TYPE_CODE_NAMESPACE', 'TYPE_CODE_PTR', 'TYPE_CODE_RANGE', 'TYPE_CODE_REF', 'TYPE_CODE_RVALUE_REF', 'TYPE_CODE_SET', 'TYPE_CODE_STRING', 'TYPE_CODE_STRUCT', 'TYPE_CODE_TYPEDEF', 'TYPE_CODE_UNION', 'TYPE_CODE_VOID', 'TYPE_CODE_XMETHOD']
```

C/C++ 코드에서 자주 만나는 것은 `PTR`·`ARRAY`·`STRUCT`·`UNION`·`ENUM`·`TYPEDEF`·`FUNC`·`INT`·`FLT`·`BOOL`·`REF`(`T&`)·`RVALUE_REF`(`T&&`)·`VOID`입니다. 값의 종류에 따라 분기할 때 씁니다.

```python
if v.type.code == gdb.TYPE_CODE_PTR:
    target = v.dereference()
elif v.type.code == gdb.TYPE_CODE_STRUCT:
    for f in v.type.fields():
        print(f.name, v[f.name])
```

### typedef 풀기와 한정자

`strip_typedefs()`는 typedef를 끝까지 풀고, typedef 타입의 `target()`은 한 단계 아래 타입을 줍니다. arm64 Linux에서 `size_t`는 `unsigned long`입니다.

```text
(gdb) python t = gdb.lookup_type("size_t"); print(t, "|", t.strip_typedefs(), "|", t.target(), "|", t.code == gdb.TYPE_CODE_TYPEDEF)
size_t | unsigned long | unsigned long | True
(gdb) python print(gdb.lookup_type("int").const(), "|", gdb.lookup_type("int").const().unqualified())
const int | int
(gdb) python print(gdb.lookup_type("int").const().volatile(), "|", gdb.lookup_type("int").volatile().const())
volatile int | const int
```

마지막 줄이 의외였습니다. `const().volatile()`가 `const volatile int`가 아니라 `volatile int`를 줍니다. GDB 16.3 `gdb/python/py-type.c` 749행의 `typy_volatile`이 `make_cv_type (0, 1, type, NULL)`, 즉 const 플래그를 0으로 넘기기 때문입니다. 두 한정자를 모두 붙인 타입이 필요하면 `gdb.lookup_type("const volatile int")`처럼 이름으로 찾는 편이 확실합니다.

pretty-printer는 `strip_typedefs()`를 자주 씁니다. 같은 컨테이너를 가리키는 typedef 이름이 여러 개여도 한 패턴으로 처리할 수 있기 때문입니다.

### template parameter

`template_argument(n)`은 n번째 템플릿 인자를 줍니다. 처음에 `gdb.lookup_type("std::vector<int>")`로 찾으려 했더니 `No type named std::vector<int>.` 오류가 났습니다. DWARF에 기록된 이름은 기본 인자까지 펼친 `std::vector<int, std::allocator<int> >`이기 때문입니다. 값에서 타입을 얻으면 이름을 맞출 필요가 없습니다.

```text
(gdb) python t = gdb.parse_and_eval("vec").type.strip_typedefs(); print(t.template_argument(0), "|", t.template_argument(1))
int | std::allocator<int>
(gdb) python t = gdb.lookup_type("std::vector<int, std::allocator<int> >"); print(t.template_argument(0))
int
```

libstdc++의 `std::vector` printer도 `template_argument(0)`으로 원소 타입을 얻습니다. 이 내용은 [Ch 3](/blog/tools/debugging/gdb-extension/chapter03-pretty-printers)에서 다시 봅니다.

## gdb.Frame — 콜스택

`gdb.selected_frame()`이 현재 선택된 프레임입니다. C++ 함수의 `function()`(심볼)은 매개변수 목록까지 포함한 이름으로 찍힙니다.

```text
(gdb) python frame = gdb.selected_frame(); print(frame.name(), hex(frame.pc()), frame.function(), frame.find_sal().symtab.filename, frame.find_sal().line)
process 0xaaaaaaaa0d18 process(int, int, MyStruct const*) inv.cpp 22
```

### 위/아래 이동

`older()`는 호출자, `newer()`는 피호출자입니다. 가장 안쪽 프레임의 `newer()`는 `None`입니다.

```text
(gdb) python print(frame.older().name(), frame.newer())
main None
```

`gdb.newest_frame()`에서 시작해 `older()`가 `None`이 될 때까지 따라가면 `bt`와 같은 순회가 됩니다.

```python
def walk_stack():
    f = gdb.newest_frame()
    depth = 0
    while f is not None:
        print(f"#{depth}  {f.name() or '??'}")
        f = f.older()
        depth += 1
```

```text
(gdb) python walk_stack()
#0  process
#1  main
```

### 프레임 안의 변수

`Frame.read_var()`는 그 프레임 문맥에서 변수 하나를 읽습니다. `gdb.parse_and_eval()`도 선택된 프레임에서 평가하므로 같은 결과를 줍니다.

```text
(gdb) python print(frame.read_var("local_var"), frame.read_var("a"))
45 6
```

### 블록 순회

`Frame.block()`은 그 PC를 감싸는 가장 안쪽 블록이고, `superblock`을 따라 올라가면 함수 블록, 파일의 static 블록, global 블록 순으로 넓어집니다.

```python
def dump_block(frame):
    block = frame.block()
    while block:
        for sym in block:
            if sym.is_variable or sym.is_argument:
                try:
                    print(f"{sym.name} = {sym.value(frame)}")
                except gdb.error as e:
                    print(f"{sym.name} = <{e}>")
        block = block.superblock
```

```text
(gdb) python dump_block(gdb.selected_frame())
a = 6
b = 7
s = 0xaaaaaaac00e8 <my_struct>
local_var = 45
ptr = 0xaaaaaaac00a0 <counter>
g_config = 0xaaaaaaaa17e8 "release"
my_struct = {x = 3, y = 4, inner = {count = 7}, name = 0xaaaaaaaa17d8 "sensor-A", ratio = 0.25, data = "\001\002\003\004\005\006\a\b"}
g_buffer = "boot ok; hello from inv", '\000' <repeats 40 times>
counter = 41
my_array = {10, 11, 12, 13, 14, 15, 16, 17, 18, 19}
```

인자와 지역 변수 뒤에 파일 범위 전역이 이어집니다. `info args` + `info locals`에 전역까지 더한 Python 버전입니다.

## gdb.Inferior

`gdb.selected_inferior()`는 현재 프로세스입니다. 스레드 목록과 메모리 읽기·쓰기·검색이 여기 있습니다.

```text
(gdb) python inf = gdb.selected_inferior(); print(inf.num, inf.pid > 0, [(t.num, t.name, t.is_stopped()) for t in inf.threads()])
1 True [(1, 'inv', True)]
(gdb) python addr = int(gdb.parse_and_eval("(long)&g_buffer")); print(bytes(inf.read_memory(addr, 8)).hex(), bytes(inf.read_memory(addr, 8)))
626f6f74206f6b3b b'boot ok;'
(gdb) python inf.write_memory(addr, b'BOOT'); print(gdb.parse_and_eval("g_buffer").string())
BOOT ok; hello from inv
(gdb) python found = inf.search_memory(addr, 64, b'hello'); print(hex(found), found - addr)
0xaaaaaaac00b1 9
(gdb) python print(inf.search_memory(addr, 64, b'absent'))
None
```

`write_memory()`는 디버기 메모리를 실제로 바꿉니다. 위에서 `g_buffer`의 첫 4바이트가 `BOOT`로 바뀌었습니다. `search_memory()`는 못 찾으면 `None`을 돌려주므로 주소 0과 헷갈리지 않게 `is None`으로 검사합니다.

### 모든 인페리어

`gdb.inferiors()`는 GDB가 잡고 있는 프로세스 전부입니다. 이 프로그램은 fork를 하지 않아 하나뿐입니다.

```text
(gdb) python print([(i.num, i.pid > 0) for i in gdb.inferiors()])
[(1, True)]
```

GDB 16.3 매뉴얼의 Forks 절에 따르면 `set detach-on-fork off`이면 fork 뒤 부모와 자식이 모두 GDB 아래 남고(하나는 정지 상태), 이때 인페리어가 둘이 됩니다. 기본값은 `on`이라 한쪽이 떨어져 나갑니다.

## gdb.Symbol

`gdb.lookup_symbol()`은 `(심볼, 필드인가)` 튜플을 돌려줍니다. 매뉴얼에 따르면 `block`을 주지 않으면 현재 프레임의 블록에서 찾습니다.

```text
(gdb) python sym, is_field = gdb.lookup_symbol("main"); print(sym.name, sym.type, sym.is_function, is_field, sym.symtab.filename, sym.line)
main() int (void) True False inv.cpp 26
(gdb) python g = gdb.lookup_global_symbol("g_config"); print(g.name, g.type, g.value(), g.addr_class == gdb.SYMBOL_LOC_STATIC)
g_config const char * 0xaaaaaaaa17e8 "release" True
```

`process()`는 `static` 함수라서 `lookup_global_symbol()`로는 안 나오고 `lookup_static_symbol()`로 찾아야 합니다.

```text
(gdb) python s = gdb.lookup_global_symbol("process"); print(s)
None
(gdb) python s = gdb.lookup_static_symbol("process"); print(s.name, s.linkage_name, s.print_name, s.is_valid())
process(int, int, MyStruct const*) process(int, int, MyStruct const*) process(int, int, MyStruct const*) True
```

### 속성

| 속성 | 뜻 |
|------|-----|
| `name` | 이름 (C++ 함수는 매개변수 목록 포함) |
| `linkage_name` | 링커가 보는 이름 |
| `print_name` | 사용자에게 보여 줄 이름 |
| `type` | `gdb.Type` |
| `symtab`, `line` | 정의된 소스 파일과 줄 |
| `addr_class` | 값이 어디 있는지 (`gdb.SYMBOL_LOC_*`) |
| `is_argument`, `is_function`, `is_variable`, `is_constant` | 종류 |
| `is_valid()` | 심볼이 아직 유효한가 |

### addr_class

GDB 16.3에 있는 `SYMBOL_LOC_*` 상수입니다.

```text
(gdb) python print([c for c in dir(gdb) if c.startswith("SYMBOL_LOC_")])
['SYMBOL_LOC_ARG', 'SYMBOL_LOC_BLOCK', 'SYMBOL_LOC_COMMON_BLOCK', 'SYMBOL_LOC_COMPUTED', 'SYMBOL_LOC_CONST', 'SYMBOL_LOC_CONST_BYTES', 'SYMBOL_LOC_LABEL', 'SYMBOL_LOC_LOCAL', 'SYMBOL_LOC_OPTIMIZED_OUT', 'SYMBOL_LOC_REF_ARG', 'SYMBOL_LOC_REGISTER', 'SYMBOL_LOC_REGPARM_ADDR', 'SYMBOL_LOC_STATIC', 'SYMBOL_LOC_TYPEDEF', 'SYMBOL_LOC_UNDEF', 'SYMBOL_LOC_UNRESOLVED']
(gdb) python print([(s.name, s.addr_class) for s in gdb.selected_frame().block()], gdb.SYMBOL_LOC_COMPUTED)
[('a', 14), ('b', 14), ('s', 14), ('local_var', 14)] 14
```

GCC가 만든 DWARF에서는 인자와 지역 변수가 `SYMBOL_LOC_ARG`·`SYMBOL_LOC_LOCAL`이 아니라 모두 `SYMBOL_LOC_COMPUTED`(14)였습니다. 매뉴얼은 이 값을 "computed location", 즉 DWARF location expression으로 계산하는 위치라고 설명합니다.

`<optimized out>` 판정도 `addr_class`로 하면 안 됩니다. 같은 VM에서 `gcc -g -O2`로 빌드한 작은 함수의 변수를 찍어 보면, 최적화로 사라진 변수도 `addr_class`는 14이고 `Value.is_optimized_out`만 `True`입니다.

```text
n 14 False 21
doubled 14 True <optimized out>
unused 14 True <optimized out>
```

pretty-printer나 명령에서 읽지 못하는 변수를 걸러 내려면 `value.is_optimized_out`을 확인합니다.

## gdb.execute — 임의 명령

`gdb.execute(cmd, to_string=True)`는 명령 출력을 화면 대신 문자열로 돌려줍니다.

```text
(gdb) python out = gdb.execute("info threads", to_string=True); print(repr(out))
'  Id   Target Id                              Frame \n* 1    Thread 0xfffff7fee020 (LWP 2648) "inv" process (a=6, b=7, s=0xaaaaaaac00e8 <my_struct>) at inv.cpp:22\n'
```

받은 문자열은 Python으로 후처리합니다. 아래 함수는 `info breakpoints`에서 번호로 시작하는 줄만 고릅니다.

```python
def list_all_breakpoints():
    out = gdb.execute("info breakpoints", to_string=True)
    for line in out.splitlines():
        if line.strip().startswith(tuple("0123456789")):
            print(line)
```

```text
(gdb) python list_all_breakpoints()
1       breakpoint     keep y   0x0000aaaaaaaa0d18 in process(int, int, MyStruct const*) at inv.cpp:22
```

CLI 출력 형식은 GDB 버전에 따라 바뀔 수 있는 사람용 텍스트입니다. breakpoint 목록이 필요하면 `gdb.breakpoints()`가 객체 목록을 주므로 그쪽이 더 단단합니다.

## 단순 출력

`gdb.write()`는 GDB의 페이지 출력 스트림에 씁니다. 두 번째 인자로 `gdb.STDOUT`·`gdb.STDERR`·`gdb.STDLOG`를 고릅니다.

```text
(gdb) python gdb.write("hello\n"); gdb.write("error\n", gdb.STDERR); gdb.flush()
hello
error
```

`print()`를 써도 같은 곳으로 갑니다. 매뉴얼 Basic Python 절에 따르면 GDB는 시작할 때 Python의 `sys.stdout`·`sys.stderr`를 GDB의 페이지 출력 스트림으로 바꿔 두고, 거기에 쓰면 `gdb.write()`가 불립니다. 둘의 차이는 스트림을 직접 고를 수 있는가입니다.

## Exception

GDB 오류는 Python 예외로 바뀝니다. 매뉴얼 Exception Handling 절에 따르면 대부분은 `gdb.error`(`RuntimeError`의 하위 클래스)이고, 디버기의 잘못된 메모리에 접근하면 그 하위 클래스인 `gdb.MemoryError`가 납니다.

```text
(gdb) python
>try:
>    v = gdb.parse_and_eval("nonexistent_var")
>except gdb.error as e:
>    gdb.write(f"error: {e}\n")
>end
error: No symbol "nonexistent_var" in current context.
```

### 실패를 구분해 반환

```python
def safe_eval(expr):
    try:
        return gdb.parse_and_eval(expr)
    except gdb.error:
        return None
```

```text
(gdb) python print(safe_eval("nonexistent_var"), safe_eval("counter"))
None 41
```

`gdb.error`만 잡으므로 Python 쪽 버그(`TypeError` 등)는 그대로 올라옵니다. 명령이나 convenience function 안에서 사용자에게 traceback 없이 오류 문구만 보여 주고 싶으면 `gdb.GdbError`를 던집니다. 매뉴얼은 이 예외를 GDB가 직접 던지지 않고 사용자 코드에서 던질 때만 알아본다고 적습니다.

## 디버깅 — print-stack

매뉴얼에 따르면 `set python print-stack`의 기본값은 `message`라서 예외의 문구만 찍힙니다. `snippets.py`에 없는 멤버를 읽는 함수를 일부러 넣어 두고, 같은 오류를 기본값과 `full`에서 비교했습니다.

```python title="snippets.py (발췌)"
def my_buggy_code():
    v = gdb.parse_and_eval("my_struct")
    x = v['nonexistent']
```

```text
(gdb) python my_buggy_code()
Python Exception <class 'gdb.error'>: There is no member named nonexistent.
Error occurred in Python: There is no member named nonexistent.
(gdb) set python print-stack full
(gdb) python my_buggy_code()
Traceback (most recent call last):
  File "<string>", line 1, in <module>
  File "/root/ext/snippets.py", line 36, in my_buggy_code
    x = v['nonexistent']
        ~^^^^^^^^^^^^^^^
gdb.error: There is no member named nonexistent.
Error occurred in Python: There is no member named nonexistent.
```

`full`이면 스크립트 파일과 줄 번호까지 나옵니다. 스크립트를 만들 때는 `full`로 두는 편이 빠릅니다.

## 한 예 — 짧은 진단 명령

지금까지의 객체를 묶어 `whereami` 명령을 만들었습니다. 선택된 스레드·프레임·소스 위치·함수 인자를 한 번에 찍습니다. 함수 블록(`block.function`이 있는 블록)에서 멈추므로 전역은 찍지 않습니다.

```python title="whereami.py"
import gdb

class WhereAmI(gdb.Command):
    """정지한 프레임의 위치와 인자를 출력한다."""
    def __init__(self):
        super().__init__("whereami", gdb.COMMAND_USER)

    def invoke(self, arg, from_tty):
        self.dont_repeat()
        thread = gdb.selected_thread()
        if thread is None or not thread.is_stopped():
            raise gdb.GdbError("select a stopped thread")
        frame = gdb.selected_frame()
        sal = frame.find_sal()
        filename = sal.symtab.filename if sal.symtab else "??"
        gdb.write(f"thread {thread.num}, PC={frame.pc():#x}\n")
        gdb.write(f"function: {frame.name() or '??'}\nlocation: {filename}:{sal.line}\n")
        block = frame.block()
        while block is not None:
            for symbol in block:
                if symbol.is_argument:
                    gdb.write(f"  {symbol.name} = {symbol.value(frame)}\n")
            if block.function is not None:
                break
            block = block.superblock

WhereAmI()
```

```text
(gdb) source /root/ext/whereami.py
(gdb) whereami
thread 1, PC=0xaaaaaaaa0d18
function: process
location: inv.cpp:22
  a = 6
  b = 7
  s = 0xaaaaaaac00e8 <my_struct>
(gdb) up
#1  0x0000aaaaaaaa0dbc in main () at inv.cpp:30
30	    int r = process(6, 7, &my_struct);
(gdb) whereami
thread 1, PC=0xaaaaaaaa0dbc
function: main
location: inv.cpp:30
```

`up` 뒤에는 `main()`의 호출 지점(30행)이 나오고, `main()`은 인자가 없어서 인자 줄이 없습니다. `gdb.selected_frame()`이 `up`/`down`을 따라간다는 것을 확인할 수 있습니다.

## 메모리 검색 — 한 예

`Inferior.search_memory()`를 명령으로 감쌌습니다. 시작 주소와 길이를 표현식으로 받으므로 `&g_buffer`·`sizeof(g_buffer)`를 그대로 쓸 수 있습니다.

```python title="findstr.py"
import gdb

class FindStr(gdb.Command):
    """findstr START LENGTH TEXT: [START, START+LENGTH)에서 TEXT의 첫 위치."""
    def __init__(self):
        super().__init__("findstr", gdb.COMMAND_DATA)

    def invoke(self, arg, from_tty):
        self.dont_repeat()
        argv = gdb.string_to_argv(arg)
        if len(argv) != 3:
            raise gdb.GdbError('usage: findstr START LENGTH "TEXT"')
        start = int(gdb.parse_and_eval(argv[0]))
        size = int(gdb.parse_and_eval(argv[1]))
        pattern = argv[2].encode("utf-8")
        found = gdb.selected_inferior().search_memory(start, size, pattern)
        gdb.write("not found\n" if found is None else f"found at {found:#x}\n")

FindStr()
```

```text
(gdb) source /root/ext/findstr.py
(gdb) findstr &g_buffer sizeof(g_buffer) "hello"
found at 0xaaaaaaac00b1
(gdb) findstr &g_buffer sizeof(g_buffer) "absent"
not found
(gdb) findstr &g_buffer 4
usage: findstr START LENGTH "TEXT"
```

찾은 주소 `0xaaaaaaac00b1`은 앞 절의 `search_memory()` 결과와 같습니다. 인자가 틀리면 `gdb.GdbError`의 문구만 나오고 traceback은 나오지 않습니다. 검색 범위는 사용자가 정하므로, 메모리 맵 I/O처럼 읽기만 해도 부작용이 있는 영역은 범위에 넣지 않습니다.

## 정리

- GDB 내장 Python으로 디버기 데이터에 접근합니다. Debian 13의 GDB 16.3은 Python 3.13.5를 내장하고 시스템 패키지 경로를 이미 `sys.path`에 둡니다.
- 핵심 객체는 Value, Type, Frame, Block, Symbol, Inferior입니다.
- `gdb.parse_and_eval(expr)`은 `print`가 받는 표현식을 그대로 받아 `gdb.Value`를 돌려줍니다.
- `dynamic_cast` 실패는 `None`이 아니라 0 포인터, `search_memory` 실패는 `None`입니다.
- GCC DWARF에서 지역 변수는 `SYMBOL_LOC_COMPUTED`이고, 최적화로 사라졌는지는 `Value.is_optimized_out`으로 봅니다.
- `gdb.execute(..., to_string=True)`로 명령 출력을 캡처합니다.
- `set python print-stack full`이면 스크립트 줄 번호까지 담긴 traceback이 나옵니다.

## 다음 장 예고

[Ch 2](/blog/tools/debugging/gdb-extension/chapter02-commands-events) — 커스텀 명령, Parameter, Convenience function, Event hook, Breakpoint subclass.

## 관련 항목

- [Ch 2: 커스텀 명령과 이벤트](/blog/tools/debugging/gdb-extension/chapter02-commands-events)
- [GDB Python API 공식 문서](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Python-API.html)
- [Ch 6: 프런트엔드](/blog/tools/debugging/gdb-extension/chapter06-frontends)
- [GDB and LLDB Ch 9: Python 스크립팅](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting) — 이 장의 앞 단계

## 검증 기준

모든 세션은 Debian 13 arm64 VM의 GDB 16.3(Debian 16.3-1, 내장 Python 3.13.5)과 GCC 14.2.0으로 `inv.cpp`·`opt.c`를 빌드해 돌렸습니다. API 설명은 GDB 16.3 소스 tarball의 `gdb/doc/python.texi`(Basic Python, Exception Handling, Values From Inferior, Types In Python, Frames In Python, Symbols In Python 절)와 `gdb/python/py-type.c`로 대조했습니다.
