# DWARF·ELF 수정 루프 — 2026-10-22

공개 6편의 전문과 published-loop-12의 지적·불확실 항목을 대조했다. 점수·판정·factcheck는 갱신하지 않는다. 아래 확인 오류는 수정(remediated)했으며 포맷 분석과 실제 프로세스 디버깅을 구분한다.

## 결정 근거·범위

1. 맥락: ELF 구조, DWARF DIE·줄/위치 정보, CFI, 분리·압축과 자체 파서에 관한 6편이다. 독자가 읽는 바이너리와 해석 결과가 같은 산출물에서 나오는지 확인했다.
2. 신호·반증: 같은 파일이라며 제시한 readelf 수치 불일치, LEB128 비트 모순, 버전별 인덱스·typed operand·CFI 규칙·없는 API를 확인했다. 합성 예시와 실측 결과를 분리하고 단일 무경고 결과를 전체 디버거 정확성 증명으로 쓰지 않는다.
3. 원인·대안: 서로 다른 출력을 섞고 타입/버전/컨테이너의 책임을 혼동한 설명이었다. 목록을 일괄 삭제하는 대신 확인 오류를 정정하고 최소 실제 산출물을 생성·파싱했다. 완료되지 않은 의사 코드는 그 범위를 명시했다.
4. 증거: DWARF 5 규격·ELF gABI·LLVM 문서·pyelftools 0.32 소스/API, 본문 명명 블록 추출 실행 로그다. DWARF 5 PDF의 §2.5·6.2·6.4를 중심으로 대조했다.
5. 표본: macOS arm64, Homebrew LLVM/Clang 23.1.3, x86_64-unknown-linux-gnu ELF 오브젝트, Python 3.15.0와 pyelftools 0.32. pyelftools는 승인된 pip 다운로드로 /private/tmp/adsense-pyelftools-2026-10-22에만 설치했다. 기존 Python 환경은 변경하지 않았다.
6. 결정: 아래 오류를 수정했다. 크로스 타깃의 ELF 파일을 생성·분석한 것이며 그 Linux 코드를 macOS에서 실행했다고 주장하지 않는다. ULEB128만 네이티브 실행 프로그램으로 확인했다.
7. 변경 경계: 6편 본문·명명 예제·검증기·수정 기록이다. URL·frontmatter·공개 상태를 보존했다. 점수 파일·다른 사용자 작업은 롤백 대상이 아니다.
8. 잔여 위험: 동적 로더/실행 파일 segment mapping·전체 stack unwind·JIT/PAC/signal·실기 변수 평가·원격 debuginfod·dwz·GDB 검색은 실행 목록 밖이다. 관련 예제나 지원 버전 변경 시 해당 정상/부정 사례를 다시 실행한다.

| 장 | 확인 문제·수정 | 실행 증거·한계 |
| --- | --- | --- |
| 01 ELF | 같은 ls의 헤더/섹션 수치 모순 제거, ET_EXEC=정적 링크·압축 이름·검색 경로 조건·WEAK/동적 interposition·build-id 무결성 혼동·다음 장 안내 정정 | 같은 sections.o의 ELF64/REL/x86-64, data/bss NOBITS, UND external·정의 compute·재배치 확인. REL의 program header 부재 확인. 잘못된 파일 파싱 거절 |
| 02 DIE | 잘못된 LEB128 2진수·첫 청크, DWARF32/64·주소 폭·FORM·type unit 저장 섹션·high_pc 클래스·미측정 버전 우열 정정 | types.c의 DWARF32/64 ELF 오브젝트 생성·verify·구조체/member 출력 확인. 네이티브 ULEB128 624485·UINT64_MAX, 잘림·빈 입력·overflow 거절 |
| 03 line | prologue PC 예시 충돌, 고정 압축 배율·허구 역사, DWARF4 directory와 DWARF5 file index, 시퀀스 경계·max_ops·breakpoint 단정 정정 | DWARF4/5 line table verify, 주소0→lines.c:1, 범위 밖 not found 실패, 4/5 인덱스 경계 확인. basename만 출력하는 최소 조회기 |
| 04 location | deref_type의 1-byte size/ULEB type offset, 고정 폭 branch, register/piece 즉시 반환·generic64·entry value 이력 보존·빠진 파서 초기화 정정 | DWARF4/5×O0/O2 4오브젝트 verify·LocationExpr/list 파싱. typed bytes size=4/type_offset=64와 다음 stack_value 파싱. 대상 메모리 dereference는 미실행 |
| 05 CFI | undefined≠same_value, 없는 is_CIE API, EH/debug API 구분, 항상 있는 eh_frame·terminator·leave 완료 시점·일반 규격/ABI 확장 혼동 정정 | .cfi_undefined/.cfi_same_value로 만든 rules.o의 EH CIE/FDE·디코딩 테이블을 읽어 두 규칙 구분. 소스 DWARF 없는 EH-only 오브젝트도 읽음. 실제 stack unwind는 미실행 |
| 06 tools | 임의 크기/시간·캐시상한, ELF 압축과 GNU 이름 방식, origin 참조 API·high_pc 클래스·CFI API·미사용/호출 그래프 완전성·PDB/pyelftools 컨테이너 범위 정정 | split.o의 skeleton, split.dwo→package.dwp의 CU 인덱스, full/압축 오브젝트 verify, 동일 함수 크기·origin 목록, SHF_COMPRESSED와 .zdebug_info 부재 확인. 원격 서비스·dwz·GDB 자동 탐색은 미실행 |

## 재현

`PYTHONPATH=/private/tmp/adsense-pyelftools-2026-10-22 node scripts/verify-dwarf-elf-article-examples.mjs NN` (01~06). 경로는 이번 임시 설치 위치다. 재실행 시 pyelftools 0.32가 설치된 환경을 지정한다. 검증기는 기사 블록에서 소스를 추출하고 명령·종료 상태를 장별 dwarf-elf-chNN-examples.log에 남긴다.

## 1차 자료와 접근 한계

- [DWARF 5 PDF](https://dwarfstd.org/doc/DWARF5.pdf), [공식 표준 진행 상태](https://dwarfstd.org/)
- [ELF sections](https://gabi.xinuos.com/elf/03-sheader.html), [program loading](https://gabi.xinuos.com/elf/07-pheader.html)
- [LLVM dwarfdump](https://llvm.org/docs/CommandGuide/llvm-dwarfdump.html), [readelf](https://llvm.org/docs/CommandGuide/llvm-readelf.html), [objcopy](https://llvm.org/docs/CommandGuide/llvm-objcopy.html)
- [GDB separate debug files](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Separate-Debug-Files.html), [elfutils debuginfod](https://sourceware.org/elfutils/Debuginfod.html)
- [pyelftools](https://github.com/eliben/pyelftools): 버전0.32의 설치된 dwarfinfo/lineprogram/die/callframe/locationlists 코드를 실제로 대조했다.
- [AArch64 DWARF ABI](https://github.com/ARM-software/abi-aa/blob/main/aadwarf64/aadwarf64.rst), [GCC return address builtin](https://gcc.gnu.org/onlinedocs/gcc/Return-Address.html)

LSB eh_frame 페이지는 접근 차단되어 그 페이지를 읽은 증거로 사용하지 않았다. 길이0 종료·확장 길이는 설치된 pyelftools callframe 파서와 구분해 확인했다. LLVM 특정 미래 릴리스 태그의 compiler-rt 원문 URL이 열리지 않은 시도 역시 판 고정 출처 검증으로 세지 않았다.

최종 gate·전체 사이트·평가 파일 보존 검사는 공통 기록을 따른다. 문서 점수 상승이나 모든 미검증 주장 해소를 선언하지 않는다.


[최종 공통 검증](repair-loops-final-2026-10-22.md)에서 최종 사이트 빌드·gate·앵커·읽기·메타데이터·점수 보존 검사를 확인한다.
