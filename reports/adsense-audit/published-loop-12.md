# 공개 글 AdSense 평가 — 루프 12

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-12.md) · [재검토 기록](double-check-loop-12.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

평가일 2026-10-19. 루브릭 v1.2·anchors·antipatterns 적용. HEAD `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. Luna 초벌 없이 Sol이 대상 열 편의 원문 전문과 D 양쪽 비교 구간, F 링크 전체 행의 후행 설명·실제 대상 title/slug/order/draft를 직접 확인했다. 본문·기존보고서·사용자 변경은 수정하지 않았다. 전편 score_status=잠정, confidence=중간. 대상은 기존보고서 ba9f7104 이후 diff가 없으며 비교글 변경 탓으로 점수 변화를 기록한 항목은 없다.

표 dwarf-elf=`src/content/blog/tools/debugging/dwarf-elf/`,embedded-cpp=`src/content/blog/embedded/embedded-cpp/`. D/F 같은시리즈파일은각경로기준. GDB=`src/content/blog/tools/debugging/gdb-lldb/`,Recipes=`src/content/blog/embedded/modern-recipes/`,Postmortem=`src/content/blog/tools/debugging/postmortem/`,Embedded Debug=`src/content/blog/tools/debugging/embedded/`,Performance=`src/content/blog/embedded/performance-engineering/`,RTOS=`src/content/blog/embedded/rtos/`다. Recipes는D비교에허용한다. anchor_ref는루프15에서읽은`10550ca1:src/content/blog/embedded/modern-recipes/`의옛UART(part1-04)49/ISR(part6-09)40/Build(part7-05)50전문이다.현재개선Recipes/Part12rename/읽지않은LLM역사본문과구분한다.

[공통 게이트](double-check-gates-2026-10-18.md)의check/build/links/sitemap/ads/anchors/reading통과를인용하며모바일육안/기술정확성으로확대하지않는다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `dwarf-elf/chapter01-elf-overview.md` | 10 | 12 | 6 | 10 | 6 | 5 | 2 | **51** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `dwarf-elf/chapter02-dwarf-overview.md` | 11 | 12 | 7 | 8 | 7 | 6 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `dwarf-elf/chapter03-debug-line.md` | 13 | 12 | 7 | 10 | 8 | 6 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `dwarf-elf/chapter04-debug-loc.md` | 14 | 13 | 6 | 10 | 7 | 7 | 3 | **60** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `dwarf-elf/chapter05-cfi-eh-frame.md` | 14 | 12 | 6 | 10 | 8 | 7 | 3 | **60** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `dwarf-elf/chapter06-split-dwarf-tools.md` | 12 | 11 | 6 | 6 | 7 | 6 | 2 | **50** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `embedded-cpp/00-preface.md` | 8 | 11 | 4 | 10 | 6 | 5 | 1 | **45** | 미검증 | 보강 | 중간 | 글별 anchor_ref; `10550ca1` |
| `embedded-cpp/part1-01-cpp-vs-c.md` | 12 | 11 | 7 | 11 | 6 | 5 | 1 | **53** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `embedded-cpp/part1-02-compiler-flags.md` | 11 | 11 | 6 | 10 | 7 | 7 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `embedded-cpp/part1-03-runtime-requirements.md` | 11 | 12 | 6 | 8 | 6 | 5 | 1 | **49** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |

합계533, 평균53.3, 범위45~60. 이전533과같다. 우선조치8편·보강1편·병합검토1편. 오류확인8·미검증2. 기존7편오류상태는유지하되DWARF06/런타임의약한근거는공식API/타입근거로교체하고DWARF04를추가했다.총점동의10/10·판정동의9/10.

| 파일 | 이전총점 | 새총점 | 차이 | 이전판정 | 새판정 | 항목 동의/변경 |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `dwarf-elf/chapter01-elf-overview.md` | 51 | 51 | 0 | 우선 조치 | 우선 조치 | A~G점수동의;일부약한근거교정 |
| `dwarf-elf/chapter02-dwarf-overview.md` | 53 | 53 | 0 | 우선 조치 | 우선 조치 | A~G점수동의;일부약한근거교정 |
| `dwarf-elf/chapter03-debug-line.md` | 58 | 58 | 0 | 우선 조치 | 우선 조치 | A~G점수동의;일부약한근거교정 |
| `dwarf-elf/chapter04-debug-loc.md` | 60 | 60 | 0 | 보강 | 우선 조치 | A~G점수동의;DWARF5 typedoperand신규오류 |
| `dwarf-elf/chapter05-cfi-eh-frame.md` | 60 | 60 | 0 | 우선 조치 | 우선 조치 | A~G점수동의;일부약한근거교정 |
| `dwarf-elf/chapter06-split-dwarf-tools.md` | 50 | 50 | 0 | 우선 조치 | 우선 조치 | A~G점수동의;기존gate기각후공식근거로교체 |
| `embedded-cpp/00-preface.md` | 45 | 45 | 0 | 보강 | 보강 | A~G점수동의;일부약한근거교정 |
| `embedded-cpp/part1-01-cpp-vs-c.md` | 53 | 53 | 0 | 병합 검토 | 병합 검토 | A~G점수동의;일부약한근거교정 |
| `embedded-cpp/part1-02-compiler-flags.md` | 54 | 54 | 0 | 우선 조치 | 우선 조치 | A~G점수동의;일부약한근거교정 |
| `embedded-cpp/part1-03-runtime-requirements.md` | 49 | 49 | 0 | 우선 조치 | 우선 조치 | A~G점수동의;기존gate기각후공식근거로교체 |

## 정확성 게이트와 채택·기각

- [DWARF5 PDF](https://dwarfstd.org/doc/DWARF5.pdf) §2.5.1.3의DW_OP_deref_type(printedp30/PDFindex47),§6.4.1의undefined/samevalue(printedp173/PDFindex190)정의문을직접읽었다.전자는1-byte unsigned size + unsigned LEB128 typeoffset이며후자는복원불가와변경없음을구별한다.위각글행과대조했다.
- [pyelftools 공식callframe.py](https://raw.githubusercontent.com/eliben/pyelftools/main/elftools/dwarf/callframe.py)467~506·633~653행을열어CFIEntry/CIE/FDE계층과클래스식별설명을읽고전체에서def is_CIE검색이없음을확인했다.메서드부재를언어기억으로판정하지않는다.일부옛tag URL은fetch실패여서그판을검증했다고기록하지않는다.
- [GCC 공식libgcc/udivmodsi4.c](https://raw.githubusercontent.com/gcc-mirror/gcc/master/libgcc/udivmodsi4.c)21~43행unsignedlong인터페이스·31비트검사를읽었고본문ARM조건의long32/longlong64를헤더없는clang ARM컴파일static_assert로검증했다.
- [GCC 공식C++옵션](https://gcc.gnu.org/onlinedocs/gcc/C_002b_002b-Dialect-Options.html)의-fuse-cxa-atexit는등록을atexit대신__cxa_atexit로수행하는옵션이다.별도-fno-exceptions프로브는실제throw를포함해컴파일실패를확인했다.전체STM32프로젝트의크기수치를재측정한것은아니다.
- ELF오프셋/LEB128은명시된동일입력의십진수·이진수·16진수를Python으로재계산했다.수치가다른예를무조건오류라하지않으며출력조건의동일성이명시된경우로좁혔다.

Luna 초벌은없다.원문과대조한기존A/B/C/E/G인용은채택하되읽지않은LLM역사앵커비교를제거했다.D/F는현재양쪽문맥으로재판정했다.DWARF06의‘섹션합은파일보다클수없음’일반단정과runtime의조건없는대략크기차=내부모순은기각했다.두글은다른공식근거로기술오류상태가유지된다.DWARF03의라벨/URLslug차이·비어보이는crashlog표제,허브next의옛제목재서술은부정확한오안내근거여서뺐다.허브description을개별튜토리얼전체이행과동일시하지않는다.

## 글별 근거

### `dwarf-elf/chapter01-elf-overview.md`

source_file: `src/content/blog/tools/debugging/dwarf-elf/chapter01-elf-overview.md`

score_status: 잠정 · score: 51 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1위오류게이트.

오류 확인. 같은/usr/bin/ls의56행e_shoff151456=0x24fa0와197행0x24f60=151392가다르다.같은명령대상에조건변경없는출력대조라기본산술만으로동시성립불가.63행shstrndx31 vs232행.strtab,143행EH_FRAME주소 vs220행도불일치후보이나첫쌍만으로게이트유지.다른빌드라면그조건을표기해야한다.

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
- 위정확성게이트에서확인/기각한해당의문은본문단락의결론을따른다.그밖API·출력·버전·측정조건은열린불확실로B≤13/C≤8유지.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 10 | 68~120행 Elf64_Ehdr·e_ident·e_type·e_machine, 150~176행 Elf64_Phdr·p_type, 237~286행 Elf64_Shdr·sh_type·sh_flags, 366~393행 Elf64_Sym은 `<elf.h>`와 gABI를 옮긴 카탈로그다. 이 글의 해석은 110행(PIE라 ET_DYN이고 file이 shared object라고 하는 이유), 182행(p_paddr가 베어메탈 LMA), 455~461행(checksec 항목과 ELF 메타데이터 대응 표) 정도다. 분석의 바탕인 readelf 출력(43~63, 125~145, 196~232행)은 서로 맞지 않는다. 앵커 part1-04(A 10)와 같은 구간이다. |
| B | 12 | 66~487행이 헤더 → Program Header → Section Header → .dynamic·PLT/GOT → Symbol → Build-ID → NOTE → checksec → 변형 → 도구 표 순서로 description(5행)의 항목을 모두 지난다. 그러나 63행이 가리키는 .shstrtab이 섹션 표에 없고, 재배치는 29행과 260~261행 표 칸뿐이다. 332행 lazy binding과 452행 Full RELRO 예가 같은 ls를 두고 이어지는데 관계 설명이 없다. 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 6 | readelf -h/-l/-S/-d/-s/-n(43, 125, 196, 291, 351, 400·421행), checksec(450행), build-id로 debuginfo를 찾는 셸 2줄(414~415행)은 다시 돌려 볼 수 있다. 배포판·binutils 버전·ls 빌드가 없어 루브릭 3-1에 따라 C ≤ 8. 출력끼리 맞지 않고(56 vs 197, 63 vs 232, 230 vs 231, 138 vs 222~227, 143 vs 220행), 401행 Build ID는 잘려 있어 414행 awk 결과를 확인할 수 없다. 앵커 part1-04(C 6)와 같은 구간이다. |
| D | 10 | 같은시리즈chapter06-split-dwarf-tools.md124~160행 ↔ 이글397~416행 build-id분리예반복. chapter02-dwarf-overview.md67~155행은DIE/abbrev라ELF구조와역할다름.다른시리즈Recipes part3-03-elf-format.md24~46·62~76행 ↔31~38·364~393행 section/segment·symbol필드중복. Embedded Debug chapter05-elf-map.md21~26행 ↔31~38행도같은질문이나그쪽은Flash/RAM MAP중심.카탈로그정본역할로10. |
| E | 6 | 제목 키워드 Section(193~286행)·Segment(122~191행)·Symbol Table(348~395행)과 description의 dynamic linking(288~346행)·build-id(397~416행)는 다룬다. 제목이 약속한 '구조 추적'은 하지 않는다. 섹션→세그먼트 매핑(readelf -l의 Section to Segment mapping)을 따라가는 절이 없고 본문은 구조체·값 카탈로그와 서로 맞지 않는 출력 예다. 루브릭 172행('추적' 약속에 개념 소개 수준이면 3~5)에 가깝지만 절마다 출력이 있어 6. |
| F | 5 | 503행 다음 장 예고(Ch 2 DWARF 개관)는 seriesOrder 2 `chapter02-dwarf-overview.md`와 맞다. 507행, 508행 'Embedded Debugging Ch 5: ELF / MAP'(대상 `chapter05-elf-map.md`, seriesOrder 5)도 맞다. 그러나 445행 '(이 시리즈 Ch 6에서 자세히)'는 틀렸다. 이 시리즈 Ch 6은 split-DWARF·dwz·debuginfod·pyelftools이고 NT_PRSTATUS는 postmortem 시리즈 Ch 2 주제다(`postmortem/chapter01-core-generation.md` 411행). 틀린 장 번호 안내라 F ≤ 5. audit:reading은 돌리지 않았다. 실제title/order/draft및후행설명을다시대조했다.기계링크통과와내용이행은구분한다. |
| G | 2 | 509~512행 관련 항목에 gABI, elf(5), Oracle Linker and Libraries Guide, glibc elf.h 링크가 있지만 23행 연도, 279~286행 sh_flags, 340~344행 검색 순서, 395행 malloc WEAK 같은 본문 주장과 이어지지 않는다. gABI 판(4+)은 URL에만 있고 readelf 출력의 binutils·배포판 버전이 없다. |

병합 대상: Recipes ELF/Embedded Debug 요약. 다음 조치: 확인오류정정후 판고정출처·실행환경·관찰을보강하고중복요약을정본링크로줄인다.오번호/후행설명불일치도정리한다.

### `dwarf-elf/chapter02-dwarf-overview.md`

source_file: `src/content/blog/tools/debugging/dwarf-elf/chapter02-dwarf-overview.md`

score_status: 잠정 · score: 53 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1위오류게이트.

오류 확인.467행624485의2진수라고쓴100110000111011100101은1248997이며624485는10011000011101100101이다.Pythonint/bin으로재계산했다.471행0100101(0x25)에MSB를붙이면A5인데472~473행은E5다.E5/8E/26을원디코더방식으로풀면624485이므로두표현이동시에참일수없다.

uncertainties:
- 23~27행 DWARF 1~5 연표(1988 Bell Labs 등)는 표준 문서로 확인하지 않았다.
- 183행 'DW_UT_type 타입 정의 전용 (.debug_types)': DWARF 5에서 type unit은 .debug_info에 들어가는 것으로 기억하나 확인하지 않았다. 439행 DW_FORM_ref_sig8의 '.debug_types'도 같다.
- 263행 DW_TAG_partial_unit을 'header file'로 설명한 것, 355행 DW_AT_bit_offset의 현행 여부는 미확인.
- 551행 'Clang 11+ 기본 DWARF 5'(기억상 Clang 14), 552행 Clang .debug_aranges 기본 미출력, 554행 DW_OP_entry_value 버전, 558행 'GDB <= 9' 경계는 미확인.
- 211행 DW_AT_high_pc DW_FORM_data4와 341행 'DWARF 4+: 길이'인데 78·136행은 high_pc를 절대 주소 0x401200으로 보인다. llvm-dwarfdump 표시 방식을 1차로 확인하지 않아 오류 근거로 쓰지 않았다.
- 37~44행 readelf 크기 열이 오프셋 간격보다 커서 합성 출력으로 보인다(같은 오프셋이 Ch 12 34~42행에도 있음).
- 77행 트리 CU low_pc 0x401000과 135행 dwarfdump CU low_pc 0x401120이 다르다(서로 다른 예시일 수 있음).
- 위정확성게이트에서확인/기각한해당의문은본문단락의결론을따른다.그밖API·출력·버전·측정조건은열린불확실로B≤13/C≤8유지.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | 이 글만의 부분은 abbrev 정의(200~233행)와 .debug_info 나열(237~244행)을 짝지은 절, DWARF 5 CU 헤더 구조체(163~172행), CU 종류(181~188행), LEB128 절(458~492행), GCC·Clang 표(549~556행)다. 254~456행 TAG·AT·FORM 표는 분량의 3분의 1을 넘지만 표준 이름에 한 줄 뜻을 붙인 목록이다. 49~63행 섹션 표·73~111행 DIE 트리·523~541행 pyelftools는 gdb-lldb Ch 12와 거의 같다. 568행 '도구 호환성 문제의 원인이 되기도'처럼 사례 없이 끝나는 문장이 있다. |
| B | 12 | 섹션 목록 → DIE → dwarfdump → CU 헤더 → abbrev → TAG/AT/FORM → LEB128 → .debug_str → DWARF64 → pyelftools → 컴파일러 차이 → version 혼재 → 정리(570~581행)로 description의 항목을 모두 다룬다. 그러나 LEB128 예시(467·471행)가 472~473행과 어긋나고, 239~244행 오프셋이 FORM 크기 합과 맞지 않으며(0x2a+4≠0x31, 0x31+4≠0x37, 0x37+7≠0x40), 239행 producer=0x123은 206행 DW_FORM_strx1(1바이트 인덱스)에 담을 수 없다. AP-C-24 상한 13에서 핵심 예시 오류로 12. 512행 절 제목 'ELF 형식 vs CIE 형식'은 내용(514~519행 endianness·DWARF64)과 맞지 않는다. |
| C | 7 | readelf·llvm-dwarfdump 명령(36·122·565행), pyelftools 스크립트(523~541행), ULEB128 디코더(477~490행)가 있다. 출력에 컴파일러 옵션·대상 환경이 없고, 37~44행 readelf 출력은 .debug_info 크기 52431892가 다음 섹션까지 오프셋 차(0x6419)보다 커서 실제 출력으로 보기 어렵다. 551·554·558행 버전 경계는 출처 없는 구체 수치라 C ≤ 8. 예시 산술이 틀려 7. |
| D | 8 | 다른시리즈GDB chapter12-dwarf.md33~62·68~107·110~152행 ↔ 이글36~63·73~152·254~456행 section/DIE/dump/TAG/abbrev반복.그글13~14행은빠른참조로이시리즈를위임하지만오프셋·예시주소까지남는다.같은시리즈chapter01의ELF헤더와chapter03의lineVM은별도층.이글163~244·458~519행CU/FORM/LEB128정본구분으로8유지. |
| E | 7 | 제목 'DIE 트리와 .debug_abbrev'와 description 'DIE/abbrev 인코딩, 컴파일 유닛, TAG/AT/FORM 카탈로그'를 67~456행이 다룬다. 13행 질문('GDB가 print x를 어떻게 아는가')의 답은 155행 한 문장에서 끝나고 이후는 카탈로그이며 512행 절 제목이 내용과 다르다. |
| F | 6 | 585행 다음 장 'Ch 3 — .debug_line 바이트코드 VM'은 seriesOrder 3 `chapter03-debug-line.md`와 맞다. 589행 Ch 1, 590행 Ch 3, 591행 GDB and LLDB Ch 12(seriesOrder 12) 라벨이 대상과 맞다. 65행 범위 안내와 53·56·59행 Ch 3·4·5 안내가 있다. 73~111행 트리 블록이 74~83행 들여쓰기와 84행부터 ├─ 기호로 섞여 구조가 깨지고, 512행 절 제목 불일치, 전제 지식(Ch 1) 안내 부재로 7 이상은 주지 않았다. 실제title/order/draft및후행설명을다시대조했다.기계링크통과와내용이행은구분한다. |
| G | 2 | 592~595행 DWARF 5 표준 PDF·llvm-dwarfdump 문서·pyelftools·Eli Bendersky 글은 관련 항목 목록일 뿐 본문 주장(23~27행 연표, 183행 DW_UT_type, 551행 기본 버전)에 절로 연결되지 않는다. 버전 표기는 131행 'clang version 17.0.0'과 551·554행뿐이다. |

병합 대상: GDB chapter12 도입/DIE공통절. 다음 조치: 확인오류정정후 판고정출처·실행환경·관찰을보강하고중복요약을정본링크로줄인다.오번호/후행설명불일치도정리한다.

### `dwarf-elf/chapter03-debug-line.md`

source_file: `src/content/blog/tools/debugging/dwarf-elf/chapter03-debug-line.md`

score_status: 잠정 · score: 58 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1위오류게이트.

오류 확인.212~215행prologue_end가설정된첫emitPC0x401120는200행push rbp의prologue주소인데318~322행은push/mov/sub뒤의사용자코드부터prologue_end라고설명한다.동일실행예의지점정의가직접충돌한다.23·151행한opcode최소1B/행과458행수천행수십~수백B주장은비압축프로그램전제의보조근거로만둔다.223행10매핑과3emit차이는산문개수표기만으로게이트삼지않는다.

uncertainties:
- 25행 'VM 모델은 1990년대 ANSI C standard committee가 … PostScript·PDF 영향'은 출처가 없다. DWARF 2(UNIX International PLSIG) 설계로 기억하지만 확인하지 않았다.
- 130행 DW_LNS_const_add_pc: 명세는 special opcode 255의 address 증분(min_inst_len 곱 포함)으로 정의하는 것으로 기억한다. DWARF 5 6.2.5.2로 확인하지 않았다.
- 223행 '약 12바이트': DW_LNE_set_address 하나만도 약 11바이트라 바이트 수도 맞지 않을 가능성이 있다(인코딩 길이 미확인).
- 367행 `lineprog['file_entry'][file_idx - 1]`은 DWARF 4 인덱싱이다. DWARF 5 바이너리에서 한 칸 어긋날 수 있다. pyelftools 버전별 동작은 미확인.
- 77행 'ARM=2 (Thumb)', 292행 '-Og는 더 많은 위치에 is_stmt=1', 312행 discriminator를 'info line'이 '세 후보'로 보여 준다는 설명은 GCC/GDB 문서로 확인하지 않았다.
- 442행 '크기 1/10 이하', 444행 '운영 빌드의 표준 옵션'은 출처·측정 없는 수치·일반화다.
- 475행 외부 글의 실제 제목은 열어 보지 않았다(URL 슬러그로만 판단).
- 위정확성게이트에서확인/기각한해당의문은본문단락의결론을따른다.그밖API·출력·버전·측정조건은열린불확실로B≤13/C≤8유지.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 13 | 이 글만의 것은 opcode_base=13·line_base=-5·line_range=14 헤더로 특수 opcode 세 개를 손으로 디코딩한 예(165~182행)다. 168·173·178행의 0x10·0x18·0x35 계산과 165행 범위는 산술이 맞다. square() asm과 line program 대응(190~221행), addr2line 검색 경계 예(242~251행)도 있다. 레지스터 표(33~46행), opcode 표(121~145행), DWARF 5 변화(99~113, 446~451행)는 명세 6.2절 정리 수준이다. 25행 역사 주장은 출처가 없고 핵심 실행 예(212~223행)가 모순을 안고 있어 13~19 구간 하단. |
| B | 12 | 헤더(52~81행) → file table(83~113행) → opcode(115~184행) → 실행 예(186~223행) → addr2line(225~263행) → 인라인(265~278행) → is_stmt·discriminator·prologue_end(280~330행) → .debug_line_str(332~347행) → pyelftools(349~373행) → crash log 후처리(407~432행)로 따라갈 수 있다. AP-C-24에 따라 B ≤ 13. 130행 const_add_pc에 min_inst_len 곱이 없고, 223행 매핑 수가 215~219행과 맞지 않으며, 367행 `file_idx - 1`은 101·449행의 DWARF 5 0번 인덱스와 맞지 않는다. 302·312행 '세 호출/세 후보'와 306~309행 4행 표도 어긋난다. |
| C | 7 | addr2line·llvm-dwarfdump·readelf 명령(255~261, 377~405, 420~430행)과 pyelftools 코드(351~371행)가 있다. 컴파일러·binutils·pyelftools 버전과 실행 환경이 없고 출력은 예시 주소다. 23행 '수십 KB'·'압축비 10배 이상', 442행 '1/10 이하', 184행 '평균 3-5 명령어'는 출처·환경 없는 수치라 C ≤ 8. 209행 line program은 '의사 코드'이고 실제 readelf 출력과 대조하는 절차가 없다. |
| D | 10 | chapter06-split-dwarf-tools.md112~122행 ↔ 이글434~444행line-tables-only반복.다른시리즈GDB chapter12-dwarf.md178~211행 ↔33~46·271~292·458행line레지스터/압축/addr2line/is_stmt설명반복.그쪽13~14행은깊이를이글로위임.이글165~182행특수opcode계산과190~221행단계예는별도로10. |
| E | 8 | 제목의 '.debug_line', 'Source-to-PC 매핑 바이트코드 VM'과 description의 '상태 머신, 표준/확장 opcode, file table, addr2line의 내부'가 27~48, 115~184, 83~113, 225~263행에서 다뤄진다. 대상 독자와 구체 문제(crash PC를 줄로 바꾸기)는 13행과 407행 이후에만 있어 9 이상은 주지 않았다. |
| F | 6 | 467행nextchapter04/order4및471~472행chapter02/order2·chapter04/order4 실제title/공개상태맞음.411~419행crash log뒤Backtrace목록이있어비어있다는기존감점근거는기각.475행EliBendersky페이지187~212행이실제line조회설명을다뤄URLslug가라벨과다르다는이유만으로오안내라고하지않음.링크없는manpage/전제안내부족으로6유지. 실제title/order/draft및후행설명을다시대조했다.기계링크통과와내용이행은구분한다. |
| G | 2 | 473행 DWARF 5 명세 링크는 관련 항목에만 있고 130행 const_add_pc, 101행 DW_LNCT_*, 145행 define_file deprecated 같은 본문 주장과 연결되지 않는다. 컴파일러·binutils·LLVM·pyelftools 버전 표기가 없다. |

병합 대상: chapter06 line-only/GDB chapter12 요약. 다음 조치: 확인오류정정후 판고정출처·실행환경·관찰을보강하고중복요약을정본링크로줄인다.오번호/후행설명불일치도정리한다.

### `dwarf-elf/chapter04-debug-loc.md`

source_file: `src/content/blog/tools/debugging/dwarf-elf/chapter04-debug-loc.md`

score_status: 잠정 · score: 60 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1위오류게이트.

오류 확인(신규).88행DW_OP_deref_type인자를uleb128,sleb128이라적었지만DWARF5§2.5.1.3의9번(printedp30/PDFindex47)은첫인자를1-byte unsigned size,둘째를unsigned LEB128 DIEoffset으로정의한다.336행뒤쪽예는byte_size,type_die를적어앞표와도다르다.실제명세를읽은후미검증→오류확인하며의사코드return/piece생략만으로추가확정하지않는다.

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
- 위정확성게이트에서확인/기각한해당의문은본문단락의결론을따른다.그밖API·출력·버전·측정조건은열린불확실로B≤13/C≤8유지.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 14 | 고유한 부분은 277~325행 의사 코드 평가기(exprloc/sec_offset 분기, lit·reg·breg·fbreg·plus·stack_value·piece 처리), 360~366행 DW_OP_GNU_* → DWARF 5 대응 표, 386~399행 pyelftools LocationParser 스크립트, 403~421행 'optimized out' 원인 셋·해법이다. 57~134행 opcode 카탈로그는 표준 목록을 표로 옮긴 수준이고 49행 piece 예·48/182행 constu 42 예·195~212행 entry_value는 gdb-lldb ch12 262·270·275·441행과 같은 예다. 342행 '잘 안 쓰이지만 일부 컴파일러는 활용', 205행 '(CFI 또는 호출 사이트 메타)'는 흐린 설명이다.  UART/Build보다메커니즘은상세하나직접계산결론은약해14. |
| B | 13 | 왜 식인가(17~30행) → 스택 머신(32~51행) → opcode(53~136행) → 예(138~238행) → location list·loclists(240~271행) → 평가 흐름(273~328행) → typed·frame_base·GNU 확장(330~368행) → 도구(370~401행) → 진단(403~421행) → 정리(445~455행)로 description의 세 키워드를 모두 다룬다. 15행은 '모든 DW_OP_* opcode의 의미'를 약속하고 55행은 '자주 보이는 것'으로 좁힌다. 21~28행 C 예제를 dwarfdump 결과로 잇지 않고, 299행 의사 코드가 DW_OP_reg에서 곧바로 return해 169행 reg+piece 식과 328행 piece 누적 설명을 처리하지 못한다. AP-C-24에 따라 B ≤ 13. typed deref인자는위공식gate에서오류확인.의사코드일부생략만으로내부오류확정하지않음. |
| C | 6 | 372~382행 llvm-dwarfdump·readelf 명령과 386~399행 pyelftools 스크립트가 있지만 예상 출력이 없고, 스크립트는 390행의 `dwarf` 객체를 만드는 줄(ELFFile·get_dwarf_info)이 없어 그대로는 돌지 않는다. 246~249행 주소 구간과 141~162행 표현식은 바이너리·컴파일러 버전·옵션 없이 든 예다. 271행 '바이트가 절반', 212행 'GCC 8+ / Clang 11+'는 출처·환경 없는 수치라 C ≤ 8. |
| D | 10 | chapter05-cfi-eh-frame.md38~62행 ↔ 이글232~238행CFA정의일부만공유.다른시리즈GDB chapter12-dwarf.md230~275행 ↔42~49·57~134·195~253행 reg/piece/const/entry_value동일예반복, GDB chapter11-practical-tips.md62~107행 ↔403~421행optimized-out대처반복.이글277~325·255~271·330~368행평가기/loclists/typed/GNU구분으로10. |
| E | 7 | 제목 'DWARF .debug_loc 분석 — Variable Location Expression VM'과 description의 '스택 머신 opcode, location list, DW_OP_entry_value'가 32~136, 240~271, 195~212행에서 다뤄진다. .debug_loclists(255~271행)까지 넓지만 13행에서 밝혀 과장은 아니다. '분석'에 비해 실제 바이너리를 덤프해 읽는 예가 없고, 15행 약속을 55행에서 좁혀 6~8 구간 가운데. |
| F | 7 | 459행 다음 장 예고 'Ch 5 — CFI'는 seriesOrder 5 `chapter05-cfi-eh-frame.md`와 맞다. 463행 Ch 3, 464행 Ch 5 라벨도 대상과 맞다. 421행 'GDB Ch 11'은 링크가 없지만 `gdb-lldb/chapter11-practical-tips.md` 87행 '레지스터 직접 보기'를 정확히 가리킨다. 15행 도입이 절 순서를 알린다. 465·466행이 같은 DWARF5.pdf를 절 번호 라벨만 바꿔 두 번 걸고 DIE·FORM 전제(chapter02) 안내가 없다. audit:reading·폰 폭은 보지 않아 9 이상은 주지 않는다. 실제title/order/draft및후행설명을다시대조했다.기계링크통과와내용이행은구분한다. |
| G | 3 | 465·466행 DWARF 5 표준 PDF(§2.5, §2.5.1)와 467행 pyelftools locationlists.py 소스 링크가 opcode 카탈로그·파서 주장과 연결된다. 70·88·132~134행에 DWARF 4/5 구분이 있다. 212행 GCC 8+/Clang 11+, 368행 '오래된 GDB는 GNU만'에 출처가 없고 llvm-dwarfdump·pyelftools·GDB 버전 표기가 없어 4에 못 미친다. |

병합 대상: GDB chapter12 location/entryvalue 요약. 다음 조치: 확인오류정정후 판고정출처·실행환경·관찰을보강하고중복요약을정본링크로줄인다.오번호/후행설명불일치도정리한다.

### `dwarf-elf/chapter05-cfi-eh-frame.md`

source_file: `src/content/blog/tools/debugging/dwarf-elf/chapter05-cfi-eh-frame.md`

score_status: 잠정 · score: 60 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1위오류게이트.

오류 확인.52·203행Undefined=복원불가/알수없음과385행undefined=변경안됨이충돌한다.DWARF5§6.4.1 printedp173/PDFindex190은undefined=no recoverable previousvalue,samevalue=unmodified로구별하므로385행이틀렸다.244행sub후257~258행leave직전의rsp+8 CFA의문은실제컴파일예대조없어별도불확실로남긴다.

uncertainties:
- 334행 DW_CFA_GNU_args_size 표준화, 419행 DW_CFA_AARCH64_negate_ra_state DWARF 5 표준화: 평가자는 DWARF 5 Table 7.29로 오류를 확인했다고 했으나 재검에서 명세를 다시 열지 않았다. 판정 근거로는 쓰지 않았다.
- 270행 .eh_frame에서 length=0xFFFFFFFF를 'terminator'로 적었다(LSB에서는 length 0이 terminator라는 기억). 확인하지 않았다.
- 335행 DW_CFA_val_offset 'DWARF 5 도입'(DWARF 3 도입이라는 기억), 336·413행 augmentation "S"를 DWARF 5 새 기능으로 적은 부분은 확인하지 않았다.
- 133~135행 "zP"·"zL"을 단독 값처럼 나열한 것, 274행 -fno-asynchronous-unwind-tables와 예외 동작 관계는 GCC 문서·LSB로 확인하지 않았다.
- 319행 __builtin_return_address, 350행 perf 권장 이유, 366행 tail call, 421행 BTI 설명은 출처가 없다.
- 389~390행 pyelftools 예가 CU 루프 안에서 CFI_entries()를 반복해 CU 수만큼 중복 출력하는 것으로 보인다. 실행해 보지 않았다.
- 위정확성게이트에서확인/기각한해당의문은본문단락의결론을따른다.그밖API·출력·버전·측정조건은열린불확실로B≤13/C≤8유지.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 14 | 고유한 부분은 86~94행 FDE 바이트코드를 99~103행 PC별 CFA·rbp·rip 표로 다시 풀어 보인 것, 221~235행 advance_loc·offset 6-bit 인라인 인코딩, 265~271행 .debug_frame/.eh_frame 비교 표, 399~407행 JIT 런타임 등록이다. 13·18·40·54행처럼 명사형으로 끊긴 요약이 많고 323~330, 344~350, 411~421행은 근거 없는 한두 줄 일반론이다. 332~338행 'DWARF 5의 변화'와 385·257행 오류가 분석 가치를 깎아 13~19 구간 아래쪽. |
| B | 12 | 왜 필요한가(21~36행) → CFA·register rule(38~62행) → CIE(108~149행) → FDE(151~166행) → 명령 카탈로그(168~217행) → 인코딩(219~235행) → 디스어셈블 대조(237~261행) → .eh_frame_hdr(276~303행) → 정리(423~435행)로 흐름은 완성됐다. 385·257행 내부 모순과 334·419행 버전 주장 문제로 정확성이 흔들리고(AP-C-24 B ≤ 13), LSDA·personality는 134~135행 표 한 줄씩뿐이다. |
| C | 6 | llvm-dwarfdump(68~94, 250~259행), objdump(239~248행), readelf frames-interp(376~383행) 출력이 있지만 컴파일러·버전·플래그·소스 코드가 없다. 같은 `my_prog`인데 86행 FDE는 pc=00401130…0040115e, 251·377행은 00401120…0040115c라 한 빌드 출력이 아니다. 257~258행은 244행과 맞지 않는 CFA를 'leave 직전'에 두어 손으로 만든 예로 보인다. C ≤ 8 상한 아래에서 출력 신뢰성 문제로 6. |
| D | 10 | chapter04-debug-loc.md232~238행 ↔ 이글38~62행CFA만공유, chapter06-split-dwarf-tools.md358~374행 ↔387~397행CFI추출반복.다른시리즈GDB chapter12-dwarf.md277~333행 ↔13·99~103·297~301·344~348행 CFI개념/PC주소표/readelf/framing설명반복.그쪽빠른참조와이글CIE/FDE인코딩역할분담으로10. |
| E | 8 | 제목의 .debug_frame·.eh_frame과 description의 CIE/FDE·CFA·register rule·.eh_frame_hdr 이진 탐색이 108·151·38·44·276행 절에서 다뤄진다. 15행이 약속한 'C++ 예외와의 관계'는 134~135·267·274·330행 몇 줄뿐이라 9 이상은 아니다. |
| F | 7 | 439행 다음 장 'Ch 6 (시리즈 마지막)'은 seriesOrder 6 `chapter06-split-dwarf-tools.md`와 맞고 6편이 마지막이다. 443행 Ch 4, 444행 Ch 6 라벨도 대상과 맞다. 54~60행 unwind 5단계, 99~103행 표가 글 고유 안내다. 전제 지식(Ch 2 DIE, Ch 4 CFA) 안내가 없고 렌더 확인을 하지 않아 7. 실제title/order/draft및후행설명을다시대조했다.기계링크통과와내용이행은구분한다. |
| G | 3 | 445~448행 DWARF 5 §6.4, Itanium C++ ABI EH, LLVM libunwind, LSB eh_frame 링크는 글 끝 목록일 뿐 본문 주장과 연결되지 않는다. 본문에 도구·컴파일러 버전, ABI 판 표기가 없다. |

병합 대상: GDB chapter12 CFI 요약. 다음 조치: 확인오류정정후 판고정출처·실행환경·관찰을보강하고중복요약을정본링크로줄인다.오번호/후행설명불일치도정리한다.

### `dwarf-elf/chapter06-split-dwarf-tools.md`

source_file: `src/content/blog/tools/debugging/dwarf-elf/chapter06-split-dwarf-tools.md`

score_status: 잠정 · score: 50 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1위오류게이트.

오류 확인.기존25~30행파일156MB/debug1234.5MB를섹션합은절대파일보다클수없다는일반규칙으로확정한근거는기각한다(압축/도구표시/분리파일조건을확인해야함).대신361행cfi.is_CIE()를직접읽은pyelftools공식callframe.py의CFIEntry/CIE/FDE정의와대조했다.공통기능은CFIEntry,식별은별도클래스isinstance이며is_CIE메서드가없다.그대로쓰기엔AttributeError경로이므로확인오류를API근거로교체.실제패키지설치/전체script실행은아니다.

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
- 위정확성게이트에서확인/기각한해당의문은본문단락의결론을따른다.그밖API·출력·버전·측정조건은열린불확실로B≤13/C≤8유지.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 12 | 이 글에만 있는 부분은 pyelftools 활용 5종(248~374행: 함수 크기 상위 20, 미사용 함수, 변수 주소, 콜그래프, CFI), `llvm-dwarfdump --statistics`·`--verify`(400~428행), 운영 셋업 5단계(449~472행)다. 13행 크기 문제, 43~62행 split-DWARF와 skeleton, 124~143행 별도 debuginfo와 build-id, 182행 부분 다운로드는 gdb-lldb Ch12 문장을 거의 그대로 옮겼다. 447행 'DWARF 7 … 큰 도약은 없을 듯'은 근거 없는 전망이고 472행 '수십 시간 → 분 단위'는 출처 없는 효과 주장이다. 122행(-gline-tables-only가 '운영 빌드의 표준')과 451~455행(-g3 -gsplit-dwarf가 '대규모 운영의 표준') 사이 선택 기준이 없다. |
| B | 11 | 크기 측정(21행)에서 split-DWARF, dwz, line-tables, build-id, debuginfod, 압축, pyelftools, dwarfdump, 운영 셋업, 정리(474행)까지 흐름은 끝까지 간다. 300~302행은 `called`를 채우는 부분이 `...`라 305행 `unused`가 all_funcs와 같아지고, 323~326행 변수 주소 추출도 `...`로 끝난다. split-DWARF와 dwz의 한계(도구 지원, .dwo 경로 변경)가 없다. AP-C-24에 따라 B ≤ 13. |
| C | 6 | 실행할 수 있는 명령(43~44, 78, 101·106, 129~131, 170~179, 197행)과 Python 코드(225~372행)가 있다. 25~30행은압축/분리파일/명령조건이없어관찰결과를신뢰하기어렵지만파일크기만으로불가능확정하지않는다. 68행 '50% 이상', 103행 '60~80%', 120행 '1/10 이하', 191행 '기본 1 GB', 215행 '30-50% 절감'은 출처·측정 환경이 없어 C ≤ 8. 402~411행 `--statistics` 출력은 임의 값으로 보이고 도구 버전이 없다. |
| D | 6 | 다른시리즈GDB chapter12-dwarf.md338~420행 ↔ 이글13·43~62·116~143·182행 split/dwo/skeleton/line-only/build-id/부분다운로드문장반복. Postmortem chapter04-debuginfod-minidump-automation.md110~161행 ↔170~204행 URL/캐시/서버명령/효과문구반복.같은시리즈chapter05-cfi-eh-frame.md387~397행 ↔358~374행CFI추출반복.자체도구예는남으나분량큰공통운용절로6. |
| E | 7 | 제목의 네 키워드를 모두 절로 다룬다(split-DWARF 34~91행, dwz 93~110행, debuginfod 165~204행, pyelftools 219~374행). description의 '분리·압축·네트워크 다운로드·자체 도구 작성'도 이행했다. 대상 독자가 정해져 있지 않고(308행 임베디드 flash, 451행 대규모 운영) 결론(476~485행)은 도구 목록에 가까워 9 이상은 주지 않았다. |
| F | 6 | 15행이 시리즈 마지막 장이라고 밝히고 487~496행이 Ch 1~6을 요약한다. 500~504행 Ch 1~5는 seriesOrder 1~5 제목과 맞고, 514행 `embedded/chapter05-elf-map.md`, 515행 `gdb-lldb/chapter01-intro-and-install.md`도 라벨과 맞다. seriesOrder 7 글이 없어 다음 편 링크가 없는 것은 맞다. 시리즈 뒤에 읽을 글 안내가 없고, 514~515행 내부 링크가 '외부 자료'에 섞여 있으며, 크게 겹치는 postmortem Ch04·gdb-lldb Ch12 링크가 없다. 실제title/order/draft및후행설명을다시대조했다.기계링크통과와내용이행은구분한다. |
| G | 2 | 508~513행 DWARF 5 표준, pyelftools, llvm-dwp, dwz, debuginfod 링크는 끝 목록이다. 본문 주장에 연결된 출처는 95행 dwz 링크 하나다. 52행 skeleton unit, 157행 'sha1 (기본)', 217행 '공식 표준화'에 절·문서 위치가 없다. 도구 버전은 24행 clang-17과 212행 'GCC 12+'뿐이고 447행 'DWARF 6는 2024년 작성 중'은 시점이 지난 표기다. |

병합 대상: GDB chapter12 및Postmortem chapter04 운용절. 다음 조치: 확인오류정정후 판고정출처·실행환경·관찰을보강하고중복요약을정본링크로줄인다.오번호/후행설명불일치도정리한다.

### `embedded-cpp/00-preface.md`

source_file: `src/content/blog/embedded/embedded-cpp/00-preface.md`

score_status: 잠정 · score: 45 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; 기술정확성확인대기.

미검증.원문내일반적zero-cost약속은조건이넓으나허브소개/후속과제이므로새내부모순으로확정하지않는다.기존git기록은slug/topic/rename/editorial/outline전환으로1차대조기록이없다.

uncertainties:
- 198~200행 -mcpu=cortex-m4 -mfloat-abi=hard에 -mfpu가 없다. part1-02 57행은 -mfpu=fpv4-sp-d16을 함께 쓴다. 툴체인 기본 FPU에 따라 달라지는지 GCC 문서로 확인하지 않았다.
- 27행 '런타임 오버헤드는 없습니다'의 단정이 part1-01 143행 'zero-cost가 아닌 영역도 있습니다'와 결이 다르다(다른 글과의 비교라 오류 확인 아님).
- 184행 기본 설정이 -std=c++17인데 표에는 C++20 기능(78행 consteval/constinit, 83행 Concepts)과 C++23(99행 std::expected)이 있다. 모순으로 보지 않았다.
- 215행 'Real-Time C++ (4th ed)' 판수와 214행 C++ Core Guidelines 분류는 확인하지 않았다.
- 187행 -fno-threadsafe-statics를 기본 설정에 넣은 근거가 본문에 없다. 기본값 권장이 맞는지 미확인.
- 위정확성게이트에서확인/기각한해당의문은본문단락의결론을따른다.그밖API·출력·버전·측정조건은열린불확실로B≤13/C≤8유지.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 8 | 16~27행 도입은 'C++는 무겁다' 같은 통념 4개(20~23행)를 나열하고 27행 'zero-cost abstraction … 런타임 오버헤드는 없습니다'로 끝나는 일반론이다. 25행 '일부는 맞고, 일부는 틀립니다'에 어느 쪽이 맞는지 답이 없다. 이 글만의 것은 144~158행 집필 원칙(측정 가능한 주장, 대안 제시, C가 맞는 상황), 164~167행 핵심 질문 4개, 171~178행 대상 환경 표 정도다. 앵커 part6-09(A 10)보다 고유 예제가 적다. |
| B | 11 | 허브 역할 기준으로 본다. 45행 '총 5개 Part, 40개 글'과 Part별 개수(51행 8, 68행 10, 87행 10, 106행 8, 123행 4)의 합 40이 실제 디렉터리 40편과 맞는다. 로드맵(138~140행), 사전 지식(205~208행), 목표(233~238행)까지 갖췄다. Part 표(55~132행)에 링크가 없고 표 라벨 일부가 현재 제목과 다르다(75행 'Lock, Handle, ScopedXxx' vs part2-02, 119행 '의존성 주입, static' vs part4-08). 182~201행 플래그 블록은 각 플래그의 이유가 없다. AP-C-24에 따라 B ≤ 13. |
| C | 4 | 실행 가능한 것은 182~201행 makefile 플래그 블록 하나인데 컴파일러 버전·대상 보드·결과가 없다. 146행 '어셈블리 N줄, 사이클 M개'는 원칙만 말하고 측정이 없다. 148행 Godbolt 확인도 절차·예상 결과가 없다. |
| D | 10 | 같은시리즈part1-02-compiler-flags.md29~57행 ↔ 이글182~201행플래그블록이상위집합. part1-01-cpp-vs-c.md27·34~46행 ↔27행zero-cost주제반복.다른시리즈Performance 00-preface.md31~53행과RTOS practical-internals/00-preface.md14~50행 ↔ 이글14~45행 동기/독자/Part개수표뼈대는공유하되성능진단/커널내부/C++도입이라는질문은다르다.허브중복을콘텐츠동일시하지않고10유지. |
| E | 6 | title '… 임베디드 모던 C++ 시리즈 소개'는 본문과 맞는다. description(5행)은 '어디까지 C++를 써도 되는가?'를 묻고 'RAII, constexpr, no-exception 설계부터 lock-free 패턴까지 … 안전하게 C++를 쓰는 법'을 약속하는데, 본문은 157~158행과 176~177행 정도로만 답하고 나머지는 목차 표(74~77·97·114행)에 이름만 둔다. |
| F | 5 | 242행nextpart1-01/order1 title은다른표현이지만실제C++vsC질문으로맞는다.옛제목자체를오류안내로단정한기존근거는기각.허브표55~132/로드맵138~140행에장별링크가없어탐색이불편하므로5유지.대상/사전지식29~41·205~208행존재. |
| G | 1 | 레퍼런스 절(210~227행)에 서적 4권·온라인 4곳·컨퍼런스 3개가 있지만 본문 주장과 하나도 연결되지 않는다. 판수는 215행 Real-Time C++ 4th ed만 있고, 214행 C++ Core Guidelines는 온라인 문서인데 '서적'에 들어가 있다. 175행 컴파일러와 182~201행 플래그 블록에 버전이 없고 225~227행 컨퍼런스는 링크·연도가 없다. |

병합 대상: part1-02 플래그블록. 다음 조치: 독립질문을유지하며 판고정출처·실행환경·관찰을보강하고중복요약을정본링크로줄인다.오번호/후행설명불일치도정리한다.

### `embedded-cpp/part1-01-cpp-vs-c.md`

source_file: `src/content/blog/embedded/embedded-cpp/part1-01-cpp-vs-c.md`

score_status: 잠정 · score: 53 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; 기술정확성확인대기.

미검증.195행-fno-rtti환경과206행dynamic_cast1회+3KB는의심되지만캐스트종류/측정대상변경을밝히지않아실제원프로그램을재현할수없다.GCC공식C++옵션은RTTI없는허용cast도따로정의하므로dynamic_cast라는문자열만으로컴파일불가를확정하지않는다.새기술gate없이기존상태유지.

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
- 위정확성게이트에서확인/기각한해당의문은본문단락의결론을따른다.그밖API·출력·버전·측정조건은열린불확실로B≤13/C≤8유지.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 Counter 생성자·멤버 함수가 사라지는 어셈블리 대조(65~91행), Gpio 템플릿과 C 매크로의 같은 출력(99~139행), 템플릿 인스턴스가 다른 타입이라 섞어 쓸 수 없다는 설명(141행), 'C가 여전히 옳은 자리' 다섯 기준(262~266행)이다. 기능별 비용 표(34~44행), 끄는 기능 목록(147~191행), 함정 6개(212~234행), Modern C++ 기능 표(240~254행)는 입문 자료의 표준 목록이다. 15행 요약, 28행 '정확히 아는 것이 핵심'은 일반론이고 185행 '대부분 무시할 수 있습니다'는 기준 없이 결론만 준다. |
| B | 11 | 문제 제기(19~28행) → 기능별 비용(34~46행) → 어셈블리 측정(52~141행) → 비용 영역(143~191행) → 크기 표(193~208행) → 함정 → C가 맞는 자리 → 공존 전략 → 정리(294~299행)로 흐름은 완성됐다. 26행 MISRA 두려움에는 답하지 않고(264행은 DO-178C만), 25행 디버깅은 288행 질문으로만 남는다. 제목의 ABI는 279행 한 문단 뒤 1-05로 넘긴다. 108행 주석 'RAII + 템플릿'인데 109~113행 코드에 RAII가 없고, 297행 정리의 비용 목록이 46행과 다르다. AP-C-24에 따라 B ≤ 13. |
| C | 7 | 56행 'ARM Cortex-M4, -O2, GCC 13'과 81~91·123~137행 어셈블리 출력으로 재현 단서는 있으나 빌드 명령이 없다. 193행 '실측' 크기 표(197~206행)는 195행 STM32F4·플래그만 있고 툴체인 버전·소스·측정 명령·libc가 없으며, 159행 '3-10KB', 169행 '수 KB', 179·226행 '50KB'도 출처·환경 없는 수치라 C ≤ 8. |
| D | 11 | part1-02-compiler-flags.md78~147행 ↔ 이글147~173행 예외/RTTI반복,00-preface.md27행 ↔27·46행zero-cost반복.다른시리즈RTOS practical-internals/part4-13-cpp-in-rtos.md254~268행 ↔155~175행핵심플래그효과반복. part1-04-code-size-analysis.md289~305행은vtable측정으로이글123~139행GPIO동등비교와질문다름.개관독립성을인정해11. |
| E | 6 | 제목의 '런타임·코드 크기·ABI 관점 비교' 중 런타임(34~44, 52~139행)과 코드 크기(193~208행)는 다루지만 ABI는 279행 한 문단 뒤 1-05로 넘긴다. description의 '측정 가능한 비교'는 출처·절차 없는 크기 표(197~206행)로 반만 이행된다. |
| F | 5 | 311행 다음 글(1-02 컴파일러 플래그)은 seriesOrder 2 파일과 맞다. 303~306행 관련 링크 4개(1-02, 1-04, 2-08 CRTP, 3-05)는 대상 제목과 맞고 165·187·268·279행 본문 링크 대상도 있다. 그러나 307행 'GoF 5: Singleton (avoid)'는 링크 없는 항목이고 대상 `programming/design/gof-design-patterns/item05-singleton.md`는 draft: true다. 같은 시리즈 `part4-08-singleton-alternatives.md`(seriesOrder 36)를 가리키지 않는다. 링크 없는 관련 항목이 공개되지 않은 글을 가리켜 F ≤ 5. 실제title/order/draft및후행설명을다시대조했다.기계링크통과와내용이행은구분한다. |
| G | 1 | 본문에 1차 출처 링크가 없다. 버전 표기는 56행 'GCC 13'과 195행 플래그뿐이고 크기 표의 libc·FreeRTOS 버전·표준 라이브러리 구현이 없다. 252~254행 C++20·C++23 표기도 표준 문서 인용이 없다. |

병합 대상: part1-02 예외/RTTI개관. 다음 조치: 독립질문을유지하며 판고정출처·실행환경·관찰을보강하고중복요약을정본링크로줄인다.오번호/후행설명불일치도정리한다.

### `embedded-cpp/part1-02-compiler-flags.md`

source_file: `src/content/blog/embedded/embedded-cpp/part1-02-compiler-flags.md`

score_status: 잠정 · score: 54 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1위오류게이트.

오류 확인.84~87행원divide에<stdexcept>만보충해macOSclang++-std=c++17-fno-exceptions로컴파일했으며exit1,cannot use throw with exceptions disabled가났다.92행규칙과97~101행같은함수32B측정은양립불가.프로브/private/tmp/adsense-loop12-throw.cpp.추가로GCC공식-fuse-cxa-atexit는atexit대신__cxa_atexit를고르는옵션으로정의하므로본문의모든소멸자등록제거해석도구분해야한다.

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
- 위정확성게이트에서확인/기각한해당의문은본문단락의결론을따른다.그밖API·출력·버전·측정조건은열린불확실로B≤13/C≤8유지.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | -fno-exceptions·-fno-rtti·-Os·-flto·gc-sections 설명(78~246행)은 GCC 매뉴얼과 입문 자료의 표준 목록이다. 이 글만의 것은 플래그를 하나씩 더한 누적 크기 표(391~400행), 최적화 레벨별 크기(199~206행), 함정 6개(350~372행), debug/release Makefile 분리(325~344행)다. 수치에 출처·재현 절차가 없고 407행 '5-10배'는 표(392·399행, 약 4.4배)와 맞지 않는다. 앵커 part7-05(A 9)보다 함정·누적 표가 구체적이다. |
| B | 11 | 표준 플래그 셋(29~57행) → 플래그별 효과·대안(62~319행) → 빌드 분리(321~346행) → 함정(348~372행) → 누적 측정(387~402행) → 정리 순서로 흐름은 갖췄다. threadsafe-statics의 race 조건(163~166행), LTO 비용(225~229행) 같은 한계도 일부 적었다. 97~101행 예시 출력이 92행과 함께 참일 수 없는 오류이고 407행도 표와 맞지 않아 11. |
| C | 6 | Makefile 조각(29~57, 252~266, 325~344행)은 그대로 쓸 수 있다. 측정값(98~101행, 199~206행 '한 임베디드 프로젝트 (STM32F4)', 389~400행 STM32F4·GCC 13, 279~281행 elf 142 KB / bin 64 KB)에 소스·링커 스크립트·라이브러리·측정 명령이 없다. 94행 '5-20KB', 137행 '1-5KB', 223행 '5-15%', 246행 '30-60%', 385행 '1-3KB'도 출처·환경이 없어 C ≤ 8. 98~101행은 같은 글 기준으로도 나올 수 없는 값이라 6. |
| D | 10 | part1-01-cpp-vs-c.md155~175·212~214행 ↔ 이글78~147·350~352행예외/RTTI함정반복.다른시리즈Recipes part8-10-code-size-optimization.md47~80행 ↔185~246행 Os/GC/LTO같은질문, RTOS practical-internals/part4-13-cpp-in-rtos.md254~268행 ↔120~166행플래그설명공유.이글168~183·248~319행atexit/경고/ARM ABI정본역할로10. |
| E | 7 | 제목의 -fno-rtti·-fno-exceptions·-Os와 description의 -flto를 모두 H2로 다룬다(78·120·185·215행). description의 '각 플래그가 실제 바이너리에 무엇을 하는가'는 출처 없는 크기 숫자뿐이고 map·disassembly 관찰이 없다. 제목은 '임베디드 C++' 일반인데 본문은 Cortex-M/GCC 중심(57·290~311·389행)이다. |
| F | 7 | 29~57행 표준 플래그 셋이 아래 H2(62·78·120·149·168·185·215·233·248·274·290행)와 대응하고 60행이 이를 안내한다. 76행 part1-08, 104·416행 part3-05, 147·417행 part3-08, 414행 part1-01, 415행 part1-04 라벨이 대상 제목과 맞는다. 421행 다음 글 part1-03은 seriesOrder 3이다. 전제 지식 안내가 없고 audit:reading을 돌리지 않아 9 이상은 주지 않는다. 실제title/order/draft및후행설명을다시대조했다.기계링크통과와내용이행은구분한다. |
| G | 2 | 본문에 GCC·Clang 매뉴얼, ARM 문서 같은 1차 출처 링크가 없다. 389행 'GCC 13', 69~72행 표준별 GCC 버전이 있지만 출처가 없고 200행은 '한 임베디드 프로젝트'로 환경을 밝히지 않는다. 앵커 part7-05(G 2)와 같다. |

병합 대상: Recipes 코드크기공통절. 다음 조치: 확인오류정정후 판고정출처·실행환경·관찰을보강하고중복요약을정본링크로줄인다.오번호/후행설명불일치도정리한다.

### `embedded-cpp/part1-03-runtime-requirements.md`

source_file: `src/content/blog/embedded/embedded-cpp/part1-03-runtime-requirements.md`

score_status: 잠정 · score: 49 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1위오류게이트.

오류 확인.85~86·210·291/293행의대략libc크기수치만으로내부모순확정한기존근거는기각한다.빌드옵션/포함기능/링크조건이빠져동일측정량이라고단정할수없다.대신38행__udivmodsi4를longlong나눗셈이라한주장은GCC공식libgcc/udivmodsi4.c21~26행의unsignedlong인자/반환및31bit검사와맞지않는다.본문ARM Cortex-M4조건에서clang++--target=arm-none-eabi-mcpu=cortex-m4-mthumb로sizeof(unsignedlong)==4/sizeof(longlong)==8 static_assert가통과했다.64bit헬퍼와32bit헬퍼의구분오류로gate유지.프로브/private/tmp/adsense-loop12-arm-width.cpp.

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
- 위정확성게이트에서확인/기각한해당의문은본문단락의결론을따른다.그밖API·출력·버전·측정조건은열린불확실로B≤13/C≤8유지.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | C++ 런타임을 libgcc·libsupc++·libc·libstdc++ 네 층으로 나누고(19~24행) 층마다 끌려오는 심볼(36~40, 59~64행)과 직접 제공하는 최소 런타임(161~182행)을 연결한 구성은 이 글의 몫이다. libc 크기 표(81~87행), libstdc++ 기능별 크기 표(110~119행), 66행 '80%가 사라집니다', 184행 '1-2KB'는 출처·환경 없는 수치이고 선택 기준은 215행 'picolibc를 검토해 볼 만합니다' 수준이다. 앵커 part1-04(A 10)보다 고유 표·코드가 조금 많다. |
| B | 12 | 문제(17~26행) → 라이브러리별 역할(28~125행) → 부트 시퀀스(127~155행) → 최소 런타임(157~184행) → newlib/nano(186~204행) → picolibc(206~215행) → syscall stub(217~256행) → 함정(258~282행) → 측정(284~297행) → 정리(299~305행)로 흐름은 완성됐다. `_sbrk`(241~249행)에 heap 상한·stack 충돌 검사가 없는데 언급이 없고, 256행 'return -1'은 `void*` 반환 함수(241행)와 맞지 않는다. 170~173행 new/delete를 무한 루프로 바꿨을 때 영향도 설명하지 않는다. |
| C | 6 | 링크 옵션(91~100, 200~204행)과 stub 코드(221~252행)는 그대로 쓸 수 있다. 측정 절(286~295행)은 'STM32F4'만 적고 toolchain 버전·최적화 플래그·LTO·gc-sections·측정 명령이 없으며 110~119행 표와 202행 '+5KB'도 출처가 없어 C ≤ 8. 서로다른대략수치에빌드조건이빠져비교가능성이낮다.동일조건내부모순으로확정하지않는다. |
| D | 8 | part1-06-startup-code.md47~63행 ↔ 이글129~146행 부트순서거의동일. part1-02-compiler-flags.md168~183행 ↔59~64행atexit역할공유.다른시리즈Recipes part3-07-c-runtime.md112~150행 ↔217~256행write/sbrk/stub구조반복;Recipes는상한/ENOMEM도있다. Recipes part8-10-code-size-optimization.md90~106행 ↔93~100·200~204행nano선택공유.이글30~75·161~182행libgcc/libsupc++목록은남아8. |
| E | 6 | 제목이 'libstdc++·newlib·crt0 분석'을 내걸지만 본문에 crt0라는 말이 없고 crt0/crti/crtn 설명도 없다. 부트 순서 목록(129~146행)이 일부를 대신할 뿐이다. libstdc++(104~125행)·newlib(186~204, 217~256행)은 다루고 description의 '무엇이 진짜 필요한가'는 157~184·299~305행이 답한다. |
| F | 5 | 317행 다음 글(Part 1-04 코드 크기 분석)은 seriesOrder 4 `part1-04-code-size-analysis.md`와 맞다. 155·311행(1-06 __libc_init_array)은 part1-06 59~63행, 312행(1-07 .init_array)은 part1-07 104~119행, 313행 3-01(seriesOrder 19)도 라벨과 맞다. 그러나 309행 'Part 1-02: 컴파일러 플래그 — newlib 선택, --specs=nano.specs' 라벨과 달리 part1-02에는 specs 언급이 없고 newlib은 368행 한 문장뿐이다. 관련 링크 라벨이 대상 내용과 달라 F ≤ 5. 실제title/order/draft및후행설명을다시대조했다.기계링크통과와내용이행은구분한다. |
| G | 1 | 본문에 1차 출처 링크가 하나도 없다. GCC·arm-none-eabi toolchain, newlib·picolibc 버전이 없고 측정 환경은 286행 'STM32F4'뿐이다. 215행 'GCC 12+와 Zephyr가 picolibc를 기본으로 채택'에도 출처가 없다. 앵커 part1-04(G 1)와 같다. |

병합 대상: part1-06 부트순서/Recipes syscall공통절. 다음 조치: 확인오류정정후 판고정출처·실행환경·관찰을보강하고중복요약을정본링크로줄인다.오번호/후행설명불일치도정리한다.
