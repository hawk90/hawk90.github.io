---
title: "Ch 1: GDB Python API 입문 — Value / Type / Frame"
date: 2025-09-03T01:00:00
description: "GDB Python 인터프리터, 핵심 객체(Value/Type/Frame/Symbol), 디버기 데이터 조작."
tags: [gdb, python, api]
series: "GDB Extension and IDE"
seriesOrder: 1
draft: false
---

GDB는 거의 모든 동작을 사용자 명령으로 제어할 수 있는 *완전한 디버거 SDK*입니다. 그 SDK의 핵심이 *내장 Python 인터프리터*. `print` 한 줄 매크로부터 STL pretty-printer, JIT 디버깅 지원, 자동화된 메모리 분석까지 — 모두 이 API 위에서 일어납니다.

이 시리즈는 *GDB의 진짜 천장*인 Python·MI·DAP·프런트엔드를 다룹니다. 첫 장은 Python API의 기본 — Value, Type, Frame, Symbol 같은 핵심 객체로 *디버기 안의 데이터*를 조작하는 법.

## 한 줄 요약

GDB가 내장한 Python 인터프리터로 디버기의 메모리·타입·콜스택을 *Python 객체*로 다룸. 거의 모든 자동화의 출발점.

## 활성화 확인

```text
(gdb) python print("hello")
hello

(gdb) python import sys; print(sys.version)
3.11.5 (main, ...)
```

GDB 빌드 시 `--with-python` 옵션이 켜져 있어야 합니다. 모든 배포판의 기본 패키지가 켭니다. 안 켜진 GDB면 `python` 명령이 에러.

내장 Python의 버전은 GDB 빌드 시점에 결정. *외부 시스템 Python*의 venv·third-party 패키지는 별도 설정 필요.

```python
(gdb) python
>>> import sys
>>> sys.path.insert(0, '/home/me/venv/lib/python3.11/site-packages')
>>> import numpy   # 이제 외부 패키지 사용 가능
>>> end
```

## 실행 방법

```text
(gdb) python print(1 + 2)       # 한 줄
3

(gdb) python                     # 여러 줄
>import os
>print(os.getpid())
>end
12345

(gdb) source my_script.py        # 외부 파일
```

`.gdbinit`에 자동 로드:

```
python
import sys
sys.path.insert(0, '/home/me/gdb-helpers')
import myhelpers
myhelpers.register_all()
end
```

## 핵심 객체 한 표

| 객체 | 역할 |
|------|------|
| `gdb.Value` | 디버기의 *값* (int/string/struct/포인터) |
| `gdb.Type` | 타입 정보 (size, fields, target) |
| `gdb.Frame` | 콜스택의 한 프레임 |
| `gdb.Symbol` | 변수·함수 심볼 |
| `gdb.Block` | 스코프 블록 |
| `gdb.Inferior` | 프로세스 |
| `gdb.Thread` | 스레드 |
| `gdb.Breakpoint` | 브레이크포인트 |
| `gdb.Objfile` | 로드된 ELF/공유라이브러리 |
| `gdb.Architecture` | 아키텍처 (x86-64, ARM, ...) |
| `gdb.Progspace` | 프로그램 공간 |

## gdb.Value — 디버기의 값

가장 자주 다루는 객체. 디버기 메모리의 한 영역을 *Python에서 다룰 수 있게 래핑한 핸들*.

### 만들기

```python
import gdb

# 표현식 평가
v = gdb.parse_and_eval("my_var")
v2 = gdb.parse_and_eval("counter + 1")
v3 = gdb.parse_and_eval("(int *)0x600000")

# 직접 생성
n = gdb.Value(42)
s = gdb.Value("hello")
```

`gdb.parse_and_eval("expr")`이 핵심. GDB의 `print` 명령이 받는 *어떤 표현식*이든 받음 — C 문법 + GDB 확장 (`$rax`, `$_thread`, `*((char *)0x1000)@10` 등).

### 멤버 접근

```python
v = gdb.parse_and_eval("my_struct")

# 멤버
x = v['x']                    # struct.x
y = v['y']                    # struct.y

# 중첩
nested = v['inner']['count']

# 포인터 deref
p = gdb.parse_and_eval("ptr")
target = p.dereference()      # *ptr

# 배열 인덱스
arr = gdb.parse_and_eval("my_array")
first = arr[0]                # my_array[0]
slice = arr[0:10]             # 10개
```

### Python 타입으로

```python
# 정수
n = int(v)
n = int(v['count'])

# 문자열 (C string)
s = v['name'].string()        # NUL까지
s = v.string(encoding='utf-8', length=20)

# 부동 소수
f = float(v['ratio'])

# byte buffer
buf = bytes(v['data'])
```

`string()`은 *C 스타일 문자열* (NUL terminated 또는 길이 지정). `bytes()`는 *raw 메모리*.

### 산술

```python
v = gdb.parse_and_eval("a")
w = gdb.parse_and_eval("b")

result = v + w               # 디버기 안에서 평가 안 됨, Python 측 산술
result = v * 2

# 디버기 안에서 평가
result = gdb.parse_and_eval(f"({v}) + ({w})")
```

`gdb.Value` 끼리의 산술은 *Python 측*에서 일어남. 디버기 측 함수 호출은 `gdb.parse_and_eval` 안에서.

### Cast

```python
p = gdb.parse_and_eval("(void *)0x600000")
t = gdb.lookup_type("MyStruct")
pp = p.cast(t.pointer())          # (MyStruct *)0x600000
val = pp.dereference()
print(val['field'])
```

`gdb.lookup_type("name")`이 타입을 찾고, `t.pointer()`로 포인터 타입, `.cast(t)`로 변환.

### dynamic_cast (C++ vtable 기반)

```python
base_ptr = gdb.parse_and_eval("base")
derived_t = gdb.lookup_type("Derived").pointer()
derived = base_ptr.dynamic_cast(derived_t)  # 또는 None
```

`set print object on` 효과의 프로그램적 버전.

## gdb.Type

```python
t = gdb.lookup_type("MyStruct")
print(t.sizeof)               # 바이트 크기
print(t.tag)                  # 태그 이름
print(t.code)                 # gdb.TYPE_CODE_STRUCT 등

# 필드 순회
for f in t.fields():
    print(f.name, f.type, f.bitpos)
```

### TYPE_CODE 카탈로그

```python
gdb.TYPE_CODE_PTR        # 포인터
gdb.TYPE_CODE_ARRAY      # 배열
gdb.TYPE_CODE_STRUCT     # struct
gdb.TYPE_CODE_UNION
gdb.TYPE_CODE_ENUM
gdb.TYPE_CODE_TYPEDEF
gdb.TYPE_CODE_FUNC
gdb.TYPE_CODE_INT
gdb.TYPE_CODE_FLT
gdb.TYPE_CODE_BOOL
gdb.TYPE_CODE_REF        # T&
gdb.TYPE_CODE_VOID
```

타입 검사:

```python
if v.type.code == gdb.TYPE_CODE_PTR:
    target = v.dereference()
elif v.type.code == gdb.TYPE_CODE_STRUCT:
    for f in v.type.fields():
        print(f.name, v[f.name])
```

### typedef 풀기

```python
t = gdb.lookup_type("size_t")
print(t)                     # "size_t"
print(t.strip_typedefs())    # "unsigned long"
print(t.unqualified())       # const/volatile 제거
print(t.target())            # 포인터/typedef의 base
```

`pretty-printer`에서 자주 — 같은 컨테이너의 다양한 typedef 변형을 *한 패턴*으로 처리.

### template parameter

```python
t = gdb.lookup_type("std::vector<int>")
for i in range(t.target_type.fields().__len__()):
    pass

# 또는 template 인자 직접
print(t.template_argument(0))   # 첫 template 인자 (예: int)
```

`std::vector<int>` → `template_argument(0)` = `int` 타입. STL pretty-printer가 이걸로 *원소 타입*을 알아냄.

## gdb.Frame — 콜스택

```python
frame = gdb.selected_frame()         # 현재 프레임
print(frame.name())                   # 함수 이름 또는 None
print(frame.pc())                     # PC
print(frame.function())               # gdb.Symbol
print(frame.find_sal())               # gdb.Symtab_and_line (file/line)
```

### 위/아래 이동

```python
older = frame.older()                 # 호출자
newer = frame.newer()                 # 피호출자
```

순회.

```python
f = gdb.newest_frame()
depth = 0
while f is not None:
    print(f"#{depth}  {f.name() or '??'}")
    f = f.older()
    depth += 1
```

### 프레임 안의 변수

```python
frame = gdb.selected_frame()
var = frame.read_var("local_var")     # 변수 read
print(var)
```

또는 `gdb.parse_and_eval`이 *현재 프레임 컨텍스트*에서 평가.

### 블록 순회

```python
block = frame.block()
while block:
    for sym in block:
        if sym.is_variable or sym.is_argument:
            try:
                value = sym.value(frame)
                print(f"{sym.name} = {value}")
            except gdb.error:
                pass            # optimized out
    block = block.superblock
```

스코프 nested 전부 — 함수 인자, 지역 변수, 정적, 전역. `info locals`/`info args`의 Python 버전.

## gdb.Inferior

```python
inferior = gdb.selected_inferior()
print(inferior.pid)
print(inferior.num)              # GDB의 인페리어 번호

# 모든 스레드
for thread in inferior.threads():
    print(thread.num, thread.name, thread.is_stopped())

# 메모리 read / write
buf = inferior.read_memory(0x600000, 100)
print(bytes(buf).hex())

inferior.write_memory(0x600000, b'\x01\x02\x03')

# 메모리 검색
found = inferior.search_memory(0x400000, 0x100000, b'hello')
if found:
    print(f"found at {found:#x}")
```

`read_memory`/`write_memory`가 *디버기 메모리에 직접 접근*. pretty-printer 같은 곳에서 *struct 안의 raw 데이터*를 빠르게 가져올 때.

### 모든 인페리어

```python
for inf in gdb.inferiors():
    print(inf.num, inf.pid)
```

`set follow-fork-mode child` + `detach-on-fork off`로 fork된 자식까지 추적할 때 여러 인페리어가 있음.

## gdb.Symbol

```python
# 이름으로 lookup
sym, is_field = gdb.lookup_symbol("main")
print(sym.name, sym.type, sym.value())

# 전역 심볼
sym = gdb.lookup_global_symbol("g_config")
```

### 속성

```python
sym.name             # 이름
sym.linkage_name     # C++ mangled name
sym.print_name       # 사용자 표시용 (demangled)
sym.type             # gdb.Type
sym.symtab           # 정의된 소스 파일
sym.line             # 정의 줄
sym.addr_class       # gdb.SYMBOL_LOC_REGISTER, ...

sym.is_argument
sym.is_function
sym.is_variable
sym.is_constant
sym.is_valid()
```

### addr_class

```python
gdb.SYMBOL_LOC_STATIC      # 정적 (전역, .data/.bss)
gdb.SYMBOL_LOC_REGISTER    # 레지스터
gdb.SYMBOL_LOC_ARG         # 함수 인자
gdb.SYMBOL_LOC_REF_ARG     # reference 인자
gdb.SYMBOL_LOC_LOCAL       # 지역 변수
gdb.SYMBOL_LOC_TYPEDEF
gdb.SYMBOL_LOC_BLOCK       # 함수
gdb.SYMBOL_LOC_CONST       # 상수
gdb.SYMBOL_LOC_OPTIMIZED_OUT
gdb.SYMBOL_LOC_COMPUTED    # 위치가 DWARF expression
```

`SYMBOL_LOC_OPTIMIZED_OUT`이면 `<optimized out>`. pretty-printer에서 *변수를 못 읽는 상황*을 우아하게 처리.

## gdb.execute — 임의 명령

```python
output = gdb.execute("info threads", to_string=True)
print(output)

gdb.execute("break main")
gdb.execute("continue")
```

`to_string=True`로 *출력을 캡처*. 출력 분석이 필요한 자동화에 핵심.

### 묶어 보기

```python
def list_all_breakpoints():
    out = gdb.execute("info breakpoints", to_string=True)
    for line in out.splitlines():
        if line.strip().startswith(tuple("0123456789")):
            print(line)
```

GDB 명령 출력을 Python에서 후처리.

## 단순 출력

```python
gdb.write("hello\n")                   # stdout
gdb.write("error\n", gdb.STDERR)
gdb.flush()
```

`print()`도 동작하지만 `gdb.write`가 *GDB 출력 시스템*과 매끄러움 (TUI 모드 등).

## Exception

```python
try:
    v = gdb.parse_and_eval("nonexistent_var")
except gdb.error as e:
    gdb.write(f"error: {e}\n")
```

`gdb.error`가 모든 GDB API 오류의 base.

### 무한 정지 방지

```python
def safe_eval(expr):
    try:
        return gdb.parse_and_eval(expr)
    except gdb.error:
        return None
```

pretty-printer에서 *없는 멤버 접근*이 흔하므로 wrapper로 보호.

## 디버깅 — print-stack

```text
(gdb) set python print-stack full
```

이후 Python 예외의 *전체 traceback*이 콘솔에 출력. 자체 스크립트 디버깅에 필수.

```text
(gdb) python my_buggy_code()
Traceback (most recent call last):
  File "<string>", line 1, in <module>
  File "/path/to/script.py", line 42, in my_buggy_code
    x = v['nonexistent']
gdb.error: There is no member named nonexistent.
```

## 한 예 — 짧은 진단 명령

```python
import gdb

class WhereAmI(gdb.Command):
    """현재 위치 종합 정보."""

    def __init__(self):
        super().__init__("whereami", gdb.COMMAND_USER)

    def invoke(self, arg, from_tty):
        try:
            frame = gdb.selected_frame()
        except gdb.error:
            gdb.write("no frame (process not running?)\n")
            return

        pc = int(frame.pc())
        name = frame.name() or '??'
        sal = frame.find_sal()
        file = sal.symtab.filename if sal.symtab else '??'
        line = sal.line

        thread = gdb.selected_thread()
        tid = thread.num

        gdb.write(f"thread {tid}, PC = {pc:#x}\n")
        gdb.write(f"function: {name}\n")
        gdb.write(f"location: {file}:{line}\n")

        # 인자
        block = frame.block()
        gdb.write("args:\n")
        for sym in block:
            if sym.is_argument:
                try:
                    val = sym.value(frame)
                    gdb.write(f"  {sym.name} = {val}\n")
                except gdb.error:
                    gdb.write(f"  {sym.name} = <optimized out>\n")

WhereAmI()
```

`(gdb) source whereami.py` → `(gdb) whereami` → 한 화면에 모든 정보. 일상 디버깅에 매우 유용.

## 메모리 검색 — 한 예

```python
import gdb

class FindStr(gdb.Command):
    """프로세스 메모리에서 문자열 검색."""

    def __init__(self):
        super().__init__("findstr", gdb.COMMAND_USER)

    def invoke(self, arg, from_tty):
        inf = gdb.selected_inferior()
        pattern = arg.encode()
        # vmap에서 모든 R/W 영역 (info proc mappings 필요)
        mappings = gdb.execute("info proc mappings", to_string=True)
        for line in mappings.splitlines():
            parts = line.split()
            if len(parts) < 5: continue
            try:
                start = int(parts[0], 16)
                end = int(parts[1], 16)
            except ValueError:
                continue
            size = end - start
            if size > 100*1024*1024: continue   # skip huge
            try:
                found = inf.search_memory(start, size, pattern)
                if found:
                    gdb.write(f"found at {found:#x}\n")
            except gdb.error:
                pass

FindStr()
```

```text
(gdb) findstr password
found at 0x7ffff7d2c8a0
found at 0x55555556a280
```

## 정리

- GDB 내장 Python으로 디버기 데이터에 접근.
- 핵심 객체: Value, Type, Frame, Symbol, Inferior, Thread.
- `gdb.parse_and_eval(expr)`이 만능 진입점.
- `gdb.execute(..., to_string=True)`로 명령 출력 캡처.
- `inferior.read_memory/write_memory/search_memory`로 raw 메모리.
- 예외는 `gdb.error`. `set python print-stack full`로 디버깅.
- 짧은 명령 한 두 개로도 일상 디버깅 효율이 크게 늘어남.

## 다음 장 예고

Ch 2 — 커스텀 명령, Convenience function, Event hook, Breakpoint subclass.

## 관련 항목

- [Ch 2: 커스텀 명령과 이벤트](/blog/tools/debugging/gdb-extension/chapter02-commands-events)
- [GDB Python API 공식 문서](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Python-API.html)
- [Ch 6: 프런트엔드](/blog/tools/debugging/gdb-extension/chapter06-frontends)
- `set python print-stack full` — 스크립트 디버깅
