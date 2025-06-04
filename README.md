# 광고 음소거 (Ad Mute) Chrome 확장 프로그램

TVING, YouTube, Netflix, Wavve 등 스트리밍 서비스에서 AdGuard나 다른 광고 차단기로 차단되지 않는 광고를 자동으로 음소거하는 Chrome 확장 프로그램입니다.

## ✨ 주요 기능

- 🔇 **자동 광고 음소거**: 광고가 감지되면 자동으로 음소거하고, 광고가 끝나면 원래 볼륨으로 복원
- 🎯 **스마트 광고 감지**: 각 사이트별 맞춤형 광고 감지 로직
- ⚙️ **세밀한 설정**: 음소거 지연 시간, 사이트별 활성화/비활성화 설정
- 🌐 **다중 사이트 지원**: TVING, YouTube, Netflix, Wavve 지원
- 💾 **설정 동기화**: Chrome 계정을 통한 설정 동기화

## 🎬 지원 사이트

- **TVING** (tving.com)
- **YouTube** (youtube.com)
- **Netflix** (netflix.com)
- **Wavve** (wavve.com)

## 🚀 설치 및 사용법

### Chrome에서 확장 프로그램 설치

1. **개발 버전 설치** (개발자용):

   ```bash
   # 프로젝트 클론
   git clone <repository-url>
   cd ad-mute

   # 의존성 설치
   pnpm install

   # 개발 서버 실행
   pnpm dev
   ```

2. **Chrome에 확장 프로그램 로드**:

   - Chrome 브라우저에서 `chrome://extensions/` 접속
   - 우측 상단의 "개발자 모드" 활성화
   - "압축해제된 확장 프로그램을 로드합니다" 클릭
   - 프로젝트의 `build/chrome-mv3-dev` 폴더 선택

3. **확장 프로그램 활성화 확인**:
   - Chrome 주소 표시줄 우측에 확장 프로그램 아이콘이 나타남
   - 아이콘을 클릭하여 설정 팝업 열기

### 프로덕션 빌드 및 배포

```bash
# 프로덕션 빌드
pnpm build

# 빌드 결과물은 build/chrome-mv3-prod 폴더에 생성
```

### 첫 사용 설정

1. **확장 프로그램 아이콘 클릭** → 설정 팝업 열기
2. **기본 설정 확인**:

   - ✅ 광고 음소거 활성화: ON
   - ⏱️ 음소거 지연 시간: 1초 (조정 가능)
   - 🔔 화면 알림 표시: ON (선택사항)
   - 🌐 지원 사이트: 모두 활성화

3. **지원 사이트 방문**:

   - TVING (tving.com)
   - YouTube (youtube.com)
   - Netflix (netflix.com)
   - Wavve (wavve.com)

4. **동작 확인**:
   - 광고 재생 시 자동 음소거
   - 광고 종료 시 자동 음소거 해제
   - 우측 상단에 알림 표시 (설정 시)

## ⚙️ 사용 방법

1. 확장 프로그램을 설치한 후 Chrome 툴바의 확장 프로그램 아이콘을 클릭
2. 팝업에서 다음 설정을 조정할 수 있습니다:
   - **광고 음소거 활성화/비활성화**
   - **음소거 지연 시간** (0~3초)
   - **사이트별 활성화/비활성화**
3. 지원되는 스트리밍 사이트에서 광고가 재생되면 자동으로 음소거됩니다
4. 광고가 끝나면 원래 볼륨으로 자동 복원됩니다

## 🔧 작동 원리

### 광고 감지 방식

각 사이트별로 다음과 같은 방법으로 광고를 감지합니다:

- **TVING**: 광고 컨테이너, 스킵 버튼 등의 DOM 요소 감지
- **YouTube**: 광고 배지, 스킵 버튼 감지
- **Netflix**: 광고 관련 data-uia 속성 감지
- **Wavve**: 광고 클래스, 스킵 버튼 감지

### 음소거 처리

1. 광고 감지 시 설정된 지연 시간 후 비디오 요소를 음소거
2. 원본 볼륨 값을 저장하여 광고 종료 후 복원
3. 여러 비디오 요소가 있는 경우 모두 처리

## 📁 프로젝트 구조

```
src/
├── content.ts          # 콘텐츠 스크립트 (광고 감지 및 음소거 로직)
├── background.ts       # 백그라운드 스크립트 (설정 관리)
├── popup.tsx          # 팝업 UI (설정 화면)
└── assets/
    └── icon.png       # 확장 프로그램 아이콘
```

## 🛠 기술 스택

- **Plasmo**: Chrome 확장 프로그램 프레임워크
- **React**: 팝업 UI
- **TypeScript**: 타입 안전성
- **Chrome Extension API**: 브라우저 기능 활용

## 🔒 권한

확장 프로그램은 다음 권한을 요청합니다:

- `storage`: 사용자 설정 저장
- `activeTab`: 현재 탭 정보 접근
- `tabs`: 탭 상태 감지
- `host_permissions`: 지원 사이트에서의 스크립트 실행

## 🐛 문제 해결

### 광고가 음소거되지 않는 경우

1. 확장 프로그램이 활성화되어 있는지 확인
2. 해당 사이트가 지원 목록에 포함되어 있는지 확인
3. 브라우저 콘솔에서 오류 메시지 확인
4. 페이지를 새로고침한 후 다시 시도

### 설정이 저장되지 않는 경우

1. Chrome 동기화가 활성화되어 있는지 확인
2. 확장 프로그램을 다시 설치해보세요

## 📄 라이선스

MIT License

## 🤝 기여

버그 리포트나 기능 제안은 GitHub Issues를 통해 주시기 바랍니다.

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!
