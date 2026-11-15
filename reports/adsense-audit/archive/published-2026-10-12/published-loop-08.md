# 공개 글 AdSense 평가 — 루프 08

> 대상: 공개 글 10편 (Buildroot Practical `seriesOrder` 13~20 8편, CMake `seriesOrder` 1~2 2편)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 여덟 번째 루프다. 대상은 `src/content/blog/embedded/buildroot/`의 `chapter13-uboot-integration.md`~`chapter20-yocto-migration.md` 8편과 `src/content/blog/tools/build/cmake/`의 `chapter01-intro.md`·`chapter02-language.md` 2편이고 모두 공개 글이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 두 시리즈가 섞여 있어 파일 이름 앞에 시리즈 디렉터리를 붙였다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `buildroot/chapter13-uboot-integration.md` | 12 | 11 | 7 | 11 | 7 | 5 | 2 | **55** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `buildroot/chapter14-build-caching.md` | 13 | 11 | 7 | 10 | 7 | 5 | 2 | **55** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `buildroot/chapter15-post-build-deep.md` | 13 | 12 | 6 | 8 | 7 | 4 | 2 | **52** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `buildroot/chapter16-ota.md` | 15 | 13 | 7 | 7 | 7 | 4 | 2 | **55** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `buildroot/chapter17-sdk.md` | 13 | 13 | 7 | 12 | 8 | 5 | 2 | **60** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `buildroot/chapter18-security-cve.md` | 14 | 12 | 7 | 11 | 8 | 5 | 2 | **59** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `buildroot/chapter19-cicd.md` | 13 | 13 | 7 | 10 | 8 | 5 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `buildroot/chapter20-yocto-migration.md` | 14 | 13 | 7 | 9 | 7 | 4 | 2 | **56** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `cmake/chapter01-intro.md` | 11 | 13 | 7 | 10 | 7 | 7 | 2 | **57** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `cmake/chapter02-language.md` | 11 | 12 | 8 | 11 | 7 | 7 | 3 | **59** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |

평균 56.6점(10편 합 566), 범위 52~60점이다. 판정은 우선 조치 7편, 병합 검토 3편이다. 80점 이상 글과 `factcheck: 검증됨` 글은 없다. 오류 확인은 7편(buildroot ch13·14·15·16·17·19, cmake ch02)이다. buildroot ch15·ch19는 평가 중 연 Buildroot 매뉴얼과, cmake ch02는 CMake 4.4.4 문서와 `cmake -P` 실행 결과와 대조해 확인했고, 나머지는 원문 내부 모순(루브릭 3-1)으로 판정했다. 점수 구간으로는 buildroot ch17만 보강(60~79)이고 나머지 9편이 병합 검토(40~59)다. 병합 검토 3편(buildroot ch18·ch20, cmake ch01)은 모두 '병합 대상 없음' 또는 부분 정리 뒤 보강이 다음 조치다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체와 다음 편·관련 항목·본문 내부 링크 대상 파일의 존재·제목·seriesOrder·`draft: false`까지이고, 렌더링·광고 배치는 보지 않았다. 외부 자료는 Buildroot 매뉴얼(ch15·ch19)과 로컬 CMake 4.4.4 문서(cmake ch02)만 열었다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `buildroot/chapter13-uboot-integration.md` | 56 | 55 | -1 | 없음 |
| `buildroot/chapter14-build-caching.md` | 54 | 55 | +1 | 없음 |
| `buildroot/chapter15-post-build-deep.md` | 52 | 52 | 0 | 없음 |
| `buildroot/chapter16-ota.md` | 55 | 55 | 0 | 없음 |
| `buildroot/chapter17-sdk.md` | 60 | 60 | 0 | 없음 |
| `buildroot/chapter18-security-cve.md` | 59 | 59 | 0 | 없음 |
| `buildroot/chapter19-cicd.md` | 59 | 58 | -1 | 없음 |
| `buildroot/chapter20-yocto-migration.md` | 56 | 56 | 0 | 없음 |
| `cmake/chapter01-intro.md` | 57 | 57 | 0 | 없음 |
| `cmake/chapter02-language.md` | 59 | 59 | 0 | 없음 |

1차 합 567에서 최종 566으로 1점 내려갔다. 부풀림(AP-C-24) 판정은 10편 모두 없음이다.

- 기각한 오류 확인: 2건, 1편(buildroot ch15).
  - 121·136행(post-image에서 setcap·setfiles) vs 28·44·308행(post-image에서 TARGET_DIR 수정은 무의미): 121·136행이 작업 대상을 밝히지 않아 마운트한 이미지에 실행하는 해석이 가능하다. uncertainties로 옮겼다.
  - 88행 'device_table.txt와 device_table_dev.txt를 합쳐 적용': 매뉴얼 6.2상 정적 /dev를 고르면 두 파일이 함께 처리되므로 조건 누락일 뿐이다. uncertainties로 옮겼다.
- 추가한 오류 확인: 5건, 4편.
  - buildroot ch15: 222~226행 genimage cfg(두 번째 파티션 `partition data`에 rootfs.ext4) vs 255행('A/B 업데이트 시작점'이라면서 data 파티션을 첫 부팅 때 mkfs로 다시 만든다).
  - buildroot ch17: 136행 export 없는 `SYSROOT` vs 204행 `set(CMAKE_SYSROOT $ENV{SYSROOT})`. 183행 'sysroot 안에 toolchain file' vs 190·262행 `${SDK_PATH}/share/buildroot/toolchainfile.cmake`와 42~60행 트리.
  - buildroot ch19: Buildroot 매뉴얼 make sdk 절('<TARGET-TUPLE>_sdk-buildroot.tar.gz ... located in output/images/') vs 317행 표('sdk.tar.zst', output/host/)와 330행 `aws s3 cp output/sdk.tar.zst`. 같은 글 115행 `mv output/images/*sdk* sdk.tar.gz`와도 충돌한다. 판정이 미검증·병합 검토 → 오류 확인·우선 조치로 바뀌었다.
  - cmake ch02: 269행 `# IS_EQUAL = TRUE` vs CMake 4.4.4 `cmake -P` 실행 결과 `IS_EQUAL=1`.
- 산문 개수 실수는 오류 확인으로 올리지 않았다: buildroot ch13 295행 '다섯 가지'(실제 6개)는 B 감점과 시리즈 공통 문제에만 반영했다.
- 점수 변경: buildroot ch13 B 12→11(295행 개수, 141·291행 SPL 산출물 이름 불일치), buildroot ch14 D 9→10(per-package·hash gate·sstate 부재·재빌드 범위가 이 글에만 있어 역할 구별), buildroot ch19 B 14→13(매뉴얼 기준 SDK 경로 오류, 128행 예와 304행 원칙 불일치). 나머지 7편은 인용 줄을 원문과 대조해 점수를 유지했다.
- 근거 정정: D 비교 줄 번호를 직접 연 줄로 바꿨다(ch13의 bootloader ch13 25~32행·ch24 14~36행·ch12 142~156행, ch14의 Ch19 157~170·244~264행, ch15의 ch07 21~30·165~250행, ch16의 bootloader ch20 53~84·93~110행, ch20의 ch01 202~207행, cmake ch01의 ch02 600~610행·gnu-make ch01 H2 줄). ch14 B 근거의 'AP-C-24 B ≤ 13'은 불확실 목록 기반 상한이 아니어서 근거 문구에서 뺐다(점수 유지). ch16 anchor_ref는 part12-10에서 part1-04로 바꿨다.
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목과 대조했다. Buildroot 8편은 모두 틀린 라벨이나 없는 매뉴얼 절 라벨 때문에 F ≤ 5다. CMake 2편은 다음 편·관련 항목이 맞아 7이다.

## 글별 근거

### `buildroot/chapter13-uboot-integration.md` — 55점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 글 안의 모순(루브릭 3-1). 162행 "legacy header의 CRC는 무결성 확인용이지 cryptographic 서명이 아닙니다. 서명 검증이 필요하면 별도의 FIT image 서명 구성을 사용해야 합니다"와 315행 "cryptographic 서명은 별도 FIT signing 구성이 필요합니다"에 대해, 191행은 "`boot.scr`은 서명·CRC가 들어가 불의의 텍스트 손상을 막아 줍니다"라고 쓰고 182행 "`uEnv.txt`는 서명 없는 평문 env"도 boot.scr에 서명이 있다는 전제로 대비한다. 8189c09b('Correct Buildroot U-Boot script guidance', 출처 없음)는 162·315행만 고쳤다. 0b676f7e는 Buildroot master Config.in.legacy·boot/uboot/Config.in·package/uboot-tools/Config.in.host와 대조했지만 범위는 boot script 옵션과 47~58행 설정 블록 심볼까지이고 env·fw_env·SPL·산출물 표는 대조 기록이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글에만 있는 것은 Buildroot 설정 심볼 표(27~43행)와 U-Boot env 값과 fw_env.config를 맞춰야 한다는 관점이다(219행, 297행 offset 불일치 사고, 252행 redundant 한 줄 사고). Source 4가지(63~91행), defconfig·fragment(93~130행), 산출물 표(136~145행), SPL 2단계(267~282행)는 매뉴얼·U-Boot 문서의 일반 설명 수준이다. 91·301·305행은 구체 기준 자리에 놓인 일반론이다. 재현 로그가 없어 6~12 구간 위쪽. |
| B | 11 | 옵션 → 소스 위치 → defconfig → 산출물 → boot.scr → env 위치 → fw_env → SPL → 함정 → 정리로 흐름은 이어진다. boot.scr 서명 여부가 162·315행과 182·191행에서 엇갈리고, 273행 다이어그램 자리에는 TODO만 있다. 예제 보드가 섞였다(51행 am335x_evm, 150~153행 MLO + sun50i-h6 dtb·Image, 174~177행 H6 booti). 295행 '다섯 가지'인데 함정은 297~307행의 여섯 개다. 141행 `SPL`과 291행 `u-boot-spl.bin`이 다르다. 열린 불확실이 있어 AP-C-24로 B ≤ 13, 결함을 반영해 11. |
| C | 7 | 설정 조각(47~58, 85~89, 119~127, 210~217행), fw_env.config 예(235~240행), fw_printenv·fw_setenv 예(256~263행)가 있다. 실행 보드·Buildroot 버전·실행 결과는 없고 예제 보드가 섞였다. 271행 'SPL 32~128 KB'·'main U-Boot 500 KB~1 MB', 322행 '30 ~ 50분짜리 재빌드'는 출처·환경 없는 수치라 C ≤ 8. 함정 절(297~307행)은 증상만 있고 확인 절차가 없다. |
| D | 11 | 비교한 글: 같은 시리즈 `chapter12-kernel-customize.md`, `chapter14-build-caching.md`, `chapter16-ota.md`, `chapter10-real-board.md`, 다른 시리즈 `bootloader/chapter13-env-bootcmd.md`, `bootloader/chapter24-spl-deep.md`, `bsp/chapter18-ota-recovery.md`. 겹침: env 위치 표(199~206행) ↔ bootloader ch13 25~32행, fw_env.config 예(235~240행) ↔ bsp ch18 86~89행·buildroot ch16 251~255행, SPL 절(267~282행) ↔ bootloader ch24 14~36행, fragment(110~130행) ↔ ch12 142~156행. Buildroot 심볼 표와 Buildroot 안 통합 절차는 다른 글에 없다(ch10 110~115행은 설정 몇 줄). |
| E | 7 | 제목 '빌드·env·fw_env 흐름'과 description의 빌드·패키징·env·fw_env.config 접근은 23~156·195~219·221~265행이 다룬다. 대상 보드·독자 수준이 없고 예제 보드가 섞여 6~8 구간. |
| F | 5 | 322행 다음 편 'Ch 14: 빌드 캐싱'은 seriesOrder 14 `chapter14-build-caching.md`와 맞고 327~330행 Ch 7·11·12·16 라벨도 맞다. 331행 'Bootloader 시리즈 Ch 18: U-Boot env in flash'는 `bootloader/chapter18-efi-in-uboot.md`(EFI 호환)로 가는 틀린 링크라 F ≤ 5다(맞는 대상은 `bootloader/chapter13-env-bootcmd.md`). 327행 Ch 7 설명 'boot.cmd, fw_env.config 배치'는 ch07 본문에서 찾지 못했다. 전제 지식 안내가 없다. |
| G | 2 | 332~333행 Buildroot Manual §17·U-Boot Documentation 링크는 문서 끝에 모은 것이라 개별 주장과 연결되지 않는다. 버전은 예시 값 U-Boot 2024.04(50·88행)뿐이고 Buildroot 릴리스·대조 시점이 없다. 0b676f7e의 대조는 커밋 본문에만 있다. |

uncertainties:
- 213행 CONFIG_SYS_MMC_ENV_PART=1('boot partition 1')과 238~239행 /dev/mmcblk0boot1의 대응(hwpart 1 = mmcblk0boot0인지)을 U-Boot 문서로 확인하지 않았다(기억에 근거한 의심).
- 227~230행 libubootenv '권장 — newer, FIT 지원', BR2_PACKAGE_UBOOT_TOOLS_FW_PRINTENV 심볼, 223행 'BusyBox의 fw_printenv/fw_setenv'는 Buildroot·BusyBox 소스로 확인하지 않았다.
- 145행 u-boot.sb를 'Freescale/NXP Vybrid'라 했는데 i.MX23/28 형식일 가능성이 있다.
- 141행 'SPL'과 291행 'u-boot-spl.bin' 중 어느 쪽이 맞는지 확인하지 않았다.
- 271행 SPL 32~128 KB는 `bootloader/chapter24-spl-deep.md` 16·22행 '32~256 KB'와 다르다(다른 글과의 차이).
- 250행 '<num-sectors> NAND에서만', 307행 'mmcblk0boot1은 보통 read-only'는 확인하지 않았다.
- `chapter16-ota.md` 249행 'Buildroot가 자동으로 /etc/fw_env.config를 만든다'와 이 글의 관계는 확인하지 않았다.
- 150~153행 ls 출력은 51행 am335x 설정으로는 나오기 어려운 조합이라 합성 예일 가능성이 있다.

병합 대상: 판정은 오류 확인 때문에 우선 조치다. 점수 구간(병합 검토)으로는 병합 대상 없음이다. BR2_TARGET_UBOOT_* 통합 절차를 다루는 다른 공개 글이 없고 ch16 257·383행이 이 글을 fw_env 정본으로 가리킨다. 다음 조치는 보강: 182·191행을 162·315행에 맞추고, 295행 개수와 331행 링크를 고치고, 예제 보드를 통일하고, env·SPL 절은 bootloader ch13·ch24로 넘기며, 271·322행 수치는 확인하거나 지운다.

### `buildroot/chapter14-build-caching.md` — 55점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log에 1차 자료 대조 커밋이 없다(0a9dd7bc slug 고정, be973200 topic 메타, fa55144d 링크 일괄 수정). 원문 안의 두 모순: (1) 15행 "셋 중 하나만 빠져도 두 번째 빌드가 다시 30분이 됩니다"(28행도 같은 취지)는 BR2_PER_PACKAGE_DIRECTORIES가 빠지면 느려진다는 주장인데, 208행 'incremental build에서 느려질 수 있음', 218행 '개인 개발 워크스테이션에서는 끄는 게 보통 더 빠릅니다', 352행 '켜면 … 실제는 느려집니다 … 꺼야 합니다', 363행 '끄는 게 더 빠릅니다'는 정반대다. (2) 144행은 컴파일러 hash가 cache key, 153행은 CCACHE_COMPILERCHECK=content라 '같은 toolchain 버전이라면' 공유된다고 하는데 302행은 '다른 toolchain을 쓴다면 ccache는 hit가 나지만'이라고 한다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 계층별 '무엇을 캐싱/언제 무효화/공유 범위' 표(34~38행), per-package를 reproducibility 도구로 규정한 절(210~218행), sstate를 넣지 않은 이유(224~235행), 변경 유형별 재빌드 범위 표(290~300행)가 이 글의 관점이다. 226~228행 sstate 이유는 출처 없는 추론이고 290~300행 시간·137행 hit rate 80% 기준은 근거가 없다. 15행 요약이 본문 결론(218·352행)과 어긋난다. 13~19 하단. |
| B | 11 | 3계층(30~42행) → dl(44~107행) → ccache(109~164행) → per-package(166~218행) → sstate(220~235행) → 측정(237~284행) → 시나리오(286~304행) → CI(306~346행) → 흔한 실수(348~356행) → 정리(358~367행)로 흐름은 완성됐다. 276행 제목 `BR2_TIME_TAR_GZ와 utilities`는 그 옵션을 설명하지 않고 279행 BR2_REPRODUCIBLE만 다룬다. 내부 모순 두 쌍이 남아 10~15 하단. |
| C | 7 | Kconfig 줄(81~85·113~118·178~180행), `ccache -s` 출력(124~135행, 85.08%로 산술은 맞음), `time make` 출력(245~251행), GitHub Actions YAML(319~342행)이 있다. 버전·보드·호스트 사양이 없고 206~207행 '10-20% 증가·2-3배', 107행 '1~5 GB', 290~300행 시간 표, 313행 '1.5~3배'는 출처 없는 수치라 C ≤ 8. 261행 awk는 저장된 로그에 현재 시각을 찍어 274행이 약속한 단계별 시간을 내지 못해 7. |
| D | 10 | 같은 시리즈 `chapter19-cicd.md`와 겹친다: 319~344행 ↔ Ch19 157~170행(actions/cache·restore-keys), 89~105행 ↔ Ch19 193~242행(dl 공유), 122~140·155~164행 ↔ Ch19 244~264행(ccache). 93~99행 `BR2_DL_DIR` 예는 `chapter04-first-build.md` 312~322행과 같고 `chapter03-kconfig.md` 106~109행은 세 옵션을 한 줄씩만 소개한다. 인접 ch13·ch15와는 겹치지 않는다. 다른 시리즈 `modern-recipes/part7-05-kernel-build.md` 156~177행, `modern-recipes/part7-14-rootfs-buildroot.md` 204~205·237행과 비교했고 per-package·hash gate·sstate 부재·재빌드 범위 표(166~235·286~300행)는 이 글에만 있다. 10~14 하단. |
| E | 7 | 제목의 dl·ccache·per-package는 44·109·166행 절이, description의 'sstate가 없는 이유'는 220~235행이 다룬다. '분석'에 비해 무효화 시점(36~38행)을 코드·매뉴얼로 추적하지 않고 276행 절 제목이 내용과 달라 9 이상은 아니다. |
| F | 5 | 371행 다음 편(Ch 15 post-build·post-image)은 seriesOrder 15와 맞고 376·378~380행 라벨도 맞다. 377행 Ch 11 링크 설명 'toolchain 결정이 ccache hit rate에 미치는 영향'인데 `chapter11-toolchain.md`에는 ccache 언급이 0건이고, 382행 '§8.14: per-package directories' 라벨은 `#top-level-parallel-build` 앵커를 가리킨다. 틀린 라벨이라 5 이하. |
| G | 2 | 매뉴얼 링크(381~382행)는 관련 항목 목록에만 있고 본문 주장(120·153·157·200행)과 연결되지 않는다. 예시 패키지 버전(51~58행)은 있지만 대상 Buildroot 릴리스와 ccache 버전이 없다. |

uncertainties:
- 116·157·160~161·355행 `BR2_CCACHE_SIZE`가 Buildroot Kconfig에 실제로 있는지 미확인(117행 BR2_CCACHE_INITIAL_SETUP로 준다는 기억은 1차 자료 미확인).
- 153행 'Buildroot가 기본으로 CCACHE_COMPILERCHECK=content를 켠다'와 144행 전제는 toolchain wrapper·ccache 문서로 미확인.
- 120행 BR2_CCACHE가 host·cross toolchain 모두의 wrapper를 바꾼다는 범위 미확인.
- 52·55·58행은 `.hash`가 dl/ 안에 있다고 그리지만 70행은 package/openssl/openssl.hash를 보여 준다. 실제 위치 미확인.
- 75행 'hash가 다르면 재다운로드'가 실패인지 재다운로드인지 미확인.
- 215행 per-package가 병렬 빌드 race를 막는다는 설명이 매뉴얼 전제와 같은 뜻인지 미확인.
- 261행 awk 의미 판단은 코드 해석이라 오류 확인에 넣지 않았다.
- 276행 `BR2_TIME_TAR_GZ`, 284행 `br2-builds`의 존재 미확인. 381~382행 §8.13·§8.14 절 번호 미확인.
- 233행 '수 분'과 297~300행 '30-50분' 사이 긴장. toolchain 재빌드 포함 여부를 글이 밝히지 않는다.
- 308행 '30분 → 5분 이하'는 313행 '1.5~3배'로는 10분 이상이 된다. dl·output 효과를 더한 수치인지 밝히지 않았다.
- 214행 '양산 빌드에 per-package 켬'과 314·366행 'CI에서는 OFF'의 관계를 정하지 않는다.
- 137행 hit rate 80% 기준과 `chapter19-cicd.md` 258·372행 '목표 50~70%'가 다르다(다른 글과의 모순).

병합 대상: 판정은 오류 확인 때문에 우선 조치다. 점수 구간 기준 병합 대상 후보는 `chapter19-cicd.md`(이 글 306~346행 CI 절이 Ch19 157~191행과 겹침). 독립 검색 의도(per-package·dl hash gate·sstate 부재·재빌드 범위)가 있으므로 합치지 않고 보강한다. CI 절은 한 단락 요약과 Ch19 링크로 줄이고, 15·302행 모순을 매뉴얼·ccache 문서로 고치며, 153행과 Ch19 263·305행의 공유 정책을 1차 자료로 정한다.

### `buildroot/chapter15-post-build-deep.md` — 52점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log에 1차 자료 대조 커밋이 없다(0a9dd7bc, be973200, e85d7684, fa55144d, ac24bb76, 393f23a8, 87bd86e2, f7714f0f). 평가 중 Buildroot 매뉴얼(manual.text, 'Buildroot 2026.08 manual generated on 2026-09-04')을 직접 받아 대조했다. (1) 52행 'BR2_ROOTFS_POST_IMAGE_SCRIPT의 공백 뒤 값이 $1'(301행도 같음) ↔ 매뉴얼 9.7 'a space-separated list of post-image scripts', 추가 인자는 BR2_ROOTFS_POST_SCRIPT_ARGS·BR2_ROOTFS_POST_IMAGE_SCRIPT_ARGS. (2) 107행 'uid/gid 숫자(이름 사용 불가)' ↔ 25장 'can be either numerical values or actual names'. (3) 105행 type `l` symlink ↔ 25장 type 목록 f·F·d·r·c·b·p. (4) 119·297·303·312행 'fakeroot 한계로 capabilities 불가 → systemd로 대체' ↔ 25장 BR2_ROOTFS_DEVICE_TABLE_SUPPORTS_EXTENDED_ATTRIBUTES와 device table의 xattr 줄로 capability 부여 가능. 내부 모순 하나: 222~226행 cfg는 두 번째 파티션을 data로 두고 rootfs.ext4를 채우는데, 255행은 이것을 A/B의 시작점이라 하면서 같은 문단에서 data 파티션을 첫 부팅 때 mkfs로 다시 만든다고 한다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 고유한 부분은 세 hook을 권한·디렉터리·시점으로 나눈 표(25~34행), fakeroot 한계 절(113~136행), post-image 서명 예(261~284행), 증상·원인·해결 표(290~301행)다. 핵심 결론 'capabilities는 fakeroot로 불가하니 systemd로'(119·297·303행)가 매뉴얼 25장의 xattr 기능과 어긋나고, 132행 '확인해야 합니다'는 완곡 표현이다. 앵커 part12-10(18)보다 낮다. |
| B | 12 | 세 hook 차이 → 환경 변수(38행) → overlay(65행) → device table(86행) → fakeroot 한계(113행) → post-image(138행) → genimage(185행) → 서명(257행) → 흔한 실수(286행) → 정리(305행)로 흐름은 끝까지 간다. 52·105·107·119행 사실 오류와 열린 불확실로 AP-C-24(B ≤ 13) 적용. 255행 A/B 설명이 222~226행 cfg와 맞지 않는다. |
| C | 6 | 스크립트·cfg 조각(56~61, 151~181, 191~244, 261~280행)은 있으나 Buildroot 버전·보드·실행 출력이 없다. 60·243·267행은 BOARD_DIR을 정의하지 않고 쓴다(174행에서만 정의, 40~50행 표에도 없음). 그대로 복사하면 동작하지 않는다(AP-C-35). 19행 '트러블 슈팅의 9할'은 출처 없는 수치라 C ≤ 8. 검증 절차가 없어 앵커 part1-04(6)와 같은 구간. |
| D | 8 | 같은 시리즈 `chapter07-board-customize.md`와 반복: hook 표(ch07 21~30행 ↔ 25~34행), overlay(ch07 33~80행 ↔ 65~84행), device table(ch07 147~163행 ↔ 86~111행), genimage(ch07 165~250행 ↔ 185~253행). 다른 시리즈 `bsp/chapter17-image-packaging.md` 138~216행 ↔ 185~253행, `modern-recipes/part7-14-rootfs-buildroot.md` 123~147·257행 ↔ 65~84행. 인접 ch14·ch16은 역할이 다르다. 고유 부분은 post-fakeroot, fakeroot 한계, 서명 절. 5~9 구간. |
| E | 7 | 제목과 description(5행)이 약속한 세 hook 차이·환경 변수·overlay 한계·system_table.txt·genimage를 17·38·65·86·185행이 다룬다. '정확한 차이'를 약속하는데 52·105·107행이 매뉴얼과 다르고 제목은 post-fakeroot를 뺐다. |
| F | 4 | 318행 다음 편(Ch 16 OTA)은 seriesOrder 16과 맞는다(Mender 6회 언급). 326행 Ch 18 라벨 '이미지 서명과 공급망…'인데 `chapter18-security-cve.md`는 pkg-stats·Reproducible Builds이고, 327행 BSP Ch 17 라벨 '…서명 흐름'인데 대상 `bsp/chapter17-image-packaging.md`에 서명이 0회다. 323~325행 라벨도 대상 현재 제목과 다르다. 328행 '§9.10: post-build…'의 9.10은 매뉴얼에서 'Quick guide to storing your project-specific customizations'다. |
| G | 2 | 본문 출처는 328행 매뉴얼 링크 하나이고 절 번호가 틀렸으며 판이 없다. genimage·mkimage·fakeroot 주장에 연결된 출처·버전이 없다. |

uncertainties:
- 대조한 매뉴얼은 2026.08판이고 글 날짜는 2026-05-19다. uid/gid 이름, POST_SCRIPT_ARGS, xattr 지원이 작성 시점 판에도 같았는지 확인하지 않았다.
- 88행 device_table_dev.txt 적용은 정적 /dev 선택 시에만 참이다(조건 누락).
- 121·136행 'post-image에서 setcap·setfiles'와 28·44·308행 'TARGET_DIR 수정 무의미'는 대상이 불분명해 설명 부족으로만 본다.
- 29·45행 'post-build 시점 BINARIES_DIR은 비어 있음'은 실제 빌드 순서와 대조하지 않았다.
- 40·309행 '환경 변수 7개': 매뉴얼 9.7 목록에는 BR2_EXTERNAL이 없고 CONFIG_DIR·BASE_DIR 등이 있다. 264행 `${BR2_EXTERNAL}` 정의 여부 미확인.
- 132행 'ext4 path는 보통 genext2fs', 80행 'overlay 소유권은 항상 root:root', 125행 'fakeroot가 xattr을 흉내냄'은 확인하지 않았다.
- `chapter07-board-customize.md` 176·330행은 BR2_ROOTFS_POST_SCRIPT_ARGS와 $1=BINARIES_DIR을 쓰는데 이 글 52행은 다른 메커니즘을 쓴다(매뉴얼상 ch07이 맞음, 다른 글과의 모순).
- 19행 '트러블 슈팅의 9할'은 출처가 없다.

병합 대상: 판정은 오류 확인 때문에 우선 조치다. 점수 구간 기준 병합 대상 후보는 `chapter07-board-customize.md`(hook 소개·overlay·device table·genimage 반복). post-fakeroot·fakeroot 한계·서명 절은 독립 검색 의도가 있으므로 매뉴얼 9.7·25장 기준으로 사실 오류 4건과 A/B cfg 모순을 먼저 고치고(보강), 겹치는 기본 설명은 ch07로 넘긴다.

### `buildroot/chapter16-ota.md` — 55점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 코드와 산문이 맞지 않는다(3-1 '코드와 글이 밝힌 동작'). 236~240행 main_boot는 BOOT_ORDER가 "A B"일 때만 slot_a, 그 밖에는 slot_b로 부팅하고, 243행 altbootcmd는 현재 값과 상관없이 늘 `setenv BOOT_ORDER "B A"`를 쓴다. 그런데 247행은 bootcount가 bootlimit을 넘으면 altbootcmd가 '반대 슬롯으로 강제 전환'한다고 적었다. 151·247행에 따라 install 뒤 "B A"인 상태에서 B가 계속 실패하면 altbootcmd는 "B A"를 다시 쓰고 B로 부팅해 A로 돌아가지 않는다. git log(f7714f0f, 87bd86e2, 393f23a8, 03ec1f08·3a5602d3, ac24bb76, fa55144d, e85d7684, be973200, 0a9dd7bc)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 결정 차원 표(27~31행)와 37행의 passive/active rollback 역할 구분, 3도구 비교 표와 선택 기준(43~56행)이 있다. 실패 사례도 구체적이다(221·227행 CPIO 첫 파일 sw-description, 361행 RTC 1970년 cert not-yet-valid, 351행 slot 크기 부족). RAUC system.conf·manifest·3단계 CA는 다른 시리즈 두 편과 형태가 같고, 351행 '18개월 뒤 820 MB'·291행 '800 MB × 2'는 출처 없는 경험 수치다. 13~19 중간. |
| B | 13 | 결정 차원(23행) → 도구 비교(39행) → RAUC(60행) → swupdate(153행) → U-Boot 협업(229행) → partition(259행) → 서명(293행) → 롤백(324행) → 흔한 실패(349행) → 정리(365행)로 이어진다. 243행 rollback 코드 결함과 열린 불확실(170~180행 ubivol·zlib, 347행 BusyBox 옵션, 254행 fw_env.config)로 AP-C-24 B ≤ 13. |
| C | 7 | BR2_ 토글(66~71·159~164행), post-image 스크립트(130~149·206~224행), genimage.cfg(274~289행), openssl CA(299~318행), systemd unit(328~343행)이 있다. Buildroot·RAUC·swupdate·U-Boot 버전과 보드가 없고 관찰 결과는 오류 문자열 두 개(358·363행)뿐이다. 263~270·291·351행 수치는 출처 없음이라 C ≤ 8. 243행 코드는 그대로 쓰면 A로 돌아가지 못해 한 단계 더 내렸다. |
| D | 7 | 같은 시리즈: `chapter15-post-build-deep.md` 147·277행은 openssl·tar 서명 bundle이라 역할 구별, `chapter17-sdk.md`는 겹치지 않음, `chapter13-uboot-integration.md` 221~262행은 249~257행과 일부 겹침. 다른 시리즈와 다섯 군데 겹침: system.conf(77~104행 ↔ `bsp/chapter18-ota-recovery.md` 약 101~130행, `bootloader/chapter20-rauc-swupdate.md` 53~84행), verity manifest(110~126행 ↔ bsp ch18 약 136~146행, bootloader ch20 93~110행), 3단계 CA(299~317행 ↔ bsp ch18 약 275~288행), sw-description(168~202행 ↔ bootloader ch20 148~200행), bootcount·mark-good(229~247·328~343행 ↔ `bootloader/chapter17-ab-update.md` 77~109·362~380행). Mender 비교(43~58행)도 bsp ch18 244~257행과 겹친다. 5~9 구간. |
| E | 7 | 제목의 'RAUC·swupdate 통합'은 60~227행이 이행한다. description(5행)은 Mender까지 통합한다고 약속하지만 58행은 Mender를 다루지 않는다고 밝히고 비교 표 한 열(43~54행)뿐이다. 나머지 약속은 259·128·229·293·324행 절이 다룬다. |
| F | 4 | 378행 다음 편 'Ch 17: SDK 생성·배포'는 seriesOrder 17과 맞다. 388행 'BSP Development Ch 14: 업데이트 시스템 설계'는 `bsp/chapter14-thermal-watchdog.md`로 간다(실제 OTA 글은 `bsp/chapter18-ota-recovery.md`). 385행 'Ch 18: 보안·CVE 관리 — secure boot, SBOM…'의 대상에는 'secure'·'서명'이 0회다. F ≤ 5. |
| G | 2 | 389~390행 RAUC·swupdate 문서 링크는 버전이 없고 주장과 연결되지 않는다. 본문 버전 표기는 126행 'RAUC 1.5+' 하나다. 비교 표(43~54행)의 라이선스·D-Bus·서명 알고리즘 칸에 출처가 없다. |

uncertainties:
- 170~180행 rootfs.ext4.gz를 `type = "ubivol"`로 적었는데 185·92·98행은 eMMC를 쓴다. swupdate 문서로 확인하지 않았다.
- 180행 .gz 파일에 `compressed = "zlib"`. swupdate 정의 미확인.
- 247행 RAUC가 mark-good 때 bootcount를 리셋한다는 설명. RAUC U-Boot 백엔드 변수(BOOT_ORDER, BOOT_x_LEFT)는 확인하지 않았다.
- 243행 altbootcmd가 bootcount를 리셋하지 않을 때 reset 뒤 다시 도는지는 U-Boot 문서로 확인하지 않았다.
- 221~227·363행 'newc만 정답' vs `bootloader/chapter20-rauc-swupdate.md` 200행 근처 `cpio -ov -H crc`(다른 글과의 차이).
- 254행 fw_env.config(`/dev/mmcblk0 0x100000 … 2`) vs `chapter13-uboot-integration.md` 237~238·250·297행(mmcblk0boot1 0xC0000, num-sectors는 NAND에서만, 0x100000은 잘못된 값의 예). 다른 글과의 모순.
- 347행 `BR2_PACKAGE_BUSYBOX_SHOW_OTHERS`로 watchdog을 켠다는 설명 미확인.
- 46·50~53행 Mender·swupdate 비교 칸 미확인.
- 361행 bundle 스크립트(143~148행)가 `--intermediate`를 넘기지 않을 때 검증 통과 여부 미확인.
- 62행 '5개 파일'과 370행 '세 파일'의 개수 차이(산문 개수 표기라 오류 확인 제외).
- 351행 820 MB 사례, 291행 800 MB × 2는 출처가 없다.

병합 대상: 판정은 오류 확인 때문에 우선 조치다. 243행 altbootcmd를 슬롯을 실제로 바꾸는 코드로 고치고(`bootloader/chapter17-ab-update.md` 88~100행 switch_slot 참고), 388·385행 라벨을 바로잡은 뒤, 세 시리즈에 반복되는 RAUC·swupdate 설명은 Buildroot 고유 부분(BR2_ 토글, post-image hook, genimage) 중심으로 줄이는 방향을 검토한다.

### `buildroot/chapter17-sdk.md` — 60점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log에 1차 자료 대조 커밋이 없다(0a9dd7bc, be973200, e85d7684, fa55144d, ac24bb76, 그 앞은 생성·발행). 글 안의 모순 네 건: (1) 139행 `export CC="${TARGET_PREFIX}-gcc --sysroot=${SYSROOT}"` vs 126~127행 `echo $CC`가 절대 경로 `/opt/sdk/.../bin/aarch64-buildroot-linux-gnu-gcc` 하나만 출력. (2) 42·101~104행 tarball을 풀면 `aarch64-buildroot-linux-gnu_sdk-buildroot/`가 생긴다 vs 347~348행은 tar 파일 이름만 바꾸고 362~363행은 `/opt/sdk/sdk-myproduct-v1.4.2/relocate-sdk.sh`를 실행한다. (3) 136행 `SYSROOT="..."`는 export 없는 셸 변수 vs 204행 `set(CMAKE_SYSROOT $ENV{SYSROOT})`는 환경 변수를 읽어 CMAKE_SYSROOT·209행 CMAKE_FIND_ROOT_PATH가 비고 216행이 경고한 host 라이브러리 혼입이 일어난다. (4) 183행 toolchain file이 'sysroot 안에' 있다 vs 190·262행 `${SDK_PATH}/share/buildroot/toolchainfile.cmake`와 42~60행 트리(share/는 SDK 최상위).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 시스템 팀·application 팀 분리 동기(19~23행), relocate 한계 세 가지(112~114행)와 설치 경로 표준화(116행), host architecture 종속(118행), Buildroot SDK·Yocto SDK·eSDK 비교와 팀 구조별 선택 기준(372~383행), 흔한 실수 6건(389~405행)이 이 글만의 관점이다. 112행 RPATH 한계는 '~경우가 있어'로 조건을 흐렸고 378행 크기 수치는 출처가 없다. 빌드 시스템 4종 예(166~257행)는 일반 cross-compile 자료 수준이다. |
| B | 13 | make sdk 산출물(27~92행) → relocate(94~118행) → environment-setup(120~160행) → 빌드 시스템 4종(162~266행) → IDE(268~337행) → 버전 배포(339~366행) → Yocto 비교(368~383행) → 흔한 실수(385~405행) → 정리(407~417행)로 이어진다. 내부 모순 네 건(127 vs 139, 363 vs 42·101~104·347, 136 vs 204, 183 vs 190행)이 열려 있어 AP-C-24로 B ≤ 13. |
| C | 7 | 명령과 예시 출력(31~37·100~106·357~364행), 생성 파일 내용(132~156·199~214·233~246행)이 있다. Buildroot 버전·defconfig·host 환경이 없고 105행 'Patched 247 files'와 378행 크기 범위는 출처 없는 수치라 C ≤ 8. 127행 출력은 139행과 맞지 않고, 363행 경로는 없으며, 204행은 export하지 않은 SYSROOT를 읽어 그대로 따라 하면 재현되지 않는다. |
| D | 12 | 같은 시리즈 인접 `chapter16-ota.md`·`chapter18-security-cve.md`는 주제가 달라 겹치지 않는다. `chapter19-cicd.md` 110~122·312~331행이 이 글 345~366행과 겹치지만 Ch19는 CI 자동화, 이 글은 수동 명명·체크섬이라 역할이 나뉜다. `chapter01-problem.md` 92행·`chapter20-yocto-migration.md` 37·74행은 make sdk와 populate_sdk를 한 줄로만 비교한다. 다른 시리즈 `modern-recipes/part3-11-make-cmake-cross.md` 101~104행의 FIND_ROOT_PATH_MODE 네 줄이 210~213행과 같지만 bare-metal이라 검색 의도가 다르다. buildroot 밖에서 populate_sdk·make sdk·environment-setup을 다루는 글은 `yocto/STORYBOARD.md`(글 아님)뿐이다. |
| E | 8 | 제목의 'SDK 생성·배포'·'make sdk'·'application 워크플로'는 27~92·339~366·162~337행이, description의 'relocatable toolchain 한계'는 110~118행이 이행한다. 대상 독자는 19~23행에 있으나 Buildroot 버전 같은 적용 범위가 없어 9 이상은 아니다. |
| F | 5 | 421행 다음 편(Ch 18 Security·CVE)은 seriesOrder 18과 맞고 426~429행 라벨도 대상과 맞다. 430행 'BSP Development Ch 7: 크로스 컴파일 toolchain'의 대상 `bsp/chapter07-tfa-trustzone.md`는 TF-A·TrustZone 글이라 틀린 라벨이다. 431행 매뉴얼 링크는 절 앵커가 없다. 전제 지식 안내가 없다. |
| G | 2 | 본문 출처는 431행 매뉴얼 링크 하나이고 버전·절 앵커가 없다. 132~156행 environment-setup, 190·225행 경로, 108·112행 patchelf 동작은 출처에 연결되지 않았다. 378행 Yocto 크기 수치도 출처가 없다. |

uncertainties:
- Buildroot 소스(support/scripts/mksdk·relocate-sdk.sh 템플릿)를 열지 않았다. 33~36행 출력 문구, 105행 'Patched 247 files', 132~156행 environment-setup의 실제 변수 목록은 미확인이다.
- 190·225·262행 `share/buildroot/toolchainfile.cmake`, `cross-compilation.conf`의 실제 경로·이름 미확인.
- 108·112행 relocate-sdk.sh의 patchelf 사용과 길이 제한 미확인.
- 116행 '사내 표준 경로로 통일하면 relocate가 사실상 no-op'은 92·96·390행과 어긋나 보인다. 빌드 자체를 그 경로에서 한다는 전제가 빠졌는지 확인 필요.
- 244행 meson cross-file `cpu = 'cortex-a72'`는 대상 SoC가 글에 없다.
- 378행 크기 범위, 431행 'Manual §8.13: make sdk' 절 번호 미확인.
- `chapter19-cicd.md` 317·330행 `sdk.tar.zst` vs 이 글 36·39행 `.tar.gz`(다른 글과의 모순).

### `buildroot/chapter18-security-cve.md` — 59점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic, e85d7684 코드 블록 산문 이동, ac24bb76 제목 변경, 03ec1f08, 그 이전 양산·발행 커밋)에 Buildroot 매뉴얼·upstream 소스와 대조한 커밋이 없다. 평가 중에도 1차 자료를 열지 않았다. 글 안에서 동시에 참일 수 없는 두 진술은 찾지 못했다(289~290행 jq 경로는 46~61행 예시 구조와 맞는다).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | pkg-stats 정확도 한계 세 가지(63~67행)와 triage yaml 예(69~79행), manifest 변환과 syft 스캔 비교·'manifest 기준이 진실, syft는 누락 검증용' 기준(138~143행), hardening 예외(217~224행), 주간 CVE diff 스크립트(278~298행)가 이 글만의 내용이다. 65·224·243행 핵심 메커니즘 주장에 출처가 없고 17~30행 4축 표·118행 규제 언급은 일반론이다. 앵커 part12-10(18)보다 얕고 part7-05(9)보다 고유 예제가 많다. |
| B | 12 | 4축 개요(17~30행) → pkg-stats(32~79행) → legal-info(81~114행) → SBOM(116~143행) → reproducible(145~190행) → hardening(192~224행) → password·서비스(226~259행) → 모니터링(261~300행) → 흔한 실수(302~316행) → 정리(318~327행). 정확성에 걸린 불확실(46~61행 JSON 형식, 169행, 224행, 243~249행)이 열려 있어 AP-C-24로 B ≤ 13. |
| C | 7 | 명령과 스크립트는 재현 가능한 형태다(36~40, 85~90, 122~134, 174~178, 184~188, 238~241, 278~298행). Buildroot 버전·실행 환경이 없고 출력은 예시뿐이다. 208~212행 비용 % 수치는 출처·환경 없음이라 C ≤ 8. 289~290행 jq는 46~61행 구조가 실제 출력인지 확인되지 않아 1점 더 뺐다. |
| D | 11 | 같은 시리즈: `chapter17-sdk.md` 421행은 안내만, `chapter19-cicd.md`는 legal-info 업로드(96·318행)·cve-check.txt(320행)만 언급, `chapter14-build-caching.md` 279행은 BR2_REPRODUCIBLE 한 줄. 다른 시리즈: `bsp/chapter20-production.md` 21행~(재현 빌드)·323행~(SBOM·라이선스)이 145~190·81~143행과 같은 질문을 다루고, `embedded-security/chapter10-sdlc.md` 198~200행이 116~143행과, `modern-recipes/part7-14-rootfs-buildroot.md` 200~203행이 BR2_REPRODUCIBLE과 겹친다. pkg-stats는 블로그 전체에서 이 글에만 나온다(grep). 10~14. |
| E | 8 | 제목(2행)의 pkg-stats·Reproducible Builds와 description(5행)의 CVE·legal info·SBOM·reproducible build를 32~79·81~114·116~143·145~190행이 다룬다. 대상 독자·Buildroot 버전·출하 조건이 없어 9 이상은 아니다. hardening·root password(192~259행)는 제목 밖이지만 과장은 아니다. |
| F | 5 | 331행 다음 편 'Ch 19: CI/CD'는 seriesOrder 19와 맞지만 Ch19가 'pkg-stats·legal-info·diffoscope 검증을 자동화'한다는 설명과 달리 `chapter19-cicd.md`에는 pkg-stats·diffoscope가 0건이다. 339행 라벨도 대상 제목('Buildroot CI/CD 구축 — Container Build와 Cache 공유')과 다르다. F ≤ 5. 336·338행은 맞고, 337행 ch16 라벨은 제목과 다르지만 대상 293·324행 절과 맞는다. 340행 '§10.3'은 매뉴얼 첫 페이지 URL이라 확인할 수 없다. |
| G | 2 | 본문 안에 주장과 연결된 1차 출처가 없고 끝의 340~341행 외부 링크 두 개뿐이다. 340행은 매뉴얼 전체 URL이고 Buildroot 릴리스 버전이 없어 169·196~200행 옵션 이름과 46~61행 출력 형식의 기준 판을 알 수 없다. |

uncertainties:
- 46~61행 pkg-stats.json 예시 구조가 실제 출력과 같은지 미확인(289~290행 jq가 전제).
- 65·310행 '버전만 보고 CVE를 보고'한다는 주장. <PKG>_IGNORE_CVES 류 선언 메커니즘이 있는지 매뉴얼로 확인하지 않았다(기억에 근거한 의심).
- 120행 SBOM 직접 출력 미내장, 127~130행 cyclonedx-buildroot 도구 이름·옵션 미확인.
- 106행 manifest.csv 헤더 열 이름 미확인.
- 169행 BR2_REPRODUCIBLE_PATH, 224·314행 BR2_PACKAGE_<NAME>_DOES_NOT_USE_PIC 존재 미확인.
- 219·222행 kernel module PIE 로드 실패, JIT W^X·PIE 충돌은 출처가 없다.
- 236·316·326행 ROOT_PASSWD가 crypt(3) 해시만 받는다는 주장 미확인.
- 243~249행 password를 비우면 'SSH key 인증만 허용'된다는 주장. 빈 값이 비밀번호 없는 root 로그인을 뜻할 수 있어 보안 권고가 반대로 작동할 수 있다. fact-check 우선 대상이다.
- 306행 BR2_GENERATE_LOCALE과 manifest license 표시의 관계는 출처가 없다.
- 208~212행 비용 수치, 340행 '§10.3' 절 번호 미확인.

병합 대상: 병합 대상 없음. pkg-stats triage(32~79행), Buildroot hardening 옵션·예외(192~224행), 주간 CVE diff(261~300행)는 `bsp/chapter20-production.md`·`embedded-security/chapter10-sdlc.md`에 없는 Buildroot 고유 검색 의도다. 다음 조치는 보강: 46~61행 형식, 169·224행 옵션, 243~249행 빈 password 동작을 매뉴얼·upstream으로 대조하고 확인 못 한 것은 지우거나 TBD로 두며, 208~212행 수치는 출처를 찾거나 지우고, SBOM·reproducible 겹침은 bsp ch20 링크로 줄이고, 331·339행 Ch19 안내를 실제 내용에 맞춘다.

### `buildroot/chapter19-cicd.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(f7714f0f, 87bd86e2, 393f23a8, 3a5602d3·03ec1f08, ac24bb76, be973200, 0a9dd7bc)에 1차 자료 대조 커밋이 없다. 평가 중 Buildroot 매뉴얼(buildroot.org/downloads/manual/manual.html)을 열었다. make sdk 절: "This generates a tarball of the content of the host directory output/host/, named <TARGET-TUPLE>_sdk-buildroot.tar.gz ... and located in the output directory output/images/." 이 글 317행 표는 SDK 산출물을 'sdk.tar.zst \| output/host/ → make sdk'로, 330행은 `aws s3 cp output/sdk.tar.zst`로 적어 그대로 실행하면 파일이 없어 실패한다. 같은 글 115행 `mv output/images/*sdk* sdk.tar.gz`는 매뉴얼과 맞아 115행과 317·330행이 동시에 참일 수 없다. 매뉴얼 §8.13은 'Top-level parallel build'이고 CI/CD 절은 없다(388행 라벨 결함, F 감점).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 128행 GitLab cache 키를 보드별로 잡는 이유, 191행 dl 키를 hashFiles('package/**/*.hash')로 잡는 근거, 233행 --size-only를 runner 사이 mtime 차이로 설명, 266~272행 ccache를 tar.zst로 묶어 S3 호출 수를 줄이는 방식, 302~308행 공유 원칙이 이 글의 판단이다. 197~201·294~298·354~360행 표는 일반론이고 258행 '50~70%', 264행 '10G가 무난', 362행 '10개 이상'은 근거 없는 경험칙이다. 13~19 하단. |
| B | 13 | base image(25~58행) → GitLab CI(60~128행) → GitHub Actions(130~191행) → dl 공유(193~242행) → ccache(244~274행) → matrix(276~308행) → 배포(310~342행) → 흔한 실수(344~362행) → 정리(364~375행)로 완결된다. 69~70행 절대 경로와 85~86행 상대 경로 cache paths가 다르고, SDK 산출물이 115·317·330행에서 세 가지이며, 128행 예(dl을 보드별 키에)와 304행 원칙('dl/ 전체 공유')이 다르다. 확인된 경로 오류를 반영해 14에서 13. |
| C | 7 | Dockerfile(29~54행), .gitlab-ci.yml(64~126행), GHA workflow(134~189행), S3 sync 스크립트(205~231행)가 있다. 19행 빌드 시간, 249~255행 ccache -s 예시, 258행 hit rate, 274행 압축 비교, 308행 600 MB, 356~358행 플랫폼 한도는 출처·환경 없음이라 C ≤ 8. 330행 명령은 실행하면 실패해 7. |
| D | 10 | 인접 `chapter18-security-cve.md`(114행 한 줄)·`chapter20-yocto-migration.md`와는 CI 내용이 겹치지 않는다. `chapter14-build-caching.md` 306행 절의 actions/cache 예(321·328행)·restore-keys가 157~169행과 같고 ch14 350행이 347행과 같은 함정이지만 ch14 346행이 'Ch 19에서 더 깊이'로 넘겨 역할은 나뉜다. `bootloader/chapter30-bootloader-ci.md`의 matrix 세 차원(74행 ↔ 292행), S3 업로드(265~276행 ↔ 323~338행), 플랫폼 비교 표(319~322행 ↔ 354~360행) 뼈대가 같다. `bsp/chapter20-production.md` 103~108·181~182행, `tools/emulation/qemu-embedded/chapter20-ci-matrix.md`(draft, 60·221~229행)와도 일부 겹친다. Buildroot dl·ccache 캐시 키 설계는 이 글만 다룬다. 10~14 하단. |
| E | 8 | 제목의 'Container Build'는 25~58행, 'Cache 공유'는 193~308행, description의 GitLab·GitHub Actions·dl·ccache 팀 공유는 60~128·130~191·193~274행이 맡는다. 과장은 없다. 대상 독자 규모·출발점이 없고 310~342행 배포는 제목 밖이라 9는 아니다. |
| F | 5 | 379행 다음 편 'Ch 20: Yocto로의 migration'은 seriesOrder 20과 맞다. 384~387행 대상은 존재하고 주제가 맞지만 라벨이 ac24bb76 이전 제목이다(384·385·387행). 388행 'Buildroot Manual §8.13: CI/CD considerations'는 없는 절을 가리키는 틀린 라벨이라 5 이하. 375행 '6가지'라고 하고 4개를 나열해 정리의 안내력이 떨어진다. |
| G | 2 | 버전 표기는 31행 ubuntu:22.04, 132·154·158·184행 actions/*@v4, 71·150행 이미지 태그 2026.02이고 Buildroot 버전은 없다. 본문에 주장과 연결된 1차 출처가 없고 유일한 388행 링크는 없는 절 라벨로 첫 페이지에 간다. |

uncertainties:
- 19행 'toolchain 30~50분 + base packages 10~20분 + image 5분 → 40분에서 한 시간': 구성 요소 합은 45~75분이다(대략 표현이라 오류 확인 제외).
- 300행 '2 × 3 × 5 = 30 job'은 294~298행 표(2·2·3)와 285~289행 matrix(보드 5개)와 대응하지 않는다.
- 128행 dl 보드별 키 vs 304행 'dl/ 전체 공유'.
- 85~86행 상대 경로 cache paths와 69~70행 절대 경로. GitLab cache가 프로젝트 밖 경로를 저장하는지 미확인.
- 128·368행 'GitLab cache는 차분만 올림' 미확인.
- 262행 'root ccache를 non-root가 읽으면 hit가 안 됨' vs 347행 '읽기는 되지만 쓰기는 안 됨, hit rate 0%'. ccache 문서로 확인하지 않았다.
- 319행 output/sbom.json 고정 경로는 매뉴얼에 사용자 리다이렉트 예로만 나온다(WebFetch 요약 기준). 336행 output/update.raucb 미확인.
- 356~358·342·348행 플랫폼 한도 수치 미확인. 274·258·308행 수치는 출처가 없다.
- `chapter14-build-caching.md` 137·362행 '80% 이상' vs 이 글 258·372행 '50~70%', ch14 153·362행 공유 vs 이 글 263·305행 보드별 분리(다른 글과의 모순).
- 375행 '6가지'인데 4개 나열, 344~352행에는 7개(개수 표기 실수).
- 매뉴얼 확인은 WebFetch 요약(인용 포함)에 기댔고 판에 따라 절 번호가 다를 수 있다.

병합 대상: 판정은 오류 확인 때문에 우선 조치다(점수 구간은 병합 검토). 317·330행 SDK 경로를 매뉴얼대로 고치고 388행 라벨을 바로잡는 것이 먼저다. ch14와 겹치는 CI 캐시 설명의 정본은 이 글로 두고 ch14 CI 절을 줄이는 방향은 수정 루프에서 참고한다.

### `buildroot/chapter20-yocto-migration.md` — 56점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(6cab6d72 달러 기호 escape, 0a9dd7bc, be973200, ac24bb76, 3a5602d3 등과 양산·발행 커밋)에 Yocto/BitBake 문서·Buildroot manual·meta-buildroot 저장소와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았다. 273행 산술(5×32=160, 110+4×8=142)은 맞고, 41·271·338행(4번째 빌드)과 277행(5번째 빌드)의 차이는 표현 차이로 볼 여지가 있어 오류 확인으로 올리지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | Buildroot↔Yocto 개념 대응 표(63~78행)와 대응이 안 되는 두 지점(80행), .mk→.bb 변환 대조(156~206행)와 변수 대응(208행), defconfig를 MACHINE conf와 image recipe로 나누는 설명(214~259행), '옮기지 말아야 할 신호'(298~307행)가 이 글만의 부분이다. 이전 신호(23~41행)는 1장 116~121·153~155행과 같은 목록이고 비용 표(49~53·283~292행)는 출처 없는 견적이다. 43·55행 같은 일반론이 섞여 13~19 하단. |
| B | 13 | 신호(19~43행) → 비용(45~57행) → 개념 매핑(59~80행) → hybrid(82~150행) → recipe 변환(152~210행) → MACHINE conf(212~259행) → 빌드·운영 비용(261~294행) → 옮기지 말 신호(296~307행) → 정리(330~340행). hybrid 패턴 2의 meta-buildroot(90~150행)는 저장소·출처가 없고 72·210행 정확성 불확실이 열려 있어 AP-C-24로 B ≤ 13. |
| C | 7 | 코드 예(113~122, 126~146, 156~206, 216~257행)는 있으나 bitbake 실행 명령·예상 출력·검증 절차가 없다. 빌드 시간 표(263~273행)는 하드웨어 환경은 적었지만 명령·로그가 없고 같은 수치가 1장 202~207행에 그대로 있어 실측 여부를 알 수 없다(경험 진위, C ≤ 12). 49~53·283~292행은 출처 없는 수치라 C ≤ 8. 187·190행 체크섬은 자리 표시 값이다. |
| D | 9 | 비교 글: 같은 시리즈 `chapter01-problem.md`, 인접 `chapter19-cicd.md`, 다른 시리즈 `bsp/chapter16-rootfs.md`. 263~269행 측정 조건·수치(32분/110분 등)가 1장 202~207행 표와 같다. 신호 1·3·4(23~37행)가 1장 116~121·153~155행과 같고, 90~150행 meta-buildroot hybrid는 1장 167행에서 이미 소개했다. 69·71행은 BSP 16장 326~338행, machine conf 예(216~237행)는 BSP 16장 242~266행과 구조가 같다. 19장은 277행 sstate 언급 외에 겹치지 않는다. 마이그레이션 절차·recipe 변환은 이 글만의 역할이라 5~9 상단. |
| E | 7 | 제목의 '언제'(19~43, 296~307행)와 '어떻게'(82~259행)를 모두 다루고 description의 'meta-buildroot 같은 hybrid 옵션'은 90~150행에 있다. meta-buildroot 실존을 본문이 출처로 보이지 않고 309~328행을 시리즈 회고가 차지해 6~8 중간. |
| F | 4 | 344~347행 관련 항목 4개는 대상 제목과 맞다. 그러나 시리즈 회고 표(313~319행)가 장 번호와 주제를 틀리게 적었다: 316행 Ch 6~10, 317행 Ch 11~15('device tree, BR2_EXTERNAL'), 318행 Ch 16~19('release branching, OTA·secure boot')가 실제 06~19장 제목과 다르다. 다른 글의 번호를 잘못 적은 경우라 5 이하. 마지막 편이라 다음 편은 없고 후속 안내(321~326행)는 Yocto '준비 중', BSP·Embedded C++ 링크 없음이다. |
| G | 2 | 출처는 끝의 매뉴얼 링크 3개(348~350행)와 323행 매뉴얼 이름뿐이고 주장에 연결되지 않는다. 버전 표기는 265행 'Buildroot 2024.02 / Yocto Scarthgap'과 121행 LAYERSERIES_COMPAT 정도다. meta-buildroot(92행) 저장소, populate_sdk_ext(37행)·FILES 분할(210행)의 문서 위치가 없다. |

uncertainties:
- 92행 등 'meta-buildroot' layer가 실제 공개된 layer인지 확인하지 않았다. 113~146행은 글이 직접 쓴 예로 보인다.
- 72행 `hostname_pn-base-files`는 옛 override 문법이고 144·205행은 새 문법을 쓴다. Scarthgap 기준 문법은 미확인.
- 210행 '/etc 아래 파일을 FILES:${PN}에 명시하지 않으면 빠진다': 기본 FILES:${PN}에 ${sysconfdir} 포함 여부 미확인.
- 263~273행 측정값은 명령·로그가 없고 1장 202~207행과 같은 수치다.
- 41·338·271행 '4번째 빌드부터'와 277행·1장 211행 '5번째 빌드부터'의 관계가 불분명하다.
- 275행 'Buildroot가 빠른 시나리오는 … single board incremental'과 269행(1 pkg 수정: 25초 vs 12초)이 맞지 않아 보인다.
- 214행 '한 줄짜리 configs/<board>_defconfig' 표현의 뜻이 불분명하다.
- 131행 `S = "${TOPDIR}/../buildroot"` 방식이 sstate·fetch 규칙과 맞는지, 194행 tag archive 디렉터리 이름 `myapp-${PV}` 미확인.
- 49~53·285~290행 수치는 출처가 없다. 349행 URL 유효성 미확인.

병합 대상: 병합 대상 후보는 `src/content/blog/embedded/buildroot/chapter01-problem.md`(이전 신호 23~41행, 측정 표 263~269행, meta-buildroot 소개가 겹침). 마이그레이션 절차·recipe 변환·MACHINE conf 분리라는 독립 검색 의도가 있어 글 전체를 합치지 않는다. 다음 조치는 보강: 263~273행 측정 표를 1장과 중복되지 않게 정리하고 명령·로그가 없으면 지우거나 TBD로 두며, meta-buildroot 실존을 1차 자료로 확인해 없으면 패턴 2를 고치거나 지우고, 313~319행 회고 표를 실제 장 제목에 맞춘다.

### `cmake/chapter01-intro.md` — 57점, 병합 검토

confidence: 중간

factcheck: 미검증. git log --follow(0a9dd7bc, 07cc1988 관련 항목 추가, be973200, ac24bb76, 400892d7·09a00a29·c99833a1·644b71b5 일괄 정리·이동, 4e81ea21 rewrite, 4c6933da 라이브러리 버전·CMake baseline 갱신, 55e250f2, d7fea249 TikZ 변환, b629631a 전면 리라이팅)에 fact-check·1차 자료 대조를 적은 커밋이 없다(4e81ea21 이전 커밋은 --follow로만 보인다). 평가 중에도 CMake 공식 문서를 열지 않았다. 원문 안에서 동시에 참일 수 없는 기술 주장은 찾지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 메타 빌드 시스템 설명(13~40행), 능력 표(48~54행), OS별 설치(81~131행), hello 프로젝트(146~241행)는 공식 Tutorial·입문서에 흔한 구성이다. 더 설명하는 부분은 cmake_minimum_required의 정책 기본값과 버전 범위 문법(183~193행), multi-config와 single-config 관행 대비(325~336행), 흔한 실수 5개(408~501행)다. 33행 '매주', 307행 '2~3배'는 근거가 없고 실패 사례·선택 기준이 없다. 6~12 위쪽. |
| B | 13 | 문제 제기(15~36행) → 설치(81~142행) → 첫 프로젝트(146~241행) → 구성·빌드(245~336행) → 구조 확장(340~404행) → 흔한 실수(408~501행) → 정리(505~514행)로 끝까지 간다. hello의 구성 로그·282행 실행 결과가 없고 316~321행 빌드 타입 플래그 표 같은 불확실이 열려 있어 AP-C-24로 B ≤ 13. 195행은 'Makefile의 첫 줄'이라 써 CMakeLists.txt와 헷갈린다. |
| C | 7 | 따라 할 수 있는 명령·파일이 있다(156~174, 274~283, 291~302행). 관찰 결과는 136~137행 버전 출력 예와 181행 에러 메시지뿐이고 빌드 로그·실행 결과·OS·컴파일러 버전이 없다. 307행 '2~3배'는 출처 없는 수치라 C ≤ 8. 4~7 상단. |
| D | 10 | 같은 시리즈: 325~336행 multi-config 설명이 `chapter02-language.md` 600~610행, `chapter04-options.md` 641~645행과 같다. 482~501행 변수 중심 vs 타겟 중심 대비가 `chapter03-targets.md` 15~35행, `chapter08-best-practices.md` 60~70행과 같고, 461~463행 빌드 타입 기본값 snippet이 chapter04 280~289·570~575행과 거의 같다. 다른 시리즈: `gnu-make/chapter01-intro.md`는 H2 뼈대가 같다(13·58·131·344·463·472·476·482행). `modern-recipes/part3-11`과 sanitizers chapter05는 주제가 갈린다. 입문 역할은 분명하지만 뒤 장과 겹치는 절이 여럿이라 10~14 하단. |
| E | 7 | 제목(2행) '설치부터 빌드까지'와 description(5행) '왜 메타 빌드 시스템이 필요한가'를 13~40·81~142·245~336행이 이행한다. 대상 독자·구체 문제가 없다. description '5줄 짜리 첫 프로젝트'와 177행 '세 줄이 전부'가 개수를 다르게 말한다(실제 167~174행은 명령 3개, 8줄). |
| F | 7 | 518행 다음 장 예고(Ch 2: CMake 언어)는 seriesOrder 2 `chapter02-language.md`(draft: false)와 맞다. 관련 항목 529행 Ch 2, 530행 Ch 3(`chapter03-targets.md`, seriesOrder 3), 531행 `gnu-make/chapter01-intro.md` 대상 파일을 열어 라벨과 내용이 맞음을 확인했다. 본문 241·369·501행도 Ch 3을 해당 개념 자리에서 가리킨다. 전제 지식 안내가 없고 렌더 확인을 하지 않아 8 이상은 아니다. |
| G | 2 | 참고 자료(522~525행)와 532행 cmake(1) 링크는 모두 cmake.org/help/latest(버전 미고정)이고 140·285·316~321·92행 주장에 연결된 인용이 없다. 버전 정보는 137행 예시 3.28.1, 167행 최소 3.20 정도다. |

uncertainties:
- 316~321행 빌드 타입 표: GCC Debug 기본 플래그가 '-O0'인지('-g'만인지) 미확인. Release·RelWithDebInfo의 '-DNDEBUG'가 표에 없고 323행 'assert 비활성화'와 연결되지 않는다. Modules/Compiler/GNU.cmake로 확인 필요.
- 140행 FetchContent FIND_PACKAGE_ARGS·presets v6가 3.25부터라는 경계 미확인. 'CMakeLists.txt 모듈 개선'의 내용을 알 수 없다.
- 92행 'Ubuntu 22.04 LTS는 3.22', 285행 '-B는 3.13+'는 1차 자료로 대조하지 않았다.
- 307행 '대형 프로젝트에서 2~3배 빠른'은 출처·측정 환경이 없다.
- 435행 'project()가 먼저 오면 위쪽 코드는 아주 옛 동작'이 실제 정책 설정 시점과 맞는지 미확인.
- 470~475행은 '변경이 반영 안 됨'을 실수로 들면서 475행에서 자동 재구성된다고 해 항목 성립이 불분명하다.
- 142행 '3.0 이전과 3.x는 완전히 다른 도구'와 185행 '2.6 시절 파일도 3.x에서 거의 그대로 돈다'가 긴장 관계다(산문 수준이라 오류 확인 제외).
- 195행 'Makefile의 첫 줄'은 CMakeLists.txt의 오기로 보인다. 5행 '5줄 짜리'와 177행 '세 줄'의 개수가 다르다.

병합 대상: 병합 대상 없음. 'CMake 소개·첫 프로젝트'는 독립 검색 의도가 있고 이 글은 목차형 허브가 아니라 입문 본문이다. 다음 조치는 보강: chapter03·04·08과 겹치는 절(325~336·461~463·482~501행)을 줄여 해당 장으로 넘기고, hello 프로젝트의 실제 구성·빌드 로그와 실행 결과를 OS·컴파일러 버전과 함께 적고, 92·140·285·316~321행 주장을 CMake 공식 문서로 대조해 출처를 달며, 307행 '2~3배'와 33행 '매주'는 출처를 찾지 못하면 지운다.

### `cmake/chapter02-language.md` — 59점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log에 1차 자료 대조 커밋이 없다(0a9dd7bc, 07cc1988, be973200, ac24bb76 등 모두 내용 대조 아님). 평가 중 로컬 CMake 4.4.4 문서를 열고 스크립트를 실행해 확인했다. (1) 714~716행 '공백이 리스트 구분자로 해석될 수 있음 … C:/Program, Files/MyApp (두 개로 분리!)' ↔ `cmake --help-manual cmake-language` Unquoted Argument·Lists 절(변수 참조 결과는 ;에서만 나뉨), `cmake -P` 결과 `iter: C:/Program Files/MyApp` 한 번만 출력. (2) 817행 `cmake_policy(SET CMP0135 NEW)   # URL_HASH 경고 끄기` ↔ `cmake --help-policy CMP0135`: URL 다운로드 추출물 타임스탬프(DOWNLOAD_EXTRACT_TIMESTAMP 기본값) 정책이며 URL_HASH와 무관. (3) 321행 'VAR이 … 또는 비어 있지 않으면 참' ↔ `cmake --help-command if`의 if(<variable>) 정의(false constant가 아닌 값), `set(V OFF)` 후 if(V)는 거짓. (4) 269행 `# IS_EQUAL = TRUE` ↔ CMake 4.4.4에서 `string(COMPARE EQUAL "abc" "abc" IS_EQUAL)` 실행 결과 `IS_EQUAL=1`.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 89~690행 대부분이 cmake-language(7)·명령 문서 항목을 순서대로 옮긴 참조형 나열이다. 이 글만의 설명은 중첩 제너레이터 식을 안쪽부터 1/0으로 푸는 절과 표(552~582행), multi-config에서 if(CMAKE_BUILD_TYPE)이 항상 거짓이 되는 이유(599~612행), 흔한 실수 절(694~777행) 정도다. 714~716행 예는 공식 문서·실행 결과와 반대이고, 731~735행 '이중 역참조가 발생할 수 있음'은 근거 없는 완곡 표현이다. 6~12 상단. |
| B | 12 | 왜 언어를 알아야 하는가(13~34행) → 기초 → 변수 → 리스트 → 문자열 → 조건문 → 함수/매크로 → 제너레이터 식 → message → 흔한 실수 → 정리(781~790행)로 완결된다. 정리 뒤에 cmake_policy 절(792~823행)이 붙어 결론 위치가 어긋나고, 변수 스코프(124~130행)에 3.25 block() 스코프가 없다. 정확성 오류가 열려 있어 AP-C-24로 13 이하. |
| C | 8 | 코드마다 예상 출력을 주석으로 단 재현 가능한 예가 많다(100~103, 179~188, 219~229, 291~293, 429~433행). 기준 CMake 버전이 없고 43행은 3.15, 794행은 3.20을 전제해 환경이 하나로 고정되지 않는다. 716행(두 개로 분리)과 269행(TRUE, 실제 1)의 예상 출력이 실행 결과와 다르다. 실측·트레이드오프 기록이 없다. 8~11 하단. |
| D | 11 | 같은 시리즈: `chapter01-intro.md` 179~195행이 정책 데이터베이스를 이미 설명하고 이 글 792~823행이 이어받아 일부 반복한다(794행이 Ch1 167행 3.20을 언급). `chapter04-options.md` 640~652행이 521~534·599~612행과 같은 예제·결론이다. `chapter03-targets.md` 400~421행, `chapter09-modern-advanced.md` 225~251행의 BUILD_INTERFACE/INSTALL_INTERFACE가 643~652행과 겹친다. 다른 시리즈: tools/build/cmake 밖에 PARENT_SCOPE·$<$<CONFIG·CMP0135·cmake_policy를 쓰는 글이 grep으로 없다. `gnu-make/chapter03-variables.md`(72~146행)는 다른 도구다. CMake 언어 문법 전반은 이 글에만 있어 10~14. |
| E | 7 | 제목 '변수·조건문·함수의 동작'과 description(5행)이 89~510행과 맞는다. '분석'은 552~612·694~777행에서 일부 이행되지만 대부분 사용법 나열이다. description에 없는 제너레이터 식(513~668행)·정책(792~823행) 비중이 크다. |
| F | 7 | 15행이 Ch1 전제를 밝히고, 827행 다음 편 'Ch 3: 타겟'은 seriesOrder 3 `chapter03-targets.md`(draft: false)와 맞다. 837~840행 관련 항목 대상(chapter01-intro, chapter03-targets, chapter04-options 189행 절, gnu-make/chapter03-variables 72행 절)의 라벨과 내용이 맞다. 정리(781행) 뒤 정책 절(792행) 구조와 모바일 확인 미실시로 9 이상은 아니다. |
| G | 3 | 참고 자료(831~833행)와 823·841행에 cmake.org 공식 매뉴얼 링크가 있으나 모두 'latest'라 기준 버전이 없고 71·817·321행 주장에 출처가 붙어 있지 않다. 정책 절(823행)만 주장과 링크가 연결된다. 2~3. |

uncertainties:
- 731~735행 '이중 역참조가 발생할 수 있음': CMake 4.4.4에서 SOME_VALUE를 비워도 if(VAR)는 참이었고 이중 역참조는 관찰되지 않았다. 완곡 표현이고 if(${VAR}) 상황을 뜻했을 수 있어 오류 근거에는 넣지 않았다.
- 515·789행 '빌드 시스템 생성 시점에 평가'와 531·771행 '빌드 시점에 평가'의 용어 불일치.
- 269행 IS_EQUAL 값은 4.4.4 실행 결과로 확인했고 3.15~3.20에서도 같은지는 실행하지 않았다.
- 43행 3.15와 794행 3.20이 섞여 예제 기준 버전이 불명확하다.
- 78행 '인자는 공백이나 세미콜론으로 구분'은 리터럴 인자에만 맞고 714~716행 오해와 같은 뿌리로 보인다.
- 387행 Clang -Weverything 권장은 근거 없는 실무 권고다.

병합 대상: 판정은 오류 확인 때문에 우선 조치다. 점수 구간(59점)만으로는 병합 검토이나 병합 대상 없음: 시리즈 안팎에서 CMake 언어 문법 전반을 다루는 글은 이 글뿐이다. 714~723·817·321·269행을 고친 뒤 기준 CMake 버전과 1차 자료를 적은 대조 커밋을 남긴다. Ch4 640~652행과 겹치는 multi-config 함정은 한쪽으로 모으는 것을 검토한다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **1차 자료 대조 커밋 없음 (10편 전부).** Buildroot ch13~20은 f7714f0f 스텁 → 87bd86e2 양산 → 393f23a8 발행 뒤 slug·topic·제목·링크 일괄 커밋뿐이다(ch13의 0b676f7e는 boot script 옵션과 47~58행 심볼까지만 대조). CMake ch01·ch02도 리라이팅·일괄 정리 커밋뿐이다. `factcheck: 검증됨`은 0편이고 7편이 오류 확인이다. Buildroot Practical과 CMake 모두 `/fact-check-round` 대상이고, Buildroot는 `data/upstream-tracking.yaml`에 항목이 없다.
- **관련 항목·다음 편 라벨이 대상 글과 다름 (Buildroot 8편 전부).** ch13 331행(→ bootloader efi-in-uboot), ch14 377행(Ch11에 ccache 없음)·382행(§8.14 라벨, parallel build 앵커), ch15 323~327행(옛 제목, Ch18·BSP Ch17에 서명 없음), ch16 385행(Ch18에 secure boot 없음)·388행(→ bsp thermal-watchdog), ch17 430행(→ bsp TF-A 글), ch18 331·339행(Ch19에 pkg-stats·diffoscope 없음), ch19 384~388행(옛 제목·없는 매뉴얼 절), ch20 313~319행(회고 표 장 번호·주제). 87bd86e2 양산 때 라벨, ac24bb76 제목 변경 뒤 미갱신, fa55144d 기계식 REMAP(같은 번호 매칭)의 흔적으로 보인다. Buildroot 8편이 모두 F ≤ 5인 원인이다.
- **1차 출처가 글 끝 링크로만 있고 기준 버전이 없음 (10편 전부, G 2~3).** buildroot ch13 332~333행, ch14 381~382행, ch15 328행, ch16 389~390행, ch17 431행, ch18 340~341행, ch19 388행, ch20 348~350행, cmake ch01 522~525·532행, ch02 831~833행. Buildroot 글에는 대상 릴리스 표기가 없고 CMake 글은 cmake.org 'latest'만 가리킨다. 매뉴얼 절 번호도 틀리거나 확인되지 않는다(ch14 381~382행, ch15 328행 §9.10, ch17 431행 §8.13, ch18 340행 §10.3, ch19 388행 §8.13).
- **출처·측정 환경 없는 구체 수치 (9편, C ≤ 8 상한 반복).** buildroot ch13 271·322행, ch14 107·206~207·290~300·308·313행, ch15 19행, ch16 263~270·291·351행, ch17 105·378행, ch18 208~212행, ch19 19·258·274·308·356~358행, ch20 49~53·263~273·283~292행, cmake ch01 33·307행.
- **그대로 따라 하면 동작하지 않는 예제 (5편).** buildroot ch14 261행 awk(저장된 로그에 현재 시각), ch15 60·243·267행 정의되지 않은 BOARD_DIR, ch16 243행 altbootcmd(슬롯을 바꾸지 않음), ch17 136·204행 export 없는 SYSROOT와 363행 없는 경로, ch19 330행 `output/sdk.tar.zst`.
- **같은 시리즈·다른 시리즈 글 사이 사실 충돌 (6편 관련).** fw_env.config 값(ch13 237~238·250·297행 vs ch16 254행), ccache hit rate 기준과 공유 정책(ch14 137·153행 vs ch19 258·263·305행), post-image 인자 전달(ch15 52·301행 vs ch07 176·330행), SDK 압축 형식(ch17 36·39행 .tar.gz vs ch19 317·330행 .tar.zst), 'Yocto가 몇 번째 빌드부터 빠른가'(ch20 41·338행 vs 277행·ch01 211행), cpio 형식(ch16 221~227행 vs bootloader ch20 200행 근처). 다른 글과의 모순이라 오류 확인에는 넣지 않았고 fact-check 라운드에서 1차 자료로 정한다.
- **같은 내용이 시리즈 안팎에서 반복 (D 감점, 7편).** ch14 CI 절 ↔ ch19, ch15 hook·overlay·genimage ↔ ch07·bsp ch17, ch16 RAUC·swupdate·bootcount ↔ bsp ch18·bootloader ch17·ch20, ch13 env·SPL ↔ bootloader ch13·ch24, ch20 신호·측정 표 ↔ ch01, cmake ch01 multi-config·타겟 중심 대비 ↔ ch02·03·04·08, cmake ch02 multi-config 함정·BUILD_INTERFACE ↔ ch04·ch03·ch09.
- **공통 H2 뼈대 (Buildroot 5편 확인, CMake·GNU Make 첫 장).** '한 줄 요약 → 본문 → 흔한 실수/실패 → 정리 → 다음 장 예고 → 관련 항목'이 ch13(13·293·309·320·325행), ch15(13·286·305·316·321행), ch16(13·349·365·376·381행), ch17(13·385·407·419·424행), ch18(13·302·318·329·334행)에 같은 순서로 있다. 87bd86e2 커밋 본문은 'Ch11 파일럿 톤·깊이를 9편에 그대로 적용'이라고 적었다. cmake ch01과 gnu-make ch01도 같은 뼈대다. 루브릭 9절 scaled content 수치 기록 대상이다.
- **산문 개수 표기 실수 (4편).** buildroot ch13 295행('다섯 가지', 실제 6개), ch16 62행 '5개 파일' vs 370행 '세 파일', ch19 375행('6가지', 4개 나열), cmake ch01 5행 '5줄' vs 177행 '세 줄'. 오류 확인 대상은 아니지만 같은 뼈대의 다른 글에서도 grep으로 확인할 가치가 있다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 7편은 확인된 오류 수 순으로 본다. buildroot ch15(5건: 매뉴얼 9.7·25장 기준 4건 + A/B cfg 모순), ch17(4건: CC 출력, relocate 경로, SYSROOT export, toolchain file 위치), cmake ch02(4건: 공백 분리, CMP0135, if(VAR), IS_EQUAL), ch14(2건: per-package 결론, ccache toolchain hit), ch13(boot.scr 서명), ch16(altbootcmd 롤백), ch19(SDK 경로). 1차 자료(Buildroot 매뉴얼·소스 태그, RAUC·U-Boot 문서, CMake 문서와 `cmake -P` 실행)를 열고 고친 뒤 출처를 적은 커밋을 남긴다.
- 같은 작업에서 Buildroot 8편의 관련 항목 라벨과 매뉴얼 절 번호를 한 번에 대조해 고친다(ch13 331행, ch14 377·382행, ch15 323~328행, ch16 385·388행, ch17 430행, ch18 331·339행, ch19 384~388행, ch20 313~319행). F 감점 원인이라 다시 채점할 때 바로 반영된다.
- 글 사이 사실 충돌 여섯 건(fw_env 값, ccache 기준, post-image 인자, SDK 형식, Yocto 역전 시점, cpio 형식)은 Buildroot Practical `/fact-check-round`에서 한 번에 정한다. Buildroot를 `data/upstream-tracking.yaml`에 등록할지는 사용자가 결정한다.
- 병합 검토 3편은 모두 보강 쪽이다. buildroot ch18은 243~249행 빈 password 동작을 먼저 확인한다(보안 권고가 반대로 작동할 수 있음). buildroot ch20은 1장과 겹치는 측정 표와 meta-buildroot 실존을 정리한다. cmake ch01은 뒤 장과 겹치는 절을 줄이고 실행 로그를 기록한다.
- 시리즈 간 중복(OTA 3시리즈, hook·genimage, CI 캐시)은 역할 분담을 종합 검토에서 정한다. 87bd86e2 양산 뼈대와 개수 표기 실수는 Buildroot ch11·ch12와 다음 루프의 CMake ch03~ 채점에서 수를 센다.
