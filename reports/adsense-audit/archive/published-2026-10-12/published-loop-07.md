# 공개 글 AdSense 평가 — 루프 07

> 대상: 공개 글 10편 (Buildroot Practical, `seriesOrder` 3~12)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 일곱 번째 루프다. 대상은 `src/content/blog/embedded/buildroot/`의 `chapter03-kconfig.md`~`chapter12-kernel-customize.md` 10편이고 모두 공개 글이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `chapter03-kconfig.md` | 10 | 11 | 7 | 9 | 6 | 6 | 2 | **51** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `chapter04-first-build.md` | 12 | 12 | 7 | 10 | 8 | 6 | 2 | **57** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `chapter05-package-system.md` | 10 | 12 | 7 | 9 | 5 | 5 | 1 | **49** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter06-br2-external.md` | 10 | 11 | 7 | 10 | 7 | 6 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter07-board-customize.md` | 13 | 13 | 8 | 9 | 8 | 7 | 2 | **60** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `chapter08-filesystems.md` | 15 | 13 | 8 | 12 | 7 | 7 | 2 | **64** | 미검증 | 보강 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `chapter09-new-package.md` | 13 | 12 | 7 | 8 | 7 | 6 | 2 | **55** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md` |
| `chapter10-real-board.md` | 15 | 12 | 7 | 10 | 8 | 4 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter11-toolchain.md` | 15 | 13 | 8 | 12 | 8 | 5 | 2 | **63** | 미검증 | 보강 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `chapter12-kernel-customize.md` | 14 | 14 | 8 | 11 | 8 | 4 | 2 | **61** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md` |

평균 57.1점(10편 합 571), 범위 49~64점이다. 판정은 우선 조치 6편, 보강 2편(ch08·ch11), 병합 검토 2편(ch03·ch05)이다. 80점 이상 글과 `factcheck: 검증됨` 글은 없다. 오류 확인은 6편(ch04·06·07·09·10·12)이고 모두 원문 내부 모순(루브릭 3-1)으로 판정했다. 점수 구간으로는 ch07·ch08·ch11·ch12가 보강(60~79)이고 나머지 6편이 병합 검토(40~59)다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체와 다음 편·관련 항목·본문 내부 링크 대상 파일의 존재·제목·seriesOrder·`draft: false`까지이고, 렌더링·광고 배치·외부 링크 응답은 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `chapter03-kconfig.md` | 51 | 51 | 0 | 없음 |
| `chapter04-first-build.md` | 59 | 57 | -2 | 없음 |
| `chapter05-package-system.md` | 49 | 49 | 0 | 없음 |
| `chapter06-br2-external.md` | 54 | 53 | -1 | 없음 |
| `chapter07-board-customize.md` | 60 | 60 | 0 | 없음 |
| `chapter08-filesystems.md` | 64 | 64 | 0 | 없음 |
| `chapter09-new-package.md` | 56 | 55 | -1 | 없음 |
| `chapter10-real-board.md` | 58 | 58 | 0 | 없음 |
| `chapter11-toolchain.md` | 63 | 63 | 0 | 없음 |
| `chapter12-kernel-customize.md` | 61 | 61 | 0 | 없음 |

1차 합 575에서 최종 571로 4점 내려갔다. 부풀림(AP-C-24) 판정은 10편 모두 없음이다.

- 기각한 오류 확인: 0건.
- 추가한 오류 확인: 5건, 4편.
  - ch04: 229·241행과 245~247행 표(각 단계 끝에 `.stamp_downloaded`·`.stamp_extracted`·`.stamp_patched` 생성) vs 232~239행 `ls | grep stamp` 출력에 그 세 stamp가 없음. 172행 `ls -lh`의 60M 일반 파일 rootfs.ext4 vs 179행 'rootfs.ext2의 symlink'. 판정이 병합 검토 → 우선 조치로 바뀌었다.
  - ch06: 114·117행(Config.in을 비워 둬도 됨)·129~132행(External options 표시) vs 281행(비어 있으면 메뉴 미표시). 평가자가 본 225행 vs 296행 모순에 더해 두 번째 근거가 됐다.
  - ch07: 59행(overlay 권한 그대로 유지, overlay에서 chmod +x) vs 142행('overlay에서 mode를 강제할 방법이 없습니다')·335행('권한·삭제는 표현 불가'). 판정이 보강 → 우선 조치로 바뀌었다.
  - ch09: 234행(setup.py·pyproject.toml·poetry 자동 감지) vs 264·270·484행(`_SETUP_TYPE`을 정확히 적어야 함). 판정이 병합 검토 → 우선 조치로 바뀌었다.
- 점수 변경: ch04 B 13→12·C 8→7(빈 단계 제목과 예시 출력 모순), ch06 B 12→11(두 번째 내부 모순), ch09 B 13→12(확인된 내부 모순). 나머지 7편은 인용 줄을 원문과 대조해 점수를 유지했다.
- 근거 정정: D 비교 줄 번호를 직접 연 줄로 바꿨다(ch04의 ch01 185~195·ch02 168~181·ch14 96~107행, ch05의 ch09 cmake 144~231·python 232~308행, ch06의 ch10 링크 62행, ch07의 ch15 80~81행, ch09의 ch05 213·265행·ch18 81~97행, ch10의 Ch 7 190~214·219~229행, ch12의 Ch13 110·329행). ch08·ch11 D에는 평가자가 놓친 같은 주제 글(qemu-embedded ch06, embedded-security ch06, ch03 131~138행, part7-14 104~121행)을 더했고 점수는 유지했다.
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목과 대조했다. 감점 원인은 대상과 다른 라벨(ch05 397행, ch11 329행, ch12 125·217·349·352·353행), 시리즈 종결 오안내(ch10 605~636행)다.

## 글별 근거

### `chapter03-kconfig.md` — 51점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic 메타데이터, ac24bb76 제목 변경, c41a9273 text 블록 변환, 03ec1f08 do-178c 표 변환, 20c1b507 ASCII→TikZ, 29edb309 시리즈 10편 작성, 7824b986 stub)에 Buildroot manual이나 upstream Config.in과 대조한 커밋이 없다. 두 기술 주장이 동시에 참일 수 없는 모순도 찾지 못했다. '8개 메뉴'(15·27·51·374행)와 10개짜리 목록(39~48행)·절 번호 1)~9)의 차이는 산문 개수 표기 실수라 uncertainties에 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 본문 대부분(67~319행)은 menuconfig 최상위 메뉴를 하나씩 보여 주고 옵션 심볼 몇 개를 붙인 메뉴 투어다. 이 글만의 내용은 Buildroot toolchain과 external toolchain 비교 표(131~136행), '.config는 산물이고 defconfig가 공식 정의'라는 구분(349·379행), 자주 하는 실수 4개(366~369행) 정도다. 87행 'SIGILL이 나거나 성능을 깎아 먹습니다', 108행 '간헐적 빌드 오류가 줄어듭니다', 109행 '크게 개선됩니다'는 조건과 근거가 없는 일반론이다. 앵커 part7-05(A 9)와 비슷하다. |
| B | 11 | 메뉴 투어(29~319행) → savedefconfig(321~349행) → fragment(351~362행) → 실수(364~369행) → 정리(371~379행)까지 흐름은 끝까지 간다. description이 약속한 '옵션 의존성'은 243행 한 문단과 graph-depends(245~249행)뿐이고 depends on과 select의 차이, 숨은 옵션 찾기가 없다. fragment 절(355~360행)에 merge_config.sh 결과 처리와 olddefconfig 필요 여부가 없다. 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | 명령(194~197·298~300·334~337·345~346행)과 `/` 검색 출력 예(232~238행)가 있다. 실행 환경은 37행 'Buildroot 2026.02'뿐이고 메뉴 화면(72~77·169~181행)이 실제 출력인지 확인할 수 없다. 75행 FP-ARMv8과 84·85행 BR2_ARM_FPU_VFPV3·THUMB2처럼 AArch64 설정에 맞지 않아 보이는 심볼도 있다. 202행 '2,000개', 331행 '50~200줄'은 출처·환경 없는 수치라 C ≤ 8. 합격·실패를 가르는 검증 절차가 없다. |
| D | 9 | 인접 글: `chapter02-directory-structure.md` 133행은 savedefconfig를 Ch3로 넘겨 역할이 나뉜다. `chapter04-first-build.md` 353·364행이 이 글 368·245~249행과 짧게 겹친다. 다른 글: (1) 333~347행은 `modern-recipes/part7-14-rootfs-buildroot.md` 79~102행과 거의 같다. (2) 323·353~360·366~369행은 `bsp/chapter08-kernel-config.md` 112~150·259행과 같다. (3) 184~198행은 `buildroot/chapter12-kernel-customize.md` 25~45·275~290행과 겹친다. 메뉴 투어는 다른 글에 없지만 후반 defconfig 절은 반복이다. |
| E | 6 | 제목 'menuconfig와 defconfig 작성'에는 29~65·321~349행이 답한다. description의 '옵션 의존성'은 243~249행 두 문단뿐이다. 15·27행이 약속한 '8개 메뉴'가 39~48행 목록(10개)과 절 번호 1)~9)와 맞지 않는다. |
| F | 6 | 383행 다음 편(Ch 4 첫 빌드)은 seriesOrder 4 `chapter04-first-build.md`와 맞다. 388~391행 대상(ch02, ch04, ch08, bsp/chapter08-kernel-config)을 열어 라벨과 주제가 맞음을 확인했다. 278행 Ch 8, 319행 Ch 7도 해당 장이 있다. '8개 메뉴'와 절 번호 불일치로 위치를 헷갈리기 쉽고 전제 지식 안내가 없다. audit:reading을 돌리지 않아 7 이상은 주지 않았다. |
| G | 2 | 37행 Buildroot 2026.02, 121~122행 binutils 2.41·gcc 13.x, 171행 커널 6.6, 289행 U-Boot 2024.04처럼 버전은 있다. Buildroot manual, Kconfig 언어 문서, package/openssh/Config.in(236행에 경로만) 같은 1차 출처 링크가 본문에 없다. 앵커 part7-05(G 2)와 같다. |

uncertainties:
- 15·27·51·374행 '8개 메뉴': 39~48행 목록은 10개, Legacy를 빼도 9개이고 절 번호는 1)~9)다. `chapter02-directory-structure.md` 293행에도 같은 '8개 메뉴'가 있다.
- 84·85행 BR2_ARM_FPU_VFPV3(-mfpu)·BR2_ARM_INSTRUCTIONS_THUMB2(-mthumb)는 73~77행 AArch64·FP-ARMv8 설정과 맞지 않아 보인다. arch/Config.in.arm으로 확인하지 않았다.
- 59행 Space가 [M]까지 돈다는 설명: Buildroot 옵션에 tristate 값이 없을 수 있다.
- 171행 'Latest version (6.6)'이 Buildroot 2026.02 기본 최신 커널과 맞는지 미확인.
- 177행 DTS 이름 'qemu/aarch64-virt'의 in-tree 존재 미확인.
- 249행 graph-depends 출력 graph-depends.svg: 기본 출력 형식(BR2_GRAPH_OUT)이 pdf인지 미확인.
- 355~360행 merge_config.sh 호출의 실행 위치, 결과 .config 처리, olddefconfig 필요 여부 미확인.
- 63행 'Esc Esc — 저장하고 종료', 202행 '2,000개 패키지', 331행 'defconfig 50~200줄'은 출처 없다.
- 134·136행 toolchain 재현성 비교와 추천('학습·테스트' vs '제품')은 근거 없는 일반화다.

병합 대상: 병합 대상 없음. 'Buildroot menuconfig 메뉴 구성'이라는 별도 검색 의도가 있고 메뉴 투어(67~319행)를 대신할 글이 없다. 다음 조치는 보강이다. savedefconfig·merge_config 절(321~369행)은 `bsp/chapter08-kernel-config.md` 112~150행·`modern-recipes/part7-14-rootfs-buildroot.md` 79~102행으로, Kernel 절(184~198행)은 `buildroot/chapter12-kernel-customize.md` 25~45·275~290행으로 링크해 줄이고 Buildroot에만 있는 부분을 남긴다. 그다음 '옵션 의존성'(depends on/select, 숨은 옵션 찾기)을 manual 출처와 함께 채우고 메뉴 개수 표기를 맞춘다.

### `chapter04-first-build.md` — 57점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건이다.
- 229행 '각 패키지 디렉터리(output/build/<pkg>-<ver>/) 안에는 stamp 파일들이 있다', 241행 '각 단계가 끝나면 stamp 파일을 생성', 245~247행 표의 `.stamp_downloaded`·`.stamp_extracted`·`.stamp_patched`
- 232~239행 같은 디렉터리를 `ls | grep stamp`한 출력에 이 세 stamp가 없음

풀 빌드 뒤 둘 다 참일 수 없다.
- 172행 `ls -lh` 출력: `-rw-r--r-- 1 me me  60M rootfs.ext4`(일반 파일)
- 179행 '`rootfs.ext4` … (= `rootfs.ext2`의 symlink)'

예시 출력과 본문 사실이 맞지 않는다. git log 8개 커밋(7824b986, 29edb309, 87bd86e2, c38cb67c, e85d7684, ac24bb76, be973200, 0a9dd7bc)에 1차 자료 대조 커밋이 없어 모순이 없었더라도 미검증이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | clone → defconfig → make → start-qemu.sh 흐름(52~198행)과 `-rebuild`·`-reconfigure`·`-dirclean`(339~345행)은 공식 매뉴얼 quick start와 같은 내용이다. 이 글만의 것은 output/ 표의 '누구의 시선'·'들어가 보는 이유' 칸(216~223행), 'staging은 link 시점, target은 run 시점' 구분(225행), stamp와 make 타깃의 1:1 대응 설명(241~262행), 첫 빌드 실패 6개의 증상→대처(351~356행)다. 선택 기준이나 실제 실패 분석은 없다. |
| B | 12 | 호스트 패키지(27~48행) → 클론(56~70행) → defconfig(76~97행) → 빌드(101~161행) → 산출물(167~200행) → 부팅·로그인(266~299행) → 증분 빌드(324~347행) → 실패(349~356행)로 흐름은 끝까지 간다. 빌드 단계 1·2·8번(109~113·136행)은 굵은 제목만 있고 내용이 비었다. 내부 모순 두 건과 열린 불확실로 AP-C-24 상한 13에서 1점 더 깎았다. |
| C | 7 | 명령(27~48·57~59·77·102·267행)과 기대 관찰(빌드 로그 143~158행, 부팅 로그 273~280행, `uname`·`free`·`ls /` 286~294행, 탈출 키 299행)은 있다. '30분의 풀 빌드'(99행), '30분 안쪽'(377행), dl/ 1.2G(307행), '10 ~ 20 GB'(351행), '8 GB 미만 RAM'(356행)은 측정 환경 없는 수치라 C ≤ 8. 61행 `abcdef0`은 자리표시 해시이고 예시 출력이 본문과 모순되어 1점 더 낮췄다. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter01-problem.md`, `chapter02-directory-structure.md`, `chapter03-kconfig.md`, `chapter05-package-system.md`, `chapter14-build-caching.md`, 다른 시리즈 `modern-recipes/part7-14-rootfs-buildroot.md`, `tools/emulation/qemu-embedded/chapter06-rootfs.md`(draft). (1) ch01 185~195행이 57~59·77·102·167~174행과 같다. (2) ch02 168~181행 output/ 표가 216~223행과 같다. (3) ch14 96~107행 `BR2_DL_DIR`·CI 공유가 301~322행과 같다. (4) ch05 361행 stamp 설명이 227~262행과 겹친다. part7-14 60~76행은 RPi4라 대상이 다르다. 'QEMU 첫 빌드·부팅' 역할은 구별되지만 세 덩어리가 반복된다. |
| E | 8 | 제목(2행)과 description(5행)의 '빌드하고 QEMU에서 부팅하는 전체 흐름'을 266~295행 부팅·로그인까지 이행하고 범위(QEMU AArch64 virt)도 같다. 대상 독자 명시가 없고 99행 절 제목 수치가 근거 없이 약속돼 9 이상은 주지 않았다. |
| F | 6 | 379행 다음 편(Ch 5)은 seriesOrder 5 `chapter05-package-system.md`와 맞다. 383~387행 대상(ch03, ch05, ch07, ch10, bsp/chapter10-first-boot)을 열어 모두 공개 글이고 주제가 맞음을 확인했다. 라벨은 ac24bb76 이전 'Ch N:' 형식이지만 다른 글을 가리키지 않는다. 빈 단계 제목(109~113·136행)이 흐름을 끊고 전제 장(ch02·ch03) 안내가 없다. |
| G | 2 | Ubuntu 22.04/24.04(25행), 2024.02.x(57·69행), 2024.02.6(61·330행), linux 6.6.30·binutils 2.41·busybox 1.36.0(147~157행)으로 버전은 있다. Buildroot 매뉴얼, configs/qemu_aarch64_virt_defconfig, package/pkg-generic.mk 같은 1차 출처 링크는 본문에 없다. |

uncertainties:
- 85~95행 defconfig 발췌의 `BR2_LINUX_KERNEL_DEFCONFIG="defconfig"`, `BR2_LINUX_KERNEL_INTREE_DTS_NAME="arm/qemu-virt-a53"`가 2024.02.x configs/qemu_aarch64_virt_defconfig에 있는지 미확인(QEMU virt는 DTB를 QEMU가 생성한다는 기억과 충돌).
- 225행 `BR2_INSTALL_STAGING=YES`: 패키지 변수는 `<PKG>_INSTALL_STAGING`이라는 기억과 다르다.
- 232~239행 openssl 디렉터리에 `.stamp_host_installed`·`.stamp_images_installed`가 함께 있는지(host 패키지는 host-openssl 디렉터리) 미확인.
- 169행 `total 87M`과 34M+60M+60M 합 불일치(sparse 이미지 가능성).
- 54행 'LTS(YYYY.02-LTS, YYYY.08-LTS)'는 공식 정책으로 미확인(LTS는 .02뿐이라는 기억).
- 330행 'Collecting legal info' 출력, 344행 `linux-reinstall`, 352행 'root는 명시적으로 거부' 미확인.
- 157행 busybox 1.36.0, 154행 linux 6.6.30이 2024.02.6 기본값인지 미확인.
- 99·377행 '30분', 307행 1.2G, 351행 10~20 GB는 출처 없음. ch14 107행은 dl/을 1~5 GB로 적는다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토)으로는 병합 대상 없음 — 'QEMU 첫 빌드·부팅 한 사이클'은 시리즈에서 이 글의 역할이다. 두 모순을 실제 빌드 산출물로 고친 뒤 다음 조치는 보강: output/·dl/·stamp 반복을 ch02·ch14·ch05 링크로 줄이고, 빈 단계 제목을 채우거나 지운다.

### `chapter05-package-system.md` — 49점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic 메타데이터, ac24bb76 제목 일괄 변경, 02ba5c79 text 블록 변환, 그 이전 작성·TikZ 커밋)에 Buildroot manual이나 upstream package/pkg-*.mk와 대조한 커밋이 없다. 로컬에 Buildroot clone이 없고 `data/upstream-tracking.yaml`에도 등록되지 않아 평가 중 1차 자료를 열지 못했다. 원문만으로 성립하는 기술 주장 간 모순도 없다(21·148·165행은 개수 표기 실수).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | Config.in 구문 표(69~75행), depends on 표(79~85행), .mk 변수 표(136~146행), infra 표(152~159행), helper 표(197~201행)는 manual 패키지 작성 장 수준이다. 이 글만의 것은 select·depends on 선택 기준(87행), dirclean→extract→patch→configure→build→install로 끊고 stamp로 재실행하는 디버깅 흐름(350~361행), 자주 하는 실수 다섯 가지(369~373행)인데 출처·실제 사례가 없다. 앵커 part1-04(A 10)와 같다. |
| B | 12 | 파일 짝(23~49행) → Config.in(51~108행) → .mk 골격(110~146행) → infra 예제(148~283행) → host(285~295행) → .hash(297~318행) → 패치(320~333행) → 디버깅(335~365행) → 실수·정리(367~384행)로 흐름은 완성됐다. 21·148행 '세 infra'와 152~159행 6종·380행 5종이 어긋나고 307행 hash 동작 설명이 불분명하며, SETUP_TYPE(277·283행)·kernel helper(201행)·SITE_METHOD(141행) 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | make 명령(309~314·339~344·350~357행)과 .mk 예제(114~130·167~183·207~229·248~263·271~281행)는 있으나 example.com·myapp 가상 패키지라 빌드할 수 없고, Buildroot 릴리스·호스트 환경과 명령별 기대 출력이 없다. 343행은 'aarch64-...-gcc ...'로 생략됐다. 15행 '2,000개 패키지'는 출처 없는 수치라 C ≤ 8. |
| D | 9 | 같은 시리즈 `chapter09-new-package.md`와 크게 겹친다: 203~242행 ↔ ch09 31~102행, 244~265행 ↔ ch09 144~231행, 267~283행 ↔ ch09 232~308행, 297~318행 ↔ ch09 104~120·201~217·435~451행, 320~333행 ↔ ch09 331~355행, 335~361행 ↔ ch09 357~405행, 370행 ↔ ch09 406행 절. `chapter04-first-build.md` 227~241행이 361행과, `chapter06-br2-external.md` 159행 이후 acme-firmware 예가 55~65·167~183행과 같은 형태다. 다른 시리즈 `modern-recipes/part7-14-rootfs-buildroot.md` 150~181행이 55~65·167~183행과 거의 같다. Config.in 구문·.mk 변수 규약(51~146행)은 이 글만의 역할이다. |
| E | 5 | 제목 '분석 — .mk와 Config.in 동작 추적'은 동작 추적을 약속하지만 본문은 작성 규약 설명이다. $(eval $(generic-package))가 pkg-generic.mk에서 펼쳐지는 과정, BR2_PACKAGE_* 심볼이 빌드 대상으로 이어지는 과정은 150행 한 문장뿐이다. 루브릭 E 주석('분석·추적' 약속에 개념 소개 수준이면 3~5) 적용. |
| F | 5 | 388행 다음 편(Ch 6)은 seriesOrder 6 `chapter06-br2-external.md`와 맞고 393~396행 넷도 대상 제목과 맞다. 397행 'BSP Development Ch 12: 드라이버 추가 — 커널 측 변경과 패키지 측 변경의 분리'의 대상 `bsp/chapter12-driver-add.md`는 DT binding·드라이버 통합 글이고 Buildroot·패키지 언급이 0건이다(grep). 틀린 설명이라 F ≤ 5. 21행 구성 안내도 실제 절 구성과 맞지 않는다. |
| G | 1 | Buildroot manual·upstream 소스 링크가 없고 기준 릴리스도 없다. 132행 'Buildroot CI가 거부', 370행 'maintainer CI가 reject'에 check-package나 manual 절 인용이 없다. 앵커 part1-04·part6-09(G 1)와 같다. |

uncertainties:
- 277행 `PYTHON_MYTOOL_SETUP_TYPE = pyproject`와 283행 'setuptools / flit / pyproject / distutils 중 하나': 현행 값과 distutils 지원 여부 미확인.
- 201행 `$(call kernel,longterm,v6.x,linux-6.6.30)` helper의 존재, 200행 gitlab helper 펼침 결과 미확인.
- 141행 `<NAME>_SITE_METHOD` 값 'http / git / local / svn'이 manual 목록(wget 등)과 맞는지 미확인.
- 289행 host 패키지 'Config.in은 같지만' — Config.in.host 규약 미확인.
- 307행 'hash가 생성되지 않으면 CI가 거부'의 실제 동작 불분명.
- 370행 'LICENSE = unknown' 허용 여부 미확인.
- 132행 'Buildroot CI가 거부'와 369행 '조용히 무시'가 각각 어느 단계인지 미확인.
- 372행 'make clean 한 번이면 사라집니다' — `<pkg>-dirclean`과 make clean 범위 미확인.
- 15행 '2,000개 패키지'는 출처·버전 없는 수치.
- 개수 표기 실수: 21·148행 '세 infra'(152~159행 6종, 380행 5종), 165행 '세 hook'(코드는 둘).

병합 대상: 후보 `src/content/blog/embedded/buildroot/chapter09-new-package.md`. 203~283행(autotools·cmake·python 예제), 297~333행(.hash·패치), 335~361행(디버깅)은 ch09가 실제 사례로 더 깊게 다루므로 ch09로 넘기거나 링크로 줄인다. 'Buildroot Config.in·.mk 구조'라는 독립 검색 의도가 있어 다음 조치는 보강이다. Config.in 구문·.mk 규약(51~146행)을 남기고, 제목이 약속한 pkg-generic.mk 펼침을 채우며, Buildroot 릴리스와 manual·upstream 출처를 단다.

### `chapter06-br2-external.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건이다.
- 225행 '후자가 전자의 패키지를 override할 수도 있는데 … 뒤에 오는 트리가 이깁니다'(308행 정리도 같은 말)
- 296행 '두 외부 트리에서 같은 패키지 이름이 충돌' 절의 'Kconfig 옵션 이름이 같으면 두 번째 정의가 무시됩니다'

같은 상황에 반대 결론이다.
- 114·117행 최상위 Config.in을 `touch`로 비워 둬도 됨, 129~132행 그 상태에서 menuconfig에 'External options 항목이 표시됩니다'
- 281행 '최상위 Config.in이 비어 있으면 메뉴 자체를 표시하지 않습니다'

git log(29edb309 집필, 662ae843 TikZ, 02ba5c79 text block 변환, ac24bb76 제목 변경, be973200·0a9dd7bc 메타데이터)에 1차 자료 대조 커밋이 없어 모순이 없었더라도 미검증이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | external.desc·external.mk·Config.in 설명(41~95행), 디렉터리 규약 표(138~144행), stacking(218~225행)은 manual 외부 트리 절의 구성을 따른다. 이 글만의 것은 fork가 무너지는 5단계 시나리오(23~29행), defconfig 상대 경로를 $(BR2_EXTERNAL_ACME_PATH)로 바꾸는 함정(235~249행), Troubleshooting 4개(279~300행)다. 300행 '깨질 수 있습니다', '적어 두는 게 안전합니다'는 버전별 변화 대신 넣은 완곡 표현이다. |
| B | 11 | 문제(17~35행) → 최소 구조(41~95행) → 첫 트리(99~132행) → 패키지 예(161~214행) → stacking(218~231행) → defconfig 이전(235~249행) → 검증(253~275행) → Troubleshooting(279~300행) → 정리로 흐름은 간다. stacking 우선순위(225 vs 296행)와 빈 Config.in 메뉴 표시(117·132 vs 281행)가 어긋나 첫 단계와 핵심 질문의 답이 정해지지 않는다. 188행 `ACME_FIRMWARE_DEPENDENCIES = libubox`인데 166~170행 Config.in에 select/depends가 없다. 모순이 두 건이라 상한 13에서 더 낮췄다. |
| C | 7 | 재현 명령(101~115·123행)과 기대 출력(148~157·255~265·287~290행)은 있다. Buildroot 버전이 본문에 없다. 204행 tarball sha256은 빈 입력의 해시(e3b0c442…)이고 205행은 'abcd...' placeholder다. 154~156행 list-defconfigs 출력은 만든 적 없는 acme_gateway_defconfig를 보여 준다. 출처·환경 없는 예시 출력이라 C ≤ 8. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter05-package-system.md`, `chapter07-board-customize.md`, `chapter10-real-board.md`, 다른 시리즈 `bsp/chapter16-rootfs.md`. (1) bsp/chapter16 41~98행이 63~95·123행을 같은 순서로 설명한다(external.mk 코드는 79행과 동일). (2) ch10 64~82행이 101~115행을 다시 만들고 62행에서 이 글을 링크해 의도된 반복이다. (3) 175~198행은 ch05 166~180행 MYAPP 예와 같은 뼈대다. (4) ch07은 겹치지 않는다. 이 글이 BR2_EXTERNAL의 본래 자리라 10~14 구간 하단. |
| E | 7 | 제목(2행)과 description(5행)이 본문 구성(41~95행)·활용(159~249행)과 같은 질문을 향한다. '보드 정의'는 141~144행 표와 244~246행 두 줄뿐이다. |
| F | 6 | 313행 다음 편 'Ch 7: 보드 customize'는 seriesOrder 7 `chapter07-board-customize.md`와 맞지만 링크가 없다. 318~320행 Ch 5·7·9 대상을 열어 번호·주제가 맞음을 확인했다(라벨은 옛 제목 표기). 증상별 Troubleshooting 소제목(279~298행)과 231행 레이어 그림이 있으나 전제 지식(Ch 5) 안내가 없다. |
| G | 2 | 1차 출처는 321행 Buildroot Manual 링크 하나이고 225행 override 규칙·146행 list-defconfigs·126행 .br-external.mk 같은 주장과 연결되지 않는다. 버전 표기가 없다(28행 '2026.02 → 2026.08'은 시나리오 예). |

uncertainties:
- 225행 vs 296행: '두 번째 정의'가 BR2_EXTERNAL 순서상 뒤 트리인지 Kconfig source 순서인지 글이 밝히지 않는다. Buildroot가 같은 패키지를 오류로 막는지 매뉴얼로 확인하지 않았다.
- 281행과 132행 중 실제 동작이 어느 쪽인지 미확인(내부 모순으로만 판정).
- 28행 'Buildroot LTS 2026.02 → 2026.08': LTS는 .02 릴리스라는 기억이 있으나 미확인.
- 154행 list-defconfigs 헤더가 external.desc의 desc 문자열을 출력하는지 미확인.
- 260~261행 `make show-info`는 JSON을 출력한다는 기억이 있으나 미확인.
- 126행 output/.br-external.mk 기록 동작, 86·132행 'External options' 메뉴 이름 미확인.
- 321행 매뉴얼 앵커 #outside-br-custom 존재 미확인.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토)으로는 병합 대상 없음 — 이 글이 BR2_EXTERNAL의 본래 자리이고 ch10·bsp/chapter16이 반복하는 쪽이다. 다음 조치는 보강: override 규칙(225·296·308행)과 빈 Config.in 메뉴 표시(117·132·281행)를 매뉴얼·support/scripts/br2-external로 확인해 하나로 고치고, 204~205행 hash placeholder 정리, Buildroot 버전 명시, 188행 libubox 의존성의 select 보강. bsp/chapter16 41~98행은 이 글을 링크하도록 시리즈 간 검토로 넘긴다.

### `chapter07-board-customize.md` — 60점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다.
- 59행 '권한도 *overlay 디렉터리의 권한 그대로* 유지됩니다. 따라서 `S99acme` 같은 init 스크립트는 `chmod +x`로 미리 실행 권한을 줘 두어야 합니다'
- 142행 'overlay에서 mode를 강제할 방법이 없습니다', 335행 '`BR2_ROOTFS_OVERLAY`는 정적 파일 트리 복사. 권한·삭제는 표현 불가'

overlay가 파일 mode를 전달하는지에 대한 두 진술은 동시에 참일 수 없다. git log(0a9dd7bc·be973200·e85d7684·ac24bb76·03ec1f08 등)에 1차 자료 대조 커밋이 없어 모순이 없었더라도 미검증이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 세 hook의 시점·대상·용도 표(27~31행)가 아래 세 H2(33·82·165행)의 뼈대다. overlay 함정 세 가지(65~69행), 공통→보드→변형 overlay 쌓기(73~80행), overlay와 post-build를 가르는 규칙(138~143행), 증상별 Troubleshooting(290~330행, 302~307행)은 작성자의 선택 기준이다. 변수 표(94~102·180~186행)와 device table 형식(155~161행)은 manual과 같고 실제 보드의 실패나 결과는 없다. |
| B | 13 | 한 줄 요약(15행) → 세 hook(21~31행) → overlay(33~80행) → post-build(82~143행) → device table(145~163행) → post-image·genimage(165~250행) → 종합 트리(252~286행) → Troubleshooting(288~330행) → 정리(332~340행)로 끝까지 간다. overlay 권한 모순과 불확실(311행 savedefconfig, 319행 target-finalize, 132~133행 주석·코드)이 열려 있어 AP-C-24에 따라 B ≤ 13. 정확성은 factcheck 게이트로 처리해 추가 감점은 하지 않았다. |
| C | 8 | defconfig 줄(40·89·150·172~173·276~281행), 실행 가능한 스크립트(106~134·190~216행), genimage.cfg(220~248행), ls 출력(296~307행)이 있다. Buildroot 버전·빌드 결과(이미지 크기, 실행 로그)가 없어 '결과가 없는 절차는 C ≤ 9'를 적용했다. 122행 `usr/bin/acme-fw`가 없으면 111행 `set -e`로 중단되고 132~133행 주석과 코드가 맞지 않는다. |
| D | 9 | 같은 시리즈: `chapter06-br2-external.md`는 역할이 다르고 `chapter08-filesystems.md`는 312행에서 device table을 가리킬 뿐이다. `chapter10-real-board.md` 297~317행 post-image.sh는 190~216행과 거의 같고, 321~358행 genimage.cfg는 boot.vfat(221~231행)만 같고 rootfs 파티션은 다르다. `chapter15-post-build-deep.md`가 환경 변수(38~54행)·overlay(65~84행)·device table(86~111행)·genimage(185~240행)를 다시 다루지만 19·323행에서 이 글을 '기본 소개'로 둔다. 다른 시리즈: `bsp/chapter16-rootfs.md` 119~121·350~365행(205~210행과 같은 genimage 인자), `modern-recipes/part7-14-rootfs-buildroot.md` 146~147행. |
| E | 8 | overlay·post-build·post-image가 33·82·165행 H2와 정리(334~337행)에서 모두 이행되고 description '세 가지 hook'(5행)도 27~31행 표와 맞다. 본문 예는 BBB(227행)지만 hook은 보드 무관이라 범위 불일치가 아니다. overlay 권한 서술이 59행과 335행에서 갈려 9는 주지 않았다. |
| F | 7 | 344행 다음 편(Ch 8)은 seriesOrder 8 `chapter08-filesystems.md`와 맞다. 349~351행 ch06·ch08·ch10과 250행 본문 링크를 열어 라벨과 대상이 맞음을 확인했다. 27~31행 표가 세 H2와 1:1로 대응하고 Troubleshooting이 증상별 H3(290·309·313·317·328행)다. 심화 글 ch15 링크가 없고 라벨이 옛 'Ch N' 체계라 8은 주지 않았다. |
| G | 2 | 352~353행 Buildroot Manual customize 절과 genimage README 링크가 변수 표(94~102행), 인자 규칙(176·183·330행), device table 형식(155행)에 연결되지 않는다. Buildroot·genimage 버전이 없다. |

uncertainties:
- 132~133행 주석 'Strip world-write from /tmp'와 코드 `chmod 1777`이 반대로 보이나 chmod 8진 의미를 알아야 판단되는 코드 결함이라 오류 확인에 넣지 않았다.
- 311행 'make olddefconfig 또는 savedefconfig를 거쳐야 빌드에 반영': savedefconfig는 반대 방향이라 맞지 않아 보인다. manual 미확인.
- 319행 'make target-finalize로 fakeroot 단계만 다시': 29~30행 표(overlay·post-build는 fakeroot 전)와 함께 보면 설명이 불명확하다.
- 176·183·330행 'BR2_ROOTFS_POST_SCRIPT_ARGS는 $2부터' vs ch15 52행 '$1'(다른 글과의 차이).
- 59행 권한 서술과 ch15 80~81행 '소유권은 항상 root:root, 모드는 호스트 그대로'의 차이도 manual 확인 필요.
- 130행 'we use systemd-networkd'와 51~53행 `/etc/init.d/S99acme`·`/etc/network/interfaces`의 양립 여부.
- 266행 'device_table.txt # SUID'인데 157~160행 예에 SUID 항목이 없고 122행 post-build에서 설정한다. 338행(device table)과 142·336행(post-build) 권고가 엇갈린다.

### `chapter08-filesystems.md` — 64점, 보강

confidence: 중간

factcheck: 미검증. git log(7824b986 stub, 29edb309 시리즈 10편 작성 — 본문에 'Build verified — 2425 pages'만, 03ec1f08 다른 시리즈 표 변환, ac24bb76 제목 변경, be973200 topics, 0a9dd7bc slug 고정)에 Buildroot 매뉴얼·Config.in·커널 문서와 대조한 커밋이 없다. 평가 중에도 1차 자료를 열지 않았다. 27행 '40~60%'와 37~40행 표의 차이는 30행이 표를 '대략적' 예시로 밝혀 오류 확인으로 올리지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 포맷 선택이 업데이트 전략·수명을 정한다는 도입(15~17행), 저널은 메타데이터만 지킨다는 구분(125·139행), squashfs base + overlayfs + data 파티션을 init 스크립트까지 묶은 절(143~232행), fakeroot 권한 차이를 device table로 잡는 해결(310~312행)이 고유하다. 네 포맷 비교(21~28행)와 initramfs 장단점(58~68행)은 일반론이고, 크기 표(32~40행)·압축 표(104~109행)는 출처 없는 수치이며 30행 '측정값에 가깝습니다'와 102행 '추정값'이 같은 수치를 달리 부른다. |
| B | 13 | 포맷 비교 → initramfs(48~70행) → cpio·booti(83~89행) → squashfs(95~121행) → ext4(127~141행) → overlay 패턴(147~223행) → 동시 생성(236~255행) → cmdline·fstab(259~283행) → Troubleshooting → 정리로 끝까지 간다. 232행에서 data 파티션의 전원 끊김 취약성도 적었다. 157행 jffs2를 꺼내고 UBIFS는 다루지 않으며, 불확실(27·95·318행 수치, 164행 마운트 주체, 176~180행 ext4 용도)이 열려 있어 B ≤ 13. |
| C | 8 | Buildroot 심볼 설정(51~53·98~99·128~132·172~183·239~244행), U-Boot 명령(84~86행), init 스크립트(190~223행), cmdline(262·268행), fstab(276~283행), resize 명령(296~297행)이 있다. 크기·압축 표는 버전·보드·패키지 구성이 없는 수치이고 overlay 마운트 뒤 `mount` 출력 같은 기대 관찰이 없어 C ≤ 8. |
| D | 12 | 같은 시리즈: `chapter07-board-customize.md` 145~163행(빌드 시점 overlay — 역할 다름), `chapter09-new-package.md`(겹침 없음), `chapter10-real-board.md` 120~128행(172~180행 패턴 적용)·588행(289행 Troubleshooting과 중복), `chapter15-post-build-deep.md` 146행, `chapter16-ota.md` 48행. 다른 시리즈: `bsp/chapter16-rootfs.md` 119~133행, `bsp/chapter08-kernel-config.md` 89행, `embedded-security/chapter06-ota-update.md` 252~257행, `bootloader/chapter20-rauc-swupdate.md` 300행, `tools/emulation/qemu-embedded/chapter06-rootfs.md`(draft) 15~24·175~181행. 포맷 선택과 read-only+overlay를 깊게 다루는 공개 글은 이 글뿐이다. |
| E | 7 | 제목의 initramfs·squashfs·ext4·cpio가 각각 절로 있고(44·72·93·123행) 선택 기준(42행)과 정리(316~322행)가 같은 질문을 향한다. description의 '읽기성능'은 61행 한 문장과 104~109행 정성 표뿐이고 111행 '체감될 만큼 큽니다'도 수치가 없다. |
| F | 7 | 326행 다음 편(Ch 9)은 seriesOrder 9 `chapter09-new-package.md`와 맞다(링크 없음). 331행 Ch 7, 332행 Ch 10과 312행 device table 링크(chapter07 145~163행)도 맞다. 162~167행 부팅 흐름 4단계가 스크립트 202~217행과 대응한다. 전제 지식 안내가 없고 audit:reading을 돌리지 않아 9 이상은 불가. |
| G | 2 | 본문 주장에 붙은 출처가 없다. 관련 항목 끝 Buildroot Manual(333행)과 kernel.org overlayfs.txt(334행, 옛 .txt 경로)뿐이다. Buildroot 릴리스·커널 버전 표기가 없다. |

uncertainties:
- 27행 'ext4 대비 40~60%', 95행 '40~60% 줄여 줍니다', 318행 '40~60% 절감'과 표(37~40행: ext4 80MB → squashfs 19~27MB, 절감 66~76%)가 어느 해석으로도 맞지 않는다. 범위나 표 중 하나를 고쳐야 한다.
- 30행 '측정값에 가깝습니다'와 102행 '추정값'이 같은 수치를 다르게 부른다.
- 37행 'rootfs.ext4 (8% reserved) 80MB'는 132·137행의 5%(권장 1%)와 다르고 28행 '원본 크기'와도 다르다.
- 176~180행은 BR2_TARGET_ROOTFS_EXT2를 'data partition용'으로 켜지만 255행대로면 rootfs 전체가 들어간다. 37행 80MB와 180행 SIZE=64M도 맞지 않는다.
- 164행 '부트로더가 squashfs를 /로 마운트' vs 259~268행 cmdline root= 설명. 마운트 주체는 커널이라는 일반적 이해를 1차 자료로 확인하지 않았다.
- 52행 CPIO_ZSTD, 99행 SQUASHFS4_ZSTD, 179행 EXT2_LABEL, 131행 INODES=0, 132행 RESBLKS를 Config.in과 대조하지 않았다.
- 99행 'gzip < xz < zstd 권장'의 의미가 불명확하고 111행 'zstd 해제는 lzo급'은 출처 없다.
- 188·210~217행 실행 중인 /etc 위에 overlay를 덮는 S01overlay 방식의 안전성 미확인.
- 333행 #rootfs-images 앵커, 334행 overlayfs.txt 경로의 현재 유효성 미확인.

### `chapter09-new-package.md` — 55점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다.
- 234행 'Python 패키지는 … *setup.py*, *pyproject.toml*, *poetry* 모두 자동 감지합니다'
- 264행 `PYTHON_ACME_TOOLS_SETUP_TYPE = setuptools` 직접 지정, 270행 '핵심은 `PYTHON_ACME_TOOLS_SETUP_TYPE`입니다'(272~277행 값 표), 484행 'Python 패키지는 `_SETUP_TYPE`을 정확히 적어야 합니다'

자동 감지와 작성자가 정확히 지정해야 한다는 말은 둘 다 참일 수 없다. git log(29edb309·e85d7684·ac24bb76·be973200·0a9dd7bc·7824b986)에 manual이나 upstream package/와 대조한 커밋이 없어 모순이 없었더라도 미검증이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 외부 트리에 htop fork를 두는 autotools 사례(33·72~92행, libcap 조건부 85~90행), Config.in 옵션을 CMake 인자로 바꾸는 shared/static 패턴(186~190·223~230행), 의존성 세 종류 표(319~323행)와 권장 규칙(327~329행), libcap 링크 에러에서 reconfigure까지의 디버깅(377~404행)이 고유하다. cmake·python은 가상 패키지(146·239행)라 선택 기준이 없고, 17행 '99%'는 출처가 없으며 459행 'install order가 꼬일 수 있습니다'는 원인 없는 완곡 표현이다. |
| B | 12 | 세 infra 사례 → 의존성(309~329행) → patch(331~355행) → 디버깅(357~404행) → license·legal-info(406~431행) → troubleshooting(433~473행) → 정리(475~484행)로 끝까지 간다. 234행과 270·484행 모순, 열린 불확실(364·369·404행 타깃, 274행 distutils, 81행 configure 옵션)로 상한 13에서 1점 더 낮췄다. |
| C | 7 | Config.in·.mk 전문(46~92·150~193·238~267행), make 타깃(133~135행), 기대 산출물 `output/target/usr/bin/htop`(142행), patch 로그(347~353행), wrong hash 오류(439~445행)가 있다. hash 값은 `ad12345fc...`·`cf2b...`·`e3b0...` 자리표시자(108~109·118~119·215~216행)이고, cmake·python은 재현할 수 없으며 386~388행 로그는 '... still fails'뿐이다. Buildroot 버전·호스트 환경이 없고 17행 '99%'로 C ≤ 8. |
| D | 8 | 비교한 글: 같은 시리즈 `chapter05-package-system.md`, `chapter06-br2-external.md`, `chapter10-real-board.md`, `chapter18-security-cve.md`, 다른 시리즈 `bsp/chapter20-production.md`. autotools-package·python-package를 grep하면 이 글과 ch05만 나온다. 21~29행 ↔ ch05 148~159행, 195~199행 ↔ ch05 213·265행, 104~120행 ↔ ch05 297~316행, 331~344행 ↔ ch05 320~333행, 357~373행 ↔ ch05 335~366행, 423~431행 ↔ ch18 81~97행·bsp ch20 329~340행. ch10 154~156행은 이 글을 참조하고 역할이 갈린다. 이 글에만 있는 것은 세 사례의 전체 .mk와 의존성 표다. |
| E | 7 | title·description(2·5행)이 약속한 세 사례는 31·144·232행 절로 있다. '실전'과 달리 cmake·python은 가상 패키지(146·239행)이고 hash는 자리표시자이며 python 절의 핵심 설명(234 vs 270행)이 어긋난다. |
| F | 6 | 488행 다음 편 'Ch 10: 실전 — BeagleBone Black'은 seriesOrder 10 `chapter10-real-board.md`와 맞다. 493~495행 ch05·ch06·ch10을 열어 제목과 라벨이 맞음을 확인했다. 세 사례가 Config.in → .mk → hash → 등록 순서의 같은 소절 구조(35~142행)다. 17행은 Ch 5를 'generic-package 골격'으로만 소개해 ch05 21행과 맞지 않고 전제 지식 안내가 없다. |
| G | 2 | 496~497행 Buildroot Manual 'Adding new packages'와 SPDX License List 링크가 234·270행 SETUP_TYPE, 364·369행 타깃, 473행 autoreconf 플래그 같은 주장에 연결되지 않는다. Buildroot 릴리스 버전이 없고 본문 버전은 htop 3.3.0(72행)뿐이다. |

uncertainties:
- 364행 `<name>-extract`가 patch까지 한다는 설명 vs ch05 351~359행의 별도 `-patch` 단계. manual 미확인.
- 369·404행 `-rebuild`가 'extract부터' 다시 한다는 설명: 기억으로는 build 단계부터다. 1차 자료 미확인.
- 274행 SETUP_TYPE 값 `distutils`의 현행 지원, 다른 값(maturin 등) 여부 미확인.
- 81~83행 `--disable-unicode=no` 형태와 `--enable-affinity`·`--disable-hwloc`가 htop 3.3.0 configure에 있는지 미확인.
- 209행 github 헬퍼가 해시 불일치를 막는다는 설명과 447행 'GitHub auto-generated archive는 해시가 바뀝니다'의 관계 미확인.
- 344·355행 patch 알파벳 순 적용, quilt `series` 지원 미확인.
- 473행 `_AUTORECONF = YES`의 정확한 autoreconf 플래그 미확인.
- 459행 런타임 의존성을 `_DEPENDENCIES`에 적으라는 권고가 321~322·328행 표·규칙(런타임은 select)과 긴장 관계다('둘 다 적는 게 안전'이라 모순으로 보지 않음).
- 17행 '오픈소스 패키지의 99%'는 출처 없는 수치다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 먼저 234·270·484행 SETUP_TYPE 모순을 manual python-package 절(버전 명시)로 확인해 고치고 274행 distutils, 364·369·404행 타깃 의미도 같이 확인한다. 점수 구간(병합 검토)으로 후보는 `src/content/blog/embedded/buildroot/chapter05-package-system.md`이지만, 세 사례의 전체 .mk와 의존성 표(319~329행)는 ch05에 없어 다음 조치는 보강이다. ch05와 겹치는 개요 표·hash·patch 설명을 ch05 링크로 줄이고 17행의 ch05 소개를 고친다.

### `chapter10-real-board.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건이다.
- 482행 'J1 pin 4 (RX, 보드 TX) ── 어댑터 RX', 483행 'J1 pin 5 (TX, 보드 RX) ── 어댑터 TX'(보드 TX = pin 4)
- 574행 '보드 TX(pin 5)가 어댑터 RX에 가야 합니다'(보드 TX = pin 5)

두 배선 지시는 동시에 참일 수 없다.
- 322~333행 genimage.cfg: boot.vfat `size = 16M`에 MLO·u-boot.img·zImage·dtb·uEnv.txt를 넣음
- 435~438행 ls 출력: MLO 16M + u-boot.img 580K + zImage 6.2M + dtb 62K ≈ 22.8M — 442행의 16M boot.vfat에 들어갈 수 없음

git log(7824b986 stub, 29edb309 집필, 662ae843 다이어그램, ac24bb76 제목 변경, e85d7684 코드 블록 산문 이동, be973200 topics, 0a9dd7bc slug 고정)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | BeagleBone Black 한 보드로 외부 트리(65~81행) → savedefconfig(88~92행) → 자작 패키지 acme-led-blink(158~241행) → overlay·init(255~281행) → squashfs+ext4 3-파티션 genimage(321~356행) → uEnv.txt(383~397행) → dd·bmaptool(461~474행) → 시리얼·USER 버튼 부팅(478~500행)까지 앞 장 개념을 한 사례로 묶었다. BBB 고유 함정(590~599행 SYSBOOT·eMMC 와이프, 588행 squashfs 커널 옵션)도 있다. post-image.sh(298~317행)는 Ch 7과 거의 같고, 빌드·부팅 출력(416~443·504~541행)은 모순이 있어 실행 기록으로 보기 어렵다. 592·630행은 출처 없는 일반론이다. |
| B | 12 | 준비물(36~42행)부터 첫 부팅·로그인(546~564행), Troubleshooting 5개(570~603행)까지 흐름은 간다. 25·127행이 내건 'ext4 data partition'은 genimage에 rootfs.ext4를 넣을 뿐(350~354행) fstab·마운트가 없고 553~556행 df에도 없다. 469~473행 bmaptool이 쓰는 sdcard.bmap을 genimage.cfg가 만들지 않고 435~442행 목록에도 없다. 열린 불확실(100행 외부 toolchain vs 419행 uclibc 빌드)로 B ≤ 13. |
| C | 7 | 명령·설정·코드(46~51·88~152·170~241·287~317·383~397·461~474행)와 기대 관찰(504~541행 부팅 로그, 546~564행 df·mount·leds, 566행 LED)이 있다. '첫 빌드는 30~60분'(414행), '401MB transferred in 38s'(463행)는 환경 없는 수치라 C ≤ 8. 크기 모순(332 vs 435~442행), 배선 모순(482~483 vs 574행), 472행 산출물 목록에 없는 sdcard.bmap으로 1점 더 뺐다. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter07-board-customize.md`, `chapter08-filesystems.md`, `chapter09-new-package.md`, `chapter11-toolchain.md`, 다른 시리즈 `bsp/chapter17-image-packaging.md`, `modern-recipes/part7-14-rootfs-buildroot.md`, `bootloader/chapter29-distro-boot.md`. 298~317행은 Ch 7 190~214행과 변수명·genimage 인자까지 같고, 322~333행 boot.vfat은 Ch 7 219~229행과 같다(Ch 7 247행이 역할을 나눔). 461~474행은 BSP 17장 219~229행과 겹친다. Ch 8 19·93행은 개념, Ch 9 31~61행은 다른 예제, part7-14는 132행 언급뿐, 부트로더 29장은 332행 한 줄이다. 실 보드 end-to-end는 이 글뿐이다. |
| E | 8 | 제목과 description(5행) 'defconfig부터 SD 카드 부팅까지'를 Step 1~11(53~566행)이 따라가고 범위도 BBB 한 보드다. 25행 'ext4 data partition'은 마운트까지 가지 않고 대상 독자·전제 지식 명시가 없다. |
| F | 4 | 605~617행 '시리즈 마무리', 619~623행 '다음 시리즈 — Embedded BSP', 636행 '다음 시리즈는 Embedded BSP'는 이 글을 마지막 장으로 안내하지만 seriesOrder 11 `chapter11-toolchain.md`가 있고 chapter20까지 `draft: false`다. 611행 'A/B 슬롯 OTA … 다루지 않은 것', 613행 '부트로더 자체 customize'도 공개된 `chapter16-ota.md`·`chapter13-uboot-integration.md`와 어긋난다. 26행 'acme-led-blink … (Ch 9 자작)'은 Ch 9(htop-acme)와 다르다. 640~643행 Ch 6·7·8·9는 맞다. 틀린 다음 편 안내(F ≤ 5)에 오안내 두 건을 더해 4점. |
| G | 2 | Buildroot 2026.02(59행), 커널 6.6.21(103행), U-Boot 2024.04(420·505행), Ubuntu 24.04(42행)로 버전은 있다. 출처는 644~645행 BeagleBoard 보드 페이지와 Buildroot master의 beaglebone_defconfig뿐이고 J1 핀(481~484행), SYSBOOT·USER 버튼(496~500·592행), defconfig 내용(96~117행)에 연결되지 않는다. defconfig 링크는 2026.02가 아니라 master를 가리킨다. |

uncertainties:
- 100행 BR2_TOOLCHAIN_EXTERNAL=y인데 414행 'toolchain … 모두 빌드', 419행 'uclibc 1.0.50 Building'은 internal toolchain 로그로 보인다. 2026.02 beaglebone_defconfig로 확인 필요.
- 96~117행이 2026.02 beaglebone_defconfig의 savedefconfig 결과와 같은지(커널 6.6.21, multi_v7, U-Boot am335x_evm, ext4 120M) 미확인.
- 391·401행 console=ttyO0: 커널 6.6 + multi_v7(8250_omap)에서 ttyS0가 맞는지 미확인.
- 592행 USER 버튼 high일 때 SD 우선, eMMC 비면 ROM이 SD로 fallback은 AM335x TRM·BBB SRM으로 미확인.
- J1 pin 4/5 중 어느 쪽이 보드 TXD인지 SRM으로 확인하지 않았다(어느 줄을 고칠지는 1차 자료로 정함).
- 435행 MLO 16M은 SPL 크기로 비현실적이며 boot.vfat 16M와 혼동된 것으로 보인다.
- 524행 Kernel image 끝 0x5f2400(6235136 B)과 522행 6238208 bytes가 3072 B 다르다. U-Boot 출력 의미를 알아야 해 오류 확인에 넣지 않았다.
- 350~354행 data partition에 rootfs.ext4를 넣는 설계 의도 미확인, fstab·마운트 없음.
- 469~473행 sdcard.bmap 생성 설정이 없다. genimage의 bmap 옵션은 미확인.
- 26행 'acme-led-blink (Ch 9 자작)'은 Ch 9(htop-acme, 31~61행)와 다르다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토)으로는 병합 대상 없음 — 실 보드 end-to-end 부팅은 시리즈에서 이 글뿐이고 Ch 7과의 겹침은 post-image.sh·boot.vfat 블록이다. 두 모순을 BBB System Reference Manual J1 핀 표와 실제 빌드 산출물로 고친 뒤 다음 조치는 보강: 605~636행을 Ch 11 안내로 바꾸고, 26행 Ch 9 참조를 고치고, data partition 마운트·bmap 생성·빌드 환경을 추가한다.

### `chapter11-toolchain.md` — 63점, 보강

confidence: 중간

factcheck: 미검증. git log(f7714f0f Ch11 파일럿, 393f23a8 발행, 03ec1f08 do-178c 표 변환에 함께 포함, ac24bb76 제목 변경, fa55144d 링크 기계 치환, e85d7684 코드 블록 산문 이동, be973200 topic 메타데이터, 0a9dd7bc slug 고정)에 Buildroot manual·Kconfig 소스·Bootlin과 대조한 커밋이 없다. 247행과 315행의 원인 귀속 차이는 원인이 여러 개일 수 있어 uncertainties에 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | internal과 external 선택 기준 목록(50~55·81~86행), 8개 항목 비교표(90~99행), external 배포판 네 종류 장단점(107~160행)이 있다. vendor SDK 메타데이터를 잘못 적었을 때의 사고(174행), sysroot openssl 1.1.1과 staging 3.2 충돌 예(231~237행), readelf -V로 GLIBC 요구 버전 읽기(298~306행)가 고유하다. ABI 표(190~198행)와 libc 표(271~279행)는 교재 수준이고 129·132행은 근거 없는 일반론이다. 앵커 part12-10(18)보다 직접 분석이 적다. |
| B | 13 | 왜 중요한가(17~23행) → internal(25~55행) → external(57~86행) → 비교(88~101행) → 배포판(103~184행) → ABI(186~200행) → 실패 세 가지(202~265행) → libc(267~281행) → 검증(283~306행) → 정리(308~317행)로 이어진다. 315행은 headers 규칙 위반을 'GLIBC_2.X not found'로 묶고 247행은 glibc 버전 차이로 설명한다. 불확실이 열려 있어 B ≤ 13. |
| C | 8 | Kconfig 조각(29~35·61~66·151~160행), vendor toolchain 메타데이터 확인 명령(176~182행), 예상 출력이 붙은 readelf 절차(287~304행)가 있다. 46·70·92행 '30~50분 / 5~10분', 19행 '절반에서 2/3', 273행 glibc '8~12 MB'·musl '0.6~1 MB'는 출처·환경 없는 수치라 C ≤ 8. |
| D | 12 | 같은 시리즈: `chapter10-real-board.md` 100행은 한 줄뿐, `chapter12-kernel-customize.md` 320·338행은 200행 규칙을 'Ch 11에서 다룬'이라며 이어받는다. `chapter03-kconfig.md` 131~138행 비교표가 90~101행과 같은 질문을 요약 수준으로 답한다. `chapter04-first-build.md` 88·138행은 주제만 닿고, `chapter14-build-caching.md` 297~304행은 46·253행과 캐싱 관점으로 겹치며, `chapter17-sdk.md` 39~79행은 211~227행과 일부 겹친다. 다른 시리즈 `modern-recipes/part7-14-rootfs-buildroot.md` 104~121행은 25~101·267~281행 요약이고, `modern-recipes/part3-01-cross-compiler.md`는 bare-metal 중심이라 질문이 다르다. 이 글이 깊이 다룬다. |
| E | 8 | 제목 'Internal vs External 비교'와 description의 'Bootlin·Linaro·vendor SDK의 속도·호환성 트레이드오프'를 88~99·107~160행이 다룬다. 범위 과장은 없다. 대상 독자는 15행 '처음 30분' 정도로만 드러나고 속도 비교 근거가 없다. |
| F | 5 | 321행 다음 편(Ch 12)은 seriesOrder 12 `chapter12-kernel-customize.md`와 맞고 326~328행(ch04, ch12, ch17)도 맞다. 329행 'BSP Development Ch 7: 크로스 컴파일 toolchain'이 가리키는 `bsp/chapter07-tfa-trustzone.md`의 실제 제목은 'TF-A·TrustZone 통합 — BL31·secure world·SMC 흐름 적용'이다. 틀린 라벨이라 F ≤ 5. 330행 'Buildroot Manual §3: getting started'는 주제와 맞지 않는 절 라벨이다. |
| G | 2 | 출처는 109행 toolchains.bootlin.com 언급과 330행 manual 링크뿐이고 330행은 절 라벨이 맞지 않는다. GCC 13·binutils 2.41·headers 6.6(32~34행)은 적었지만 Kconfig 심볼의 기준 Buildroot 릴리스가 없다. 200행 ABI 규칙과 273행 libc 크기에 출처가 없다. |

uncertainties:
- 19행 6단계 부트스트랩이 현재 Buildroot의 host-gcc-initial/host-gcc-final 구조와 맞는지 미확인.
- 65행 BR2_TOOLCHAIN_EXTERNAL_BOOTLIN_AARCH64_GLIBC와 113행 ..._GLIBC_STABLE 중 실제 심볼 미확인.
- 126행 BR2_TOOLCHAIN_EXTERNAL_LINARO_AARCH64가 현재 릴리스에 남아 있는지 미확인.
- 237행 BR2_TOOLCHAIN_EXTERNAL_LIBS_CLEANUP, 263행 BR2_TOOLCHAIN_BUILDROOT_MULTILIB의 존재와 internal multilib 지원 미확인.
- 47행 BR2_PER_PACKAGE_DIRECTORIES 설명이 실제 용도(병렬 빌드)와 맞는지 미확인.
- 174행 headers 버전을 잘못 적었을 때 Buildroot가 빌드를 이어 가는지, 검사로 멈추는지 미확인.
- 109행 Bootlin toolchain이 'Buildroot 본가에서 제공하는 공식'인지(배포 주체) 미확인.
- 19행 '30분~1시간, 빌드 시간의 절반~2/3'와 46·92·311행 '30~50분'의 관계가 불분명하고 출처가 없다. ch04 377행 '30분 안쪽'과도 엇갈린다.
- 315행과 247행의 GLIBC_2.X not found 원인 귀속 차이 — 정리 문장 다듬기 후보.
- 42행 '세 가지 libc 자유 전환'에 musl·glibc 둘만 적었다(개수 표기 실수).
- 143행 ARM GNU 'multiarch 변형 제한', 79행 'vendor SDK는 보통 glibc 한정'은 출처 없는 일반화다.

### `chapter12-kernel-customize.md` — 61점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다.
- 320행 'External toolchain이 kernel headers 5.15로 빌드됐는데 빌드하는 커널이 6.6이면 … 런타임에 ENOSYS가 납니다'(headers < 커널에서 사고)
- 320행 끝 'headers ≤ 커널을 검증하는 게 안전', 338행 'external toolchain의 headers 버전이 커널보다 낮아야 syscall 사고가 없습니다'(headers < 커널이면 사고 없음)

같은 구성을 두고 사고가 난다는 진술과 없다는 진술은 둘 다 참일 수 없다. git 이력(f7714f0f 스텁, 87bd86e2 양산, 393f23a8 발행, 그 뒤 ac24bb76·fa55144d·be973200·0a9dd7bc·3232b1be 일괄 커밋)에 1차 자료 대조 커밋이 없어 모순이 없었더라도 미검증이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | merge_config.sh로 fragment를 합칠 때 뒤쪽이 이긴다는 규칙(167행), 양산 트리는 full commit hash(79행), source 방식 4개 비교표(92~97행), LOCALVERSION 불일치로 modprobe가 조용히 실패하는 사고(265행), rebuild·reconfigure·reinstall 구분(296·306·328행)이 Buildroot 실무 판단이다. 옵션 표(27~41행)와 target 표(271~285행)는 manual 목록 수준이고 79행 '경험이 누구나 한 번씩', 324행 '1년 안에 유지보수가 어려워지므로'는 근거 없는 일반론이다. |
| B | 14 | 도입(17~21행) → source(45~99행) → defconfig(101~138행) → fragment(140~169행) → DTS(171~217행) → 모듈(219~247행) → rootfs 반영(249~265행) → 빌드 단계(267~298행) → 흔한 실수(300~328행) → 정리(330~339행)로 완결된다. out-of-tree DTS의 #include 해석(196·201행), 모듈 Config.in 예(239~245행)의 kernel-module 전제 조건이 없고 헤더 버전 절(320·338행)은 결론이 뒤집혀 있다. |
| C | 8 | defconfig 조각(53~88·109~123·144~165·179~194행), 명령(131~136·289~294행), 확인 절차(308행 .config, 312행 ls *.dtb, 316행 depmod -a)가 있다. Buildroot 릴리스와 보드 환경, 빌드 로그·실제 출력이 없고 254~263행 트리도 예상 구조다. 58행 'LTS 6.6에서 6.12로 자동 이동', 324행 '1년 안에'는 출처 없는 주장이라 C ≤ 8. |
| D | 11 | 인접 `chapter13-uboot-integration.md`와 H2 뼈대가 같다(23 ↔ 23행, 45 ↔ 63행, 101 ↔ 93행, 300 ↔ 293행). 대상이 다르고 Ch13 110·329행이 이 글을 원본으로 참조해 역할은 갈린다. `chapter04-first-build.md` 343~344·363행이 287~298행과 겹친다. 다른 시리즈 `bsp/chapter08-kernel-config.md` 145~158행이 140~169행과, `bsp/chapter16-rootfs.md` 107~111·373행이 69~79·140~169행과 겹치고, `modern-recipes/part7-06-kernel-module.md`도 219~247행과 주제가 같다. Buildroot 옵션·make target 관점은 이 글에만 있다. |
| E | 8 | 제목의 'defconfig fragment'(140~169행)와 'DTS 통합'(171~217행), description의 vendor 트리(69~79행)·custom config(116~125행)·in-tree DTS(175~185행)를 이행한다. 대상 독자(19행)는 드러나지만 구체 문제를 끝까지 푸는 글보다 옵션 정리에 가깝다. |
| F | 4 | 343행 다음 편(Ch 13)은 seriesOrder 13 `chapter13-uboot-integration.md`와 맞다. 125행 br2-external 'Ch 7 참고'는 실제로 `chapter06-br2-external.md`(seriesOrder 6)이고, 217행 'DTS overlay … Ch 7'도 Ch7에 DTS 내용이 없다. 349행 'Ch 7: 보드 customize — br2-external과 board 디렉터리'는 실제 제목과 다르고, 352행 'BSP Development Ch 11: 커널 포팅'은 '부트로그 디버깅' 글로 가며, 353행 'Manual §13: Customizing the generated target filesystem'은 다른 절이다. 틀린 라벨이 여러 곳이라 4점. |
| G | 2 | 1차 출처는 353행 manual 링크 하나이고 엉뚱한 절 라벨이라 주장과 연결되지 않는다. 커널 6.6.32(66행), vendor 태그 lf-6.6.23-2.0.0(76행)은 설정 예일 뿐이고 Buildroot 릴리스 버전이 없다. |

uncertainties:
- 196행 out-of-tree .dts가 'arch/arm64/boot/dts/freescale/'로 복사된다는 설명: linux.mk가 서브디렉터리 없이 arch/<arch>/boot/dts/에 복사하면 201행 `#include "imx8mm-evk.dts"`가 해석되지 않을 수 있다.
- 41행 BR2_LINUX_KERNEL_INSTALL_TARGET이 'output/images/에 복사'한다는 설명이 target /boot 설치 옵션과 맞는지 미확인.
- 37행 BR2_LINUX_KERNEL_IMAGE_TARGET_NAME이 일반 선택 옵션인지 custom target 이름 전용인지 미확인.
- 235행 kernel-module 인프라의 KERNELDIR 전달과 패키지별 depmod는 pkg-kernel-module.mk로 미확인.
- 276행 linux-build가 'make Image dtbs modules'를 수행한다는 표기를 linux.mk와 대조하지 않았다.
- 58행 'LTS 6.6에서 6.12로 자동 이동', 324행 '1년 안에'는 출처 없는 수치다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **1차 자료 대조 커밋 없음 (10편 전부).** 집필 커밋 29edb309(10편 일괄)·87bd86e2/393f23a8(Ch11~ 양산·발행) 이후 slug·메타데이터·제목(ac24bb76)·TikZ·text 블록·링크 일괄(fa55144d) 커밋뿐이다. `factcheck: 검증됨`은 0편이고 6편(ch04·06·07·09·10·12)은 원문 내부 모순으로 오류 확인이다. 로컬 Buildroot clone이 없고 `data/upstream-tracking.yaml`에도 없다. Buildroot Practical은 `/fact-check-round` 대상이다.
- **Buildroot 기준 릴리스 표기 없음 또는 불일치 (8편).** ch05·ch06·ch07·ch08·ch09·ch11·ch12는 본문에 기준 릴리스가 없고, 있는 글도 ch03 37행 2026.02, ch04 57·61행 2024.02.x/2024.02.6, ch10 59행 2026.02로 서로 다르다. Kconfig 심볼·make 타깃 의미를 대조할 기준이 없다.
- **1차 출처가 본문 주장에 붙지 않음 (10편 전부, G 1~2).** 본문 링크가 아예 없는 글(ch03, ch04, ch05)과 관련 항목 끝 manual 링크만 있는 글(ch06 321행, ch07 352~353행, ch08 333~334행, ch09 496~497행, ch10 644~645행, ch11 330행, ch12 353행)뿐이다. ch11 330행·ch12 353행은 manual 절 라벨이 글 주제와 맞지 않는다.
- **출처·측정 환경 없는 구체 수치 (10편 전부, C ≤ 8 상한 반복).** ch03 202·331행, ch04 99·307·351·356·377행, ch05 15행, ch06 204~205행(placeholder 해시), ch07(결과 없음), ch08 32~40·104~109행, ch09 17행, ch10 414·463행, ch11 19·46·92·273행, ch12 58·324행. 빌드 시간 '30분'대 수치는 ch04 99·377행, ch11 46·92·311행, ch14 297~300행에서 서로 엇갈린다.
- **예시 출력이 실제 실행 기록이 아닌 흔적 (5편).** 자리표시 해시(ch04 61행, ch06 204~205행, ch09 108~109·118~119·215~216행, ch05 304행), 본문과 모순된 출력(ch04 172 vs 179행·232~239 vs 245~247행, ch10 435~442 vs 332행), 만든 적 없는 defconfig 출력(ch06 154~156행). 같은 양산 커밋을 거친 나머지 장도 출력 예시를 점검해야 한다.
- **링크 라벨·장 번호가 대상과 다름 (4편).** ch05 397행(BSP Ch12 '패키지 측 변경' → DT binding 글), ch11 329행(BSP Ch 7 '크로스 컴파일 toolchain' → TF-A 글, 루프 밖 ch17 430행도 같음), ch12 125·217·349행(br2-external을 'Ch 7'로)·352행(BSP Ch 11 '커널 포팅' → 부트로그 디버깅 글)·353행, ch10 26행(Ch 9 acme-led-blink). fa55144d 기계 치환에서 생긴 것으로 보인다.
- **옛 'Ch N: …' 라벨과 링크 없는 다음 편 안내 (10편 전부).** 다음 편·관련 항목 라벨이 ac24bb76 제목 변경 이전 표기다(ch03 388행, ch04 379·383~387행, ch06 313·318~320행, ch07 344·349~351행, ch08 326·331~332행 등). ch06 313행·ch08 326행 등 다음 장 예고에 링크가 없다.
- **10편 체계 시절 문구 잔존 (2편 + 루프 밖).** ch10 605~636행 '시리즈 마무리·다음 시리즈', ch01 181행 'Ch 10에서 마무리'가 20편 공개 상태와 맞지 않는다. 루프 안은 ch10 한 편이지만 시리즈 허브 문제라 함께 적는다.
- **같은 내용이 시리즈 안팎에서 반복 (D 감점, 8편).** defconfig/savedefconfig/merge_config(ch03 321~369행 ↔ bsp/chapter08 112~150행 ↔ part7-14 79~102행), output/·dl/·stamp(ch02·ch04·ch05·ch14), 패키지 infra·hash·patch·디버깅(ch05 203~361행 ↔ ch09 21~404행), ACME 외부 트리(ch06 101~115행 ↔ ch10 64~82행 ↔ bsp/chapter16 41~98행), post-image·genimage(ch07 190~248행 ↔ ch10 298~356행 ↔ ch15), internal/external toolchain 비교(ch03 131~138행 ↔ ch11 90~99행 ↔ part7-14 104~121행).
- **같은 시리즈 글 사이 사실 충돌 (5편 관련).** stamp/타깃 단계(ch05 351~359행 vs ch09 364·369행), post-script 인자(ch07 176·183·330행 vs ch15 52행), overlay 소유권·모드(ch07 59행 vs ch15 80~81행), dl/ 크기(ch04 307행 1.2G vs ch14 107행 1~5 GB), Ch 5 범위 소개(ch09 17행 vs ch05 21행). 다른 글과의 모순이라 오류 확인에는 넣지 않았고 fact-check 라운드에서 정한다.
- **개수 표기 실수 (3편).** ch03 15·27·51·374행 '8개 메뉴'(ch02 293행 포함), ch05 21·148행 '세 infra'·165행 '세 hook', ch11 42행 '세 가지 libc'.
- **공통 H2 뼈대 (10편 전부).** '한 줄 요약 → 본문 → (Troubleshooting/자주 하는 실수) → 정리 → 다음 장 예고 → 관련 항목'(예: ch03 13·364·371·381·386행, ch07 13·288·332·342·347행, ch09 13·433·475·486·491행, ch12 23·45·101·300행 ↔ ch13 같은 순서). 29edb309·87bd86e2 일괄 작성분이라 루브릭 9절 scaled content 수치 기록 대상이다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 6편은 오류 건수 순으로 본다. ch04(2건: stamp 목록·rootfs.ext4 symlink), ch06(2건: stacking 우선순위·빈 Config.in 메뉴), ch10(2건: J1 배선·boot.vfat 크기), ch07(overlay 권한), ch09(SETUP_TYPE 자동 감지), ch12(headers ≤ 커널 결론). Buildroot 기준 릴리스를 하나 고정하고 manual·package/*.mk·Config.in, BBB SRM, 실제 빌드 산출물을 열어 고친 뒤 출처를 적은 커밋을 남긴다.
- 같은 작업에서 F 감점 원인을 고친다: ch10 605~636행 시리즈 종결 안내와 26행 Ch 9 참조, ch12 125·217·349·352·353행, ch11 329·330행, ch05 397행. 다시 채점할 때 바로 반영된다.
- 병합 검토 2편: ch05는 infra 예제·hash·패치·디버깅을 ch09로 넘기고 Config.in·.mk 구조와 pkg-generic.mk 펼침을 채우는 방향, ch03은 후반 defconfig 절을 bsp/chapter08·ch12 링크로 줄이고 '옵션 의존성'을 채우는 방향으로 보강을 검토한다.
- 보강 2편(ch08·ch11)은 버전 표기와 열린 uncertainties(ch08 40~60% 수치·ext4 data 이미지, ch11 Kconfig 심볼 존재) 확인이 먼저다.
- 시리즈 단위로 Buildroot 기준 버전을 정하고 `data/upstream-tracking.yaml` 등록 여부를 사용자가 결정한다. 등록되면 ③⑥ 자동화가 이 시리즈에 적용된다.
- '같은 시리즈 글 사이 사실 충돌'과 개수 표기 실수는 Buildroot Practical `/fact-check-round`에서 한 번에 정한다. 예시 출력 placeholder·모순 패턴과 옛 'Ch N' 라벨은 나머지 장(ch01·02·13~20)에도 있는지 grep으로 수를 센 뒤 다음 루프 채점에 반영한다.
