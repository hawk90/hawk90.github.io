# 공개 글 AdSense 평가 — 루프 12

> 대상: 공개 글 10편 (DWARF and ELF Internals `seriesOrder` 1~6, Embedded C++ for Real Systems `seriesOrder` 0~3)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 열두 번째 루프다. 대상은 `src/content/blog/tools/debugging/dwarf-elf/`의 `chapter01-elf-overview.md`~`chapter06-split-dwarf-tools.md` 6편(시리즈 전체)과 `src/content/blog/embedded/embedded-cpp/`의 `00-preface.md`~`part1-03-runtime-requirements.md` 4편이고 모두 공개 글이다. 두 시리즈가 섞여 있어 표의 파일명 앞에 디렉터리를 붙였다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `dwarf-elf/chapter01-elf-overview.md` | 10 | 12 | 6 | 10 | 6 | 5 | 2 | **51** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `dwarf-elf/chapter02-dwarf-overview.md` | 11 | 12 | 7 | 8 | 7 | 6 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `dwarf-elf/chapter03-debug-line.md` | 13 | 12 | 7 | 10 | 8 | 6 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `dwarf-elf/chapter04-debug-loc.md` | 14 | 13 | 6 | 10 | 7 | 7 | 3 | **60** | 미검증 | 보강 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `dwarf-elf/chapter05-cfi-eh-frame.md` | 14 | 12 | 6 | 10 | 8 | 7 | 3 | **60** | 오류 확인 | 우선 조치 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `dwarf-elf/chapter06-split-dwarf-tools.md` | 12 | 11 | 6 | 6 | 7 | 6 | 2 | **50** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `embedded-cpp/00-preface.md` | 8 | 11 | 4 | 10 | 6 | 5 | 1 | **45** | 미검증 | 보강 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `embedded-cpp/part1-01-cpp-vs-c.md` | 12 | 11 | 7 | 11 | 6 | 5 | 1 | **53** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `embedded-cpp/part1-02-compiler-flags.md` | 11 | 11 | 6 | 10 | 7 | 7 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `embedded-cpp/part1-03-runtime-requirements.md` | 11 | 12 | 6 | 8 | 6 | 5 | 1 | **49** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |

평균 53.3점(10편 합 533), 범위 45~60점이다. 판정은 우선 조치 7편(dwarf-elf ch01·02·03·05·06, embedded-cpp part1-02·1-03), 보강 2편(dwarf-elf ch04, embedded-cpp 00-preface), 병합 검토 1편(part1-01)이다. 80점 이상 글과 `factcheck: 검증됨` 글은 없다. 오류 확인은 7편이고 모두 원문 내부 모순(출력끼리, 산술, 코드 대 산문, 표 대 산문)으로 판정했다. 점수 구간으로는 ch04·ch05가 보강(60~79)이고 나머지 8편이 병합 검토(40~59)다. 00-preface는 시리즈 허브라 루브릭 5절에 따라 병합 검토 대신 보강으로 둔다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체와 다음 편·관련 항목·본문 내부 링크 대상 파일의 존재·제목·seriesOrder·draft 여부, 일부 그림 파일 존재까지이고, 렌더링·광고 배치·외부 링크 응답은 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `dwarf-elf/chapter01-elf-overview.md` | 52 | 51 | -1 | 없음 |
| `dwarf-elf/chapter02-dwarf-overview.md` | 53 | 53 | 0 | 없음 |
| `dwarf-elf/chapter03-debug-line.md` | 58 | 58 | 0 | 없음 |
| `dwarf-elf/chapter04-debug-loc.md` | 62 | 60 | -2 | 없음 |
| `dwarf-elf/chapter05-cfi-eh-frame.md` | 61 | 60 | -1 | 없음 |
| `dwarf-elf/chapter06-split-dwarf-tools.md` | 50 | 50 | 0 | 없음 |
| `embedded-cpp/00-preface.md` | 47 | 45 | -2 | 없음 |
| `embedded-cpp/part1-01-cpp-vs-c.md` | 53 | 53 | 0 | 없음 |
| `embedded-cpp/part1-02-compiler-flags.md` | 55 | 54 | -1 | 없음 |
| `embedded-cpp/part1-03-runtime-requirements.md` | 49 | 49 | 0 | 없음 |

1차 합 540에서 최종 533으로 7점 내려갔다. 부풀림(AP-C-24) 판정은 10편 모두 없음이다.

- 기각한 오류 확인: 0건. 다만 ch05에서 평가자가 DWARF 5 명세(Table 7.29)로 확인했다는 334행(DW_CFA_GNU_args_size 표준화)·419행(DW_CFA_AARCH64_negate_ra_state 표준화) 두 건은 재검에서 명세를 다시 열지 않아 uncertainties로 옮겼다. ch05의 오류 확인은 글 내부 모순 두 건으로 유지된다.
- 추가한 오류 확인: 6건, 6편.
  - ch01: 143행 GNU_EH_FRAME(오프셋 0x1cee4, 크기 0xac4) vs 220행 .eh_frame_hdr(0x1ced8, 0xad0). 173행이 PT_GNU_EH_FRAME을 '.eh_frame_hdr 위치'로 정의해 둘이 같아야 한다. 평가자가 본 네 건에 더한 다섯 번째 근거다.
  - ch02: 239~241행 .debug_info 오프셋 vs 216~219행 Abbrev 2와 407행 data1 크기(0x2a+4=0x2e≠0x31). LEB128 주 근거에 붙인 보조 근거다.
  - ch03: 223행 '10개 매핑이 약 12바이트' vs 215~219행 line program이 emit하는 3행. 평가자는 B·uncertainties에만 두었다. 보조 근거로 올렸다.
  - ch05: 244행 `sub rsp,0x10`·256행 CFA=rbp+16 vs 257~258행 '# leave 직전' CFA=rsp+8. 명세 대조 대신 글 내부 모순을 주 근거로 다시 세웠다.
  - part1-02: 92행 '-fno-exceptions면 throw 문이 컴파일 에러' vs 97~101행 throw가 든 같은 divide 함수(84~87행)의 '-fno-exceptions: 32 B'. 판정이 병합 검토 → 우선 조치로 바뀌었다.
  - part1-03: 85~86행 표(newlib-nano ~20 KB, picolibc ~10 KB)·195행 vs 210행 'picolibc는 newlib-nano보다 2-3KB 더 작습니다'. 평가자는 측정 조건 차이 가능성으로 uncertainties에 두었지만 둘 다 라이브러리 일반 크기 진술이라 동시에 참일 수 없다. 판정이 병합 검토 → 우선 조치로 바뀌었다.
- 점수 변경: ch01 E 7→6(제목의 '구조 추적'을 하는 절이 없음), ch04 D 11→10(gdb-lldb ch11 62~107행·ch12 439·441행·dwarf-elf ch02 554행과 반복)·E 8→7('분석'인데 덤프를 읽는 예가 없고 15행과 55행 범위가 다름), ch05 C 7→6(257~258행 출력이 같은 블록과 맞지 않음), 00-preface F 6→5(242행 옛 제목 라벨, 허브 목차 링크 0개)·G 2→1(참고자료가 본문 주장과 연결 0건), part1-02 B 12→11(확인된 내부 오류).
- 근거 정정: D 비교 줄 번호를 직접 연 줄로 바꿨다(ch02의 gdb-lldb ch12 48~62·68~90·505~520·532행, ch03의 ch06 112~120행, ch05의 ch06 361행, ch06의 ch12 362~370·398~413행, 00-preface의 part1-02 29~57행·part1-01 27·143행, part1-02의 part1-01 155~175·302행, part1-03의 part3-01 62~68행·part8-10 90~106·233행). ch05 D에서 줄 번호 근거 없이 언급된 part1-07은 뺐다. 점수는 그대로다.
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목과 대조했다. 감점 원인은 틀린 장 번호(ch01 445행 'Ch 6'), 옛 제목 라벨(00-preface 242행), 링크 없는 draft 대상 항목(part1-01 307행 GoF Singleton), 대상 내용과 다른 라벨(part1-03 309행)이다.

## 글별 근거

### `dwarf-elf/chapter01-elf-overview.md` — 51점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(0a9dd7bc, be973200, ac24bb76, 49f2a443, 400892d7, c99833a1, 35e57912, 60ec7a24, eb164047)에 1차 자료 대조 커밋이 없다. 같은 /usr/bin/ls에 대한 readelf 출력끼리 동시에 참일 수 없다.
- 56행 'Start of section headers: 151456'(=0x24fa0) vs 197행 'starting at offset 0x24f60'(=151392)
- 63행 'Section header string table index: 31' vs 232행 [31]은 .strtab이고 32개 섹션(201~232행)에 .shstrtab이 없음
- 230행 .gnu.build.attrib(크기 0x5ae8)와 231행 .symtab(크기 0x8298)의 오프셋이 둘 다 0x023210이라 겹침
- 138행 RW LOAD 오프셋 0x21890, FileSiz 0x11c0(끝 0x22a50) vs 222~227행 섹션이 0x21890~0x231e0(0x1950)을 차지. MemSiz 0x26e0은 228행 .bss 끝과 맞아 FileSiz만 어긋남
- 143행 GNU_EH_FRAME(0x1cee4, 0xac4) vs 220행 .eh_frame_hdr(0x1ced8, 0xad0). 173행이 둘을 같은 것으로 정의

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 68~120행 Elf64_Ehdr·e_ident·e_type·e_machine, 150~176행 Elf64_Phdr·p_type, 237~286행 Elf64_Shdr·sh_type·sh_flags, 366~393행 Elf64_Sym은 `<elf.h>`와 gABI를 옮긴 카탈로그다. 이 글의 해석은 110행(PIE라 ET_DYN이고 file이 shared object라고 하는 이유), 182행(p_paddr가 베어메탈 LMA), 455~461행(checksec 항목과 ELF 메타데이터 대응 표) 정도다. 분석의 바탕인 readelf 출력(43~63, 125~145, 196~232행)은 서로 맞지 않는다. 앵커 part1-04(A 10)와 같은 구간이다. |
| B | 12 | 66~487행이 헤더 → Program Header → Section Header → .dynamic·PLT/GOT → Symbol → Build-ID → NOTE → checksec → 변형 → 도구 표 순서로 description(5행)의 항목을 모두 지난다. 그러나 63행이 가리키는 .shstrtab이 섹션 표에 없고, 재배치는 29행과 260~261행 표 칸뿐이다. 332행 lazy binding과 452행 Full RELRO 예가 같은 ls를 두고 이어지는데 관계 설명이 없다. 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 6 | readelf -h/-l/-S/-d/-s/-n(43, 125, 196, 291, 351, 400·421행), checksec(450행), build-id로 debuginfo를 찾는 셸 2줄(414~415행)은 다시 돌려 볼 수 있다. 배포판·binutils 버전·ls 빌드가 없어 루브릭 3-1에 따라 C ≤ 8. 출력끼리 맞지 않고(56 vs 197, 63 vs 232, 230 vs 231, 138 vs 222~227, 143 vs 220행), 401행 Build ID는 잘려 있어 414행 awk 결과를 확인할 수 없다. 앵커 part1-04(C 6)와 같은 구간이다. |
| D | 10 | 같은 시리즈 다음 글 `chapter02-dwarf-overview.md`는 DIE·abbrev가 주제라 겹치지 않는다. 다른 시리즈와는 겹친다. (1) `embedded/modern-recipes/part3-03-elf-format.md` 24~46행(ELF 구조 표, '같은 ELF가 두 시각')과 62~76행(symbol 필드·binding·type)이 이 글 31~38·364~393행과 같은 질문에 답한다. (2) `tools/debugging/embedded/chapter05-elf-map.md` 21~26행 '섹션 vs 세그먼트'가 31~38행과 겹친다(그 글은 베어메탈 MAP 파일 중심). (3) build-id(397~416행)는 `dwarf-elf/chapter06-split-dwarf-tools.md` 124~160행과 겹친다. `gdb-lldb/chapter12-dwarf.md` 14행이 깊은 ELF 설명을 이 글로 넘겨 역할은 분명하다. |
| E | 6 | 제목 키워드 Section(193~286행)·Segment(122~191행)·Symbol Table(348~395행)과 description의 dynamic linking(288~346행)·build-id(397~416행)는 다룬다. 제목이 약속한 '구조 추적'은 하지 않는다. 섹션→세그먼트 매핑(readelf -l의 Section to Segment mapping)을 따라가는 절이 없고 본문은 구조체·값 카탈로그와 서로 맞지 않는 출력 예다. 루브릭 172행('추적' 약속에 개념 소개 수준이면 3~5)에 가깝지만 절마다 출력이 있어 6. |
| F | 5 | 503행 다음 장 예고(Ch 2 DWARF 개관)는 seriesOrder 2 `chapter02-dwarf-overview.md`와 맞다. 507행, 508행 'Embedded Debugging Ch 5: ELF / MAP'(대상 `chapter05-elf-map.md`, seriesOrder 5)도 맞다. 그러나 445행 '(이 시리즈 Ch 6에서 자세히)'는 틀렸다. 이 시리즈 Ch 6은 split-DWARF·dwz·debuginfod·pyelftools이고 NT_PRSTATUS는 postmortem 시리즈 Ch 2 주제다(`postmortem/chapter01-core-generation.md` 411행). 틀린 장 번호 안내라 F ≤ 5. audit:reading은 돌리지 않았다. |
| G | 2 | 509~512행 관련 항목에 gABI, elf(5), Oracle Linker and Libraries Guide, glibc elf.h 링크가 있지만 23행 연도, 279~286행 sh_flags, 340~344행 검색 순서, 395행 malloc WEAK 같은 본문 주장과 이어지지 않는다. gABI 판(4+)은 URL에만 있고 readelf 출력의 binutils·배포판 버전이 없다. |

uncertainties:
- 13행 '50년 가까이'는 23행 '1990년 도입'과 맞지 않는다(2026년 기준 36년). 산문 표기 실수로 보고 오류 확인 근거에는 넣지 않았다.
- 23행 '1995년 TIS로 정식 표준화'의 연도와 판은 1차 자료로 확인하지 않았다.
- 54행 Entry point 0x67d0은 215~217행 기준 .plt.sec(0x5e30~0x6c00) 안에 있고 .text(0x6c00~) 밖이다. 동시에 참일 수 없는 진술은 아니라 불확실로 둔다.
- 136행 R E LOAD 끝(0x17e85)과 218행 .fini 끝(0x17ba5), 137행 R LOAD 끝(0x20b40)과 221행 .eh_frame 끝(0x204c0)이 다르다. 패딩일 수 있다.
- 340~344행 검색 순서 표에 DT_RUNPATH가 있으면 DT_RPATH를 무시한다는 조건이 없다. ld.so(8)로 확인하지 않았다.
- 395행 'malloc·fork가 WEAK, __libc_malloc이 strong'과 LD_PRELOAD 설명은 glibc 소스로 확인하지 않았다.
- 286행 'COMPRESSED (.zdebug_*)': SHF_COMPRESSED는 .debug_* 이름을 유지하고 .zdebug_*는 GNU 옛 방식이라는 기억이 있으나 확인하지 않았다.
- 318행 'DT_INIT / DT_FINI = C++ ctor/dtor'는 단순화일 수 있다(298행 출력에 INIT_ARRAY가 있음).
- 332행 lazy binding과 452행 Full RELRO가 같은 ls에서 맞는지는 307행 .dynamic 출력이 잘려 FLAGS를 볼 수 없다.
- 182행 'p_paddr는 커널이 사용 안 함', 404행 'build-id 기본은 SHA-1 of section content'는 binfmt_elf 소스·ld 문서로 확인하지 않았다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토)으로는 병합 대상 없음. 시리즈 첫 장이고 `gdb-lldb/chapter12-dwarf.md` 14행이 깊은 ELF 설명을 이 글로 넘긴다. 다음 조치는 보강이다. 실제 한 바이너리에서 readelf 출력을 다시 뽑고 환경(배포판·binutils 버전)을 적고, 445행 장 번호를 고친 뒤 다시 채점한다. `part3-03-elf-format.md`·`embedded/chapter05-elf-map.md`와 겹치는 섹션/세그먼트 설명은 정본을 정해 링크로 넘길지 따로 검토한다.

### `dwarf-elf/chapter02-dwarf-overview.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log 11개 커밋(eb164047 신규 작성, 60ec7a24, c99833a1, 400892d7, 49f2a443, ac24bb76, be973200, fdb5f3f6 중복 정리, 28524a9d·68525f0c, 0a9dd7bc)에 1차 자료 대조 커밋이 없다. 본문 내부 산술이 맞지 않는다.
- 467행: 624485를 `0b100110000111011100101`로 적었지만 이 2진수는 0x130EE5 = 1248997이다(624485 = 0x98765 = 0b10011000011101100101). 471행 첫 청크 `0100101`(0x25)에 464~465행 규칙대로 MSB 1을 붙이면 `10100101`(0xA5)
- 472·473행: 첫 바이트 `11100101`(0xE5). 472~473행 E5 8E 26을 479~489행 decode_uleb128로 풀면 624485가 되므로 467·471행과 동시에 참일 수 없다
- 보조: 239~241행 .debug_info 오프셋 vs 216~219행 Abbrev 2(약어 코드 + strx1 + data1 + data1)와 407행 'data1 = 1바이트'. 0x2a DIE는 4바이트라 다음 DIE는 0x2e여야 하는데 241행은 0x31

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 이 글만의 부분은 abbrev 정의(200~233행)와 .debug_info 나열(237~244행)을 짝지은 절, DWARF 5 CU 헤더 구조체(163~172행), CU 종류(181~188행), LEB128 절(458~492행), GCC·Clang 표(549~556행)다. 254~456행 TAG·AT·FORM 표는 분량의 3분의 1을 넘지만 표준 이름에 한 줄 뜻을 붙인 목록이다. 49~63행 섹션 표·73~111행 DIE 트리·523~541행 pyelftools는 gdb-lldb Ch 12와 거의 같다. 568행 '도구 호환성 문제의 원인이 되기도'처럼 사례 없이 끝나는 문장이 있다. |
| B | 12 | 섹션 목록 → DIE → dwarfdump → CU 헤더 → abbrev → TAG/AT/FORM → LEB128 → .debug_str → DWARF64 → pyelftools → 컴파일러 차이 → version 혼재 → 정리(570~581행)로 description의 항목을 모두 다룬다. 그러나 LEB128 예시(467·471행)가 472~473행과 어긋나고, 239~244행 오프셋이 FORM 크기 합과 맞지 않으며(0x2a+4≠0x31, 0x31+4≠0x37, 0x37+7≠0x40), 239행 producer=0x123은 206행 DW_FORM_strx1(1바이트 인덱스)에 담을 수 없다. AP-C-24 상한 13에서 핵심 예시 오류로 12. 512행 절 제목 'ELF 형식 vs CIE 형식'은 내용(514~519행 endianness·DWARF64)과 맞지 않는다. |
| C | 7 | readelf·llvm-dwarfdump 명령(36·122·565행), pyelftools 스크립트(523~541행), ULEB128 디코더(477~490행)가 있다. 출력에 컴파일러 옵션·대상 환경이 없고, 37~44행 readelf 출력은 .debug_info 크기 52431892가 다음 섹션까지 오프셋 차(0x6419)보다 커서 실제 출력으로 보기 어렵다. 551·554·558행 버전 경계는 출처 없는 구체 수치라 C ≤ 8. 예시 산술이 틀려 7. |
| D | 8 | 같은 시리즈 `chapter01-elf-overview.md`(ELF)와 `chapter03-debug-line.md`(line VM)는 역할이 갈린다. `gdb-lldb/chapter12-dwarf.md`와 크게 겹친다: 36~44행 ↔ Ch 12 33~42행(섹션 번호·오프셋 동일), 49~63행 ↔ 48~62행, 73~111행 ↔ 68~90행(low_pc 0x401000·high_pc 0x401200·main 0x401120 동일), 122~152행 ↔ 95~107행('clang version 17.0.0'·0x0000000c 동일), 254~322행 ↔ 110~133행, 192~248행 ↔ 135~152행, 523~541행 ↔ 505~520행, 551·558행 ↔ 532행. 이 글에만 있는 것은 AT·FORM 카탈로그, LEB128, CU 헤더, .debug_str·DWARF64 절이다. fdb5f3f6 이후에도 도입 절이 반복이라 5~9 구간. |
| E | 7 | 제목 'DIE 트리와 .debug_abbrev'와 description 'DIE/abbrev 인코딩, 컴파일 유닛, TAG/AT/FORM 카탈로그'를 67~456행이 다룬다. 13행 질문('GDB가 print x를 어떻게 아는가')의 답은 155행 한 문장에서 끝나고 이후는 카탈로그이며 512행 절 제목이 내용과 다르다. |
| F | 6 | 585행 다음 장 'Ch 3 — .debug_line 바이트코드 VM'은 seriesOrder 3 `chapter03-debug-line.md`와 맞다. 589행 Ch 1, 590행 Ch 3, 591행 GDB and LLDB Ch 12(seriesOrder 12) 라벨이 대상과 맞다. 65행 범위 안내와 53·56·59행 Ch 3·4·5 안내가 있다. 73~111행 트리 블록이 74~83행 들여쓰기와 84행부터 ├─ 기호로 섞여 구조가 깨지고, 512행 절 제목 불일치, 전제 지식(Ch 1) 안내 부재로 7 이상은 주지 않았다. |
| G | 2 | 592~595행 DWARF 5 표준 PDF·llvm-dwarfdump 문서·pyelftools·Eli Bendersky 글은 관련 항목 목록일 뿐 본문 주장(23~27행 연표, 183행 DW_UT_type, 551행 기본 버전)에 절로 연결되지 않는다. 버전 표기는 131행 'clang version 17.0.0'과 551·554행뿐이다. |

uncertainties:
- 23~27행 DWARF 1~5 연표(1988 Bell Labs 등)는 표준 문서로 확인하지 않았다.
- 183행 'DW_UT_type 타입 정의 전용 (.debug_types)': DWARF 5에서 type unit은 .debug_info에 들어가는 것으로 기억하나 확인하지 않았다. 439행 DW_FORM_ref_sig8의 '.debug_types'도 같다.
- 263행 DW_TAG_partial_unit을 'header file'로 설명한 것, 355행 DW_AT_bit_offset의 현행 여부는 미확인.
- 551행 'Clang 11+ 기본 DWARF 5'(기억상 Clang 14), 552행 Clang .debug_aranges 기본 미출력, 554행 DW_OP_entry_value 버전, 558행 'GDB <= 9' 경계는 미확인.
- 211행 DW_AT_high_pc DW_FORM_data4와 341행 'DWARF 4+: 길이'인데 78·136행은 high_pc를 절대 주소 0x401200으로 보인다. llvm-dwarfdump 표시 방식을 1차로 확인하지 않아 오류 근거로 쓰지 않았다.
- 37~44행 readelf 크기 열이 오프셋 간격보다 커서 합성 출력으로 보인다(같은 오프셋이 Ch 12 34~42행에도 있음).
- 77행 트리 CU low_pc 0x401000과 135행 dwarfdump CU low_pc 0x401120이 다르다(서로 다른 예시일 수 있음).

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토) 기준 병합 후보는 `src/content/blog/tools/debugging/gdb-lldb/chapter12-dwarf.md`지만 이 글이 FORM·LEB128·CU 헤더·.debug_str을 더 깊게 다루므로, 이 글을 없애기보다 Ch 12의 섹션 표·DIE·TAG·abbrev 절(32~152행)을 요약 + 이 글 링크로 줄이는 방향이다. 다음 조치는 보강: 467·471행 LEB128 예시와 239~244행 오프셋·strx1 값을 DWARF 5 표준(7.6절, 7.5절)으로 고치고, 37~44·122~152행 출력을 환경을 적은 실제 빌드 출력으로 바꾸고, Ch 12와 같은 도입 절(36~63행)을 줄인다.

### `dwarf-elf/chapter03-debug-line.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(35baac92, 0a9dd7bc, 28524a9d, be973200, ac24bb76, 49f2a443, 400892d7, c99833a1, 60ec7a24, eb164047)에 1차 자료 대조 커밋이 없다. 원문 안의 모순 두 건과 보조 근거 한 건이다.
- 212~215행 line program은 'DW_LNS_set_prologue_end'를 걸고 '(0x401120, line=2, prologue_end)'를 emit한다. 그런데 200행은 0x401120 'push %rbp'를 '# prologue'로 적었고, 318~322행은 push/mov/sub가 '사용자 코드 아님'이며 prologue_end는 그 뒤 첫 명령이라고 한다. 330행 'break f는 prologue_end 첫 명령에 BP라서 인자가 이미 스택에 있다'와 달리 인자 저장은 202행 0x401124 `mov %edi,-0x4(%rbp)`에서 일어난다
- 151행 '특수 opcode 한 바이트가 한 행을 emit', 23행 '1바이트로 한 행 추가' vs 458행 '수천 행이 수십~수백 바이트'. 행마다 최소 1바이트면 수천 행은 수천 바이트 이상이다
- 보조: 223행 '10개 매핑이 약 12바이트' vs 바로 위 215~219행 예가 emit하는 3행(+end_sequence)

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 이 글만의 것은 opcode_base=13·line_base=-5·line_range=14 헤더로 특수 opcode 세 개를 손으로 디코딩한 예(165~182행)다. 168·173·178행의 0x10·0x18·0x35 계산과 165행 범위는 산술이 맞다. square() asm과 line program 대응(190~221행), addr2line 검색 경계 예(242~251행)도 있다. 레지스터 표(33~46행), opcode 표(121~145행), DWARF 5 변화(99~113, 446~451행)는 명세 6.2절 정리 수준이다. 25행 역사 주장은 출처가 없고 핵심 실행 예(212~223행)가 모순을 안고 있어 13~19 구간 하단. |
| B | 12 | 헤더(52~81행) → file table(83~113행) → opcode(115~184행) → 실행 예(186~223행) → addr2line(225~263행) → 인라인(265~278행) → is_stmt·discriminator·prologue_end(280~330행) → .debug_line_str(332~347행) → pyelftools(349~373행) → crash log 후처리(407~432행)로 따라갈 수 있다. AP-C-24에 따라 B ≤ 13. 130행 const_add_pc에 min_inst_len 곱이 없고, 223행 매핑 수가 215~219행과 맞지 않으며, 367행 `file_idx - 1`은 101·449행의 DWARF 5 0번 인덱스와 맞지 않는다. 302·312행 '세 호출/세 후보'와 306~309행 4행 표도 어긋난다. |
| C | 7 | addr2line·llvm-dwarfdump·readelf 명령(255~261, 377~405, 420~430행)과 pyelftools 코드(351~371행)가 있다. 컴파일러·binutils·pyelftools 버전과 실행 환경이 없고 출력은 예시 주소다. 23행 '수십 KB'·'압축비 10배 이상', 442행 '1/10 이하', 184행 '평균 3-5 명령어'는 출처·환경 없는 수치라 C ≤ 8. 209행 line program은 '의사 코드'이고 실제 readelf 출력과 대조하는 절차가 없다. |
| D | 10 | `chapter02-dwarf-overview.md` 585행 예고('수천 줄의 PC↔소스 매핑이 수십 바이트')는 이 글 458행과 같은 주장이다. `chapter04-debug-loc.md`는 겹치지 않는다. `chapter06-split-dwarf-tools.md` 112~120행 -gline-tables-only 절은 이 글 434~444행과 문장이 거의 같다. 다른 시리즈 `gdb-lldb/chapter12-dwarf.md` 190행 레지스터 목록, 192행 '수천 줄이 수십 바이트', 203행 addr2line 예, 211행 is_stmt가 이 글 33~46·458·271~276·282~292행과 겹친다. ch12는 13행에서 스스로 빠른 참조라며 이 시리즈를 가리킨다. |
| E | 8 | 제목의 '.debug_line', 'Source-to-PC 매핑 바이트코드 VM'과 description의 '상태 머신, 표준/확장 opcode, file table, addr2line의 내부'가 27~48, 115~184, 83~113, 225~263행에서 다뤄진다. 대상 독자와 구체 문제(crash PC를 줄로 바꾸기)는 13행과 407행 이후에만 있어 9 이상은 주지 않았다. |
| F | 6 | 467행 다음 장 예고(Ch 4 .debug_loc)는 seriesOrder 4 `chapter04-debug-loc.md`와 맞다. 471행 Ch 2, 472행 Ch 4 라벨도 맞다. 411~413행 '**crash log:**' 라벨 뒤 내용이 비어 있고, 474행 'addr2line(1) man page'는 링크 없는 항목이며, 475행 라벨 'DWARF line number programs'와 URL 슬러그('how-debuggers-work-part-3-debugging-information')가 다르다. 전제 지식 안내도 없다. |
| G | 2 | 473행 DWARF 5 명세 링크는 관련 항목에만 있고 130행 const_add_pc, 101행 DW_LNCT_*, 145행 define_file deprecated 같은 본문 주장과 연결되지 않는다. 컴파일러·binutils·LLVM·pyelftools 버전 표기가 없다. |

uncertainties:
- 25행 'VM 모델은 1990년대 ANSI C standard committee가 … PostScript·PDF 영향'은 출처가 없다. DWARF 2(UNIX International PLSIG) 설계로 기억하지만 확인하지 않았다.
- 130행 DW_LNS_const_add_pc: 명세는 special opcode 255의 address 증분(min_inst_len 곱 포함)으로 정의하는 것으로 기억한다. DWARF 5 6.2.5.2로 확인하지 않았다.
- 223행 '약 12바이트': DW_LNE_set_address 하나만도 약 11바이트라 바이트 수도 맞지 않을 가능성이 있다(인코딩 길이 미확인).
- 367행 `lineprog['file_entry'][file_idx - 1]`은 DWARF 4 인덱싱이다. DWARF 5 바이너리에서 한 칸 어긋날 수 있다. pyelftools 버전별 동작은 미확인.
- 77행 'ARM=2 (Thumb)', 292행 '-Og는 더 많은 위치에 is_stmt=1', 312행 discriminator를 'info line'이 '세 후보'로 보여 준다는 설명은 GCC/GDB 문서로 확인하지 않았다.
- 442행 '크기 1/10 이하', 444행 '운영 빌드의 표준 옵션'은 출처·측정 없는 수치·일반화다.
- 475행 외부 글의 실제 제목은 열어 보지 않았다(URL 슬러그로만 판단).

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간으로는 병합 검토이나 병합 대상 없음. `chapter06-split-dwarf-tools.md` 112~120행과 겹치는 -gline-tables-only 절(434~444행)은 한쪽으로 모으는 것을 검토한다. `gdb-lldb/chapter12-dwarf.md`는 이 시리즈를 가리키는 빠른 참조라 병합 대상이 아니다. 다음 조치는 보강이다. 시리즈에서 .debug_line만 깊게 다루는 유일한 글이다. 212~223행 예제를 실제 readelf --debug-dump=line 출력으로 바꾸고 prologue_end 위치·458행 압축 수치·223행 매핑 수를 DWARF 5 명세와 실측으로 고친다.

### `dwarf-elf/chapter04-debug-loc.md` — 60점, 보강

confidence: 중간

factcheck: 미검증. git log 10개 커밋(0a9dd7bc slug 고정, 68525f0c 코드 펜스 산문 이동, 28524a9d 언어 태그, be973200 topic 메타, ac24bb76 제목 rename, f38a41a0 표 변환, 49f2a443 텍스트 블록 변환, 400892d7 linter, 60ec7a24 다이어그램, eb164047 시리즈 신설)에 DWARF 5 표준·컴파일러 출력·pyelftools 소스와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고 원문 안에서 동시에 참일 수 없는 두 진술은 확정하지 못해 의심은 uncertainties에 적었다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 고유한 부분은 277~325행 의사 코드 평가기(exprloc/sec_offset 분기, lit·reg·breg·fbreg·plus·stack_value·piece 처리), 360~366행 DW_OP_GNU_* → DWARF 5 대응 표, 386~399행 pyelftools LocationParser 스크립트, 403~421행 'optimized out' 원인 셋·해법이다. 57~134행 opcode 카탈로그는 표준 목록을 표로 옮긴 수준이고 49행 piece 예·48/182행 constu 42 예·195~212행 entry_value는 gdb-lldb ch12 262·270·275·441행과 같은 예다. 342행 '잘 안 쓰이지만 일부 컴파일러는 활용', 205행 '(CFI 또는 호출 사이트 메타)'는 흐린 설명이다. 앵커 part12-10(A 18)처럼 직접 계산해 낸 결론은 없어 13~19 구간 아래쪽. |
| B | 13 | 왜 식인가(17~30행) → 스택 머신(32~51행) → opcode(53~136행) → 예(138~238행) → location list·loclists(240~271행) → 평가 흐름(273~328행) → typed·frame_base·GNU 확장(330~368행) → 도구(370~401행) → 진단(403~421행) → 정리(445~455행)로 description의 세 키워드를 모두 다룬다. 15행은 '모든 DW_OP_* opcode의 의미'를 약속하고 55행은 '자주 보이는 것'으로 좁힌다. 21~28행 C 예제를 dwarfdump 결과로 잇지 않고, 299행 의사 코드가 DW_OP_reg에서 곧바로 return해 169행 reg+piece 식과 328행 piece 누적 설명을 처리하지 못한다. AP-C-24에 따라 B ≤ 13. |
| C | 6 | 372~382행 llvm-dwarfdump·readelf 명령과 386~399행 pyelftools 스크립트가 있지만 예상 출력이 없고, 스크립트는 390행의 `dwarf` 객체를 만드는 줄(ELFFile·get_dwarf_info)이 없어 그대로는 돌지 않는다. 246~249행 주소 구간과 141~162행 표현식은 바이너리·컴파일러 버전·옵션 없이 든 예다. 271행 '바이트가 절반', 212행 'GCC 8+ / Clang 11+'는 출처·환경 없는 수치라 C ≤ 8. |
| D | 10 | 같은 시리즈: `chapter03-debug-line.md`(465~467행이 이 글을 예고, 주제 분리), `chapter05-cfi-eh-frame.md`(232~238행 DW_OP_call_frame_cfa 정도만 겹침), `chapter02-dwarf-overview.md`(110행 fbreg(-16) ↔ 141행, 554행 'GCC 8+ / Clang 11+' ↔ 212행), `chapter06-split-dwarf-tools.md`(414행 optimized out 통계 ↔ 401행). 다른 시리즈 `gdb-lldb/chapter12-dwarf.md`: 230~239행 ↔ 240~253·418행, 248~256행 ↔ 42~49·57~134행, 262행 piece 문자열 ↔ 49행(동일), 270행 constu 42 ↔ 48·182행, 275·441행 ↔ 195~212행, 439행 ↔ 418·421행. `gdb-lldb/chapter11-practical-tips.md` 62~107행 'value optimized out' 절 ↔ 403~421행. 진단 절과 entry_value 설명이 세 글에 반복되지만 의사 코드 평가기·loclists LLE·typed op·GNU 대응 표로 역할은 구별된다. |
| E | 7 | 제목 'DWARF .debug_loc 분석 — Variable Location Expression VM'과 description의 '스택 머신 opcode, location list, DW_OP_entry_value'가 32~136, 240~271, 195~212행에서 다뤄진다. .debug_loclists(255~271행)까지 넓지만 13행에서 밝혀 과장은 아니다. '분석'에 비해 실제 바이너리를 덤프해 읽는 예가 없고, 15행 약속을 55행에서 좁혀 6~8 구간 가운데. |
| F | 7 | 459행 다음 장 예고 'Ch 5 — CFI'는 seriesOrder 5 `chapter05-cfi-eh-frame.md`와 맞다. 463행 Ch 3, 464행 Ch 5 라벨도 대상과 맞다. 421행 'GDB Ch 11'은 링크가 없지만 `gdb-lldb/chapter11-practical-tips.md` 87행 '레지스터 직접 보기'를 정확히 가리킨다. 15행 도입이 절 순서를 알린다. 465·466행이 같은 DWARF5.pdf를 절 번호 라벨만 바꿔 두 번 걸고 DIE·FORM 전제(chapter02) 안내가 없다. audit:reading·폰 폭은 보지 않아 9 이상은 주지 않는다. |
| G | 3 | 465·466행 DWARF 5 표준 PDF(§2.5, §2.5.1)와 467행 pyelftools locationlists.py 소스 링크가 opcode 카탈로그·파서 주장과 연결된다. 70·88·132~134행에 DWARF 4/5 구분이 있다. 212행 GCC 8+/Clang 11+, 368행 '오래된 GDB는 GNU만'에 출처가 없고 llvm-dwarfdump·pyelftools·GDB 버전 표기가 없어 4에 못 미친다. |

uncertainties:
- 162행 'r6 - 8 주소에 변수. r6이 frame pointer가 아닐 때'와 349행 'DW_AT_frame_base = DW_OP_reg6 ← rbp 그대로'가 같은 r6을 다르게 설명한다. 아키텍처를 밝히지 않아 모순으로 확정하지 못했다(x86-64 psABI 레지스터 번호로 확인 필요).
- 132·187행은 DW_OP_implicit_value를 '(DWARF 4)'로, 423·429행은 'DWARF 5의 DW_OP_implicit_value'로 적고, 432~441행 예는 DW_AT_const_value와 constu/stack_value만 보인다. '또는'으로 읽을 수 있어 오류로 확정하지 않았다.
- 299행 의사 코드가 DW_OP_reg에서 곧바로 return해 169행 식을 평가하지 못하는데 328행은 piece가 누적된다고 한다. 의사 코드가 '...'로 생략돼 있어 오류로 확정하지 않았다.
- 205행 entry value 복원이 'CFI 또는 호출 사이트 메타'를 쓴다는 설명: DW_TAG_call_site의 DW_AT_call_value가 주 경로라는 기억이 있다. DWARF 5 §2.5.1.7로 확인 필요.
- 212행 'GCC 8+ / Clang 11+'와 197행: 358·362행이 GCC가 DW_OP_GNU_entry_value를 DWARF 5 이전에 도입했다고 적은 것과 버전 하한이 맞는지 미확인.
- 246~248행 DWARF 4 .debug_loc의 '(empty)' 표기가 표준 형식인지 미확인.
- 271행 '바이트가 절반'은 출처·측정 없는 수치.
- 419행 '-g3 → 매크로 정보 + 더 풍부한 DWARF'가 optimized out 해법인지 미확인.
- 122·123행 DW_OP_skip/bra 인자 'sleb16' 표기가 표준의 2-byte signed constant와 같은 뜻인지 미확인.
- 396행 `parser.parse_from_attribute(loc_attr, cu['version'], die=die)` 시그니처가 현재 pyelftools와 맞는지 미확인.
- 15행 '모든 DW_OP_* opcode'와 55행 '100+ opcode 중 자주 보이는 것'의 범위 불일치, '100+' 개수 미확인.

### `dwarf-elf/chapter05-cfi-eh-frame.md` — 60점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(eb164047 작성, 60ec7a24·f38a41a0 다이어그램, 49f2a443·400892d7·28524a9d 서식, ac24bb76 제목, be973200 topic, 0a9dd7bc slug)에 1차 자료 대조 커밋이 없다. 글 내부 모순 두 건이다.
- 52행 표 `Undefined` = '알 수 없음 (보존 안 됨)', 203행 `DW_CFA_undefined` = 'reg는 알 수 없음' vs 385행 '`u` = undefined (변경 안 됨)'. '변경 안 됨'은 48·204행에서 same_value의 뜻이다
- 244행 `sub rsp,0x10` 뒤 256행 CFA=rbp+16 vs 257~258행 '# leave 직전'(0x40115a)의 `DW_CFA_def_cfa: r7 +8`(CFA=rsp+8). leave 전 rsp=rbp-0x10이라 CFA=rsp+0x20이어야 하고, 261·366행 '명령어가 끝난 직후 CFI 변경' 설명과도 맞지 않는다

평가자가 DWARF 5 명세(Table 7.29)로 확인했다는 334·419행 오류는 재검에서 명세를 다시 열지 않아 uncertainties에 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 고유한 부분은 86~94행 FDE 바이트코드를 99~103행 PC별 CFA·rbp·rip 표로 다시 풀어 보인 것, 221~235행 advance_loc·offset 6-bit 인라인 인코딩, 265~271행 .debug_frame/.eh_frame 비교 표, 399~407행 JIT 런타임 등록이다. 13·18·40·54행처럼 명사형으로 끊긴 요약이 많고 323~330, 344~350, 411~421행은 근거 없는 한두 줄 일반론이다. 332~338행 'DWARF 5의 변화'와 385·257행 오류가 분석 가치를 깎아 13~19 구간 아래쪽. |
| B | 12 | 왜 필요한가(21~36행) → CFA·register rule(38~62행) → CIE(108~149행) → FDE(151~166행) → 명령 카탈로그(168~217행) → 인코딩(219~235행) → 디스어셈블 대조(237~261행) → .eh_frame_hdr(276~303행) → 정리(423~435행)로 흐름은 완성됐다. 385·257행 내부 모순과 334·419행 버전 주장 문제로 정확성이 흔들리고(AP-C-24 B ≤ 13), LSDA·personality는 134~135행 표 한 줄씩뿐이다. |
| C | 6 | llvm-dwarfdump(68~94, 250~259행), objdump(239~248행), readelf frames-interp(376~383행) 출력이 있지만 컴파일러·버전·플래그·소스 코드가 없다. 같은 `my_prog`인데 86행 FDE는 pc=00401130…0040115e, 251·377행은 00401120…0040115c라 한 빌드 출력이 아니다. 257~258행은 244행과 맞지 않는 CFA를 'leave 직전'에 두어 손으로 만든 예로 보인다. C ≤ 8 상한 아래에서 출력 신뢰성 문제로 6. |
| D | 10 | 같은 시리즈 `chapter04-debug-loc.md`(232~235·350행 DW_OP_call_frame_cfa만), `chapter06-split-dwarf-tools.md`(361행 pyelftools CFI_entries 예가 387~397행과 일부 겹침), 다른 시리즈 `gdb-lldb/chapter12-dwarf.md` 277~333행과 크게 겹친다: 13행 ↔ 279행, 99~103행 ↔ 309~312행(같은 0x401130/131/134 주소·CFA 규칙), 110행 ↔ 321행(같은 문장), 153행 ↔ 322행, 344~348행 ↔ 317행, 297~301행 ↔ 331~333행(readelf 출력 동일). ch12 12~14행이 스스로 빠른 참조라며 이 시리즈로 넘겨 역할은 구분된다. |
| E | 8 | 제목의 .debug_frame·.eh_frame과 description의 CIE/FDE·CFA·register rule·.eh_frame_hdr 이진 탐색이 108·151·38·44·276행 절에서 다뤄진다. 15행이 약속한 'C++ 예외와의 관계'는 134~135·267·274·330행 몇 줄뿐이라 9 이상은 아니다. |
| F | 7 | 439행 다음 장 'Ch 6 (시리즈 마지막)'은 seriesOrder 6 `chapter06-split-dwarf-tools.md`와 맞고 6편이 마지막이다. 443행 Ch 4, 444행 Ch 6 라벨도 대상과 맞다. 54~60행 unwind 5단계, 99~103행 표가 글 고유 안내다. 전제 지식(Ch 2 DIE, Ch 4 CFA) 안내가 없고 렌더 확인을 하지 않아 7. |
| G | 3 | 445~448행 DWARF 5 §6.4, Itanium C++ ABI EH, LLVM libunwind, LSB eh_frame 링크는 글 끝 목록일 뿐 본문 주장과 연결되지 않는다. 본문에 도구·컴파일러 버전, ABI 판 표기가 없다. |

uncertainties:
- 334행 DW_CFA_GNU_args_size 표준화, 419행 DW_CFA_AARCH64_negate_ra_state DWARF 5 표준화: 평가자는 DWARF 5 Table 7.29로 오류를 확인했다고 했으나 재검에서 명세를 다시 열지 않았다. 판정 근거로는 쓰지 않았다.
- 270행 .eh_frame에서 length=0xFFFFFFFF를 'terminator'로 적었다(LSB에서는 length 0이 terminator라는 기억). 확인하지 않았다.
- 335행 DW_CFA_val_offset 'DWARF 5 도입'(DWARF 3 도입이라는 기억), 336·413행 augmentation "S"를 DWARF 5 새 기능으로 적은 부분은 확인하지 않았다.
- 133~135행 "zP"·"zL"을 단독 값처럼 나열한 것, 274행 -fno-asynchronous-unwind-tables와 예외 동작 관계는 GCC 문서·LSB로 확인하지 않았다.
- 319행 __builtin_return_address, 350행 perf 권장 이유, 366행 tail call, 421행 BTI 설명은 출처가 없다.
- 389~390행 pyelftools 예가 CU 루프 안에서 CFI_entries()를 반복해 CU 수만큼 중복 출력하는 것으로 보인다. 실행해 보지 않았다.

### `dwarf-elf/chapter06-split-dwarf-tools.md` — 50점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(eb164047 'Split from gdb-lldb Ch 12', 60ec7a24, 35e57912, c99833a1, 400892d7, 49f2a443, ac24bb76, be973200, 28524a9d, 0a9dd7bc)에 1차 자료 대조 커밋이 없다. 글 안의 출력끼리 동시에 참일 수 없다.
- 24~25행 `ls -la /usr/bin/clang-17` 출력: 파일 크기 156M
- 26~27행 같은 파일의 `size -A` debug 섹션 합계: 1234.5 MB

섹션 크기의 합은 파일 크기를 넘을 수 없다. 30행 '156MB 중 1.2 GB가 디버그 정보'도 산술로 성립하지 않고, 같은 행 '(debuginfo 패키지에 분리 저장)'도 같은 바이너리에서 1.2 GB를 읽었다는 27행과 맞지 않는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글에만 있는 부분은 pyelftools 활용 5종(248~374행: 함수 크기 상위 20, 미사용 함수, 변수 주소, 콜그래프, CFI), `llvm-dwarfdump --statistics`·`--verify`(400~428행), 운영 셋업 5단계(449~472행)다. 13행 크기 문제, 43~62행 split-DWARF와 skeleton, 124~143행 별도 debuginfo와 build-id, 182행 부분 다운로드는 gdb-lldb Ch12 문장을 거의 그대로 옮겼다. 447행 'DWARF 7 … 큰 도약은 없을 듯'은 근거 없는 전망이고 472행 '수십 시간 → 분 단위'는 출처 없는 효과 주장이다. 122행(-gline-tables-only가 '운영 빌드의 표준')과 451~455행(-g3 -gsplit-dwarf가 '대규모 운영의 표준') 사이 선택 기준이 없다. |
| B | 11 | 크기 측정(21행)에서 split-DWARF, dwz, line-tables, build-id, debuginfod, 압축, pyelftools, dwarfdump, 운영 셋업, 정리(474행)까지 흐름은 끝까지 간다. 300~302행은 `called`를 채우는 부분이 `...`라 305행 `unused`가 all_funcs와 같아지고, 323~326행 변수 주소 추출도 `...`로 끝난다. split-DWARF와 dwz의 한계(도구 지원, .dwo 경로 변경)가 없다. AP-C-24에 따라 B ≤ 13. |
| C | 6 | 실행할 수 있는 명령(43~44, 78, 101·106, 129~131, 170~179, 197행)과 Python 코드(225~372행)가 있다. 25~27행 출력은 서로 모순이라 관찰 결과로 쓸 수 없다. 68행 '50% 이상', 103행 '60~80%', 120행 '1/10 이하', 191행 '기본 1 GB', 215행 '30-50% 절감'은 출처·측정 환경이 없어 C ≤ 8. 402~411행 `--statistics` 출력은 임의 값으로 보이고 도구 버전이 없다. |
| D | 6 | 비교한 글: 같은 시리즈 `chapter05-cfi-eh-frame.md`, 다른 시리즈 `gdb-lldb/chapter12-dwarf.md`, `postmortem/chapter04-debuginfod-minidump-automation.md`. (1) Ch12와 겹침: 13 ↔ 338행, 43~44 ↔ 356~357행, 52~62 ↔ 362~370행, 116~122 ↔ 384~392행, 128~143 ↔ 398~413행(거의 글자 그대로), 182 ↔ 420행, 221~246 ↔ 501~522행. (2) postmortem Ch04와 겹침: 170 ↔ 140행, 187~188 ↔ 116~117행, 191 ↔ 120행('기본 1 GB'), 197 ↔ 148행, 201 ↔ 158행, 204 ↔ 161행('game changer'). (3) chapter05와는 CFI 추출(358~374행)에서만 만난다. 본문 약 절반이 두 글과 반복이라 5~9 구간. |
| E | 7 | 제목의 네 키워드를 모두 절로 다룬다(split-DWARF 34~91행, dwz 93~110행, debuginfod 165~204행, pyelftools 219~374행). description의 '분리·압축·네트워크 다운로드·자체 도구 작성'도 이행했다. 대상 독자가 정해져 있지 않고(308행 임베디드 flash, 451행 대규모 운영) 결론(476~485행)은 도구 목록에 가까워 9 이상은 주지 않았다. |
| F | 6 | 15행이 시리즈 마지막 장이라고 밝히고 487~496행이 Ch 1~6을 요약한다. 500~504행 Ch 1~5는 seriesOrder 1~5 제목과 맞고, 514행 `embedded/chapter05-elf-map.md`, 515행 `gdb-lldb/chapter01-intro-and-install.md`도 라벨과 맞다. seriesOrder 7 글이 없어 다음 편 링크가 없는 것은 맞다. 시리즈 뒤에 읽을 글 안내가 없고, 514~515행 내부 링크가 '외부 자료'에 섞여 있으며, 크게 겹치는 postmortem Ch04·gdb-lldb Ch12 링크가 없다. |
| G | 2 | 508~513행 DWARF 5 표준, pyelftools, llvm-dwp, dwz, debuginfod 링크는 끝 목록이다. 본문 주장에 연결된 출처는 95행 dwz 링크 하나다. 52행 skeleton unit, 157행 'sha1 (기본)', 217행 '공식 표준화'에 절·문서 위치가 없다. 도구 버전은 24행 clang-17과 212행 'GCC 12+'뿐이고 447행 'DWARF 6는 2024년 작성 중'은 시점이 지난 표기다. |

uncertainties:
- 211행 `-gz=zlib` 주석은 결과가 `.zdebug_info`라고 하는데 215행은 SHF_COMPRESSED를, 217행은 `.zdebug_*`를 옛 GCC 확장이라고 설명한다. `-gz=zlib`는 SHF_COMPRESSED이고 `.zdebug`는 `zlib-gnu`일 가능성이 있지만 확인하지 않았다. 481행 정리도 `.zdebug_*`를 대표로 든다.
- 217행 압축 섹션이 'DWARF 5에 공식 표준화'됐다는 주장: SHF_COMPRESSED는 ELF gABI 사항일 가능성이 있다. 확인하지 않았다.
- 157행 `--build-id` 기본 스타일 sha1, 163행 'CMake·Bazel·autotools가 자동으로 --build-id를 켠다'(배포판 GCC spec일 수 있음)는 확인하지 않았다.
- 191행 debuginfod 클라이언트 캐시 '기본 1 GB'는 elfutils 문서로 확인하지 않았다(postmortem Ch04 120행도 같은 주장).
- 110행 'Fedora·Debian·Ubuntu의 모든 debuginfo 패키지가 dwz 처리'는 확인하지 않았다.
- 345행 `cu.get_DIE_from_refaddr(origin.value)`: CU 상대 참조값을 절대 오프셋 함수에 넘기면 틀린 DIE를 얻을 수 있다. pyelftools API로 확인하지 않았다.
- 457행 `--build-id=sha1`이 컴파일 옵션 목록에 있다(`-Wl,`이 필요할 수 있음). 82행 GDB의 .dwp 검색 규칙도 확인하지 않았다.
- 122행과 451~455행이 서로 다른 '표준'을 제시한다. 표현이 느슨해 오류 확인으로는 올리지 않았다.
- 68·103·120·215·472행 수치는 출처와 환경이 없다.
- 447행 'DWARF 6는 2024년 작성 중'이 2026-10 기준 어떤 상태인지 확인하지 않았다(staleness 후보).

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토)의 병합 후보는 `gdb-lldb/chapter12-dwarf.md` 336~420·501~522행과 `postmortem/chapter04-debuginfod-minidump-automation.md` 96~163행이다. eb164047이 Ch12에서 쪼개 만든 글인데 원본 절이 남아 있으므로, 이 글을 정본으로 두고 Ch12·postmortem Ch04 쪽을 요약 + 링크로 줄일지 시리즈 단위로 정한다. 그 전에 24~30행 크기 출력을 실측으로 바꾸고 다시 채점한다.

### `embedded-cpp/00-preface.md` — 45점, 보강

confidence: 중간

factcheck: 미검증. git log 커밋 8개(0a9dd7bc slug 고정, be973200 topic 메타데이터, ac24bb76 제목 rename, 400892d7 linter 일괄, 6f4de6bc draft 전환, a2635240 Part 확장, 10395842 editorial polish, 469b8b74 최초 작성)에 1차 자료와 대조한 기록이 없다. 평가 중 GCC 문서 등 1차 자료를 열지 않았고 글 안에서 서로 맞지 않는 구체 진술도 찾지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 8 | 16~27행 도입은 'C++는 무겁다' 같은 통념 4개(20~23행)를 나열하고 27행 'zero-cost abstraction … 런타임 오버헤드는 없습니다'로 끝나는 일반론이다. 25행 '일부는 맞고, 일부는 틀립니다'에 어느 쪽이 맞는지 답이 없다. 이 글만의 것은 144~158행 집필 원칙(측정 가능한 주장, 대안 제시, C가 맞는 상황), 164~167행 핵심 질문 4개, 171~178행 대상 환경 표 정도다. 앵커 part6-09(A 10)보다 고유 예제가 적다. |
| B | 11 | 허브 역할 기준으로 본다. 45행 '총 5개 Part, 40개 글'과 Part별 개수(51행 8, 68행 10, 87행 10, 106행 8, 123행 4)의 합 40이 실제 디렉터리 40편과 맞는다. 로드맵(138~140행), 사전 지식(205~208행), 목표(233~238행)까지 갖췄다. Part 표(55~132행)에 링크가 없고 표 라벨 일부가 현재 제목과 다르다(75행 'Lock, Handle, ScopedXxx' vs part2-02, 119행 '의존성 주입, static' vs part4-08). 182~201행 플래그 블록은 각 플래그의 이유가 없다. AP-C-24에 따라 B ≤ 13. |
| C | 4 | 실행 가능한 것은 182~201행 makefile 플래그 블록 하나인데 컴파일러 버전·대상 보드·결과가 없다. 146행 '어셈블리 N줄, 사이클 M개'는 원칙만 말하고 측정이 없다. 148행 Godbolt 확인도 절차·예상 결과가 없다. |
| D | 10 | (1) `part1-02-compiler-flags.md` 29~57행 '임베디드 표준 플래그 셋'이 이 글 182~201행의 상위집합이다(-std=c++17·-fno-exceptions·-fno-rtti·-fno-threadsafe-statics·-Os·-flto·경고·-mcpu=cortex-m4 -mthumb -mfloat-abi=hard 겹침). (2) `part1-01-cpp-vs-c.md` 27·143행의 zero-cost 설명이 이 글 27행과 같은 주제다. (3) 다른 시리즈 허브 `embedded/performance-engineering/00-preface.md`(14·45·175·181·212·219·244행, 62행 '총 6개 Part, 53개 글')와 `embedded/rtos/practical-internals/00-preface.md`(14·31·45·163·169·193·200·218행, 47행 '총 5개 Part, 52개 글')가 이 글 H2(14·29·43·136·142·160·203·210·229행) 뼈대와 '총 N개 Part, M개 글' 문장(45행)을 공유한다. |
| E | 6 | title '… 임베디드 모던 C++ 시리즈 소개'는 본문과 맞는다. description(5행)은 '어디까지 C++를 써도 되는가?'를 묻고 'RAII, constexpr, no-exception 설계부터 lock-free 패턴까지 … 안전하게 C++를 쓰는 법'을 약속하는데, 본문은 157~158행과 176~177행 정도로만 답하고 나머지는 목차 표(74~77·97·114행)에 이름만 둔다. |
| F | 5 | 242행 다음 글 링크는 `part1-01-cpp-vs-c.md`(seriesOrder 1)로 대상은 맞지만 라벨 'Part 1-01: C++ vs C: 무엇이 다른가'는 ac24bb76 이전 옛 제목이다(현재 '임베디드 C++ vs C — 런타임·코드 크기·ABI 관점 비교'). 허브인데 Part 표 40행(55~132행)과 로드맵(138~140행)에 링크가 하나도 없고 75·119행 라벨도 현재 제목과 다르다. 사전 지식(205~208행)과 독자별 로드맵(138~140행)이 있어 3~5 상단 5. |
| G | 1 | 레퍼런스 절(210~227행)에 서적 4권·온라인 4곳·컨퍼런스 3개가 있지만 본문 주장과 하나도 연결되지 않는다. 판수는 215행 Real-Time C++ 4th ed만 있고, 214행 C++ Core Guidelines는 온라인 문서인데 '서적'에 들어가 있다. 175행 컴파일러와 182~201행 플래그 블록에 버전이 없고 225~227행 컨퍼런스는 링크·연도가 없다. |

uncertainties:
- 198~200행 -mcpu=cortex-m4 -mfloat-abi=hard에 -mfpu가 없다. part1-02 57행은 -mfpu=fpv4-sp-d16을 함께 쓴다. 툴체인 기본 FPU에 따라 달라지는지 GCC 문서로 확인하지 않았다.
- 27행 '런타임 오버헤드는 없습니다'의 단정이 part1-01 143행 'zero-cost가 아닌 영역도 있습니다'와 결이 다르다(다른 글과의 비교라 오류 확인 아님).
- 184행 기본 설정이 -std=c++17인데 표에는 C++20 기능(78행 consteval/constinit, 83행 Concepts)과 C++23(99행 std::expected)이 있다. 모순으로 보지 않았다.
- 215행 'Real-Time C++ (4th ed)' 판수와 214행 C++ Core Guidelines 분류는 확인하지 않았다.
- 187행 -fno-threadsafe-statics를 기본 설정에 넣은 근거가 본문에 없다. 기본값 권장이 맞는지 미확인.

병합 대상: 시리즈 허브(00-preface, seriesOrder 0)라 루브릭 5절에 따라 병합 검토 대신 보강. Part 표 40행에 각 글 링크를 걸고 표 라벨과 242행 다음 글 라벨을 현재 제목과 맞추고(75·119·242행 등), 182~201행 플래그 블록은 part1-02와 중복이므로 링크로 바꾸거나 대상 GCC 버전과 이유를 적고, description의 '어디까지 C++를 써도 되는가'에 허브 수준의 답(어느 Part가 어떤 결론을 내는지)을 둔다.

### `embedded-cpp/part1-01-cpp-vs-c.md` — 53점, 병합 검토

confidence: 중간

factcheck: 미검증. git log 커밋 7개(e9936346 최초 작성, 815510c8 다이어그램·정리, 39149f68 번역투 폴리싱, 400892d7 linter 일괄, ac24bb76 제목 변경, be973200 topic 메타데이터, 0a9dd7bc slug 고정)에 1차 자료 대조 기록이 없다. 원문 안에서 동시에 참일 수 없는 두 기술 진술은 찾지 못했다. 195행 -fno-rtti 환경과 206행 dynamic_cast 행의 충돌은 컴파일러 동작을 알아야 판단되므로 uncertainties에 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 Counter 생성자·멤버 함수가 사라지는 어셈블리 대조(65~91행), Gpio 템플릿과 C 매크로의 같은 출력(99~139행), 템플릿 인스턴스가 다른 타입이라 섞어 쓸 수 없다는 설명(141행), 'C가 여전히 옳은 자리' 다섯 기준(262~266행)이다. 기능별 비용 표(34~44행), 끄는 기능 목록(147~191행), 함정 6개(212~234행), Modern C++ 기능 표(240~254행)는 입문 자료의 표준 목록이다. 15행 요약, 28행 '정확히 아는 것이 핵심'은 일반론이고 185행 '대부분 무시할 수 있습니다'는 기준 없이 결론만 준다. |
| B | 11 | 문제 제기(19~28행) → 기능별 비용(34~46행) → 어셈블리 측정(52~141행) → 비용 영역(143~191행) → 크기 표(193~208행) → 함정 → C가 맞는 자리 → 공존 전략 → 정리(294~299행)로 흐름은 완성됐다. 26행 MISRA 두려움에는 답하지 않고(264행은 DO-178C만), 25행 디버깅은 288행 질문으로만 남는다. 제목의 ABI는 279행 한 문단 뒤 1-05로 넘긴다. 108행 주석 'RAII + 템플릿'인데 109~113행 코드에 RAII가 없고, 297행 정리의 비용 목록이 46행과 다르다. AP-C-24에 따라 B ≤ 13. |
| C | 7 | 56행 'ARM Cortex-M4, -O2, GCC 13'과 81~91·123~137행 어셈블리 출력으로 재현 단서는 있으나 빌드 명령이 없다. 193행 '실측' 크기 표(197~206행)는 195행 STM32F4·플래그만 있고 툴체인 버전·소스·측정 명령·libc가 없으며, 159행 '3-10KB', 169행 '수 KB', 179·226행 '50KB'도 출처·환경 없는 수치라 C ≤ 8. |
| D | 11 | 비교한 글: 같은 시리즈 `00-preface.md`, `part1-02-compiler-flags.md`, `part1-04-code-size-analysis.md`, 다른 시리즈 `embedded/rtos/practical-internals/part4-13-cpp-in-rtos.md`. 이 글 147~173행(예외·RTTI)이 part1-02 78~137행과 같은 주제이고 part1-02가 더 자세하다(94행 5-20KB·137행 1-5KB). 46·93행 zero-cost 설명은 preface 27행과 반복된다. part4-13 263~265행이 -fno-rtti·-fno-exceptions 효과를, 451행이 생성자·소멸자 인라인 zero-cost를 다룬다. part1-04 300·399행은 측정 중심이라 역할이 다르다. '어떤 기능이 공짜이고 C가 언제 맞는가'라는 개관 질문으로 구별되지만 각 절이 후속 편을 앞당겨 요약한다. |
| E | 6 | 제목의 '런타임·코드 크기·ABI 관점 비교' 중 런타임(34~44, 52~139행)과 코드 크기(193~208행)는 다루지만 ABI는 279행 한 문단 뒤 1-05로 넘긴다. description의 '측정 가능한 비교'는 출처·절차 없는 크기 표(197~206행)로 반만 이행된다. |
| F | 5 | 311행 다음 글(1-02 컴파일러 플래그)은 seriesOrder 2 파일과 맞다. 303~306행 관련 링크 4개(1-02, 1-04, 2-08 CRTP, 3-05)는 대상 제목과 맞고 165·187·268·279행 본문 링크 대상도 있다. 그러나 307행 'GoF 5: Singleton (avoid)'는 링크 없는 항목이고 대상 `programming/design/gof-design-patterns/item05-singleton.md`는 draft: true다. 같은 시리즈 `part4-08-singleton-alternatives.md`(seriesOrder 36)를 가리키지 않는다. 링크 없는 관련 항목이 공개되지 않은 글을 가리켜 F ≤ 5. |
| G | 1 | 본문에 1차 출처 링크가 없다. 버전 표기는 56행 'GCC 13'과 195행 플래그뿐이고 크기 표의 libc·FreeRTOS 버전·표준 라이브러리 구현이 없다. 252~254행 C++20·C++23 표기도 표준 문서 인용이 없다. |

uncertainties:
- 195~206행 크기 표(빈 main 240 B, UART 1.2 KB, FreeRTOS 18 KB, std::cout +52 KB, dynamic_cast +3 KB)는 소스·툴체인 버전·libc 없이 '실측'이라고 적었다. 실제 측정 여부 미확인.
- 195행 환경이 -fno-rtti인데 206행에서 dynamic_cast 1회 +3 KB를 측정값으로 둔다. GCC에서 -fno-rtti 상태의 다형 dynamic_cast가 컴파일되는지 확인하지 않았다.
- 159행 예외 '3-10KB', 169행 RTTI '수 KB'는 part1-02 94행 '5-20KB', 137행 '1-5KB', part4-13 263·265행 '~10%'·'10~20%'와 다르다(다른 글과의 불일치).
- 32행 '크게 네 가지'인데 34~44행 표에는 9행이 있다(산문 개수 표기).
- 108행 주석 'RAII + 템플릿'인데 코드에 RAII가 없다.
- 268행 '__libc_init_array 호출 전에는 C++ 객체를 생성할 수 없습니다'는 constexpr·지역 객체를 고려하면 과한 일반화일 수 있다.
- 230행 shared_ptr의 atomic 카운터는 대상 코어와 libstdc++ 설정에 따라 다르다. 미확인.
- 41행 예외 '런타임 비용 있음'은 table 기반 EH의 비throw 경로 비용과 구분하지 않았다. 미확인.
- 126·133행 어셈블리를 GCC 13 -O2로 실제 생성했는지 확인하지 않았다.

병합 대상: 병합 대상 없음. 'embedded C++ vs C'는 독립 검색 의도가 있고 허브는 00-preface가 맡아 이 글은 허브가 아니다. 다음 조치는 보강이다. part1-02와 겹치는 예외·RTTI 크기 수치(159·169행)는 part1-02로 넘기고, 195~206행 크기 표는 소스·툴체인·명령이 있는 측정으로 바꾸거나 TBD로 두며, 제목의 ABI 관점을 채우거나 제목을 좁힌다.

### `embedded-cpp/part1-02-compiler-flags.md` — 54점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 같은 글 안의 진술과 예시 출력이 동시에 참일 수 없다.
- 92행 '-fno-exceptions 효과: throw 문이 컴파일 에러가 됩니다'
- 97~101행 '같은 함수, 예외 켜짐 vs 꺼짐 (ARM Cortex-M4, -Os) … -fno-exceptions: 32 B'. 대상은 84~87행 divide 함수이고 85행에 `throw std::runtime_error`가 있다

같은 글 기준으로 throw가 든 이 함수는 -fno-exceptions에서 컴파일되지 않으므로 32 B 측정값은 나올 수 없다. git log(e9936346 최초 작성, 815510c8·39149f68 폴리싱, 400892d7 linter, ac24bb76 제목 변경, be973200 topic 메타데이터, 0a9dd7bc slug 고정)에 GCC/Clang 매뉴얼 등과 대조한 커밋이 없어 모순이 없었더라도 미검증이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | -fno-exceptions·-fno-rtti·-Os·-flto·gc-sections 설명(78~246행)은 GCC 매뉴얼과 입문 자료의 표준 목록이다. 이 글만의 것은 플래그를 하나씩 더한 누적 크기 표(391~400행), 최적화 레벨별 크기(199~206행), 함정 6개(350~372행), debug/release Makefile 분리(325~344행)다. 수치에 출처·재현 절차가 없고 407행 '5-10배'는 표(392·399행, 약 4.4배)와 맞지 않는다. 앵커 part7-05(A 9)보다 함정·누적 표가 구체적이다. |
| B | 11 | 표준 플래그 셋(29~57행) → 플래그별 효과·대안(62~319행) → 빌드 분리(321~346행) → 함정(348~372행) → 누적 측정(387~402행) → 정리 순서로 흐름은 갖췄다. threadsafe-statics의 race 조건(163~166행), LTO 비용(225~229행) 같은 한계도 일부 적었다. 97~101행 예시 출력이 92행과 함께 참일 수 없는 오류이고 407행도 표와 맞지 않아 11. |
| C | 6 | Makefile 조각(29~57, 252~266, 325~344행)은 그대로 쓸 수 있다. 측정값(98~101행, 199~206행 '한 임베디드 프로젝트 (STM32F4)', 389~400행 STM32F4·GCC 13, 279~281행 elf 142 KB / bin 64 KB)에 소스·링커 스크립트·라이브러리·측정 명령이 없다. 94행 '5-20KB', 137행 '1-5KB', 223행 '5-15%', 246행 '30-60%', 385행 '1-3KB'도 출처·환경이 없어 C ≤ 8. 98~101행은 같은 글 기준으로도 나올 수 없는 값이라 6. |
| D | 10 | 비교한 글: 같은 시리즈 `part1-01-cpp-vs-c.md`, `part1-03-runtime-requirements.md`, `part1-04-code-size-analysis.md`, 다른 시리즈 `embedded/modern-recipes/part8-10-code-size-optimization.md`, `embedded/rtos/practical-internals/part4-13-cpp-in-rtos.md`. 이 글 78~147행이 part1-01 155~175행과 같은 내용이고 함정 1(350~352행)이 part1-01 212~214행과 같다. -Os·gc-sections·LTO 절(185~246행)은 part8-10 47~80행과 같은 질문에 답한다. 120~166행은 part4-13 256~267행과 겹친다. part1-01 302행이 이 글을 플래그 정본으로 링크하고, -fno-use-cxa-atexit·경고·ARM ABI 플래그(168~183·248~319행)는 다른 글에 없다. |
| E | 7 | 제목의 -fno-rtti·-fno-exceptions·-Os와 description의 -flto를 모두 H2로 다룬다(78·120·185·215행). description의 '각 플래그가 실제 바이너리에 무엇을 하는가'는 출처 없는 크기 숫자뿐이고 map·disassembly 관찰이 없다. 제목은 '임베디드 C++' 일반인데 본문은 Cortex-M/GCC 중심(57·290~311·389행)이다. |
| F | 7 | 29~57행 표준 플래그 셋이 아래 H2(62·78·120·149·168·185·215·233·248·274·290행)와 대응하고 60행이 이를 안내한다. 76행 part1-08, 104·416행 part3-05, 147·417행 part3-08, 414행 part1-01, 415행 part1-04 라벨이 대상 제목과 맞는다. 421행 다음 글 part1-03은 seriesOrder 3이다. 전제 지식 안내가 없고 audit:reading을 돌리지 않아 9 이상은 주지 않는다. |
| G | 2 | 본문에 GCC·Clang 매뉴얼, ARM 문서 같은 1차 출처 링크가 없다. 389행 'GCC 13', 69~72행 표준별 GCC 버전이 있지만 출처가 없고 200행은 '한 임베디드 프로젝트'로 환경을 밝히지 않는다. 앵커 part7-05(G 2)와 같다. |

uncertainties:
- 407행 '끄기만 해도 5-10배 크기 감소'가 392·399행(24 KB→5.5 KB, 약 4.4배)과 맞지 않는다. '가능합니다'라는 완곡 표현이라 오류 확인 근거로는 쓰지 않았다.
- 389~400행 빈 main 5.5 KB(STM32F4)와 part1-01 199행 '빈 main 240 B'가 다르다. 다른 글과의 모순이라 1차 측정으로 정해야 한다.
- 181행 '-fno-use-cxa-atexit 효과: __cxa_atexit 호출이 제거됩니다': GCC 매뉴얼상 __cxa_atexit 대신 atexit를 쓰게 하는 옵션으로 기억하나 확인하지 않았다. 170행 표현도 함께 확인 필요.
- 385행 '-fno-asynchronous-unwind-tables는 예외 unwind 테이블까지 모두 제거'와 이를 Clang 추가 옵션(374~383행)으로 분류한 것 미확인.
- 74행 'legacy ARM Compiler 5는 C++03만 지원' — armcc 5.x의 C++11 부분 지원 여부 미확인.
- 271행 '-Wcast-align: ARM에서 unaligned access는 bus fault' — Cortex-M4는 LDR/STR unaligned를 허용한다는 점 미확인.
- 276행 '링커가 .debug_* 섹션을 제외' — 빼는 주체가 링커인지 objcopy인지 미확인.
- 336~342행 release 플래그에 -fno-threadsafe-statics·-fno-use-cxa-atexit·-Wl,--gc-sections가 빠져 29~57행과 다르다. 의도인지 누락인지 미확인.
- 69~72행 표준별 최소 GCC 버전, 94·137·223·246·385행 크기 감소 비율은 출처 없는 수치.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토)으로는 병합 대상 없음 — part1-01 302행이 이 글을 플래그 정본으로 가리키고 -fno-use-cxa-atexit·경고·ARM ABI 플래그 절은 다른 글에 없다. 92·97~101행을 실제 빌드로 고친 뒤 다음 조치는 보강: 측정 표에 소스·툴체인·명령을 붙이고 part1-01과 겹치는 예외·RTTI 절은 한쪽을 정본으로 정한다.

### `embedded-cpp/part1-03-runtime-requirements.md` — 49점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 같은 두 라이브러리의 크기 차이를 같은 글이 다르게 적었다.
- 85~86행 libc 표: newlib-nano '~20 KB', picolibc '~10 KB'(약 10 KB 차이). 195행도 newlib-nano '~20 KB'
- 210행: 'picolibc는 newlib-nano보다 2-3KB 더 작습니다'

둘 다 라이브러리 일반 크기 진술이라 측정 조건 차이로 설명되지 않고 동시에 참일 수 없다. 291·293행 측정(38 KB vs 19 KB)도 210행과 맞지 않는다. git log는 0a9dd7bc(slug 고정), 68525f0c(코드 블록 산문 이동), be973200(topic 메타데이터), ac24bb76(제목 변경)뿐이고 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | C++ 런타임을 libgcc·libsupc++·libc·libstdc++ 네 층으로 나누고(19~24행) 층마다 끌려오는 심볼(36~40, 59~64행)과 직접 제공하는 최소 런타임(161~182행)을 연결한 구성은 이 글의 몫이다. libc 크기 표(81~87행), libstdc++ 기능별 크기 표(110~119행), 66행 '80%가 사라집니다', 184행 '1-2KB'는 출처·환경 없는 수치이고 선택 기준은 215행 'picolibc를 검토해 볼 만합니다' 수준이다. 앵커 part1-04(A 10)보다 고유 표·코드가 조금 많다. |
| B | 12 | 문제(17~26행) → 라이브러리별 역할(28~125행) → 부트 시퀀스(127~155행) → 최소 런타임(157~184행) → newlib/nano(186~204행) → picolibc(206~215행) → syscall stub(217~256행) → 함정(258~282행) → 측정(284~297행) → 정리(299~305행)로 흐름은 완성됐다. `_sbrk`(241~249행)에 heap 상한·stack 충돌 검사가 없는데 언급이 없고, 256행 'return -1'은 `void*` 반환 함수(241행)와 맞지 않는다. 170~173행 new/delete를 무한 루프로 바꿨을 때 영향도 설명하지 않는다. |
| C | 6 | 링크 옵션(91~100, 200~204행)과 stub 코드(221~252행)는 그대로 쓸 수 있다. 측정 절(286~295행)은 'STM32F4'만 적고 toolchain 버전·최적화 플래그·LTO·gc-sections·측정 명령이 없으며 110~119행 표와 202행 '+5KB'도 출처가 없어 C ≤ 8. 수치끼리도 어긋난다(85~86·210·291/293행, 270행 '수십 KB' vs 290·291행 104 KB 차이). |
| D | 8 | 비교한 글: 같은 시리즈 `part1-02-compiler-flags.md`, `part1-04-code-size-analysis.md`, `part1-06-startup-code.md`, `part1-07-linker-scripts.md`, 다른 시리즈 `embedded/modern-recipes/part3-07-c-runtime.md`, `part3-01-cross-compiler.md`, `part8-10-code-size-optimization.md`. 부트 시퀀스(129~146행)는 part1-06 47~63행과 단계·문구가 거의 같다. syscall stub(217~256행)은 part3-07 112~150행과 같은 코드 모양이다(그쪽은 ENOMEM·상한 검사까지 있음). libc 비교 표(81~87행)는 part3-01 62~68행과 같은 다섯 libc다. nano.specs·`-u _printf_float`(93·96, 200~204, 272~274행)는 part3-07 150·197~218행, part8-10 90~106·233행과 겹친다. libgcc/libsupc++ 심볼 목록(30~75행)과 최소 런타임 코드(161~182행)는 다른 글에 없다. |
| E | 6 | 제목이 'libstdc++·newlib·crt0 분석'을 내걸지만 본문에 crt0라는 말이 없고 crt0/crti/crtn 설명도 없다. 부트 순서 목록(129~146행)이 일부를 대신할 뿐이다. libstdc++(104~125행)·newlib(186~204, 217~256행)은 다루고 description의 '무엇이 진짜 필요한가'는 157~184·299~305행이 답한다. |
| F | 5 | 317행 다음 글(Part 1-04 코드 크기 분석)은 seriesOrder 4 `part1-04-code-size-analysis.md`와 맞다. 155·311행(1-06 __libc_init_array)은 part1-06 59~63행, 312행(1-07 .init_array)은 part1-07 104~119행, 313행 3-01(seriesOrder 19)도 라벨과 맞다. 그러나 309행 'Part 1-02: 컴파일러 플래그 — newlib 선택, --specs=nano.specs' 라벨과 달리 part1-02에는 specs 언급이 없고 newlib은 368행 한 문장뿐이다. 관련 링크 라벨이 대상 내용과 달라 F ≤ 5. |
| G | 1 | 본문에 1차 출처 링크가 하나도 없다. GCC·arm-none-eabi toolchain, newlib·picolibc 버전이 없고 측정 환경은 286행 'STM32F4'뿐이다. 215행 'GCC 12+와 Zephyr가 picolibc를 기본으로 채택'에도 출처가 없다. 앵커 part1-04(G 1)와 같다. |

uncertainties:
- 270행 'nano.specs 누락 시 수십 KB 차이'와 290·291행 142 KB→38 KB(104 KB 차이), 195행 표(~50 KB+ vs ~20 KB)가 맞지 않는다. '수십'과 '+'가 느슨해 오류 확인 근거로는 쓰지 않았다.
- 51행: FPU 없는 Cortex-M0 예(45행)의 크기 절약책으로 `-mfloat-abi=hard`를 제시했다. FPU 없는 코어에서 가능한지 GCC 문서로 확인하지 않았다.
- 38행 `__udivmodsi4`를 'long long 나눗셈'이라 했지만 si 접미사는 32비트 정수로 기억한다. 확인하지 않았다.
- 66행 '예외와 RTTI를 끄면 __cxa_pure_virtual과 __cxa_atexit 정도만 남는다'는 63행 `__cxa_guard_*`가 남는지와 함께 확인이 필요하다.
- 215행 'GCC 12+와 Zephyr가 picolibc를 기본으로 채택'의 시점·범위 미확인.
- 256행 '`return -1`'은 `void*` 반환 `_sbrk`(241행)와 형이 맞지 않는다. newlib 관례(`(void*)-1`과 errno=ENOMEM)를 확인하지 않았다.
- 278행 'syscall stub 누락 시 링크는 통과'는 보통 undefined reference가 나는 상황과 다를 수 있다. nosys.specs일 때만인지 미확인.
- 282행 '임베디드는 exit가 없습니다. 소멸자가 영원히 호출되지 않습니다'는 141~144행(main이 return하면 __libc_fini_array → exit)과 239행 `_exit` 정의와 긴장 관계다. 141행이 조건부라 오류 확인으로 두지 않았다.
- 112~119행, 66행 '80%', 184행 '1-2KB', 202행 '+5KB', 286~295행 측정값은 출처·환경이 없다.
- 170~173행 operator new/delete를 무한 루프로 정의하면 반환 없는 비void 함수가 되는데 경고 없이 빌드되는지 확인하지 않았다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토)으로는 병합 대상 없음. libgcc/libsupc++ 심볼 목록과 최소 런타임 코드는 다른 글에 없다. 부트 절은 part1-06 47~63행, syscall stub 절은 `modern-recipes/part3-07-c-runtime.md` 112~150행으로 링크해 줄이는 부분 정리를 검토한다. 85~86·210행 수치를 1차 측정으로 맞춘 뒤 다음 조치는 보강: 제목의 crt0를 채우거나 제목에서 빼고, 309행 라벨을 대상 내용에 맞춘다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **1차 자료 대조 커밋 없음 (10편 전부).** DWARF and ELF Internals 6편은 eb164047(gdb-lldb Ch 12에서 분리 작성) 이후 다이어그램·callout·linter·제목(ac24bb76)·slug 커밋뿐이고, Embedded C++ 4편도 작성·번역투 폴리싱(39149f68·815510c8)·제목·메타데이터 커밋뿐이다. `factcheck: 검증됨`은 0편이고 7편(dwarf-elf ch01·02·03·05·06, part1-02·1-03)이 원문 내부 모순으로 오류 확인이다. 두 시리즈 모두 `/fact-check-round` 대상이다.
- **예시 출력이 실제 실행 기록이 아닌 흔적 (6편).** 출력끼리 맞지 않는 readelf(ch01 56 vs 197, 63 vs 232, 230 vs 231, 138 vs 222~227, 143 vs 220행), 크기 열이 오프셋 간격보다 큰 readelf와 FORM 크기와 맞지 않는 .debug_info 오프셋(ch02 37~44, 239~244행), 의사 코드 line program(ch03 209~223행), 같은 `my_prog`인데 PC 범위가 다른 출력과 맞지 않는 CFA(ch05 86 vs 251·377행, 257~258행), 파일보다 큰 섹션 합계(ch06 24~27행), 컴파일될 수 없는 함수의 크기(part1-02 97~101행). 도구·컴파일러 버전 표기도 없다.
- **출처·측정 환경 없는 구체 수치 (10편 전부, C ≤ 8 상한 반복).** ch02 551·554·558행, ch03 23·184·442행, ch04 212·271행, ch06 68·103·120·191·215행, 00-preface 182~201행(결과 없음), part1-01 159·169·195~206행, part1-02 94·137·199~206·389~400행, part1-03 81~87·110~119·286~295행, ch01·ch05는 출력 환경 없음.
- **1차 출처가 본문 주장에 붙지 않음 (10편 전부, G 1~3).** dwarf-elf 6편은 끝의 '관련 항목'·'외부 자료'(ch01 509~512, ch02 592~595, ch03 473~475, ch04 465~467, ch05 445~448, ch06 508~513행)에만 명세 링크가 모여 있고 본문 연결은 ch06 95행 dwz 하나, ch04 465~467행 정도다. embedded-cpp 4편은 본문 1차 출처 링크가 없다(00-preface 210~227행 참고자료는 본문과 연결 0건).
- **gdb-lldb/chapter12-dwarf.md와 같은 문장·예시 공유 (dwarf-elf 5편).** ch02 36~152·254~322·523~541행 ↔ Ch12 33~152·505~520행, ch03 33~46·271~292·458행 ↔ Ch12 190~211행, ch04 48~49·182·195~212행 ↔ Ch12 230~275·439~441행, ch05 13·99~103·110·153·297~301·344~348행 ↔ Ch12 277~333행, ch06 13·43~62·116~143·182·221~246행 ↔ Ch12 336~420·501~522행. eb164047 분리 후 Ch12 원본 절이 남아 생긴 구조라 Ch12를 요약 + 링크로 줄일지 시리즈 단위로 정해야 한다.
- **같은 주장이 시리즈 안팎에서 반복 (4편 이상).** 'GCC 8+ / Clang 11+'(ch02 554, ch04 212행, Ch12 441행), '수천 줄의 매핑이 수십 바이트'(ch02 585, ch03 458행, Ch12 192행), -gline-tables-only '1/10 이하'·'운영 빌드의 표준'(ch03 434~444 ↔ ch06 112~120행), 'optimized out' 진단(ch04 403~421, gdb-lldb ch11 62~107행), debuginfod 절(ch06 165~204 ↔ postmortem ch04 96~163행), 예외·RTTI 비용과 '늦게 끄면 깨진다'(part1-01 155~175·212~214 ↔ part1-02 78~147·350~352행), 플래그 블록(00-preface 182~201 ↔ part1-02 29~57행), 부트 시퀀스(part1-03 129~146 ↔ part1-06 47~63행).
- **예외·RTTI·libc 크기 수치가 글마다 다름 (4편).** 예외 비용 part1-01 159행 '3-10KB' vs part1-02 94행 '5-20KB' vs practical-internals part4-13 263행 '~10%', 빈 main part1-01 199행 240 B vs part1-02 389~400행 5.5 KB, picolibc 차이 part1-03 85~86 vs 210행. 다른 글과의 모순은 오류 확인에 넣지 않았고 fact-check 라운드에서 정한다.
- **링크·라벨이 대상과 다름 (5편).** ch01 445행 'Ch 6'(실제는 postmortem Ch 2 주제), 00-preface 242행 옛 제목 라벨·75·119행 표 라벨, part1-01 307행 링크 없는 'GoF 5: Singleton'(draft 글, 같은 형태가 part2-01 488·part2-08 493·part3-08 399·part4-06 424·part4-08 407행에도 있음), part1-03 309행 nano.specs 라벨, ch03 474행 링크 없는 man page·475행 라벨과 URL 불일치.
- **제목·도입이 약속한 범위를 본문이 채우지 않음 (5편).** ch01 '구조 추적'(섹션→세그먼트 매핑 없음), ch04 15행 '모든 DW_OP_*' vs 55행, part1-01 제목의 ABI(279행 한 문단), part1-03 제목의 crt0(본문에 없음), 00-preface description의 '어디까지 C++를 써도 되는가'. ac24bb76 제목 일괄 변경과 함께 시리즈 전체 제목·본문 대조가 필요하다.
- **공통 H2 꼬리 뼈대 (10편 전부).** dwarf-elf는 '정리 → 다음 장 예고 → 관련 항목'(ch01 489~512, ch02 583~595, ch04 445·457·461행, ch05 423·437·441행), embedded-cpp는 '한 줄 요약 → 어떤 문제를 푸는가 → … → 자주 보는 함정 → 정리 → 관련 항목 → 다음 글'(part1-01 13·17·210·294·301·309행, part1-02 13·17·348·404·412·419행, part1-03 13·17·258·299·307·315행)이다. embedded-cpp 허브 뼈대는 performance-engineering·practical-internals 허브와도 같다. 루브릭 9절 scaled content 수치 기록 대상이다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 7편은 오류 건수 순으로 본다. dwarf-elf ch01(readelf 출력 5건), ch03(prologue_end 위치, 압축 산술, 223행 매핑 수), ch02(LEB128, .debug_info 오프셋), ch05(undefined 규칙 의미, leave 직전 CFA), ch06(파일 크기 vs 섹션 합계), part1-02(throw 컴파일 vs 32 B), part1-03(picolibc 크기 차이). DWARF 5 명세·binutils/LLVM 실제 출력, GCC 매뉴얼·newlib/picolibc 실측을 열어 고친 뒤 출처를 적은 커밋을 남긴다.
- 같은 작업에서 F 감점 원인을 고친다: ch01 445행 장 번호, 00-preface 242행·75·119행 라벨과 Part 표 링크, part1-01 307행 GoF 항목, part1-03 309행 라벨, ch03 411~413·474·475행.
- 병합 검토 1편(part1-01)은 예외·RTTI 수치를 part1-02로 넘기고 크기 표를 측정 근거가 있는 표로 바꾸거나 TBD로 두는 보강을 검토한다. 보강 2편 중 ch04는 열린 uncertainties(r6 설명, implicit_value 버전, 의사 코드 piece 처리) 확인이 먼저고, 00-preface는 허브 목차 링크와 라벨 정리가 먼저다.
- dwarf-elf 시리즈와 `gdb-lldb/chapter12-dwarf.md`, `postmortem/chapter04-debuginfod-minidump-automation.md` 사이 중복은 어느 글을 정본으로 둘지 사용자가 정한다. Ch12는 빠른 참조로 줄이는 방향이 자연스럽지만 이 루프에서는 결정하지 않는다.
- DWARF and ELF Internals와 Embedded C++ for Real Systems는 `/fact-check-round` 대상이다. 예시 출력 합성 패턴과 링크 없는 'GoF N' 항목, 옛 제목 라벨은 embedded-cpp 나머지 장(part1-04~part5-04)에도 있는지 grep으로 수를 센 뒤 다음 루프 채점에 반영한다.
- ch06 447행 'DWARF 6는 2024년 작성 중'은 `audit:staleness` 대상 후보로 넘긴다.
