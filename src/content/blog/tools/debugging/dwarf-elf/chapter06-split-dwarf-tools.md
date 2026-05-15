---
title: "Ch 6: split-DWARF, dwz, debuginfod, pyelftools"
date: 2025-09-02T06:00:00
description: "큰 디버그 정보 다루기. 분리·압축·네트워크 다운로드·자체 도구 작성."
tags: [dwarf, split-dwarf, dwz, debuginfod, pyelftools, tools]
series: "DWARF and ELF Internals"
seriesOrder: 6
draft: false
---

DWARF는 *큽니다*. Chrome, LLVM, Linux 커널 등 큰 코드베이스는 디버그 정보가 본 코드의 5~10배. 빌드 시간·메모리·디스크가 모두 영향을 받습니다.

이 시리즈의 마지막 장은 *큰 DWARF를 다루는 도구·기법*을 모았습니다. split-DWARF로 *.dwo 파일 분리, dwz로 중복 제거, 별도 debuginfo + build-id 매칭, 네트워크 자동 다운로드(`debuginfod`), 그리고 pyelftools로 자체 분석 도구 작성까지.

## 한 줄 요약

DWARF의 크기 문제는 *분리·중복 제거·인덱싱*으로 풉니다. pyelftools가 자체 도구 작성의 표준.

## 크기 측정

```bash
$ ls -la /usr/bin/clang-17
-rwxr-xr-x ... 156M /usr/bin/clang-17
$ size -A /usr/bin/clang-17 | grep debug | awk '{sum+=$2} END {print sum/1024/1024" MB"}'
1234.5 MB
```

clang 바이너리 156MB 중 *1.2 GB가 디버그 정보*. (debuginfo 패키지에 분리 저장.)

`.debug_info`가 단연 가장 크고, `.debug_loc`/`.debug_str`이 그 다음, `.debug_line`은 비교적 작음. 큰 프로젝트의 디버그 정보가 *왜 크냐*는 거의 항상 `.debug_info`의 답이 옵니다 — 같은 STL 인스턴스화·인라인 함수가 *수십 CU*에 중복.

## Split-DWARF — .dwo 파일 분리

해법: DWARF를 *.o 파일 안*이 아닌 *별도 .dwo 파일*에 두기. 링크 시 본 ELF엔 *skeleton만* 남고, 디버거가 필요할 때 *.dwo*를 읽기.

### 빌드

```bash
$ clang++ -g -gsplit-dwarf -c foo.cpp     # foo.o + foo.dwo 생성
$ clang++ -g -gsplit-dwarf foo.o -o prog  # prog 안엔 skeleton
                                          # foo.dwo가 같은 경로에 남아 있음
```

GCC도 같은 옵션 `-gsplit-dwarf`. `-c`로 컴파일할 때 `.dwo`가 분리되고, 링크 단계에선 *건드리지 않음*.

### Skeleton CU

ELF 안에 남는 건 *DW_TAG_skeleton_unit* (DWARF 5).

```
ELF .debug_info:
  DW_TAG_skeleton_unit
  ├─ DW_AT_dwo_name = "foo.dwo"
  ├─ DW_AT_addr_base = ref(.debug_addr)
  ├─ DW_AT_str_offsets_base = ref(.debug_str_offsets)
  ├─ DW_AT_loclists_base = ref(.debug_loclists)
  ├─ DW_AT_rnglists_base = ref(.debug_rnglists)
  └─ (no children — 본체는 dwo에)
```

본 DIE 트리는 `.dwo`의 `.debug_info.dwo` 섹션에 있습니다. ELF엔 *어디서 찾는지의 포인터*만.

### 효과

- 링크 시간: *DWARF 처리가 사라져* 매우 빨라짐 (큰 프로젝트에서 50% 이상).
- 링크 메모리: 마찬가지.
- 분산 빌드: `.dwo`는 *분산 가능* (`distcc`/`icecc`가 `.dwo`만 따로 전송).
- 디버깅: 변화 없음 (디버거가 `.dwo`를 자동 찾음).

### .dwp 패키지

`.dwo`가 *수천 개*면 관리가 어려움. `dwp` 도구가 한 *.dwp 패키지*로 묶습니다.

```bash
$ llvm-dwp -o myapp.dwp *.dwo
$ ls myapp myapp.dwp
```

배포 시 *.dwp 하나만* 같이 두면 GDB가 자동 사용. ELF의 *DW_AT_dwo_name*이 *foo.dwo*든 *myapp.dwp*든 GDB가 적절히 검색.

### 디버거 검색 경로

```text
(gdb) show debug-file-directory
(gdb) set debug-file-directory /opt/dwo:/opt/symbols
```

또는 환경변수 `DEBUGINFOD_URLS` (다음 절).

## dwz — 중복 제거

[dwz](https://sourceware.org/dwz/)가 DIE 트리에서 *중복 부분 트리*를 찾아 *한 번만 저장*하고 나머지는 *참조*로.

대표 예: `std::vector<int>`의 instantiation이 수십 CU에서 *완전히 동일*. dwz가 *partial CU* (DW_TAG_partial_unit)로 *공유 정의*를 만들고 각 CU가 *import* (DW_TAG_imported_unit).

```bash
# 단일 파일
$ dwz my_prog
$ size -A my_prog | grep debug | awk '{sum+=$2} END {print sum}'
# 기존의 60~80%

# 여러 바이너리 공유 (libfoo.so + libbar.so가 공통 DIE를 가질 때)
$ dwz -m common.debug a.so b.so c.so
# common.debug에 공유 DIE, a.so/b.so/c.so는 그걸 참조
```

Fedora·Debian·Ubuntu의 *모든 debuginfo 패키지*가 dwz 처리됩니다. 따라서 공식 패키지의 DWARF는 *이미 압축*된 상태.

## -gline-tables-only — 줄 정보만

`bt`의 줄 번호만 필요하고 `print var`은 안 쓸 거라면 *line table만* 보존.

```bash
$ clang++ -gline-tables-only -O2 ...
```

`.debug_info`, `.debug_loc`, `.debug_ranges`가 거의 비고 `.debug_line`만 남음. 크기는 *1/10 이하*. addr2line 정상 동작.

운영 빌드의 표준 옵션. crash log에서 *함수명 + 줄*만 알면 충분.

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

대부분의 빌드 시스템(CMake, Bazel, autotools)이 자동으로 `--build-id`를 켭니다.

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

내부적으로 *HTTP GET* + Cookie/Range. *부분 다운로드*도 가능 — 첫 콜스택에 일부만, `print var`로 깊이 들어가면 그때 더.

### 캐시

```bash
$ ls ~/.cache/debuginfod_client/
$ du -sh ~/.cache/debuginfod_client/
```

기본 1 GB. 한 번 받은 debuginfo는 캐싱.

### 자체 서버

```bash
# 사내 debuginfod 서버
$ debuginfod -F /opt/builds -d /var/cache/debuginfod /opt/builds
[/opt/builds 안의 모든 ELF 인덱스, build-id로 검색 가능]

# 클라이언트
$ export DEBUGINFOD_URLS="http://debuginfod.internal.example.com:8002/"
```

CI 빌드 산출물을 *모두* debuginfod 서버에 넣으면 *모든 개발자가 자동* debuginfo 매칭. 대규모 운영의 game changer.

## Compressed debug sections

DWARF 자체를 *압축*해 더 작게.

```bash
$ clang++ -g -gz=zlib ...    # .debug_info → .zdebug_info (zlib)
$ clang++ -g -gz=zstd ...    # .debug_info (zstd compressed) (GCC 12+)
```

ELF 안에 `SHF_COMPRESSED` 플래그 + 압축된 데이터. GDB가 자동 압축 해제. 크기 30-50% 절감, 디버깅 속도엔 영향 거의 없음.

DWARF 5에 *공식 표준화*. 옛 도구는 `.zdebug_*` 형태 (zlib 한정, GCC 확장).

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
            if high.form.startswith('DW_FORM_data'):
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

DWARF 5의 `DW_TAG_call_site`가 모든 호출을 메타로 표시. 임베디드에서 *flash 공간 감축*에 활용.

### 활용 3 — 매핑 분석

`-fdata-sections`로 변수가 자기 섹션을 가질 때, 각 변수의 크기·주소를 추출.

```python
for cu in dwarf.iter_CUs():
    for die in cu.iter_DIEs():
        if die.tag != 'DW_TAG_variable': continue
        loc = die.attributes.get('DW_AT_location')
        if not loc: continue
        # DW_FORM_exprloc — 단일 표현식
        if loc.form == 'DW_FORM_exprloc':
            expr = loc.value
            # DW_OP_addr (0x03) 이후 4 또는 8바이트가 주소
            if expr[0] == 0x03:
                addr = int.from_bytes(expr[1:], 'little')
                ...
```

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
                    callee_die = cu.get_DIE_from_refaddr(origin.value)
                    callee_name = callee_die.attributes.get('DW_AT_name')
                    if callee_name:
                        edges.append((caller_name.value.decode(),
                                      callee_name.value.decode()))

import networkx as nx
G = nx.DiGraph(edges)
# ...
```

대규모 프로젝트의 *모듈 의존성 분석*. clang-tooling보다 가볍게.

### 활용 5 — CFI 추출

```python
for cfi in dwarf.CFI_entries():
    if cfi.is_CIE():
        print("CIE")
    else:
        addr = cfi.header.initial_location
        print(f"FDE for function @ {addr:#x}")
        # 디코딩된 표
        decoded = cfi.get_decoded()
        for row in decoded.table:
            cfa = row['cfa']
            print(f"  pc={row['pc']:#x}  CFA={cfa}")
```

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
$ llvm-dwarfdump --find=0x401234 my_prog
$ llvm-dwarfdump --lookup=0x401234 my_prog

# 특정 함수
$ llvm-dwarfdump --name='main' my_prog

# verbose (raw 바이트 + 디코딩)
$ llvm-dwarfdump -v my_prog

# 통계
$ llvm-dwarfdump --statistics my_prog
{
  "version": 6,
  "#functions": 12345,
  "#inlined functions": 8765,
  "#variables": 23456,
  "#variables - in scope": 22000,
  "#variables - source location": 21500,
  "sum_inscope_bytes": ...,
  ...
}
```

`--statistics`가 *디버그 정보의 품질*을 정량화 — 변수의 몇 %가 "optimized out"인지, 인라인이 얼마나 깊이 표현되는지.

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
- **PDB** — Windows. 별 포맷이지만 LLVM이 DWARF → PDB 변환 지원.
- **WASM** — WebAssembly. 표준 DWARF 사용.

```bash
# macOS — Mach-O 분석
$ dwarfdump MyApp.dSYM/Contents/Resources/DWARF/MyApp
```

DWARF의 *컨테이너 중립성*이 큰 장점. 같은 도구 (pyelftools 포함)가 거의 모든 환경에 동작.

## DWARF 7 — 미래

DWARF 6는 2024년 작성 중 (작은 변경). DWARF 7은 *형식 인덱싱*과 *언어별 확장*에 더 신경 쓸 것으로 예상. 다만 *DWARF 5가 너무 잘 됨*이라 큰 도약은 없을 듯.

## 운영 권장 셋업

대규모 운영 환경의 표준.

1. **빌드 옵션**
   ```
   -g3 -gdwarf-5 -gsplit-dwarf
   -fno-omit-frame-pointer
   --build-id=sha1
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

이 흐름이 *대규모 시스템*에서 디버깅 시간을 *수십 시간 → 분 단위*로 줄입니다.

## 정리

- DWARF 크기 문제: split-DWARF (분리), dwz (중복 제거), `-gline-tables-only` (line만).
- Split-DWARF: 빌드 가속 + 분산 빌드 친화.
- dwz: 중복 DIE를 partial CU로 공유. 배포판 표준.
- Build-id가 *바이너리 정체성* — debuginfo 매칭의 핵심.
- debuginfod로 *네트워크 자동 다운로드*.
- Compressed debug section (`.zdebug_*`, `-gz=zstd`).
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
- [Embedded Debugging Ch 5: ELF/MAP](/blog/tools/debugging/embedded-debug/chapter05-elf-map)
- [GDB and LLDB 시리즈](/blog/tools/gdb-lldb/chapter01-intro-and-install)
