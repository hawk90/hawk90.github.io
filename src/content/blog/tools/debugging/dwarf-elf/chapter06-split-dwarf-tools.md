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

DWARF는 *큽니다*. Debian 13 arm64의 `/usr/bin/ls`는 stripped 상태로 199,576바이트인데, debuginfod로 받은 디버그 파일은 섹션이 압축된 채로 366,128바이트, 압축을 풀면 589,560바이트였습니다. 여기에 dwz가 따로 뺀 공용 파일은 들어 있지도 않습니다. 실행 파일보다 디버그 정보가 큰 것이 보통이고, 빌드 시간·링크 메모리·디스크가 모두 그 크기를 따라갑니다.

이 시리즈의 마지막 장은 *큰 DWARF를 다루는 도구·기법*을 모았습니다. split-DWARF로 `.dwo` 파일 분리, dwz로 중복 제거, 별도 debuginfo + build-id 매칭, 네트워크 자동 다운로드(`debuginfod`), 그리고 pyelftools로 자체 분석 도구 작성까지입니다. 실행은 Debian 13 arm64 QEMU 게스트(GCC 14.2, clang 19.1.7, binutils 2.44, GDB 16.3, dwz 0.15, elfutils debuginfod)와 macOS의 Homebrew LLVM 23.1.5에서 했습니다.

:::tldr
DWARF의 크기 문제는 *분리·중복 제거·인덱싱*으로 풉니다. pyelftools가 자체 도구 작성의 표준.
:::

## 크기 측정

파일 크기와 섹션 크기는 따로 봅니다. `readelf -SW`의 `Size`는 섹션이 파일에서 차지하는 바이트이고, `C` 플래그가 붙은 섹션은 압축된 크기입니다. Debian의 `ls` 디버그 파일에서 `.debug_info`는 `C` 플래그와 함께 0x131c8바이트였고, `objcopy --decompress-debug-sections`로 푼 뒤에는 0x23d20바이트였습니다.

```bash
ls -l my_prog my_prog.debug
readelf -SW my_prog | grep -E 'debug|Flg'
objcopy --decompress-debug-sections my_prog.debug /tmp/plain.debug
```

## Split-DWARF — .dwo 파일 분리

해법: DWARF를 *.o 파일 안*이 아닌 *별도 .dwo 파일*에 두기. 링크 시 본 ELF엔 *skeleton만* 남고, 디버거가 필요할 때 *.dwo*를 읽기.

![Split-DWARF + .dwp 패키지 흐름](/images/blog/tools/diagrams/split-dwarf-flow.svg)

### 빌드

게스트에서 작은 `foo.c`를 GCC 14.2로 나눠 빌드했습니다.

```c title="foo.c"
struct point { int x, y; };
__attribute__((noinline)) int dist(struct point p) { return p.x * p.x + p.y * p.y; }
int main(void) { struct point p = {3, 4}; return dist(p) == 25 ? 0 : 1; }
```

```text
$ gcc -g -gsplit-dwarf -O0 -c foo.c -o foo.o
$ ls -l foo.o foo.dwo
-rw-r--r-- 1 root root 1392 Nov 16 04:19 foo.dwo
-rw-r--r-- 1 root root 3584 Nov 16 04:19 foo.o
$ gcc foo.o -o prog
$ readelf -SW foo.dwo | grep debug
  [ 1] .debug_info.dwo   PROGBITS        0000000000000000 000040 000089 00   E  0   0  1
  [ 2] .debug_abbrev.dwo PROGBITS        0000000000000000 0000c9 000097 00   E  0   0  1
  [ 3] .debug_line.dwo   PROGBITS        0000000000000000 000160 00003a 00   E  0   0  1
  [ 4] .debug_str_offsets.dwo PROGBITS        0000000000000000 00019a 00001c 00   E  0   0  1
  [ 5] .debug_str.dwo    PROGBITS        0000000000000000 0001b6 000072 00   E  0   0  1
```

`.dwo` 섹션에는 `E`(exclude) 플래그가 붙어 링커가 실행 파일에 넣지 않습니다. 링크는 `foo.o`만 읽고, `foo.dwo`는 컴파일한 자리에 그대로 남습니다. clang도 같은 옵션 `-gsplit-dwarf`를 쓰며, macOS clang 23.1.5로 만든 x86-64 `split.o`/`split.dwo`도 모든 `.debug_*.dwo` 섹션에 `E`가 붙었습니다(`.debug_line.dwo` 대신 `.debug_loclists.dwo`·`.debug_rnglists.dwo`가 있었습니다).

### Skeleton CU

실행 파일에 남는 것은 DWARF 5의 `DW_TAG_skeleton_unit`입니다(§3.1.2 "Skeleton Compilation Unit Entries"). `prog`의 `.debug_info`는 0x35바이트뿐입니다.

```text
$ readelf --debug-dump=info prog
...
  Compilation Unit @ offset 0:
   Length:        0x31 (32-bit)
   Version:       5
   Unit Type:     DW_UT_skeleton (4)
   Abbrev Offset: 0
   Pointer Size:  8
   DWO ID:        0x1c148ae7171b0d22
 <0><14>: Abbrev Number: 1 (DW_TAG_skeleton_unit)
    <15>   DW_AT_low_pc      : 0x768
    <1d>   DW_AT_high_pc     : 0x60
    <25>   DW_AT_stmt_list   : 0
    <29>   DW_AT_dwo_name    : (indirect string, offset: 0): foo.dwo
    <2d>   DW_AT_comp_dir    : /w6
    <31>   DW_AT_GNU_pubnames: 1
    <31>   DW_AT_addr_base   : 0x8
...
  Compilation Unit @ offset 0:
   Length:        0x85 (32-bit)
   Version:       5
   Unit Type:     DW_UT_split_compile (5)
```

skeleton에는 자식 DIE가 없고, `DW_AT_dwo_name`·`DW_AT_comp_dir`이 `.dwo`의 위치를, 헤더의 `DWO ID`가 짝을 맞출 식별자를 줍니다. 주소는 실행 파일 쪽 `.debug_addr`에 남아 `DW_AT_addr_base`로 찾습니다. 같은 주소를 `.dwo`에 두면 링크 후 재배치할 방법이 없기 때문입니다. macOS clang 23.1.5의 skeleton은 `DW_AT_str_offsets_base`도 가졌습니다. 본체 DIE 트리는 `.debug_info.dwo`의 `DW_UT_split_compile` 유닛에 있습니다.

### 효과와 배포 경계

DWARF 5 §1.4는 split 형식의 목적을 실행 파일 크기 축소와 링크 시간 개선으로 적습니다. 링커가 읽고 복사할 디버그 바이트가 skeleton만큼으로 줄기 때문입니다. 대신 디버거가 `.dwo`를 찾지 못하면 그 CU의 타입·변수 정보가 없습니다. `foo.dwo`를 치우고 GDB 16.3으로 `prog`를 열었습니다.

```text
$ gdb -q -batch -ex 'break dist' -ex run -ex 'print p' ./prog
DWARF Error: unexpected tag 'DW_TAG_skeleton_unit' at offset 0x0
warning: Could not find DWO CU foo.dwo(0x1c148ae7171b0d22) referenced by CU at offset 0x0 [in module /w6/prog]
...
No symbol "p" in current context.
```

`.dwo`를 되돌리면 같은 명령이 `ptype p`에 `struct point { int x; int y; }`를 답했습니다. 그래서 split 빌드는 `.dwo`(또는 `.dwp`)를 실행 파일과 함께 보관하는 절차가 필요합니다.

### .dwp 패키지

`.dwo`가 *수천 개*면 관리가 어려움. `dwp` 도구가 한 *.dwp 패키지*로 묶습니다.

`.dwo`가 수천 개면 관리가 어렵습니다. `dwp` 도구가 이들을 *.dwp 패키지* 하나로 묶고, 패키지 안의 `.debug_cu_index`가 DWO ID → 섹션 조각의 색인이 됩니다(§7.3.5 "DWARF Package Files"). 게스트에서 clang 19.1.7로 `foo.c`를 split 빌드하고 `llvm-dwp -e`로 실행 파일이 참조하는 `.dwo`를 모았습니다.

```text
$ clang -g -gsplit-dwarf -O0 -c foo.c -o cfoo.o
$ clang cfoo.o -o cprog
$ llvm-dwp -e cprog -o cprog.dwp
$ ls -l cfoo.dwo cprog.dwp
-rw-r--r-- 1 root root  992 Nov 16 04:19 cfoo.dwo
-rw-r--r-- 1 root root 1400 Nov 16 04:19 cprog.dwp
$ llvm-dwarfdump --debug-cu-index cprog.dwp
...
.debug_cu_index contents:
version = 5, units = 1, slots = 2

Index Signature          INFO                                     ABBREV                   STR_OFFSETS              RNGLISTS
----- ------------------ ---------------------------------------- ------------------------ ------------------------ ------------------------
    2 0xf971a44b7639019b [0x0000000000000000, 0x0000000000000069) [0x00000000, 0x0000007f) [0x00000000, 0x00000030) [0x00000000, 0x00000014)
```

`cprog`와 `cprog.dwp`만 다른 디렉터리로 복사하고 `cfoo.dwo`를 지운 뒤 GDB 16.3으로 열자, `print p`가 `{x = 3, y = 4}`를 답했습니다. GDB가 실행 파일 이름에 `.dwp`를 붙인 파일을 같은 디렉터리에서 찾은 것입니다.

### 디버거 검색 경로

```text
(gdb) show debug-file-directory
The directory where separate debug symbols are searched for is "/usr/lib/debug".
(gdb) set debug-file-directory /opt/dwo:/opt/symbols
```

위 응답은 Debian GDB 16.3의 기본값입니다. 같은 GDB에서 `show debuginfod enabled`는 `"ask"`였습니다. 별도 debug 파일과 build-id 경로는 아래 절에서 다룹니다.

## dwz — 중복 제거

[dwz](https://sourceware.org/dwz/)가 DIE 트리에서 *중복 부분 트리*를 찾아 *한 번만 저장*하고 나머지는 *참조*로.

헤더에 정의한 구조체는 그 헤더를 include한 CU마다 같은 DIE로 반복됩니다. dwz는 이 공통 부분을 `DW_TAG_partial_unit`으로 한 번만 두고, 각 CU가 `DW_TAG_imported_unit`으로 가져오게 바꿉니다. DWARF 5 Appendix E.1 "Using Compilation Units"가 설명하는 기법입니다.

게스트에서 같은 헤더 `big.h`(구조체 하나와 inline 함수 하나)를 include한 파일 4개와 `main`을 `-g -O0`로 링크하고 dwz 0.15를 돌렸습니다.

```text
$ readelf -SW shared.orig | grep -E "debug_(info|abbrev|str) "
  [27] .debug_info       PROGBITS        0000000000000000 01013f 0004fa 00      0   0  1
  [28] .debug_abbrev     PROGBITS        0000000000000000 010639 000391 00      0   0  1
  [30] .debug_str        PROGBITS        0000000000000000 010bdb 0000b5 01  MS  0   0  1
$ dwz shared
$ readelf -SW shared | grep -E "debug_(info|abbrev|str) "
  [27] .debug_info       PROGBITS        0000000000000000 01013f 0002ee 00      0   0  1
  [28] .debug_abbrev     PROGBITS        0000000000000000 01042d 00011c 00      0   0  1
  [30] .debug_str        PROGBITS        0000000000000000 01075a 0000b5 01  MS  0   0  1
```

`.debug_info`가 0x4fa → 0x2ee, `.debug_abbrev`가 0x391 → 0x11c바이트로 줄었고, 파일은 74,672 → 73,520바이트가 됐습니다. `DW_TAG_structure_type`은 4개에서 1개로 줄었습니다. 바뀐 구조는 이렇습니다.

```text
$ readelf --debug-dump=info shared | grep -E "Unit Type|partial_unit|imported_unit|DW_AT_import|compile_unit"
   Unit Type:     DW_UT_partial (3)
 <0><c>: Abbrev Number: 4 (DW_TAG_partial_unit)
 <1><15>: Abbrev Number: 2 (DW_TAG_imported_unit)
    <16>   DW_AT_import      : <0x87>	[Abbrev Number: 4 (DW_TAG_partial_unit)]
   Unit Type:     DW_UT_partial (3)
 <0><87>: Abbrev Number: 4 (DW_TAG_partial_unit)
   Unit Type:     DW_UT_compile (1)
 <0><a4>: Abbrev Number: 11 (DW_TAG_compile_unit)
 <1><bf>: Abbrev Number: 2 (DW_TAG_imported_unit)
    <c0>   DW_AT_import      : <0xc>	[Abbrev Number: 4 (DW_TAG_partial_unit)]
...
```

여러 바이너리가 공통 DIE를 가지면 `dwz -m common.debug a.so b.so`처럼 공용 파일로 빼고, 각 파일은 `.gnu_debugaltlink`로 그 파일을 가리킵니다. Debian의 `ls` 디버그 파일이 그 예로, `.gnu_debugaltlink`의 경로가 `/usr/lib/debug/.dwz/aarch64-linux-gnu/coreutils.debug`였습니다. 1장의 stripped `ls`에도 같은 섹션이 있었습니다.

## -gline-tables-only — 줄 정보만

`bt`의 줄 번호만 필요하고 `print var`은 쓰지 않는다면 줄 표만 남깁니다. 같은 소스로 잰 크기는 3장의 "줄 정보만 남기기" 절에 있습니다.

```bash
clang++ -gline-tables-only -O2 ...
g++ -g1 -O2 ...
```

## 별도 debuginfo + build-id

배포 시 stripped 바이너리 + 별도 debuginfo 파일.

```bash
objcopy --only-keep-debug a.out a.debug
strip --strip-debug a.out
objcopy --add-gnu-debuglink=a.debug a.out
```

게스트에서 `foo.c`로 이 세 단계를 거치자 `a.out`(70,304바이트)에는 `.debug_*` 대신 `.gnu_debuglink`(0xc바이트)가 생겼습니다. 이 섹션은 파일 이름 `a.debug`와 그 파일의 CRC32를 담습니다. GDB 16.3은 `a.out`만 열어도 `break dist`, `print p` → `{x = 3, y = 4}`를 답했습니다. 같은 디렉터리의 `a.debug`(8,344바이트)를 이름으로 찾은 것입니다.

build-id로도 찾습니다. `-Wl,--build-id`로 링크한 `bidx`의 debug 파일을 `/usr/lib/debug/.build-id/<앞 2자리>/<나머지>.debug`로 옮기고 debuglink 없이 열었더니 GDB가 `Breakpoint 1, dist (p=...) at foo.c:2`까지 소스 정보를 찾았습니다. Debian은 디버그 패키지를 이 경로에 설치하고, 1장의 `ls`처럼 패키지가 없으면 디렉터리 자체가 없습니다(`ls: cannot access '/usr/lib/debug/.build-id/87/'`).

검색 경로는 콜론으로 여럿 줄 수 있습니다.

```text
(gdb) set debug-file-directory /opt/my-symbols:/usr/lib/debug
```

### --build-id

binutils 2.44 `ld`의 스타일별 결과입니다(게스트, 같은 `foo.c`).

| 옵션 | `readelf -n`의 Build ID |
|------|------------------|
| `-Wl,--build-id=sha1` | `faafc9c158f66a57c754ad8a0d431707dd034bec` (20바이트) |
| `-Wl,--build-id=md5` | `6b598e26877b6f6bfad0fe7d4e3634b5` (16바이트) |
| `-Wl,--build-id=uuid` | `3cf9dab6c48126cba356cc114531f6ab` (16바이트, 무작위) |
| `-Wl,--build-id=0xdeadbeef` | `deadbeef` |
| 옵션 없음 | `faafc9c158f66a57c754ad8a0d431707dd034bec` |

옵션 없이 링크한 결과가 `sha1`과 같은 ID인 것은, Debian GCC가 링커에 `--build-id`를 넘기고(1장) 스타일 없는 `--build-id`가 SHA-1을 쓰기 때문입니다. `sha1`·`md5`는 같은 입력이면 같은 ID가 나오는 결정적 해시이고, `uuid`는 링크할 때마다 바뀝니다.

## debuginfod — 네트워크 자동 다운로드

build-id로 *네트워크에서* debuginfo를 가져오는 HTTP 서비스입니다. 게스트에서 Debian의 공개 서버로 `ls`의 디버그 정보를 받았습니다.

```text
$ export DEBUGINFOD_URLS=https://debuginfod.debian.net
$ debuginfod-find debuginfo /usr/bin/ls
/root/.cache/debuginfod_client/87a7eadc711cd002f7b00ba923179e5713498159/debuginfo
```

경로의 디렉터리 이름이 1장에서 본 `ls`의 Build ID입니다. 받은 파일(366,128바이트)은 `.debug_info`·`.debug_abbrev`·`.debug_line`이 모두 `C`(SHF_COMPRESSED) 플래그를 단 압축 섹션이었고, `.gnu_debugaltlink`로 dwz 공용 파일을 가리켰습니다. 같은 클라이언트는 `source`, `executable` 종류도 받습니다.

```bash
debuginfod-find source /usr/bin/foo /usr/src/...
debuginfod-find executable BUILDID
```

GDB 16.3은 `DEBUGINFOD_URLS`가 있으면 시작할 때 사용 여부를 묻습니다. batch 모드에서는 입력이 터미널이 아니라서 `[answered N; input not from terminal]`로 꺼졌으므로, 스크립트에서는 `-ex 'set debuginfod enabled on'`을 파일 인자보다 먼저 줍니다.

### 캐시

```bash
ls ~/.cache/debuginfod_client/
du -sh ~/.cache/debuginfod_client/
```

받은 파일은 build-id 디렉터리별로 캐시에 남습니다. 게스트에서 첫 다운로드 뒤 캐시는 372K였고, 캐시 디렉터리에 `cache_clean_interval_s` 파일(값 `86400`, 하루)이 생겼습니다. 정리 주기와 보존 기간 설정은 [debuginfod-client-config(7)](https://sourceware.org/elfutils/Debuginfod.html)에 있습니다.

### 자체 서버

```bash
# 사내 debuginfod 서버: /opt/builds의 ELF/DWARF 파일을 색인
debuginfod -F -d /var/cache/debuginfod/index.sqlite /opt/builds

# 클라이언트
export DEBUGINFOD_URLS="http://debuginfod.internal.example.com:8002/"
```

Debian 13의 `debuginfod --help`에서 `-F`는 `--scan-file-dir`(ELF/DWARF 파일 스캔), `-d`는 `--database=FILE`(sqlite DB 경로), `-p`는 HTTP 포트(기본 8002)입니다. 클라이언트 `debuginfod-find`는 `debuginfo`·`executable`·`source`에 더해 `section BUILDID SECTION-NAME` 형태로 섹션 하나만 받는 명령도 지원했습니다.

CI가 빌드 산출물과 debug 파일을 이 서버가 보는 경로에 쌓아 두면, 개발자가 받은 core dump나 crash 주소를 build-id 하나로 같은 빌드의 디버그 정보와 맞출 수 있습니다.

## Compressed debug sections

섹션 자체를 압축하는 방법입니다. 게스트의 GCC 14.2로 같은 `foo.c`를 세 가지로 빌드했습니다.

```text
$ gcc -g -O2 foo.c -o z0; gcc -g -O2 -gz=zlib foo.c -o z1; gcc -g -O2 -gz=zstd foo.c -o z2
== z0
  [27] .debug_info       PROGBITS        0000000000000000 01008f 0000bd 00      0   0  1
== z1
  [27] .debug_info       PROGBITS        0000000000000000 010bc8 000090 00   C  0   0  8
== z2
  [27] .debug_info       PROGBITS        0000000000000000 010bc8 00009d 00   C  0   0  8
```

압축된 섹션은 `C` 플래그를 달고 `Elf64_Chdr` 압축 헤더로 시작합니다(gABI §3.7 "Compressed Sections"). 이 표현은 ELF 형식의 기능이지 DWARF 5가 정의한 것이 아니며, 섹션 이름을 `.zdebug_*`로 바꾸던 옛 GNU 방식과도 다릅니다. 파일 크기는 71,952(z0), 71,904(z1), 71,920(z2)바이트였습니다. 이 정도로 작은 입력에서는 압축 헤더와 정렬 비용이 이득을 거의 상쇄합니다. 아래 직접 확인 절의 x86-64 오브젝트는 zlib으로 압축하자 오히려 3,544 → 3,600바이트로 커졌습니다. Debian `ls` 디버그 파일은 압축 상태 366,128바이트, 해제 후 589,560바이트였습니다.

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

이 조각은 `called`를 채우는 부분을 생략한 의사 코드입니다. `DW_TAG_call_site`는 컴파일러가 남긴 직접 호출만 담고, 함수 포인터·export·ISR로 들어오는 경로는 없습니다. 4장의 `locals.o`처럼 `DW_AT_call_all_calls`가 붙은 함수만 호출 목록이 완전하다고 표시된 것이라서, 이 차집합은 삭제 대상이 아니라 검토 후보 목록입니다.

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

`get_DIE_from_attribute`가 참조 FORM(`ref4`, `ref_addr` 등)을 알아서 풀어 줍니다. 결과는 DWARF에 기록된 인라인·call site 연결이고, 위와 같은 이유로 완전한 호출 그래프는 아닙니다.

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

`--find`는 accelerator table(`.debug_names` 등)을 검색합니다. 직접 확인 절의 `full.o`처럼 accelerator table이 없는 오브젝트에서는 `--find=main`이 아무것도 내지 않았고, 표 없이 전체를 훑는 `--name=leaf`는 `DW_TAG_subprogram`을 찾았습니다. `--statistics`는 JSON으로 변수 위치 커버리지 같은 수치를 냅니다(4장의 `-O2`/`-Og` 비교).

## DWARF 검증 — dwarfdump --verify

2장의 `types.o`에 돌린 결과입니다.

```text
$ llvm-dwarfdump --verify types.o
Verifying types.o:	file format elf64-x86-64
Verifying .debug_abbrev...
Verifying .debug_info Unit Header Chain...
Verifying .debug_types Unit Header Chain...
Verifying non-dwo Units...
Verifying unit: 1 / 1, "types.c"
Verifying dwo Units...
Verifying .debug_line...
Verifying .debug_str_offsets...
No errors.
```

오류가 있으면 0이 아닌 종료 코드를 내므로 CI에서 컴파일러 업그레이드 뒤 DWARF가 깨지지 않았는지 확인하는 단계로 쓸 수 있습니다. 파일 형식의 일관성을 보는 것이고, 변수 위치가 맞는지 같은 의미 검사는 하지 않습니다.

## DWARF in different formats

같은 DWARF 데이터를 다른 오브젝트 형식에 담기도 합니다.

- **Mach-O (.dSYM)** — macOS. clang이 `.o`에 `__debug_info` 같은 `__DWARF` 섹션을 만들지만 링크된 실행 파일에는 넣지 않습니다. `tools.c`를 macOS clang 23.1.5로 `-g -O2 -c` 후 링크하자 실행 파일의 debug 섹션은 0개였고, `dsymutil`이 `.o`들을 읽어 `tools-macho.dSYM/Contents/Resources/DWARF/tools-macho`에 `__debug_info`(0xac바이트)·`__debug_line` 등을 모았습니다. 컴파일 직후 `.o`를 지우는 한 줄 빌드(`clang -g tools.c`)에서는 `dsymutil`이 `unable to open object file`로 경고하고 디버그 정보를 모으지 못했습니다.
- **PDB**는 별도의 디버그 형식이며 DWARF를 담는 컨테이너가 아닙니다.
- **WASM** — `clang --target=wasm32 -g -c`로 만든 오브젝트에 `.debug_info`·`.debug_line` 등이 custom section으로 들어갔습니다(`llvm-objdump -h`).

```bash
# macOS — dSYM 안의 DWARF 보기
llvm-dwarfdump MyApp.dSYM/Contents/Resources/DWARF/MyApp
```

LLVM 도구는 이 형식들을 모두 읽지만, pyelftools는 ELF 파서라서 Mach-O·WASM 파일은 열지 못합니다.

## 표준 진행 상태

2026-11-16에 확인한 [공식 사이트](https://dwarfstd.org/)는 "Version 6 of the standard is currently under development"라고 적고, Version 6 working draft 스냅샷과 검토 중인 이슈 목록을 따로 링크합니다. 현재 발행된 최신판은 이 시리즈가 인용한 DWARF 5(2017-02-13)입니다.

## 운영 권장 셋업

이 장의 도구를 한 흐름으로 묶은 구성 예시입니다.

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

핵심은 배포한 바이너리와 debug 산출물이 build-id로 짝지어 보관되는 것입니다. 한 가지 주의할 점은 `.dwp`의 서빙입니다. elfutils debuginfod는 build-id로 `debuginfo`·`executable`·`source`를 제공하는데, split DWARF의 `.dwp`는 DWO ID로 찾으므로 이 흐름에서는 `.dwp`를 실행 파일 옆에 두거나 디버거의 검색 경로에 넣는 절차를 따로 둡니다.

## 직접 확인 — split·압축·참조 해석

macOS의 clang 23.1.5로 x86-64 Linux ELF 오브젝트를 만들어, 일반 DWARF·split 산출물·zlib 압축 파일을 비교하고 같은 Python 파서로 읽습니다. debuginfod·dwz·GDB의 탐색은 앞 절에서 게스트로 따로 돌렸습니다.

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

```text
$ ls -l full.o split.o split.dwo package.dwp compressed.o
-rw-r--r--@ 1 hawk  wheel  3600 11월 16 13:48 compressed.o
-rw-r--r--@ 1 hawk  wheel  3544 11월 16 13:48 full.o
-rw-r--r--@ 1 hawk  wheel  1488 11월 16 13:48 package.dwp
-rw-r--r--@ 1 hawk  wheel  1216 11월 16 13:48 split.dwo
-rw-r--r--@ 1 hawk  wheel  3248 11월 16 13:48 split.o
$ llvm-dwarfdump --verify full.o | tail -1
No errors.
$ python3 elf-summary.py full.o
functions= [('leaf', 4), ('main', 23)]
observed_origins= ['leaf', 'value', 'wrapper']
$ python3 elf-summary.py compressed.o
functions= [('leaf', 4), ('main', 23)]
observed_origins= ['leaf', 'value', 'wrapper']
```

pyelftools 0.32는 압축된 `.debug_info`(`C` 플래그, 0xa9 → 0x84바이트)를 투명하게 풀어 같은 결과를 냈습니다. `functions`에 `wrapper`가 없는 것은 `-O2`에서 `wrapper`의 독립 사본이 `DW_AT_name` 없이 `DW_AT_abstract_origin`만 가진 concrete DIE로 나오기 때문입니다. 이름은 abstract DIE에 있으므로, 함수 크기를 빠짐없이 세려면 origin을 따라가 이름을 가져와야 합니다. `observed_origins`의 `value`는 인라인된 인자의 `DW_TAG_formal_parameter`가 가리킨 origin입니다.

## 정리

- DWARF 크기 문제: split-DWARF (분리), dwz (중복 제거), `-gline-tables-only` (line만).
- Split-DWARF: 링크 입력에서 디버그 본체를 빼고, `.dwo`/`.dwp`를 따로 보관해야 합니다.
- dwz: 중복 DIE를 partial unit으로 공유합니다. 예제에서 `.debug_info`가 0x4fa → 0x2ee로 줄었고, Debian 디버그 파일도 dwz 공용 파일을 씁니다.
- Build-id가 *바이너리 정체성* — debuginfo 매칭의 핵심.
- debuginfod로 *네트워크 자동 다운로드*.
- ELF 압축 헤더·SHF_COMPRESSED와 옛 GNU .zdebug_* 방식을 구분합니다.
- pyelftools로 압축 섹션까지 읽는 자체 분석 도구를 만듭니다.
- `llvm-dwarfdump --statistics`로 위치 커버리지를 수치로 봅니다.
- `--verify`로 도구 체인 검증.
- 운영 셋업은 build-id로 바이너리와 debug 산출물을 짝짓는 것이 중심이고, split DWARF를 쓰면 `.dwp` 보관 경로를 따로 정합니다.

## 시리즈 정리

- **Ch 1** ELF — 한 파일 두 시각 (섹션/세그먼트), 헤더, dynamic linking.
- **Ch 2** DWARF 개관 — DIE/abbrev, TAG/AT/FORM 카탈로그.
- **Ch 3** `.debug_line` — PC↔소스의 바이트코드 VM.
- **Ch 4** `.debug_loc` — 변수 위치의 스택 머신 표현.
- **Ch 5** CFI — 콜스택 unwinding의 표.
- **Ch 6** (이 장) 도구·기법 — split/dwz/debuginfod/pyelftools.

이 시리즈로 디버거가 읽는 주요 데이터(섹션·심볼·DIE·줄 표·위치 식·CFI)를 실제 바이트로 확인했습니다. GDB/LLDB의 `bt`·`print`·`break`가 무엇을 근거로 답하는지는 이 데이터를 따라가면 보입니다.

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
