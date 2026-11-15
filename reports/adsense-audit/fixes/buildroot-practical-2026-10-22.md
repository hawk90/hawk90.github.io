# Buildroot Practical 수정·검증 기록 — 2026-10-22

작업 시작 HEAD: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. Buildroot 20편은 작업 시작 시 `published-scores.json`의 원장 해시 및 HEAD와 일치했다. 각 `beforeSha256`는 작업 전 HEAD 본문, `stageStartSha256`는 이 루프 시작 본문, `afterSha256`는 현재 본문이다. 시작 SHA 둘은 모두 동일하다. 점수 원장과 평가 점수는 수정하지 않았다.

`remediated`는 각 글에서 기록한 특정 오류 수정 완료를 뜻하며 전편의 모든 주장에 대한 완전한 factcheck 완료를 뜻하지 않는다. Ch18은 기존 미검증 판정을 유지했다.

## 항목별 처분

### 01. `chapter01-problem.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 1편 `chapter01-problem.md`의 loop-06 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: 첫 빌드 비교표의 110/32는 약 3.44배인데 본문은 5배라고 계산했다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** 산술 재계산으로 3.4배로 고쳤고 일반 성능 법칙이 아닌 예시 측정값으로 범위를 제한했다.

- **표본 범위:** 산술 재계산으로 3.4배로 고쳤고 일반 성능 법칙이 아닌 예시 측정값으로 범위를 제한했다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: 첫 빌드 비교표의 110/32는 약 3.44배인데 본문은 5배라고 계산했다.를 바로잡았다. 호스트·설정에 따른 전체 Yocto 비교 수치는 재검증하지 않았다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. 호스트·설정에 따른 전체 Yocto 비교 수치는 재검증하지 않았다.

- **SHA-256:** before=`a6a9311109b9c4cc82c67aca6631dc69836510edc24db61015f1df8f64bf30c0`; stageStart=`a6a9311109b9c4cc82c67aca6631dc69836510edc24db61015f1df8f64bf30c0`; after=`cf6c684ff717cd3c6e95907852c109cb6f534727d8cc4cccb1c85e4eec38c21a`.

### 02. `chapter02-directory-structure.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 2편 `chapter02-directory-structure.md`의 loop-06 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: `make clean`이 target만 지운다는 설명은 host/toolchain을 포함한 실제 동작과 달랐다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** Buildroot 2026.08 매뉴얼 §8.2 clean/distclean 설명을 대조했다.

- **표본 범위:** Buildroot 2026.08 매뉴얼 §8.2 clean/distclean 설명을 대조했다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: `make clean`이 target만 지운다는 설명은 host/toolchain을 포함한 실제 동작과 달랐다.를 바로잡았다. 외부 ccache 디렉터리는 clean/distclean으로 지워지지 않는다는 조건도 남겼다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. 외부 ccache 디렉터리는 clean/distclean으로 지워지지 않는다는 조건도 남겼다.

- **SHA-256:** before=`75d8c649844d155b97da70528f87b78f91f820f30f13c33331329c93b5fbbb58`; stageStart=`75d8c649844d155b97da70528f87b78f91f820f30f13c33331329c93b5fbbb58`; after=`7628d649ca1360491275261ea4bc9a8c251fa5a6d8b7db8fe86bd644b1f720dd`.

### 03. `chapter03-kconfig.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 3편 `chapter03-kconfig.md`의 loop-07 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: 열거한 menuconfig 메뉴 개수와 Esc 동작, graph-depends 기본 출력 설명이 맞지 않았다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** 목록은 9개 핵심 범주+legacy이며 SVG 출력은 BR2_GRAPH_OUT=svg로 명시했다.

- **표본 범위:** 목록은 9개 핵심 범주+legacy이며 SVG 출력은 BR2_GRAPH_OUT=svg로 명시했다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: 열거한 menuconfig 메뉴 개수와 Esc 동작, graph-depends 기본 출력 설명이 맞지 않았다.를 바로잡았다. 실제 menuconfig를 이 macOS 환경에서 실행하지 않았다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. 실제 menuconfig를 이 macOS 환경에서 실행하지 않았다.

- **SHA-256:** before=`0426dda08b6b017b5c78447a93ff489bf1858a3030059200cf11c50c957dd6d4`; stageStart=`0426dda08b6b017b5c78447a93ff489bf1858a3030059200cf11c50c957dd6d4`; after=`5f6eec9379fa8358710c9958a2cdb2882bceb25e7d8c347d0c90533e8cd47b97`.

### 04. `chapter04-first-build.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 4편 `chapter04-first-build.md`의 loop-07 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: 2026.02 및 2024.02.x를 LTS라고 부르고 최상위 make 병렬화를 기본 지원처럼 안내했다. ext4/ext2 symlink 단정도 로그 형식과 충돌했다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** 공식 release/LTS 페이지, 2026.08 매뉴얼, 2026.08로 고정된 clone 명령을 대조해 바로잡았다.

- **표본 범위:** 공식 release/LTS 페이지, 2026.08 매뉴얼, 2026.08로 고정된 clone 명령을 대조해 바로잡았다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: 2026.02 및 2024.02.x를 LTS라고 부르고 최상위 make 병렬화를 기본 지원처럼 안내했다. ext4/ext2 symlink 단정도 로그 형식과 충돌했다.를 바로잡았다. QEMU 빌드·실행과 구성별 출력 파일은 실행하지 않았다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. QEMU 빌드·실행과 구성별 출력 파일은 실행하지 않았다.

- **SHA-256:** before=`4bba6aaef413c3695b5c2127e27183edf3f07562888ec193637cccc36d61bef4`; stageStart=`4bba6aaef413c3695b5c2127e27183edf3f07562888ec193637cccc36d61bef4`; after=`2560e4c3eaabcf6282d307b08986593b59159d4f2226c5a094ba6dac00778fed`.

### 05. `chapter05-package-system.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 5편 `chapter05-package-system.md`의 loop-07 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: Python SETUP_TYPE=pyproject는 Buildroot가 허용하는 backend 값으로 확인되지 않았으며 pinned source 검사상 오류였다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** flit 예시로 바꾸고 대상 릴리스의 pkg-python.mk 확인을 명시했다.

- **표본 범위:** flit 예시로 바꾸고 대상 릴리스의 pkg-python.mk 확인을 명시했다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: Python SETUP_TYPE=pyproject는 Buildroot가 허용하는 backend 값으로 확인되지 않았으며 pinned source 검사상 오류였다.를 바로잡았다. 2026.08 소스에서 full package build는 실행하지 않았으며 package .hash/CI 문구 등 다른 항목은 미검증이다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. 2026.08 소스에서 full package build는 실행하지 않았으며 package .hash/CI 문구 등 다른 항목은 미검증이다.

- **SHA-256:** before=`2733462ff529c48fed3be55cfee1947c6e82db4c1ca45b5c012400d0d6860fbd`; stageStart=`2733462ff529c48fed3be55cfee1947c6e82db4c1ca45b5c012400d0d6860fbd`; after=`5d2f0a434dd31d35d84330bcc268636fe27f4a9f0a23443eeab30994ee07fae5`.

### 06. `chapter06-br2-external.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 6편 `chapter06-br2-external.md`의 loop-07 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: BR2_EXTERNAL의 multi-tree 구분자를 콜론으로, 기록 파일을 .br-external.mk로, 동일 패키지 override를 일반 동작으로 적었다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** 2026.08 매뉴얼 §9.3 계열의 whitespace-separated tree와 output/.br2-external.mk 설명을 반영하고 override 보장을 제거했다.

- **표본 범위:** 2026.08 매뉴얼 §9.3 계열의 whitespace-separated tree와 output/.br2-external.mk 설명을 반영하고 override 보장을 제거했다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: BR2_EXTERNAL의 multi-tree 구분자를 콜론으로, 기록 파일을 .br-external.mk로, 동일 패키지 override를 일반 동작으로 적었다.를 바로잡았다. 두 외부 트리로 Buildroot Kconfig 실행은 하지 않았다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. 두 외부 트리로 Buildroot Kconfig 실행은 하지 않았다.

- **SHA-256:** before=`ed58519123f87598f2859a372a62cebe609942a0758f0250a0caa14275cdd261`; stageStart=`ed58519123f87598f2859a372a62cebe609942a0758f0250a0caa14275cdd261`; after=`3dbeca6f0e789dc2d71fc5a3be5eb65d57f3973afef809871213a9ce627046ee`.

### 07. `chapter07-board-customize.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 7편 `chapter07-board-customize.md`의 loop-07 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: overlay mode를 표현할 수 없다는 문장과 원본 mode 보존 문장이 상충하고, 공용 genimage.tmp를 rm -rf 했다. wall-clock date는 이미지 재현성에도 영향을 준다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** mode와 device metadata를 분리 설명하고 mktemp 기반 실행별 tmp 경로/정리 및 pinned revision 기록으로 좁혔다.

- **표본 범위:** mode와 device metadata를 분리 설명하고 mktemp 기반 실행별 tmp 경로/정리 및 pinned revision 기록으로 좁혔다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: overlay mode를 표현할 수 없다는 문장과 원본 mode 보존 문장이 상충하고, 공용 genimage.tmp를 rm -rf 했다. wall-clock date는 이미지 재현성에도 영향을 준다.를 바로잡았다. genimage 실행은 하지 않았고 overlay 최종 inode metadata는 native Linux rootfs에서 확인하지 않았다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. genimage 실행은 하지 않았고 overlay 최종 inode metadata는 native Linux rootfs에서 확인하지 않았다.

- **SHA-256:** before=`c718f0440f2d94328384f36ff9799e2389a300e09c06f9719548bcd508ae0835`; stageStart=`c718f0440f2d94328384f36ff9799e2389a300e09c06f9719548bcd508ae0835`; after=`83aaaeed5cf16b71ab6aff860efc0490f3ba5ca1ea3f1c76946497790a373eb6`.

### 08. `chapter08-filesystems.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 8편 `chapter08-filesystems.md`의 loop-07 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: raw cpio.gz를 booti에 크기 없이 넘기며, blkid 확인 실패 시 data device를 자동 mkfs해 사용자 데이터 손실을 일으킬 수 있었다. squashfs 내구성·hash 보안도 과장했다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** U-Boot booti의 addr:size를 반영하고 부팅 중 자동 포맷을 제거, RO·hash 보안 표현을 제한했다.

- **표본 범위:** U-Boot booti의 addr:size를 반영하고 부팅 중 자동 포맷을 제거, RO·hash 보안 표현을 제한했다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: raw cpio.gz를 booti에 크기 없이 넘기며, blkid 확인 실패 시 data device를 자동 mkfs해 사용자 데이터 손실을 일으킬 수 있었다. squashfs 내구성·hash 보안도 과장했다.를 바로잡았다. U-Boot 실제 부팅·저장장치/전원 차단 실험은 하지 않았다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. U-Boot 실제 부팅·저장장치/전원 차단 실험은 하지 않았다.

- **SHA-256:** before=`1eb542d218a995013916a3fc07a164d39b63b90f41644eec3ba34917922fe43e`; stageStart=`1eb542d218a995013916a3fc07a164d39b63b90f41644eec3ba34917922fe43e`; after=`bd0d1c04a6f5a20c750608ab2725487be4fb6f1ca8aa57058a5968f2af810f4f`.

### 09. `chapter09-new-package.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 9편 `chapter09-new-package.md`의 loop-07 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: package -rebuild가 extract/patch부터 다시 한다는 단계 설명은 Buildroot package infrastructure와 달랐다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** rebuild를 build/install 재실행으로 고치고 source/patch 수정은 dirclean 후 수행하도록 변경했다.

- **표본 범위:** rebuild를 build/install 재실행으로 고치고 source/patch 수정은 dirclean 후 수행하도록 변경했다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: package -rebuild가 extract/patch부터 다시 한다는 단계 설명은 Buildroot package infrastructure와 달랐다.를 바로잡았다. 가상 package의 full Buildroot 실행은 하지 않았다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. 가상 package의 full Buildroot 실행은 하지 않았다.

- **SHA-256:** before=`20c19d11693cd6d58a25494d832add30cdee8e5c35c56855bd4fc8d07883c755`; stageStart=`20c19d11693cd6d58a25494d832add30cdee8e5c35c56855bd4fc8d07883c755`; after=`2edc326e3b67313535ae963c4ce2b74c8bc658ebf87f4ed5b7842f2dd41b2455`.

### 10. `chapter10-real-board.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 10편 `chapter10-real-board.md`의 loop-07 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: 2026.02를 LTS로 부르고 예시 defconfig를 pinned source와 다르게 적었으며, 동일 rootfs.ext4를 data로 복제하고, 부팅 배선이 서로 충돌했으며 eMMC wipe를 권했다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** 2026.08 공식 beaglebone_defconfig 값과 맞추고 data.ext4를 별도 empty genimage image로 분리, serial mapping 일치, 위험한 wipe 제거, image size와 bmap 생성 순서를 보정했다.

- **표본 범위:** 2026.08 공식 beaglebone_defconfig 값과 맞추고 data.ext4를 별도 empty genimage image로 분리, serial mapping 일치, 위험한 wipe 제거, image size와 bmap 생성 순서를 보정했다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: 2026.02를 LTS로 부르고 예시 defconfig를 pinned source와 다르게 적었으며, 동일 rootfs.ext4를 data로 복제하고, 부팅 배선이 서로 충돌했으며 eMMC wipe를 권했다.를 바로잡았다. C 코드 host syntax는 컴파일했으나 Buildroot image, genimage, QEMU, BBB board는 실행하지 않았다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. C 코드 host syntax는 컴파일했으나 Buildroot image, genimage, QEMU, BBB board는 실행하지 않았다.

- **SHA-256:** before=`54d2da270444c10b6099f9f71e5935d07edad3c1441734c5a68cc00431483c1c`; stageStart=`54d2da270444c10b6099f9f71e5935d07edad3c1441734c5a68cc00431483c1c`; after=`1df09c3d33bcb1f7374f6007922cfcbacc6a06c463910dd52c5343a5749cf096`.

### 11. `chapter11-toolchain.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 11편 `chapter11-toolchain.md`의 loop-07 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: Yocto/OE SDK populated sysroot를 external toolchain으로 그대로 가져오는 흐름은 Buildroot의 supported import 범위와 맞지 않는다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** 공식 매뉴얼의 제한을 본문에 넣고 순수 toolchain만 분리했을 때 요구 조건을 확인하도록 고쳤다.

- **표본 범위:** 공식 매뉴얼의 제한을 본문에 넣고 순수 toolchain만 분리했을 때 요구 조건을 확인하도록 고쳤다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: Yocto/OE SDK populated sysroot를 external toolchain으로 그대로 가져오는 흐름은 Buildroot의 supported import 범위와 맞지 않는다.를 바로잡았다. vendor toolchain 실제 호환성과 headers/ABI 비교는 미실행·미검증이다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. vendor toolchain 실제 호환성과 headers/ABI 비교는 미실행·미검증이다.

- **SHA-256:** before=`d6e995620ef7bdbcd51b9e24df2f941e213f0c4fcba33f0c91dbcb6cfef422e2`; stageStart=`d6e995620ef7bdbcd51b9e24df2f941e213f0c4fcba33f0c91dbcb6cfef422e2`; after=`781b4673b7a929aaac5d9519b68cd9c6f79447f3077d065241a250b294f1c190`.

### 12. `chapter12-kernel-customize.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 12편 `chapter12-kernel-customize.md`의 loop-07 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: `linux-rebuild`와 target/staging reinstall을 한 단계처럼 설명하고 모듈 반영 범위를 혼동했다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** rebuild와 linux-reinstall을 분리 표기하고 image 재포장 단계와 구분했다.

- **표본 범위:** rebuild와 linux-reinstall을 분리 표기하고 image 재포장 단계와 구분했다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: `linux-rebuild`와 target/staging reinstall을 한 단계처럼 설명하고 모듈 반영 범위를 혼동했다.를 바로잡았다. kernel build와 target modules는 host에 Linux toolchain이 없어 실행하지 않았다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. kernel build와 target modules는 host에 Linux toolchain이 없어 실행하지 않았다.

- **SHA-256:** before=`03b41e4a3ce7b3b85d7e6ea0b2edaf55d0683b9d3f506d4b8b51d889731e91e3`; stageStart=`03b41e4a3ce7b3b85d7e6ea0b2edaf55d0683b9d3f506d4b8b51d889731e91e3`; after=`2034be41a8b57acbc5875b78c904104622f2bba4bedf16c60590f0f6127f2f33`.

### 13. `chapter13-uboot-integration.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 13편 `chapter13-uboot-integration.md`의 loop-08 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: U-Boot CONFIG_SYS_MMC_ENV_PART와 userspace fw_env.config가 서로 다른 eMMC boot partition을 가리켰다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** U-Boot partition index를 Linux mmcblk0boot1 예시와 맞추고, 이 대응은 보드별 hwpart numbering 검증이 전제임을 기록했다.

- **표본 범위:** U-Boot partition index를 Linux mmcblk0boot1 예시와 맞추고, 이 대응은 보드별 hwpart numbering 검증이 전제임을 기록했다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: U-Boot CONFIG_SYS_MMC_ENV_PART와 userspace fw_env.config가 서로 다른 eMMC boot partition을 가리켰다.를 바로잡았다. U-Boot build/board fw_setenv read/write는 실행하지 않았다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. U-Boot build/board fw_setenv read/write는 실행하지 않았다.

- **SHA-256:** before=`b457898fc9295dc91c0d1bffc3115b1b12785c11bb17005bee8ef50a6b253cfa`; stageStart=`b457898fc9295dc91c0d1bffc3115b1b12785c11bb17005bee8ef50a6b253cfa`; after=`49925d39b95babcc99464637b38ff5f72df69594981ff938e1b9f40a1975ad35`.

### 14. `chapter14-build-caching.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 14편 `chapter14-build-caching.md`의 loop-08 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: 설정 변경 시 Buildroot가 영향 패키지를 자동 재추적한다는 설명과 존재가 검증되지 않은 CCACHE_SIZE/INITIAL_SETUP Kconfig 키가 포함됐다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** 자동 재구성 기대를 제거하고 확인되지 않은 크기 Kconfig를 ccache --max-size 설정으로 옮겼다.

- **표본 범위:** 자동 재구성 기대를 제거하고 확인되지 않은 크기 Kconfig를 ccache --max-size 설정으로 옮겼다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: 설정 변경 시 Buildroot가 영향 패키지를 자동 재추적한다는 설명과 존재가 검증되지 않은 CCACHE_SIZE/INITIAL_SETUP Kconfig 키가 포함됐다.를 바로잡았다. CCACHE_COMPILERCHECK, hit rate·시간 견적 등 기존 수치·설명은 대조 범위 밖으로 남겼다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. CCACHE_COMPILERCHECK, hit rate·시간 견적 등 기존 수치·설명은 대조 범위 밖으로 남겼다.

- **SHA-256:** before=`30b04d2245b1f1f0fe4b611cbedfdd88d6baec144b2df28a49a1e151cda4c158`; stageStart=`30b04d2245b1f1f0fe4b611cbedfdd88d6baec144b2df28a49a1e151cda4c158`; after=`f27592d8b35c236a739234aa7b15192af7262efe6d7173e6acaf960e2b30c2e9`.

### 15. `chapter15-post-build-deep.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 15편 `chapter15-post-build-deep.md`의 loop-08 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: post-image SCRIPT 뒤에 붙인 문자열이 $1이라고 설명했고 UID/GID 이름 사용 불가, capability 처리 불가로 단정했다. genimage 예제는 BOARD_DIR 누락과 기존 디렉터리 rm -rf도 있었다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** hook 인자/환경표를 2026.08 매뉴얼에 맞추고 device table 설명을 수정, 실행별 mktemp·trap과 명시적 release ID/signing key를 적용했다.

- **표본 범위:** hook 인자/환경표를 2026.08 매뉴얼에 맞추고 device table 설명을 수정, 실행별 mktemp·trap과 명시적 release ID/signing key를 적용했다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: post-image SCRIPT 뒤에 붙인 문자열이 $1이라고 설명했고 UID/GID 이름 사용 불가, capability 처리 불가로 단정했다. genimage 예제는 BOARD_DIR 누락과 기존 디렉터리 rm -rf도 있었다.를 바로잡았다. target xattr/SELinux/device-table metadata의 최종 파일별 동작은 Linux Buildroot image에서 확인하지 않았다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. target xattr/SELinux/device-table metadata의 최종 파일별 동작은 Linux Buildroot image에서 확인하지 않았다.

- **SHA-256:** before=`0917b11655b1d0752f35847eb58be11100ca02c04c13afe1e45abefa93a00be1`; stageStart=`0917b11655b1d0752f35847eb58be11100ca02c04c13afe1e45abefa93a00be1`; after=`8c59a431bf743b9277989239ba2073ce001ea213fef2b67794680d17caa3e783`.

### 16. `chapter16-ota.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 16편 `chapter16-ota.md`의 loop-08 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: BOOT_ORDER가 A B인 경우와 B A인 경우 모두 altbootcmd가 B A로 덮어써 반대 슬롯 전환 보장이 깨졌다. fw_env.config 자동 생성도 잘못 안내했다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** altbootcmd를 현재 순서의 반대로 바꾸고 Buildroot가 보드 환경 파일을 추론하지 않는 점을 명시했다.

- **표본 범위:** altbootcmd를 현재 순서의 반대로 바꾸고 Buildroot가 보드 환경 파일을 추론하지 않는 점을 명시했다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: BOOT_ORDER가 A B인 경우와 B A인 경우 모두 altbootcmd가 B A로 덮어써 반대 슬롯 전환 보장이 깨졌다. fw_env.config 자동 생성도 잘못 안내했다.를 바로잡았다. U-Boot/RAUC 실제 상태 변수, bootlimit·mark-good 연결과 OTA 업데이트는 실행하지 않았다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. U-Boot/RAUC 실제 상태 변수, bootlimit·mark-good 연결과 OTA 업데이트는 실행하지 않았다.

- **SHA-256:** before=`85739f647d438176210c6b4358ca27fd341c0a6dcdd1042e5b63f2ec13a33587`; stageStart=`85739f647d438176210c6b4358ca27fd341c0a6dcdd1042e5b63f2ec13a33587`; after=`c2aac641bc8052fb41685802b2456f1746b3101a60b62cd15d7be3aac96d87b2`.

### 17. `chapter17-sdk.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 17편 `chapter17-sdk.md`의 loop-08 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: SDK tarball 이름만 바꿔도 내부 디렉터리명이 함께 바뀐다고 가정했고, CMake 자식 프로세스의 SYSROOT 환경 변수가 export되지 않았다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** 실제 내부 prefix 경로로 relocate-sdk.sh 호출을 정정하고 SYSROOT export를 추가했다.

- **표본 범위:** 실제 내부 prefix 경로로 relocate-sdk.sh 호출을 정정하고 SYSROOT export를 추가했다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: SDK tarball 이름만 바꿔도 내부 디렉터리명이 함께 바뀐다고 가정했고, CMake 자식 프로세스의 SYSROOT 환경 변수가 export되지 않았다.를 바로잡았다. tar rename fixture와 child env fixture는 통과했지만 Buildroot SDK 생성/컴파일은 실행하지 않았다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. tar rename fixture와 child env fixture는 통과했지만 Buildroot SDK 생성/컴파일은 실행하지 않았다.

- **SHA-256:** before=`95499fef935a8501d1881eeb1a3ece4f95535450ebbe1da703a701f550f7ccd4`; stageStart=`95499fef935a8501d1881eeb1a3ece4f95535450ebbe1da703a701f550f7ccd4`; after=`186c323e5d47a0c049fbc10778b5820849607919db500521f91e12b0c286d2c3`.

### 18. `chapter18-security-cve.md` — `unassessed`

- **발생 맥락과 범위:** 공개 Buildroot Practical 18편 `chapter18-security-cve.md`의 loop-08 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: 이전 평가 자체가 pkg-stats JSON, legal-info manifest, 재현성 옵션, hardening 등 핵심 주장 전체를 대조하지 않아 미검증 상태였다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** 기본 Dropbear blank-password 관련 이전 신규 오류는 상위 평가가 철회한 상태로 존중하되 본문 편집 없이 unassessed를 유지했다.

- **표본 범위:** 기본 Dropbear blank-password 관련 이전 신규 오류는 상위 평가가 철회한 상태로 존중하되 본문 편집 없이 unassessed를 유지했다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** unassessed: 오류를 확정할 대조 근거가 부족해 임의 수정을 보류했다. 패키지 메타데이터·SBOM·CVE 출력·hardening 전체에 대한 upstream 대조가 필요하다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. 패키지 메타데이터·SBOM·CVE 출력·hardening 전체에 대한 upstream 대조가 필요하다.

- **SHA-256:** before=`aa765ad82e1e590e33878630469369c2ddabb78a03c86072e80dbd626f45fdc8`; stageStart=`aa765ad82e1e590e33878630469369c2ddabb78a03c86072e80dbd626f45fdc8`; after=`aa765ad82e1e590e33878630469369c2ddabb78a03c86072e80dbd626f45fdc8`.

- **다음 행동/질문:** `manual-review` — Buildroot 2026.08의 pkg-stats JSON, legal-info manifest, 재현성/hardening Kconfig와 package metadata를 각 공식 source에서 확인하고 실제 fixture 출력과 대조했는가?

### 19. `chapter19-cicd.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 19편 `chapter19-cicd.md`의 loop-08 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: `make BR2_CCACHE=y`는 .config를 설정하지 않고 top-level -j도 기본 검증 경로가 아니다. make sdk artifact 경로/확장자·캐시 디렉터리 경로가 서로 맞지 않았다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** Kconfig를 .config에 반영 후 olddefconfig, 기본 make 사용, GitLab/GitHub cache path 연결, official output/images SDK tarball 경로로 고쳤다.

- **표본 범위:** Kconfig를 .config에 반영 후 olddefconfig, 기본 make 사용, GitLab/GitHub cache path 연결, official output/images SDK tarball 경로로 고쳤다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: `make BR2_CCACHE=y`는 .config를 설정하지 않고 top-level -j도 기본 검증 경로가 아니다. make sdk artifact 경로/확장자·캐시 디렉터리 경로가 서로 맞지 않았다.를 바로잡았다. CI YAML workflow 실제 runner·cache save/restore, Buildroot/sdk/image 생성은 실행하지 않았다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. CI YAML workflow 실제 runner·cache save/restore, Buildroot/sdk/image 생성은 실행하지 않았다.

- **SHA-256:** before=`8bd38bd1ab995913876f8b7d521c7b960607b754f80db92bfc8b703ca04ef55f`; stageStart=`8bd38bd1ab995913876f8b7d521c7b960607b754f80db92bfc8b703ca04ef55f`; after=`afd6a6904b5b45811dbfdd2f60a6d9f4f6ab81c2cf89b869c1bbc0e0c00d4720`.

### 20. `chapter20-yocto-migration.md` — `remediated`

- **발생 맥락과 범위:** 공개 Buildroot Practical 20편 `chapter20-yocto-migration.md`의 loop-08 평가에서 확인된 오류 및 이 라운드에서 대조한 해당 예제 범위. URL/frontmatter 유지.

- **문제 신호와 반증 조건:** 확인된 신호: 시리즈 회고의 장 범주가 실제 6~19편 순서/내용과 다르고 Buildroot/Yocto rebuild 동작을 1:1 대응처럼 보였다. 반증/한계: 수정은 이 오류 항목에 국한되며, 나머지 버전별·환경별 주장까지 맞다는 근거는 아니다.

- **원인 가설과 대안:** 원인은 실제 Buildroot/U-Boot/host 명령 계약과 예시 가정이 어긋난 것이다. 대안 원인으로는 선택 릴리스·보드 설정 차이가 있으므로 버전/보드 조건을 함께 기록했다.

- **증거:** 회고 표를 실제 장 구성으로 고치고 rebuild 대응은 목적만 비슷하고 단계/설치 동작은 다르다고 명시했다.

- **표본 범위:** 회고 표를 실제 장 구성으로 고치고 rebuild 대응은 목적만 비슷하고 단계/설치 동작은 다르다고 명시했다. 표본은 이 글의 명명된 예제와 공식 2026.08 자료 대조에 한정.

- **결정:** remediated: 시리즈 회고의 장 범주가 실제 6~19편 순서/내용과 다르고 Buildroot/Yocto rebuild 동작을 1:1 대응처럼 보였다.를 바로잡았다. Yocto task, hybrid wrapper, migration estimates와 비교 수치 전체는 이 라운드에서 upstream 검증하지 않았다.

- **최소 안전 변경과 롤백 경계:** 해당 본문 코드·문장만 최소 수정했다. URL, title, description, date, seriesOrder, draft와 점수 원장은 수정하지 않았다. 롤백 경계는 이 파일 diff이며 beforeSha256가 복구 기준이다.

- **검증과 잔여 위험:** 전용 Node 검증기는 frontmatter 불변성, named shebang block `sh -n`, Ch10 C syntax, Ch10 genimage data-image 관계, Ch8 위험 포맷 경로, Ch16 branch 조건 등을 점검했다. 별도 gate/math 결과와 전체 미실행 항목은 동반 .log에 기록했다. Yocto task, hybrid wrapper, migration estimates와 비교 수치 전체는 이 라운드에서 upstream 검증하지 않았다.

- **SHA-256:** before=`f76a6a9c853831c0c29e2e391a29b0e2a11537f70bf002d7ef8e0b3999b6cba8`; stageStart=`f76a6a9c853831c0c29e2e391a29b0e2a11537f70bf002d7ef8e0b3999b6cba8`; after=`dc65f33e0ef5fc74abee5127992f23ac8c139489e73ade22a60600797196c725`.

## 검증 해석

`node scripts/verify-buildroot-practical-examples.mjs` 통과: 20편 frontmatter slug/date/seriesOrder/draft와 HEAD 불변성, shebang 스크립트 12개 `sh -n`, Ch10 LED C 코드 host syntax, Ch10 pinned defconfig/data image 안전 관계, Ch8 initramfs 크기·자동 포맷 제거, Ch16 양방향 boot-order 조건, SDK archive rename 및 child `SYSROOT` fixture를 확인했다. 이 검증은 full Buildroot 산출물 실행을 대신하지 않는다.

`bash scripts/audit-publish-gate.sh`에 20편을 명시해 실행했고 blocking gate는 통과했다. 번역체 검사는 Ch12 soft review 후보 1건을 냈다. cited-symbol upstream 검사는 clone 부재로 `SKIPPED`(PASS 아님)였고, 검사 대상 clone은 다른 series용이었다. `node scripts/check-inline-math.mjs`는 20편 모두 통과, `git diff --check` 통과.

환경은 macOS ARM64, GNU make 3.81이다. `genimage`, `qemu-system-aarch64`, Buildroot source/build host를 사용할 수 없어 Buildroot/Linux image build, QEMU boot, BeagleBone hardware boot/flash는 실행하지 않았다. `PASS`로 표현하지 않았다.

## 1차 자료

- [Buildroot 2026.08 manual, revision d5180309b1](https://buildroot.buildroot.org/downloads/manual/manual.html) — clean/distclean, Linux host requirement, package lifecycle, BR2_EXTERNAL, hook arguments, SDK/cache/build behavior.

- [Buildroot 2026.08 `configs/beaglebone_defconfig`](https://gitlab.com/buildroot.org/buildroot/-/raw/2026.08/configs/beaglebone_defconfig) — BeagleBone kernel/toolchain/U-Boot baseline.

- [Buildroot 2026.08 `package/pkg-generic.mk`](https://gitlab.com/buildroot.org/buildroot/-/raw/2026.08/package/pkg-generic.mk) — package lifecycle source.

- [Buildroot releases and LTS status](https://buildroot.org/download.html) · [U-Boot `booti`](https://docs.u-boot.org/en/latest/usage/cmd/booti.html) · [genimage README](https://github.com/pengutronix/genimage/blob/master/README.rst).

No title/description, URL, date, draft, or seriesOrder was changed. No score ledger was changed. No commit or push was made.
