// Background script for Ad Mute extension

// 확장 프로그램 설치/업데이트 시 초기 설정
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[AdMute Background] 확장 프로그램이 설치되었습니다")

  // 기본 설정 저장
  const defaultSettings = {
    enabled: true,
    muteDelay: 1000,
    sites: ["tving.com", "youtube.com", "netflix.com", "wavve.com"],
    showNotifications: true
  }

  try {
    const result = await chrome.storage.sync.get(["adMuteSettings"])
    if (!result.adMuteSettings) {
      await chrome.storage.sync.set({ adMuteSettings: defaultSettings })
      console.log("[AdMute Background] 기본 설정이 저장되었습니다")
    }
  } catch (error) {
    console.error("[AdMute Background] 설정 저장 실패:", error)
  }
})

// 탭 업데이트 감지 (URL 변경 등)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 페이지 로딩이 완료되고 URL이 있는 경우
  if (changeInfo.status === "complete" && tab.url) {
    const url = new URL(tab.url)
    const hostname = url.hostname

    // 지원 사이트인지 확인
    const supportedSites = [
      "tving.com",
      "youtube.com",
      "netflix.com",
      "wavve.com"
    ]
    const isSupported = supportedSites.some((site) => hostname.includes(site))

    if (isSupported) {
      console.log(`[AdMute Background] 지원 사이트 감지됨: ${hostname}`)

      // Content script가 이미 주입되어 있는지 확인하고 메시지 전송
      chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script가 아직 로드되지 않았으면 무시
          console.log("[AdMute Background] Content script가 아직 로드되지 않음")
        } else if (response && response.pong) {
          console.log("[AdMute Background] Content script 활성 상태 확인됨")
        }
      })
    }
  }
})

// 메시지 처리
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSettings") {
    // 설정 조회
    chrome.storage.sync
      .get(["adMuteSettings"])
      .then((result) => {
        sendResponse(result.adMuteSettings || {})
      })
      .catch((error) => {
        console.error("[AdMute Background] 설정 조회 실패:", error)
        sendResponse({})
      })
    return true // 비동기 응답을 위해 true 반환
  }

  if (request.action === "saveSettings") {
    // 설정 저장
    chrome.storage.sync
      .set({ adMuteSettings: request.settings })
      .then(() => {
        console.log("[AdMute Background] 설정이 저장되었습니다")
        sendResponse({ success: true })

        // 모든 탭에 설정 업데이트 알림
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.id && tab.url) {
              chrome.tabs.sendMessage(
                tab.id,
                { action: "updateSettings" },
                () => {
                  // 에러 무시 (content script가 없는 탭)
                  if (chrome.runtime.lastError) {
                    // 무시
                  }
                }
              )
            }
          })
        })
      })
      .catch((error) => {
        console.error("[AdMute Background] 설정 저장 실패:", error)
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  if (request.action === "logAdDetected") {
    // 광고 감지 로그
    console.log(`[AdMute Background] 광고 감지됨 - 사이트: ${sender.tab?.url}`)

    // 필요시 통계 수집이나 다른 작업 수행
    chrome.storage.local.get(["adDetectionStats"]).then((result) => {
      const stats = result.adDetectionStats || { count: 0, lastDetected: null }
      stats.count += 1
      stats.lastDetected = new Date().toISOString()

      chrome.storage.local.set({ adDetectionStats: stats })
    })
  }
})

// 확장 프로그램 아이콘 클릭 시 팝업 열기
chrome.action.onClicked.addListener((tab) => {
  // 팝업이 설정되어 있으면 자동으로 열림
  console.log("[AdMute Background] 확장 프로그램 아이콘 클릭됨")
})

// 저장소 변경 감지
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.adMuteSettings) {
    console.log(
      "[AdMute Background] 설정이 변경되었습니다:",
      changes.adMuteSettings
    )
  }
})

console.log("[AdMute Background] Background script가 시작되었습니다")
