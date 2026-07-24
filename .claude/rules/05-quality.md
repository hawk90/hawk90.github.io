## 10. 흔한 실수

다음은 자주 발생하는 실수 모음. 작성·리뷰 시 체크리스트로 활용하세요.

### 톤 관련

- [ ] 한 글 안에서 `~합니다`와 `~다`를 섞지 않았는가?
- [ ] em-dash 체인이 한 문장에 두 번 이상 들어가지 않았는가?
- [ ] 명사로 끝나는 fragment 문장이 줄줄이 이어지지 않는가?

### 구조

- [ ] H2부터 시작했는가? (H1은 frontmatter)
- [ ] "정리", "다음 장 예고", "관련 항목" 섹션이 있는가?
- [ ] 코드 예시가 규칙마다 최소 한 개씩 있는가?

### 코드 블록

- [ ] *모든* 코드 블록에 언어 태그를 붙였는가? (빈 ` ``` ` 금지)
- [ ] `shell` 대신 `bash`(실행) / `text`(트리·출력·의사코드)를 썼는가?
- [ ] 한국어 산문을 코드 블록에 *넣지 않았는가*? (산문은 markdown, 비교는 표)

### Frontmatter

- [ ] `draft`가 의도대로 설정되어 있는가?
- [ ] `series`/`seriesOrder`가 시리즈 안에서 충돌하지 않는가?
- [ ] `description`이 검색에 의미 있는 한 문장인가?

### 링크

- [ ] 내부 링크가 절대 경로(`/blog/...`)인가? 상대 경로 아닌가?
- [ ] 다음/이전 글 링크가 양방향으로 일관된가?

### 시각 자료

- [ ] ASCII 박스 다이어그램(`┌──┐`)을 결과물에 남기지 않았는가?
- [ ] **Mermaid 블록**(` ```mermaid `)을 *전혀* 쓰지 않았는가? (sequence는 `_design-sequence.tex`, state는 `_design-state.tex`, 나머지는 `_design.tex`로)
- [ ] 표·리스트로 충분한 정보를 *불필요한 그림*으로 그리지 않았는가?
- [ ] *한 챕터에 이미지가 0개*인데 추상 개념(channel·STM·NDRange·HAMT 등)이 있다면 보강 검토했는가? (§11 접근성)

### 접근성 (§11 신규)

- [ ] H2 절마다 *동기 단락*(왜 이게 문제인가)이 형식 정의 *앞*에 있는가?
- [ ] 일상 비유가 *챕터당 최소 3개* 있는가? (lock=화장실 문, channel=컨베이어, mailbox=사서함 등)
- [ ] *실 시스템 사례*가 1-2개 인용됐는가? (Redis·Kafka·WhatsApp·NVIDIA 등)
- [ ] 코드 블록 *직전 한 문장*이 *이 코드의 의도*를 말해 주는가?
- [ ] 책 시리즈라면 *책 출간 후 신기술*을 새 챕터로 끌어들이지 않았는가?

### TikZ

- [ ] `\input{../../_design.tex}` + `\begin{tikzpicture}[blog]`를 썼는가?
- [ ] 멀티라인 노드의 `\\`가 `\\[2pt]`로 명시 간격을 가졌는가?
- [ ] 색상을 `text=color` / `draw=color` 형태로 명시했는가? (옵션 자리에 색상명만 쓰면 무시)
- [ ] `(A.south west |- 0, -1.5)` 형태로 y가 두 번째에 들어갔는가?
- [ ] `python3 scripts/detect-text-overlap.py --series <X>`로 `olap` 0 확인했는가?

### Frontmatter 중복 키

- 빌드 실패의 흔한 원인 — `draft: false`와 `draft: true`가 한 frontmatter에 모두 있는 경우. YAML이 거부합니다. 한 키는 한 번만.

### Hallucination 방지 — *publish 전 자율 audit 필수*

다음 카테고리는 *기억에 의존하면 hallucinate*하기 가장 쉽습니다. 챕터 publish 전 *반드시* 자율 점검합니다.

- [ ] **Future-product SKU·spec** — *발표 전·미양산* 제품의 capacity·TOPS·세부 spec을 *단정*하지 않았는가? "*예정·발표·로드맵*" qualifier 사용.
  - 잘못된 예: "AMD MI325X 288 GB HBM3E" (실은 256 GB)
  - 잘못된 예: "NVIDIA B300 (288GB)" (미발표·단정)
- [ ] **JEDEC·DSP·IEEE·RFC 표준 번호와 revision** — *기억으로 적지 말고* 공식 spec 인용·"진행 중"·"update" qualifier 사용.
  - 잘못된 예: "HBM2E JESD235B" (실은 C), "HBM4 JESD238B" (번호 미부여)
  - 올바른 예: "JEDEC 표준화 진행", "JESD238 update"
- [ ] **Kernel API·flag·struct 이름** — *기억으로 만들지 말 것*. 정확한 이름이 안 떠오르면 *generic 설명*으로 우회 또는 *self-walker* qualifier.
  - 잘못된 예: `MHP_NID_IS_MGID` (존재 안 함)
  - 잘못된 예: `from drgn.helpers.linux.cxl import for_each_cxl_port` (모듈 없음 가능)
  - 올바른 예: "자체 walker 작성", "(개념적 — 실제는 struct walk)"
- [ ] **회사 ↔ 내부 구현 매핑** — *비공개 정보가 많음*. "현대중공업은 IgH 기반" 같은 구체 단정 금지.
  - 올바른 예: "국내 로봇·자동화 업계", "(구체 회사·라인별 채택은 공개 자료 한정)"
- [ ] **Project codename 매핑** — "Google Carbon (Carbon은 프로그래밍 언어)", "Alibaba Pangu (Pangu는 스토리지)" 같은 *이름 충돌* 흔함.
  - 올바른 예: "AMD MI300 Cluster", "Meta Memory Tiering" 같은 *검증된 매핑*만 사용
- [ ] **YAML·config schema 단정** — *특정 라이브러리의 schema*를 외워 적으면 위험. "*개념적 예시 — 실 schema는 docs 참조*" qualifier.
- [ ] **인용한 spec·표준의 *publish 연도*** — "JESD235A는 2018년" 같은 *연도 단정*은 *반드시 공식 자료 인용 또는 확인*.

핵심 원칙: *내가 100% 확신 못 하는 fact는 단정하지 않는다*. *qualifier 사용*이 *신뢰성 손실보다 작은 비용*.

---

## 11. 접근성 — 직관·비유·사례

기술 깊이가 깊을수록 *직관 설명*이 필요합니다. 책 listings·정형 증명만 늘어놓으면 *전문가용 reference*가 되어 일반 독자가 따라오지 못합니다. 본문이 *형식 정의로 시작*하면 거의 항상 보강 대상입니다.

### 절마다 들어가야 할 4가지

1. **동기 단락 (Why)** — H2 절을 시작하기 전 *3-4 문장*. *이 문제가 왜 풀려야 하는가*. 형식 정의보다 *앞*에 놓습니다.
2. **일상 비유** — 추상 개념을 *물리 세계*로 mapping. 한 챕터에 *최소 3개* 비유.
   - lock → 화장실 문 / 회의실 예약
   - channel → 컨베이어 벨트 / 사물함
   - actor mailbox → 우체국 사서함
   - STM transaction → 은행 송금 (둘 다 성공 or 둘 다 취소)
   - consensus → 위원회 만장일치
   - GPU SIMT → 수천 명 고등학생이 똑같은 문제 풂
   - HAMT 구조 공유 → 가계도 (새 가지 생겨도 다른 가계는 그대로)
3. **실 시스템 사례** — 비유로 *왜 중요*했으면, 사례로 *어디서 쓰는지*. *최소 1-2 사례*.
   - Redis lock-free ops, Kafka producer thread pool
   - WhatsApp Erlang (9명이 100M 동시 접속), Discord Elixir
   - Bitcoin GPU 채굴, NVIDIA CUDA 딥러닝
   - Twitter Lambda 시작 사례, Netflix Mantis
4. **코드 직전 한 문장** — 코드 블록 *바로 위*에 *이 코드가 무엇을 시연하는지* 1-2 문장.

### 형식 → 직관 순서

책 listings·정형 증명을 *그대로 옮기지* 않습니다. 다음 순서로 재배치합니다.

1. *직관 단락* (왜 이게 문제인가)
2. *비유* (일상으로 매핑)
3. *간단한 예* (가장 작은 case)
4. *형식 정의* (책의 정의)
5. *전체 코드/증명* (책의 listing/proof)
6. *시스템 사례* (실무 적용)

이 순서를 거꾸로(*형식 먼저*) 가는 글은 *전문가만* 읽습니다.

### 책 범위 안에서

Book-review 시리즈는 *책 챕터 1:1*로 매핑이 원칙입니다. 다음을 *지킵니다*.

- **책 출간 후 신기술 추가 금지** — 책이 *Hadoop·Storm*을 다룬다면 Spark·Flink는 *책 wrap-up에서만* 짧게 언급, 별도 챕터 *금지*.
- **외부 모델·라이브러리 추가 금지** — Paul Butcher의 7CM은 *Java·Clojure·Elixir·OpenCL* 중심이라 Go/async/Rust는 *별도 챕터로 추가하지 않습니다*.
- **깊이는 책 listings**로 — 책에 있는 Listing 1.1, 1.2 같은 코드 예제를 *충분히 풀이*. 책 밖 코드는 자제.
- **확장은 책 범위 내** — 챕터가 얇으면 *책의 Day 1/Day 2/Day 3 + Wrap-Up*을 복원하는 방식으로 보강. 책 outline 외 새 절 추가 자제.

### 검증 신호

다음 상황이 보이면 *접근성 부족* 신호입니다.

- **한 챕터에 *이미지 0개*** — 추상 개념(channel·STM·NDRange 같은)이 있는데 시각화 0개.
- **연속 H2 절이 *모두 형식 정의*로 시작** — 직관 단락이 없음.
- **`text` 블록에 ASCII 다이어그램** (`┌──┐`, `→`, `▶`) — *반드시 TikZ로 교체*.
- **`text` 블록에 *한국어 산문*이 들어가 있음** — 본문으로 빼내야 함.
- **코드 블록 *직전 문장*이 없음** — `## 예` 헤더 직후 바로 코드.
- ***시스템 사례 0개*** — 한 챕터에 실 사례 인용이 없으면 reader가 "*그래서 쓸 데가 있나*"라고 묻게 됨.

