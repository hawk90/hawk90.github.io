# 공개 글 독립 재평가 — 루프 07

2026-10-19 재평가. 기준 원문 `d55f8d66ece6acb8ebb274df7c843ce6b4054853`, 루브릭 v1.2·AP-C-24. Buildroot ch03~12 전문과 기존 평가, 아래 비교 원문을 대조했다. 전편 `score_status: 잠정`, `confidence: 중간`. 앵커는 수정 전 `10550ca1` 기준. 원문과 기존 보고서는 변경하지 않았다. 공통 검사는 [2026-10-18 게이트](double-check-gates-2026-10-18.md)를 인용하며 실제 Buildroot 빌드·보드 시험은 수행하지 않았다. 본문 검토에서 P0 미발견.

## 점수

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `chapter03-kconfig.md` | 10 | 11 | 6 | 9 | 6 | 7 | 2 | 51 | 오류 확인 | 우선 조치 |
| `chapter04-first-build.md` | 12 | 12 | 7 | 10 | 8 | 6 | 2 | 57 | 오류 확인 | 우선 조치 |
| `chapter05-package-system.md` | 10 | 11 | 6 | 9 | 5 | 6 | 1 | 48 | 오류 확인 | 우선 조치 |
| `chapter06-br2-external.md` | 10 | 11 | 7 | 10 | 7 | 7 | 2 | 54 | 오류 확인 | 우선 조치 |
| `chapter07-board-customize.md` | 13 | 13 | 8 | 9 | 8 | 7 | 2 | 60 | 오류 확인 | 우선 조치 |
| `chapter08-filesystems.md` | 15 | 12 | 7 | 12 | 7 | 7 | 2 | 62 | 오류 확인 | 우선 조치 |
| `chapter09-new-package.md` | 13 | 12 | 6 | 8 | 7 | 7 | 2 | 55 | 오류 확인 | 우선 조치 |
| `chapter10-real-board.md` | 15 | 12 | 7 | 10 | 8 | 4 | 2 | 58 | 오류 확인 | 우선 조치 |
| `chapter11-toolchain.md` | 15 | 12 | 8 | 12 | 8 | 5 | 2 | 62 | 오류 확인 | 우선 조치 |
| `chapter12-kernel-customize.md` | 14 | 13 | 8 | 11 | 8 | 4 | 2 | 60 | 오류 확인 | 우선 조치 |

합계 571→567, 평균 57.1→56.7. 신규 오류 확인 ch03·05·08·11 네 편. 일부 기존 오류 근거는 아래처럼 철회/축소하고 확인 가능한 근거로 교체했다. 전편 오류 확인은 적어도 한 개의 구체 오류를 확인했다는 뜻이며 모든 주장에 대한 검증 완료가 아니다.

## 정확성 게이트 재검토

- ch03 L249의 기본 `make graph-depends` 결과가 SVG라는 설명은 [Buildroot manual §8.10](https://buildroot.org/downloads/manual/manual.html)의 기본 PDF·SVG 선택 환경 변수와 다르다. 별도 SVG 설정이 없는 제시 명령의 기본 출력 설명 오류다. 메뉴 개수 오기는 기술 오류 게이트로 쓰지 않는다.
- ch04의 stamp 목록은 예시 목록 생략으로도 읽을 수 있어 ‘반드시 모두 나열되어야 한다’는 기존 오류 근거를 철회한다. 그러나 L172의 일반 파일 형태 `ls -lh`와 L179의 같은 ext4가 ext2의 symlink라는 설명은 양립하지 않는다. 해당 출력/설명의 오류로 게이트 유지.
- ch05 L277·283의 Python SETUP_TYPE=`pyproject`를 [Buildroot 2026.02 pkg-python.mk](https://raw.githubusercontent.com/buildroot/buildroot/2026.02/package/pkg-python.mk)의 허용값 검사와 대조했다. 이 값은 허용되지 않고 오류 처리된다. 신규 오류 확인. 과거 distutils 지원 여부와 구분하며 글에 기준 버전이 없는 점도 남긴다.
- ch06 L225·308의 뒤 외부 트리가 앞 패키지를 override한다는 설명은 단순 Kconfig 정의와 .mk override가 다른 층일 가능성이 있어 내부 모순만으로 확정하지 않는다. 대신 [2026.02 pkg-generic.mk](https://raw.githubusercontent.com/buildroot/buildroot/2026.02/package/pkg-generic.mk)가 같은 패키지의 중복 선언을 오류 처리함을 확인했다. 뒤 트리 동일 패키지의 일반 override라는 설명은 잘못됐다. 빈 Config.in에서 External options가 보인다/안 보인다는 L117~132·281의 상충 설명도 남는다.
- ch07 L59의 원본 파일 권한 보존·chmod로 실행 가능하게 하라는 설명과 L142·335의 overlay에서 mode/권한을 표현할 방법이 없다는 단정은 같은 파일의 mode 전달 여부에 상충한다. 기존 오류 유지. 소유권을 root로 바꾸거나 삭제를 표현할 수 있다는 뜻으로 일반화하지 않는다. [2026.02 Makefile](https://raw.githubusercontent.com/buildroot/buildroot/2026.02/Makefile)의 target-finalize→overlay 복사→post-build 순서는 대조했지만 이 순서 확인만으로 모든 권한 계약을 검증했다고 하지 않는다.
- ch08 L84~86은 gzip cpio를 그대로 올리고 크기 없이 booti를 호출한다. [U-Boot v2024.04 booti 문서](https://docs.u-boot.org/en/v2024.04/usage/cmd/booti.html)는 raw initrd에 `주소:크기`가 필요하다고 명시한다. 제시 파일은 legacy/FIT header로 감쌌다는 설명이 없는 raw cpio.gz다. 신규 오류 확인. 실제 U-Boot 실행은 하지 않았다.
- ch09 자동 감지/명시적 SETUP_TYPE 공존은 override가 가능한 API라면 모순이 아니므로 내부 문장 비교만의 기존 근거는 철회한다. 위 pkg-python.mk의 SETUP_TYPE 필수 검사로 자동 감지 주장을 확인 오류로 유지한다. 또한 L347~353·369·404의 rebuild가 extract/patch부터 다시 한다는 설명은 위 pkg-generic.mk의 build/install stamp 정리와 다르다. 일반 tarball 패키지의 rebuild는 extract/patch를 다시 하지 않는다. local/OVERRIDE_SRCDIR의 rsync 예외와 구분했다.
- ch10 L482·483의 보드 TX=pin4와 L574의 보드 TX=pin5는 같은 배선에서 충돌한다. 또한 L435~438의 MLO16M·U-Boot580K·kernel6.2M·DTB62K는 L322~333·442의 16M boot.vfat에 담기지 않는다. 산술/동일 배선 오류 유지. 실제 보드 핀 정의는 이 내부 비교와 별개다.
- ch11 L84·147~160이 NXP Yocto SDK를 external toolchain으로 그대로 가져오는 예를 제시한다. [Buildroot manual §6.1.2](https://buildroot.org/downloads/manual/manual.html)는 OpenEmbedded/Yocto SDK의 다수 사전 빌드 라이브러리 때문에 해당 SDK import를 지원하지 않는다고 명시한다. 그대로 가져오는 일반 절차의 신규 오류 확인. 순수 toolchain만 따로 추출·수정한 별도 환경은 배제하지 않는다. GLIBC 버전 오류와 headers 규칙을 묶은 요약은 별도 불확실성으로 남긴다.
- ch12 L320의 ENOSYS 설명은 어느 새 syscall/최소 kernel 조건인지 없어, headers5.15/kernel6.6 자체가 늘 실패한다는 근거로 삼지 않는다. 대신 L328·337의 rebuild는 빌드만 하고 target 모듈을 갱신하지 않는다는 설명이 위 pkg-generic.mk의 rebuild→install 재실행과 다르다. rootfs 이미지를 새로 만드는 별도 `make` 필요와 target 설치 여부를 구분한다. 기존 오류 게이트는 이 1차 자료 근거로 교체한다. 미해결 정확성이 있는데 B14를 준 기존 평가는 상한13으로 수정.

## 글별 근거

축약 경로 기준 `src/content/blog/embedded/`. 내부 링크 44개를 slug→실제 YAML 메타데이터로 대조했으며 누락/비공개 목적지는 없다. 존재와 라벨 의미는 별도로 평가했다. 세부 목록 `/private/tmp/adsense-parent-links-07.json`. F의 검사 미실행 감점은 공통 정적 검사 결과와 고유 탐색 구조를 반영해 다시 판단했다.

### chapter03-kconfig.md

source_file: `src/content/blog/embedded/buildroot/chapter03-kconfig.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`.
- blockers: graph-depends 기본 출력 설명 오류.
- uncertainties: AArch64 심볼·menu의 버전·tristate·fragment 결과 적용 방식·수치 출처는 미검증. 메뉴 개수는 편집 문제로 분리한다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | L67~319 메뉴/옵션 목록이 대부분. toolchain 비교·config/defconfig 구분·실수 목록은 적용 관점이나 독자 실험은 없다. |
| B | 11 | 메뉴→defconfig→fragment→실수로 완결. 의존성 약속은 L243의 짧은 설명이며 기본 출력 오류와 미확인 옵션으로 상단 불가. |
| C | 6 | 7→6. L245~249 따라 확인할 산출물 형식이 틀렸다. 명령/검색 출력은 있으나 환경·결과 검증이 약하고 수치로 C≤8. |
| D | 9 | L333~347↔Recipes7-14 L93~102 savedefconfig 반복; L323·353~360↔BSP08 L112~150 config/merge 반복; kernel 조작은 본시리즈12 L275~290이 더 깊다. 메뉴 지도 역할은 별도다. |
| E | 6 | menuconfig/defconfig 약속은 이행하나 의존성 문제를 푸는 실제 예는 부족하다. 개수 오기는 이행/편집 약점으로만 반영. |
| F | 7 | 6→7. 다음04·관련02/04/08/BSP08은 일치. 메뉴별 9개 소절이 찾기 쉬운 고유 구조다. 검사 미실행만으로7 불가라는 기존 이유는 철회. |
| G | 2 | 버전·옵션 파일 경로는 있지만 본문에 개별 주장의 공식 자료 연결이 없다. |

변경: 총점51 유지, 신규 오류로 우선 조치. 병합 대상 없음; 메뉴 지도와 숨은 옵션 진단을 보강할 후보.

### chapter04-first-build.md

source_file: `src/content/blog/embedded/buildroot/chapter04-first-build.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part12-10-on-device-llm.md@10550ca1`.
- blockers: ls 일반 파일과 symlink 설명 불일치.
- uncertainties: qemu defconfig 실제 옵션·DTS·릴리스/LTS 정책·실제 로그와 start-qemu BINARIES_DIR 설정은 미검증. stamp 목록 생략은 확정 오류에서 철회.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | L216~262 staging/target·stamp에 따라 실패를 찾는 관점. clone/build/QEMU는 일반 절차이며 실제 관측 근거는 없다. |
| B | 12 | 호스트→clone→config→build→boot→실패까지 완결. L109~113·136 빈 설명과 산출물 불일치가 남는다. |
| C | 7 | 호스트·명령·로그가 있지만 실제 재현 자료는 없고 출력에 symlink 오류가 있다. 시간/용량 출처 부족으로 C≤8. |
| D | 10 | L57~102↔01 L185~195 첫 빌드, L216~223↔02 L168~181 output, L301~322↔14 L79~87 cache/mirror가 반복된다. QEMU 부팅까지 연결하는 질문은 별도다. |
| E | 8 | 제목·description의 QEMU 첫 빌드부터 로그인까지 L23~299가 답한다. 일부 빈 단계와 결과 정확성 때문에 상단 불가. |
| F | 6 | 다음05·관련03/05/07/10/BSP10은 일치. stamp/검증 구조는 유용하나 빈 단계 표제가 흐름을 끊고 전제 장 안내가 약하다. |
| G | 2 | 저장소·버전은 있으나 제시 config/로그·기본값의 공식 고정 출처가 없다. |

동의: 57 유지. 병합 대상 없음; 실제 고정 릴리스의 최초 부팅 산출물로 보강할 후보.

### chapter05-package-system.md

source_file: `src/content/blog/embedded/buildroot/chapter05-package-system.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: PYTHON_MYTOOL_SETUP_TYPE=pyproject 오류.
- uncertainties: helper·host Config.in 규약·hash 생성/검사 설명·CI 거부 단계와 정확한 기준 버전은 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 구문·변수·infra·helper 표가 일반 문서 수준. 고유 실패 기록 없이 디버깅 순서를 묶는다. |
| B | 11 | 12→11. 구조→infra→hash→patch→debug는 완결이나 지원하지 않는 setup 값으로 핵심 예제가 틀린다. |
| C | 6 | 7→6. 가상 URL/해시·생략 toolchain뿐 아니라 SETUP_TYPE도 그대로는 유효하지 않다. 실제 실행 환경/출력이 없다. |
| D | 9 | L203~283↔09 L31~308 infra 예제, L297~333↔09 L104~120·331~355 hash/patch, L335~361↔09 L357~405 debug 중복이 크다. L51~146의 구조 설명 역할은 남는다. |
| E | 5 | 제목의 동작 추적에 비해 매크로가 어떻게 심볼/target으로 펼쳐지는지 없이 작성 규약을 소개한다. |
| F | 6 | 5→6. 다음06·관련02/03/06/09는 일치. L397의 driver-add는 커널 측과 패키지 측 작업을 구분하는 맥락으로 읽을 수 있어 목적지에 Buildroot 단어가 없다는 이유만의 상한은 철회. 단계별 debug 구조는 있지만 구성 안내가 흔들린다. |
| G | 1 | 기준 릴리스·공식 문서/소스와 개별 CI 주장의 연결이 없다. |

변경:49→48, 신규 오류로 우선 조치. 병합 후보09; 이 글은 Config.in/.mk 확장 원리로 범위를 좁힐 후보.

### chapter06-br2-external.md

source_file: `src/content/blog/embedded/buildroot/chapter06-br2-external.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`.
- blockers: 같은 패키지 뒤 트리 override 설명 오류.
- uncertainties: 빈 Config.in 메뉴 표현·show-info 출력·해시 자리표시·name 충돌 처리와 prefix별 metadata 계약은 별도 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 분리·stacking·이동·진단 관점은 있으나 예제 대부분 매뉴얼 구조이며 실제 충돌/업그레이드 사례가 없다. |
| B | 11 | 최소 파일→첫 트리→패키지→stacking→이동→시험으로 완결. override 핵심 설명 오류와 메뉴 안내 충돌이 남는다. |
| C | 7 | mkdir부터 make·metadata까지 있지만 URL/해시가 가상이고 실제 실행 증거·릴리스가 없다. |
| D | 10 | L63~95·123↔BSP16 L41~98 external 기본, L175~198↔05 L167~183 generic 골격, L101~115↔10 L64~82 첫 트리 반복. 본래 external 설명 자리라는 역할은 남는다. |
| E | 7 | 본체와 패키지/보드/defconfig 분리 약속을 전개한다. stacking의 계약이 부정확해 상단 불가. |
| F | 7 | 6→7. 다음07·관련05/07/09 의미가 맞고 L279~298 증상별 H3와 확인 명령이 고유 탐색 구조다. 전제 링크 한 개가 없다는 이유만으로6에 고정하지 않음. |
| G | 2 | 공식 manual 연결은 있으나 예제/stacking의 기준 tag·원자료가 없다. |

변경:53→54. 오류 유지, 근거를 package 등록 계약으로 보강. 병합 대상 없음; external의 실제 충돌/검증 결과를 보강할 후보.

### chapter07-board-customize.md

source_file: `src/content/blog/embedded/buildroot/chapter07-board-customize.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part12-10-on-device-llm.md@10550ca1`.
- blockers: overlay 파일 mode 전달 설명 상충.
- uncertainties: device table·SUID의 fakeroot 반영, target-finalize와 fakeroot 차이·수정 defconfig 적용법은 별도 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 13 | 정적/동적/삭제 구분·인자표·증상별 진단이 적용 관점. 실험 원자료 없이 일반 예제가 중심이다. |
| B | 13 | 세 hook·권한·genimage·종합 트리·진단까지 충실. 권한 설명 오류가 있어13 상한. |
| C | 8 | L106~133·190~247·273~281 완성도 있는 코드/구성은 있으나 실제 고정 버전의 실행 결과가 없다. 절차 중심 상한9보다 낮게 판단. |
| D | 9 | L190~216↔10 L298~317 post-image, L221~231↔10 L322~333 FAT 예제 반복. BSP16 L350~365도 genimage 호출이 같다. 일반 hook 설명은 이 글이 본래 자리다. |
| E | 8 | 세 hook의 시점·수정 대상·입력·파일 위치를 대응해 약속을 이행한다. 권한 계약 보강이 필요하다. |
| F | 7 | 다음08·관련06/08/10과 실제 주제가 일치. L27~31 표→세 본절→증상 H3가 고유 구조다. |
| G | 2 | 공식 manual/genimage 링크는 있지만 tag별 동작·예제 실행 근거가 없다. |

동의:60 유지. 병합 대상 없음; 기본 hook 입문 역할을 유지하고 권한/빌드 단계 계약을 보강할 후보.

### chapter08-filesystems.md

source_file: `src/content/blog/embedded/buildroot/chapter08-filesystems.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part12-10-on-device-llm.md@10550ca1`.
- blockers: raw cpio.gz booti의 크기 인자 누락.
- uncertainties: rootfs를 부트로더가 mount한다는 L164 표현·overlay early-init/데이터 손상 시 동작·size/성능 수치·cpio 쓰기 표현은 별도 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 15 | power failure·RO/overlay 정책을 선택 기준으로 묶는다. 수치 표는 추정/대략 예시이며 측정 자료가 아니다. |
| B | 12 | 13→12. 포맷→쓰기 정책→스크립트→진단으로 충실하지만 raw initrd 부팅 명령이 불완전하다. |
| C | 7 | 8→7. 설정·init script·cmdline은 구체적이나 부팅 명령 계약이 틀리고 실제 전원 차단/복구 결과가 없다. 출처 없는 수치로 C≤8. |
| D | 12 | L172~180↔10 L124~130 squash/ext4 조합과 L289↔10 L588 진단은 겹친다. 07 L145~163 device table은 빌드 정책이고 본글 L143~232는 런타임 overlay여서 같은 overlay 명칭만으로 중복 감점하지 않는다. |
| E | 7 | 포맷/선택 질문을 답하지만 읽기 성능 근거는 추정 표와 일반론이며 실제 비교가 없다. |
| F | 7 | 다음09·관련07/10과 device table 연결이 일치. L162~167 순서와 L202~217 script 대응이 고유 구조다. 순서 자체의 정확성은 B와 구별. |
| G | 2 | 공식 manual/overlayfs 자료는 있으나 버전·추정 수치·자체 시험 근거가 없다. |

변경:64→62, 신규 오류로 우선 조치. 병합 대상 없음; 동일 rootfs의 실제 포맷/부팅·복구 비교로 보강할 후보.

### chapter09-new-package.md

source_file: `src/content/blog/embedded/buildroot/chapter09-new-package.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`.
- blockers: SETUP_TYPE 자동 감지·rebuild extract/patch 설명 오류.
- uncertainties: helper의 파일명/해시 보장·htop configure flags·runtime dependency 순서·실제 가상 패키지 빌드는 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 13 | 세 형태 전체 코드와 dependency 구분·실패 진단을 묶는 관점. 독립 분석/원자료 없이 표준 예제 수준이다. |
| B | 12 | 세 사례→의존성→patch→debug→license까지 충실. 핵심 rebuild/자동 감지 계약이 틀려13 이하. |
| C | 6 | 7→6. 가상 URL·해시뿐 아니라 실제 patch 변경의 재빌드 절차도 틀린다. 실행 환경/결과가 없다. |
| D | 8 | L31~308↔05 L203~283 infra, L104~120·331~355↔05 L297~333 hash/patch, L357~405↔05 L335~361 debug가 중복. 세 전체 .mk와 dependency 문제를 별도로 다룬 역할은 남는다. |
| E | 7 | 제목 세 infra의 실제 예를 이행하나 실제 빌드 가능한 고정 사례는 아니다. |
| F | 7 | 6→7. 다음10·관련05/06/10은 일치. 세 사례가 Config.in→.mk→hash→등록 구조로 대응하고 증상별 H3가 있다. 앞장 generic 언급은 그 앞장이 다른 infra도 다룬다는 사실과 양립한다. |
| G | 2 | official manual/SPDX 연결은 있지만 개별 옵션·출력·toolchain의 tag/원자료가 없다. |

변경:C−1/F+1,55 유지. 오류 근거를 필수 SETUP_TYPE/실제 stamp 계약으로 정정. 병합 후보05의 infra 예제 절; 실제 한 패키지의 변경 검증에 집중할 후보.

### chapter10-real-board.md

source_file: `src/content/blog/embedded/buildroot/chapter10-real-board.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: 같은 TX 핀 배선 충돌·boot.vfat 용량 부족·마지막 장 오안내.
- uncertainties: 실제 BBB pinout·버튼/부트 순서·패키지 생성 순서·RO rootfs/data overlay 통합·실측 여부는 별도 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 15 | external→LED 패키지→이미지→보드 부팅까지 연결하는 통합 관점. 실제 보드 관측 근거가 없어 상단 불가. |
| B | 12 | 각 파일·단계·진단은 풍부하지만 배선/용량 오류와 스크립트·초기 config 적용 시점 문제가 남는다. |
| C | 7 | 호스트/보드·코드·로그는 구체적이나 실측 증빙이 없고 이미지 결과가 구성과 맞지 않는다. 시간/크기 값으로 C≤8. |
| D | 10 | L298~317↔07 L190~216 post-image와 L322~333↔07 L221~231 FAT 반복; L461~474↔BSP17 L219~229 writer 반복. 실제 보드 전체 흐름은 별도 질문이다. |
| E | 8 | defconfig에서 SD 부팅까지 제목/description을 이행하지만 구성·출력 오류로 그대로 검증하기 어렵다. |
| F | 4 | L605~636이 마지막 글로 끝내지만 공개11~20이 뒤에 있다. L611 OTA 미취급은16과 다르고 L26의09 자작LED도 실제09 htop과 다르다. 관련06~09의 존재와 의미는 맞는다. |
| G | 2 | 공식 board/defconfig 링크가 있으나 사용 tag와 관찰 로그·구성의 직접 연결이 없다. |

동의:58 유지. 병합 대상 없음; 고정 버전/보드에서 실제 end-to-end 결과로 보강할 후보.

### chapter11-toolchain.md

source_file: `src/content/blog/embedded/buildroot/chapter11-toolchain.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part12-10-on-device-llm.md@10550ca1`.
- blockers: Yocto SDK를 그대로 external import하는 일반 절차가 공식 지원 범위와 다름.
- uncertainties: multilib/cleanup 옵션 실재·headers 선언 검사·Bootlin 배포 주체/심볼·ABI 비교·성능/크기 수치는 별도 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 15 | 선택 조건·sysroot 충돌·readelf 해석은 구체 적용 관점. 공식 검증/자체 실험 없이 일반론과 수치에 의존한다. |
| B | 12 | 13→12. 비교→배포판→ABI→실패→검증 흐름은 완결이나 vendor SDK import를 일반화한 핵심 절차가 틀렸다. |
| C | 8 | Kconfig/metadata/readelf 예상 출력은 풍부하다. 시간/비율/libc 크기 조건·실측 자료 부재로8 상한 유지. |
| D | 12 | L90~101↔03 L131~138 internal/external 요약, L211~227↔17 L39~79 sysroot는 일부 반복. Recipes7-14 L104~121은 선택 개요이고 본글은 ABI/실패를 깊게 다뤄 역할이 구별된다. |
| E | 8 | internal/external·배포판/호환성 약속을 다룬다. 속도 비교의 증거는 부족하다. |
| F | 5 | 다음12와 관련04/12/17은 일치. L329는 BSP07을 toolchain 장으로 안내하지만 실제 TF-A·TrustZone이다. 특정 장 오안내로 상한5 유지. |
| G | 2 | official manual 연결·버전 표기는 있으나 심볼/속도/ABI 주장별 출처가 없다. |

변경:63→62, 신규 오류로 우선 조치. 병합 대상 없음; 순수 toolchain과 SDK 구분·실제 ABI 검증으로 보강할 후보.

### chapter12-kernel-customize.md

source_file: `src/content/blog/embedded/buildroot/chapter12-kernel-customize.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`.
- blockers: rebuild가 target 설치를 하지 않는다는 설명 오류.
- uncertainties: 구체 syscall/최소 kernel·custom DTS 복사 경로·module 환경 변수·정확한 옵션/타깃·최종 rootfs 검증은 별도 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | 네 축·fragment merge·config 영속화·module 문제를 묶는다. 실제 vendor upgrade/실패 기록은 없다. |
| B | 13 | 14→13. source/config/DTS/modules·진단으로 범위는 충실하지만 실제 rebuild 계약 오류가 열려 있어 AP-C-24 상한 적용. |
| C | 8 | 옵션/코드/타깃 표·개발 순서가 구체적이나 실제 보드·빌드 출력·고정 버전 검증이 없다. 절차 중심이며 오류 절차도 남아8. |
| D | 11 | L140~169↔BSP08 L145~158 config/fragment, L69~79·140~169↔BSP16 L107~111·244~278 vendor source/config 설명이 겹친다. U-Boot13과 같은 H2 뼈대인 사실은 중복 근거로 삼지 않고 Buildroot kernel 옵션/target 역할을 인정한다. |
| E | 8 | 네 축을 실제 본절이 답한다. 구현/시험의 정확성 보강은 필요하다. |
| F | 4 | 다음13은 일치. L125 external Ch7 안내는 실제06이고 L217 DTS overlay Ch7은 실제07에 없다. L352 BSP11 커널 포팅도 부트로그 디버깅으로 간다. 여러 구체 오안내로4 유지. |
| G | 2 | 공식 manual 링크·source 예 버전은 있으나 주장별 계약/고정 source 연결이 부족하다. |

변경:61→60, 오류 게이트 근거 교체. 병합 대상 없음; Buildroot kernel 통합 역할을 유지하고 실제 source/config/module 산출물로 보강할 후보.
