# IT뉴스 디자인 시스템 (Design System)

이 문서는 Stitch MCP를 통해 추출한 'IT뉴스' 프로젝트의 디자인 가이드를 담고 있습니다.

## 1. 개요 & 크리에이티브 가이드 (Creative North Star)
**Neural Curator (뉴럴 큐레이터)**
본 시스템은 표준 IT 뉴스 대시보드를 "하이엔드 에디토리얼" 경험으로 변환합니다. 정형화된 그리드에서 벗어나 **의도적 비대칭**, **톤의 깊이**, **대기감이 느껴지는 글래스모피즘(Glassmorphism)**을 활용합니다.

## 2. 컬러 팔레트 (Color Palette)
다크 모드에서의 가독성과 전문적인 "딥 테크(Deep Tech)" 느낌을 강조합니다.

### 주요 색상
| 구분 | 색상 코드 | 설명 |
| :--- | :--- | :--- |
| **Primary** | `#BDC2FF` | 주요 강조색 (연보라) |
| **Primary Container** | `#1A237E` | 강조 배경색 (짙은 네이비) |
| **Secondary** | `#44DDC1` | 포인트 색상 (민트/테일) |
| **Tertiary** | `#FFB59D` | 보조 포인트 (피치) |
| **Background** | `#121414` | 기본 배경 |
| **Surface** | `#121414` | 컴포넌트 표면 |

### 표면 계층 (Surface Hierarchy)
- **Base Level:** `surface` (#121414)
- **Section Level:** `surface-container-low` (#1A1C1C) - 주요 피드 카테고리 그룹화
- **Component Level:** `surface-container` (#1E2020) - 표준 카드 배경
- **Elevated/Active:** `surface-container-high` (#282A2B) - 호버 상태 또는 강조 카드

## 3. 타이포그래피 (Typography)
기술적 정밀함과 에디토리얼의 권위를 균형 있게 유지하기 위해 두 가지 글꼴을 조합합니다.

- **헤드라인 (Manrope):** 기하학적 모더니즘.
  - `display-lg`: 3.5rem (주요 데이터 시각화 또는 하이라이트)
  - `headline-md`: 1.75rem (기사 제목 기본)
- **본문 및 UI (Inter):** 모바일 및 작은 화면에서의 가독성 극대화.
  - `body-md`: 0.875rem (표준 뉴스 요약)
  - `label-md`: 0.75rem (카테고리 태그 및 타임스탬프)

## 4. 디자인 원칙 (Directives)
- **Clear Definition Rule:** 모든 주요 섹션(사이드바, 카드, 입력창)은 명확한 경계선(`outline-variant`)을 가져야 합니다. 단순히 톤의 차이로만 구분하지 않고, 물리적인 층의 경계를 실선으로 정의합니다.
- **Glass & Elevation:** 네비게이션 바 등에는 글래스모피즘을 적용하되, 하부 레이어와의 구분을 위해 그림자(`box-shadow`)와 경계선을 적극 활용합니다.
- **Tonal Layering:** 톤의 층 위에 고유한 그림자 효과를 더해 깊이감을 물리적으로 표현합니다.
