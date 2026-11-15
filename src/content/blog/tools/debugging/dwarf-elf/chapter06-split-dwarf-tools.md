---
title: "DWARF 도구 생태계 — split-DWARF·dwz·debuginfod·pyelftools"
slug: "tools/debugging/dwarf-elf/chapter06-split-dwarf-tools"
date: 2026-05-23T09:06:00
description: "큰 디버그 정보 다루기. 분리·압축·네트워크 다운로드·자체 도구 작성."
tags: [dwarf, split-dwarf, dwz, debuginfod, pyelftools, tools]
series: "DWARF and ELF Internals"
seriesOrder: 6
draft: false
topics: ["tools", "tools/debugging"]
---

DWARF는 *큽니다*. 큰 코드베이스에서는 디버그 정보가 코드보다 커질 수 있지만, 배율은 빌드·최적화·분리·압축 조건을 함께 측정해야 합니다. 빌드 시간·메모리·디스크가 모두 영향을 받습니다.

이 시리즈의 마지막 장은 *큰 DWARF를 다루는 도구·기법*을 모았습니다. split-DWARF로 *.dwo 파일 분리, dwz로 중복 제거, 별도 debuginfo + build-id 매칭, 네트워크 자동 다운로드(`debuginfod`), 그리고 pyelftools로 자체 분석 도구 작성까지.

:::tldr
DWARF의 크기 문제는 *분리·중복 제거·인덱싱*으로 풉니다. pyelftools가 자체 도구 작성의 표준.
:::

## 크기 측정

파일 크기와 논리적 섹션 크기를 구분합니다. readelf -SW는 파일 offset·SHF_COMPRESSED를 확인하는 출발점이고, objcopy로 분리한 debug 파일은 별도로 측정합니다. 압축 해제된 섹션 크기의 합과 압축된 파일 크기를 조건 없이 비교하지 않습니다.

```bash
ls -l my_prog my_prog.debug
llvm-readelf -SW my_prog
```

이 장의 직접 확인은 아래 작은 ELF 오브젝트를 같은 옵션으로 생성해 비교합니다. 특정 배포판 clang 바이너리의 수치를 임의로 실측 결과처럼 제시하지 않습니다.


## Split-DWARF — .dwo 파일 분리

해법: DWARF를 *.o 파일 안*이 아닌 *별도 .dwo 파일*에 두기. 링크 시 본 ELF엔 *skeleton만* 남고, 디버거가 필요할 때 *.dwo*를 읽기.

![Split-DWARF + .dwp 패키지 흐름](/images/blog/tools/diagrams/split-dwarf-flow.svg)

### 빌드

```bash
$ clang++ -g -gsplit-dwarf -c foo.cpp     # foo.o + foo.dwo 생성
$ clang++ -g -gsplit-dwarf foo.o -o prog  # prog 안엔 skeleton
                                          # foo.dwo가 같은 경로에 남아 있음
```

GCC도 같은 옵션 `-gsplit-dwarf`. `-c`로 컴파일할 때 `.dwo`가 분리되고, 링크 단계에선 *건드리지 않음*.

### Skeleton CU

ELF 안에 남는 건 *DW_TAG_skeleton_unit* (DWARF 5).

**ELF .debug_info:**

- DW_TAG_skeleton_unit
- ├─ DW_AT_dwo_name = "foo.dwo"
- ├─ DW_AT_addr_base = ref(.debug_addr)
- ├─ DW_AT_str_offsets_base = ref(.debug_str_offsets)
- ├─ DW_AT_loclists_base = ref(.debug_loclists)
- ├─ DW_AT_rnglists_base = ref(.debug_rnglists)
- └─ (no children — 본체는 dwo에)

본 DIE 트리는 `.dwo`의 `.debug_info.dwo` 섹션에 있습니다. ELF엔 *어디서 찾는지의 포인터*만.

### 효과와 배포 경계

디버그 본체를 일반 링크 입력에서 분리하면 링크 작업의 비용이 줄 수 있습니다. 실제 시간·메모리 감소율과 분산 빌드의 산출물 전송은 사용하는 도구에서 측정합니다. .dwo를 누락하거나 경로·DWO ID가 맞지 않으면 디버깅이 제한되므로 디버깅에 변화가 없다고 보장하지 않습니다.

### .dwp 패키지

`.dwo`가 *수천 개*면 관리가 어려움. `dwp` 도구가 한 *.dwp 패키지*로 묶습니다.

```bash
$ llvm-dwp -o myapp.dwp *.dwo
$ ls myapp myapp.dwp
```

소비자가 패키지 인덱스를 지원하고 적절한 검색 위치에서 대응 DWO ID를 찾을 수 있어야 합니다. 파일을 임의의 이름·위치에 두기만 하면 모두 자동 연결된다고 가정하지 않습니다. 실제 GDB의 .dwp 검색은 대상 버전에서 확인합니다.

### 디버거 검색 경로

```text
(gdb) show debug-file-directory
(gdb) set debug-file-directory /opt/dwo:/opt/symbols
```

DEBUGINFOD_URLS는 서비스가 제공하는 debug artifact 검색 설정이며 로컬 .dwo 경로 탐색의 일반 대체 설정은 아닙니다.

## dwz — 중복 제거

[dwz](https://sourceware.org/dwz/)가 DIE 트리에서 *중복 부분 트리*를 찾아 *한 번만 저장*하고 나머지는 *참조*로.

대표 예: `std::vector<int>`의 instantiation이 수십 CU에서 *완전히 동일*. dwz가 *partial CU* (DW_TAG_partial_unit)로 *공유 정의*를 만들고 각 CU가 *import* (DW_TAG_imported_unit).

```bash
# 단일 파일
$ dwz my_prog
$ size -A my_prog | grep debug | awk '{sum+=$2} END {print sum}'
# 전후 크기는 동일 산출물에서 측정

# 여러 바이너리 공유 (libfoo.so + libbar.so가 공통 DIE를 가질 때)
$ dwz -m common.debug a.so b.so c.so
# common.debug에 공유 DIE, a.so/b.so/c.so는 그걸 참조
```

배포판·패키지 빌드 정책에 따라 dwz가 사용될 수 있습니다. dwz의 중복 제거와 ELF 압축 플래그는 다른 기능이므로 적용 여부를 해당 패키지에서 각각 확인합니다.

## -gline-tables-only — 줄 정보만

`bt`의 줄 번호만 필요하고 `print var`은 안 쓸 거라면 *line table만* 보존.

```bash
$ clang++ -gline-tables-only -O2 ...
```

줄 조회에 필요한 최소 debug_info·인라인 정보도 남을 수 있습니다. 크기 감소량과 주소 조회 범위는 실제 산출물로 비교합니다.

지역 변수 조회가 필요한지와 산출물 비용을 비교해 선택합니다. 모든 운영 빌드의 표준 설정으로 강제하지 않습니다.

## 별도 debuginfo + build-id

배포 시 stripped 바이너리 + 별도 debuginfo 파일.

```bash
$ objcopy --only-keep-debug a.out a.debug
$ strip --strip-debug a.out
$ objcopy --add-gnu-debuglink=a.debug a.out
```

GDB가 `a.out`을 열 때 `a.debug`를 같이 찾습니다. 또는 *build-id*로 자동 매칭.

```bash
$ readelf -n a.out | grep "Build ID"
    Build ID: 8d3a91f0e5a3...

$ ls /usr/lib/debug/.build-id/8d/3a91f0e5a3....debug
```

배포판은 `/usr/lib/debug/.build-id/<XX>/<YY...>.debug` 디렉터리에 별도 패키지(`libfoo-debug`)로 debuginfo.

GDB 설정.

```text
(gdb) set debug-file-directory /usr/lib/debug
(gdb) set debug-file-directory /opt/my-symbols:/usr/lib/debug
```

여러 경로를 콜론으로 구분.

### --build-id

```bash
$ ld --build-id=sha1 ...   # SHA-1 (기본)
$ ld --build-id=md5 ...
$ ld --build-id=uuid ...
$ ld --build-id=0xdeadbeef  # 명시 값
```

build-id의 기본 활성화는 드라이버·링커·배포 설정에 따릅니다. CMake를 쓴다는 이유만으로 항상 생긴다고 가정하지 않고 최종 ELF의 note를 확인합니다.

## debuginfod — 네트워크 자동 다운로드

build-id로 *네트워크에서* debuginfo를 가져오는 표준 서비스.

```bash
$ export DEBUGINFOD_URLS="https://debuginfod.fedoraproject.org/ https://debuginfod.elfutils.org/"

# core dump 분석 — 자동 다운로드
$ gdb /usr/bin/foo /var/crash/core.foo.123
[자동으로 https://debuginfod.fedoraproject.org/buildid/<id>/debuginfo 다운로드]

# 명시적으로
$ debuginfod-find debuginfo /usr/bin/foo
$ debuginfod-find source /usr/bin/foo /usr/src/...
$ debuginfod-find executable BUILDID
```

debuginfod는 build-id에 대응하는 실행 파일·debug 정보·소스 등의 artifact를 HTTP로 제공합니다. 일부 section 조회 등 확장은 클라이언트·서버 버전에 따라 다르며 모든 GDB 조회가 필요한 바이트만 지연 다운로드한다고 보장하지 않습니다.

### 캐시

```bash
$ ls ~/.cache/debuginfod_client/
$ du -sh ~/.cache/debuginfod_client/
```

클라이언트는 받은 artifact를 캐싱하며 정리 정책은 설치 버전의 debuginfod-client 문서를 확인합니다. 고정된 1 GB 상한을 공통 기본값으로 가정하지 않습니다.

### 자체 서버

```bash
# 사내 debuginfod 서버
$ debuginfod -F -d /var/cache/debuginfod/index.sqlite /opt/builds
[/opt/builds 안의 모든 ELF 인덱스, build-id로 검색 가능]

# 클라이언트
$ export DEBUGINFOD_URLS="http://debuginfod.internal.example.com:8002/"
```

CI 빌드 산출물을 *모두* debuginfod 서버에 넣으면 *모든 개발자가 자동* debuginfo 매칭. 대규모 운영의 game changer.

## Compressed debug sections

DWARF 자체를 *압축*해 더 작게.

```bash
$ clang++ -g -gz=zlib ...    # .debug_* 이름 + ELF SHF_COMPRESSED
$ clang++ -g -gz=zstd ...    # 지원되는 컴파일러·링커·소비자에서 사용
```

ELF 압축 헤더와 SHF_COMPRESSED를 사용합니다. 소비자의 압축 형식 지원과 전후 크기·조회 시간을 실제 파일로 확인합니다.

ELF 압축 표현은 gABI 사항이며 DWARF 5가 새로 정의한 압축 기능은 아닙니다. 옛 GNU .zdebug_* 이름 방식과 구분합니다.

## pyelftools — 자체 도구 작성

`pip install pyelftools`. ELF·DWARF의 Python 파서.

### 기본 — DIE 트리 순회

```python
from elftools.elf.elffile import ELFFile

def dump_dies(filename):
    with open(filename, 'rb') as f:
        elf = ELFFile(f)
        if not elf.has_dwarf_info():
            print("no DWARF"); return
        
        dwarf = elf.get_dwarf_info()
        for cu in dwarf.iter_CUs():
            top = cu.get_top_DIE()
            print(f"CU: {top.attributes['DW_AT_name'].value.decode()}")
            walk(top, indent=2)

def walk(die, indent):
    for child in die.iter_children():
        name = child.attributes.get('DW_AT_name')
        name_str = name.value.decode() if name else '?'
        print(f"{' ' * indent}{child.tag}: {name_str}")
        walk(child, indent + 2)
```

### 활용 1 — 코드 크기 분석

함수별 크기 상위 20개.

```python
import sys
from elftools.elf.elffile import ELFFile

with open(sys.argv[1], 'rb') as f:
    elf = ELFFile(f)
    dwarf = elf.get_dwarf_info()
    sizes = []
    for cu in dwarf.iter_CUs():
        for die in cu.iter_DIEs():
            if die.tag != 'DW_TAG_subprogram': continue
            low = die.attributes.get('DW_AT_low_pc')
            high = die.attributes.get('DW_AT_high_pc')
            name = die.attributes.get('DW_AT_name')
            if not (low and high and name): continue
            
            low_val = low.value
            high_val = high.value
            from elftools.dwarf.descriptions import describe_form_class
            if describe_form_class(high.form) == 'constant':
                size = high_val      # offset form (DWARF 4+)
            else:
                size = high_val - low_val
            
            sizes.append((size, name.value.decode(), low_val))

sizes.sort(reverse=True)
for size, name, pc in sizes[:20]:
    print(f"{size:>8} bytes  {name}  @ {pc:#x}")
```

### 활용 2 — 미사용 함수 검출

링커가 `--gc-sections`로 안 제거한 *호출되지 않는* 함수.

```python
# 모든 함수 이름 수집
all_funcs = set()
called = set()

for cu in dwarf.iter_CUs():
    for die in cu.iter_DIEs():
        if die.tag == 'DW_TAG_subprogram':
            name = die.attributes.get('DW_AT_name')
            if name and 'DW_AT_low_pc' in die.attributes:
                all_funcs.add(name.value.decode())
        # 호출 사이트 — DWARF 5의 DW_TAG_call_site
        elif die.tag == 'DW_TAG_call_site':
            target = die.attributes.get('DW_AT_call_origin')
            if target:
                # 참조된 함수의 DIE 찾기 → 이름
                ...

# 진입점 (main, ISR, exported)을 제외하고 호출 안 되는 함수
unused = all_funcs - called - {'main', 'Reset_Handler'}
```

이 조각은 called를 채우는 부분이 생략된 의사 코드이며 그대로 실행하면 미사용 판정 도구가 아닙니다. call-site 정보는 모든 호출에 반드시 존재하지 않고 함수 포인터·export·ISR 등 진입 경로도 별도 분석해야 합니다. 이 차집합만으로 함수를 삭제하지 않습니다.

### 활용 3 — 매핑 분석

`-fdata-sections`로 변수가 자기 섹션을 가질 때, 각 변수의 크기·주소를 추출.

```python
# 이미 만든 dwarf 객체의 CU를 순회하는 조각
from elftools.dwarf.dwarf_expr import DWARFExprParser
for cu in dwarf.iter_CUs():
    parser = DWARFExprParser(cu.structs)
    for die in cu.iter_DIEs():
        if die.tag != 'DW_TAG_variable': continue
        loc = die.attributes.get('DW_AT_location')
        if not loc or loc.form != 'DW_FORM_exprloc': continue
        ops = parser.parse_expr(loc.value)
        if len(ops) == 1 and ops[0].op_name == 'DW_OP_addr':
            print(ops[0].args[0])
```

이 조각은 단일 DW_OP_addr만 처리합니다. DW_OP_addrx·목록·복합 표현식·타입 크기 분석까지 지원하는 완성된 주소 추출기는 아닙니다.

### 활용 4 — 콜그래프 추출

함수 → 호출하는 다른 함수 매핑.

```python
edges = []
for cu in dwarf.iter_CUs():
    for die in cu.iter_DIEs():
        if die.tag != 'DW_TAG_subprogram': continue
        caller_name = die.attributes.get('DW_AT_name')
        if not caller_name: continue
        for inner in die.iter_children():
            if inner.tag in ('DW_TAG_inlined_subroutine', 'DW_TAG_call_site'):
                origin = inner.attributes.get('DW_AT_abstract_origin') or \
                         inner.attributes.get('DW_AT_call_origin')
                if origin:
                    attr_name = ('DW_AT_abstract_origin' if 'DW_AT_abstract_origin' in inner.attributes else 'DW_AT_call_origin')
                    callee_die = inner.get_DIE_from_attribute(attr_name)
                    callee_name = callee_die.attributes.get('DW_AT_name')
                    if callee_name:
                        edges.append((caller_name.value.decode(),
                                      callee_name.value.decode()))

import networkx as nx
G = nx.DiGraph(edges)
# ...
```

참조 FORM에 맞는 DIE 해석 API로 관찰된 연결을 수집할 수 있습니다. 이 코드만으로 완전한 호출 그래프나 clang-tooling보다 낮은 비용을 보장하지 않습니다.

### 활용 5 — CFI 추출

CFI는 [5장의 완전한 예제](/blog/tools/debugging/dwarf-elf/chapter05-cfi-eh-frame)를 사용합니다. pyelftools 0.32에서는 isinstance(entry, CIE/FDE)로 구분하고 .eh_frame과 .debug_frame의 API를 나눕니다. is_CIE()를 가정하지 않습니다.

자체 unwinder, *콜스택 시뮬레이터* 등의 출발점.

## llvm-dwarfdump의 깊은 옵션

```bash
# 모든 정보
$ llvm-dwarfdump my_prog

# 특정 섹션
$ llvm-dwarfdump --debug-info my_prog
$ llvm-dwarfdump --debug-line my_prog
$ llvm-dwarfdump --debug-loc my_prog
$ llvm-dwarfdump --debug-frame my_prog
$ llvm-dwarfdump --debug-aranges my_prog
$ llvm-dwarfdump --debug-str my_prog

# 특정 주소
$ llvm-dwarfdump --find=main my_prog
$ llvm-dwarfdump --lookup=0x401234 my_prog

# 특정 함수
$ llvm-dwarfdump --name='main' my_prog

# verbose (raw 바이트 + 디코딩)
$ llvm-dwarfdump -v my_prog

# 통계
$ llvm-dwarfdump --statistics my_prog

```

statistics는 해당 버전에서 정의한 계수와 범위를 보고합니다. 단일 비율을 실제 디버거에서 모든 시점의 optimized out 발생률과 같다고 보지 않습니다.

## DWARF 검증 — dwarfdump --verify

```bash
$ llvm-dwarfdump --verify my_prog
Verifying .debug_abbrev...
Verifying .debug_info Unit Header Chain...
Verifying .debug_info references...
Verifying .debug_line...

No errors.
```

도구 체인 버그·옛 컴파일러의 DWARF 오류 검출. CI에서 *DWARF 출력의 정상성 자동 확인*에 유용.

## DWARF in different formats

같은 DWARF 데이터를 *다른 컨테이너*로.

- **Mach-O (.dSYM)** — macOS. 별도 `.dSYM` 번들에 분리.
- **PDB**는 별도의 디버그 형식이며 DWARF를 담는 컨테이너가 아닙니다. LLVM 도구가 둘을 다룬다고 일반 DWARF 파일→PDB 변환이 보장되는 것은 아닙니다.
- **WASM** — WebAssembly. 표준 DWARF 사용.

```bash
# macOS — Mach-O 분석
$ dwarfdump MyApp.dSYM/Contents/Resources/DWARF/MyApp
```

DWARF의 *컨테이너 중립성*이 큰 장점. LLVM 도구는 여러 오브젝트 형식을 지원하지만 pyelftools의 ELF 파서로 임의의 Mach-O·PDB·WASM 파일을 열 수는 없습니다. 형식별 파서를 선택합니다.

## 표준 진행 상태

2026-10-22 확인한 [공식 사이트](https://dwarfstd.org/)는 DWARF 5 공개 표준과 DWARF 6 개발 초안을 구분합니다. 미래 DWARF 7의 방향이나 변경 폭을 근거 없이 예측하지 않습니다.

## 운영 권장 셋업

다음은 운영 요구에 맞춰 조합할 구성 예시입니다. 도구 지원과 보존 정책에 따라 선택합니다.

1. **빌드 옵션**
   ```text
   -g3 -gdwarf-5 -gsplit-dwarf
   -fno-omit-frame-pointer
   -Wl,--build-id=sha1
   ```
2. **링크 시**
   - debuginfo `.dwo`를 `.dwp` 하나로 묶음.
   - 본 ELF는 stripped.
3. **저장**
   - `.dwp` + `<build-id>.debug`를 사내 debuginfod 서버에 인덱싱.
4. **운영 머신**
   - `DEBUGINFOD_URLS`로 사내 서버 가리킴.
   - core dump에 build-id 기록.
5. **사고 분석**
   - `coredumpctl debug` 또는 `gdb exe core`.
   - debuginfo 자동 다운로드.
   - 인라인 trace + 변수 검사.

이 흐름의 목적은 바이너리와 debug 산출물의 대응을 유지하는 것입니다. 실제 분석 시간 감소는 운영 환경에서 측정하며, .dwo/.dwp의 서비스 제공·소비자 조회 지원도 따로 확인합니다.

## 직접 확인 — split·압축·참조 해석

아래 소스는 Linux ELF 오브젝트 생성용입니다. 일반 DWARF와 split 산출물의 섹션을 비교하고, zlib ELF 압축 파일을 같은 Python 파서로 읽습니다. 원격 debuginfod·dwz·GDB 자동 탐색은 별도 검증 대상입니다.

```c title="tools.c"
__attribute__((noinline)) int leaf(int value) { return value + 1; }
int wrapper(int value) { return leaf(value) + 2; }
int main(void) { return wrapper(39) == 42 ? 0 : 1; }
```

```python title="elf-summary.py"
import sys
from elftools.elf.elffile import ELFFile
from elftools.dwarf.descriptions import describe_form_class

with open(sys.argv[1], "rb") as stream:
    elf = ELFFile(stream)
    dwarf = elf.get_dwarf_info()
    functions = []
    edges = []
    for cu in dwarf.iter_CUs():
        for die in cu.iter_DIEs():
            attrs = die.attributes
            if die.tag == "DW_TAG_subprogram" and "DW_AT_name" in attrs:
                low, high = attrs.get("DW_AT_low_pc"), attrs.get("DW_AT_high_pc")
                if low and high:
                    kind = describe_form_class(high.form)
                    if kind in ("address", "constant"):
                        size = high.value - low.value if kind == "address" else high.value
                        functions.append((attrs["DW_AT_name"].value.decode(), size))
            for name in ("DW_AT_call_origin", "DW_AT_abstract_origin"):
                if name in attrs:
                    target = die.get_DIE_from_attribute(name)
                    if target and "DW_AT_name" in target.attributes:
                        edges.append(target.attributes["DW_AT_name"].value.decode())
    print("functions=", sorted(functions))
    print("observed_origins=", sorted(set(edges)))
```

```bash
clang --target=x86_64-unknown-linux-gnu -g -gdwarf-5 -O2 -c tools.c -o full.o
clang --target=x86_64-unknown-linux-gnu -g -gdwarf-5 -gsplit-dwarf -O2 -c tools.c -o split.o
llvm-dwp split.dwo -o package.dwp
llvm-objcopy --compress-debug-sections=zlib full.o compressed.o
llvm-dwarfdump --verify full.o
python3 elf-summary.py full.o
python3 elf-summary.py compressed.o
```

출력의 함수 크기·관찰된 origin 이름을 두 파일에서 비교합니다. 모든 호출이나 미사용 함수를 찾아냈다는 주장이 아닙니다. split.dwo 누락 시 skeleton만으로 변수 정보를 다 얻는다고 가정하지 않으며, 패키지의 CU 인덱스도 별도로 확인합니다.

## 정리

- DWARF 크기 문제: split-DWARF (분리), dwz (중복 제거), `-gline-tables-only` (line만).
- Split-DWARF: 빌드 가속 + 분산 빌드 친화.
- dwz: 중복 DIE를 partial CU로 공유. 배포판 표준.
- Build-id가 *바이너리 정체성* — debuginfo 매칭의 핵심.
- debuginfod로 *네트워크 자동 다운로드*.
- ELF 압축 헤더·SHF_COMPRESSED와 옛 GNU .zdebug_* 방식을 구분합니다.
- pyelftools가 자체 분석 도구의 표준.
- `llvm-dwarfdump --statistics`로 DWARF 품질 정량화.
- `--verify`로 도구 체인 검증.
- 대규모 운영의 셋업 = split + dwp + build-id + debuginfod.

## 시리즈 정리

- **Ch 1** ELF — 한 파일 두 시각 (섹션/세그먼트), 헤더, dynamic linking.
- **Ch 2** DWARF 개관 — DIE/abbrev, TAG/AT/FORM 카탈로그.
- **Ch 3** `.debug_line` — PC↔소스의 바이트코드 VM.
- **Ch 4** `.debug_loc` — 변수 위치의 스택 머신 표현.
- **Ch 5** CFI — 콜스택 unwinding의 표.
- **Ch 6** (이 장) 도구·기법 — split/dwz/debuginfod/pyelftools.

이 시리즈로 *디버거가 보는 모든 데이터*를 다뤘습니다. GDB/LLDB가 *왜 그렇게 동작하는지*는 결국 ELF + DWARF의 답으로 귀결됩니다.

## 관련 항목 (시리즈 전체)

- [Ch 1: ELF 포맷](/blog/tools/debugging/dwarf-elf/chapter01-elf-overview)
- [Ch 2: DWARF 개관](/blog/tools/debugging/dwarf-elf/chapter02-dwarf-overview)
- [Ch 3: .debug_line VM](/blog/tools/debugging/dwarf-elf/chapter03-debug-line)
- [Ch 4: DWARF expression VM](/blog/tools/debugging/dwarf-elf/chapter04-debug-loc)
- [Ch 5: CFI](/blog/tools/debugging/dwarf-elf/chapter05-cfi-eh-frame)

## 외부 자료

- [DWARF 5 표준](https://dwarfstd.org/doc/DWARF5.pdf)
- [pyelftools GitHub](https://github.com/eliben/pyelftools)
- [LLVM dwp](https://llvm.org/docs/CommandGuide/llvm-dwp.html)
- [dwz GitHub](https://sourceware.org/git/?p=dwz.git)
- [debuginfod 공식](https://sourceware.org/elfutils/Debuginfod.html)
- [Fedora debuginfod](https://debuginfod.fedoraproject.org/)
- [Embedded Debugging Ch 5: ELF/MAP](/blog/tools/debugging/embedded/chapter05-elf-map)
- [GDB and LLDB 시리즈](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)
