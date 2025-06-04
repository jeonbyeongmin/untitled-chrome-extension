import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: [
    "https://*.tving.com/*",
    "https://*.youtube.com/*",
    "https://*.netflix.com/*",
    "https://*.wavve.com/*"
  ],
  run_at: "document_end"
}

interface AdMuteSettings {
  enabled: boolean
  muteDelay: number // 광고 시작 후 음소거까지의 지연 시간 (ms)
  sites: string[]
  showNotifications: boolean
}

class AdMuteManager {
  private settings: AdMuteSettings = {
    enabled: true,
    muteDelay: 1000,
    sites: ["tving.com", "youtube.com", "netflix.com", "wavve.com"],
    showNotifications: true
  }

  private videos: Set<HTMLVideoElement> = new Set()
  private observer: MutationObserver | null = null
  private adDetectionInterval: number | null = null
  private lastAdState = false
  private originalVolumes = new WeakMap<HTMLVideoElement, number>()

  constructor() {
    this.init()
  }

  private async init() {
    // 설정 로드
    await this.loadSettings()

    if (!this.settings.enabled) return

    // 현재 사이트가 설정된 사이트 목록에 있는지 확인
    const currentSite = window.location.hostname
    const isTargetSite = this.settings.sites.some((site) =>
      currentSite.includes(site)
    )

    if (!isTargetSite) return

    console.log("[AdMute] 광고 음소거가 활성화되었습니다:", currentSite)

    // 기존 비디오 요소들 찾기
    this.findAndObserveVideos()

    // DOM 변화 감시
    this.setupMutationObserver()

    // 광고 감지 시작
    this.startAdDetection()
  }

  private async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(["adMuteSettings"])
      if (result.adMuteSettings) {
        this.settings = { ...this.settings, ...result.adMuteSettings }
      }
    } catch (error) {
      console.log("[AdMute] 설정 로드 실패, 기본값 사용")
    }
  }

  private findAndObserveVideos() {
    const videos = document.querySelectorAll("video")
    videos.forEach((video) => this.addVideoElement(video))
  }

  private addVideoElement(video: HTMLVideoElement) {
    if (this.videos.has(video)) return

    this.videos.add(video)

    // 원본 볼륨 저장
    this.originalVolumes.set(video, video.volume)

    // 비디오 이벤트 리스너
    video.addEventListener("play", () => this.onVideoPlay(video))
    video.addEventListener("pause", () => this.onVideoPause(video))
    video.addEventListener("ended", () => this.onVideoEnd(video))

    console.log("[AdMute] 비디오 요소 감지됨:", video)
  }

  private setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element

            // 새로운 비디오 요소 찾기
            if (element.tagName === "VIDEO") {
              this.addVideoElement(element as HTMLVideoElement)
            }

            // 하위 요소에서 비디오 찾기
            const videos = element.querySelectorAll("video")
            videos.forEach((video) => this.addVideoElement(video))
          }
        })
      })
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  private startAdDetection() {
    this.adDetectionInterval = window.setInterval(() => {
      this.checkForAds()
    }, 500) // 더 빠른 감지를 위해 0.5초로 변경
  }

  private checkForAds() {
    const isAdPlaying = this.detectAd()

    if (isAdPlaying !== this.lastAdState) {
      this.lastAdState = isAdPlaying

      if (isAdPlaying) {
        console.log("[AdMute] 광고 감지됨 - 음소거 적용")
        // Background Script에 광고 감지 알림
        chrome.runtime.sendMessage({ action: "logAdDetected" }).catch(() => {
          // 에러 무시 (background script가 응답하지 않을 수 있음)
        })
        setTimeout(() => this.muteVideos(), this.settings.muteDelay)
      } else {
        console.log("[AdMute] 광고 종료됨 - 음소거 해제")
        this.unmuteVideos()
      }
    }
  }

  private detectAd(): boolean {
    // 현재 사이트에 따른 감지
    let isAd = false

    if (window.location.hostname.includes("tving.com")) {
      isAd = this.detectTvingAd()
    } else if (window.location.hostname.includes("youtube.com")) {
      isAd = this.detectYouTubeAd()
    } else if (window.location.hostname.includes("netflix.com")) {
      isAd = this.detectNetflixAd()
    } else if (window.location.hostname.includes("wavve.com")) {
      isAd = this.detectWavveAd()
    }

    // 범용 광고 감지 (모든 사이트에서 공통으로 사용)
    if (!isAd) {
      isAd = this.detectGenericAd()
    }

    return isAd
  }

  // 범용 광고 감지 로직
  private detectGenericAd(): boolean {
    // 일반적인 광고 관련 텍스트 감지
    const adTexts = [
      "광고",
      "advertisement",
      "sponsor",
      "ad",
      "commercial",
      "건너뛰기",
      "skip"
    ]
    const allText = document.body.innerText.toLowerCase()

    // 광고 관련 텍스트가 있고 비디오가 재생 중인 경우
    if (adTexts.some((text) => allText.includes(text))) {
      const videos = Array.from(this.videos)
      const hasPlayingVideo = videos.some(
        (video) => !video.paused && !video.ended
      )

      if (hasPlayingVideo) {
        // 추가 검증: 스킵 버튼이나 광고 배지가 실제로 보이는지 확인
        const skipElements = document.querySelectorAll("*")
        for (const element of Array.from(skipElements)) {
          const text = element.textContent?.toLowerCase() || ""
          const className = element.className?.toLowerCase() || ""
          const id = element.id?.toLowerCase() || ""

          if (
            (text.includes("skip") ||
              text.includes("건너뛰기") ||
              className.includes("skip") ||
              className.includes("ad") ||
              id.includes("skip") ||
              id.includes("ad")) &&
            this.isElementVisible(element)
          ) {
            return true
          }
        }
      }
    }

    return false
  }

  private detectTvingAd(): boolean {
    // TVING 광고 감지 로직
    const adSelectors = [
      ".ad-container",
      ".advertisement",
      ".ad-wrapper",
      '[class*="ad-"]',
      '[id*="ad-"]',
      ".commercial",
      ".sponsor",
      // TVING 특정 광고 관련 클래스들
      '[class*="Advertisement"]',
      '[class*="commercial"]',
      ".vod-ad-container",
      ".live-ad-container"
    ]

    // 광고 컨테이너 체크
    for (const selector of adSelectors) {
      const adElement = document.querySelector(selector)
      if (adElement && this.isElementVisible(adElement)) {
        return true
      }
    }

    // 스킵 버튼으로 광고 감지
    const skipSelectors = [
      '[class*="skip"]',
      '[class*="Skip"]',
      '[id*="skip"]',
      'button[class*="ad"]',
      ".btn-skip",
      ".skip-ad",
      // TVING 스킵 버튼
      ".ad-skip-button",
      ".skip-button"
    ]

    for (const selector of skipSelectors) {
      const skipButton = document.querySelector(selector)
      if (skipButton && this.isElementVisible(skipButton)) {
        const text = skipButton.textContent?.toLowerCase() || ""
        if (
          text.includes("skip") ||
          text.includes("건너뛰기") ||
          text.includes("광고")
        ) {
          return true
        }
      }
    }

    // 광고 텍스트 감지
    const adTextSelectors = [
      ".ad-text",
      ".ad-label",
      ".advertisement-text",
      '[class*="ad-info"]'
    ]

    for (const selector of adTextSelectors) {
      const element = document.querySelector(selector)
      if (element && this.isElementVisible(element)) {
        const text = element.textContent?.toLowerCase() || ""
        if (
          text.includes("광고") ||
          text.includes("ad") ||
          text.includes("advertisement")
        ) {
          return true
        }
      }
    }

    return false
  }

  private detectYouTubeAd(): boolean {
    // YouTube 광고 감지 - 더 정확한 방법들

    // 1. 광고 배지 확인
    const adBadges = [
      ".ytp-ad-badge",
      ".ytp-ad-text",
      ".video-ads .ad-badge",
      ".ytp-ad-player-overlay-layout"
    ]

    for (const selector of adBadges) {
      const badge = document.querySelector(selector)
      if (badge && this.isElementVisible(badge)) {
        return true
      }
    }

    // 2. 스킵 버튼 확인
    const skipButtons = [
      ".ytp-ad-skip-button",
      ".ytp-skip-ad-button",
      ".ytp-ad-skip-button-container button",
      ".videoAdUiSkipButton"
    ]

    for (const selector of skipButtons) {
      const skipButton = document.querySelector(selector)
      if (skipButton && this.isElementVisible(skipButton)) {
        return true
      }
    }

    // 3. 광고 진행 표시기 확인
    const adProgressSelectors = [".ytp-ad-progress", ".ytp-ad-progress-list"]

    for (const selector of adProgressSelectors) {
      const progress = document.querySelector(selector)
      if (progress && this.isElementVisible(progress)) {
        return true
      }
    }

    // 4. 비디오 플레이어의 광고 상태 확인
    const video = document.querySelector("video")
    if (video && video.parentElement) {
      const player = video.closest(".html5-video-player")
      if (player && player.classList.contains("ad-mode")) {
        return true
      }
    }

    // 5. URL 기반 광고 감지 (YouTube에서 광고 비디오는 특별한 URL 패턴을 가짐)
    const adVideoElements = document.querySelectorAll(
      'video[src*="googleads"], video[src*="/ads/"]'
    )
    if (adVideoElements.length > 0) {
      return Array.from(adVideoElements).some((el) =>
        this.isElementVisible(el as Element)
      )
    }

    return false
  }

  private detectNetflixAd(): boolean {
    // Netflix 광고 감지 (일부 지역에서만 광고 지원)
    const adIndicators = document.querySelectorAll(
      '[data-uia*="ad"], [class*="ad-"]'
    )
    return Array.from(adIndicators).some((el) => this.isElementVisible(el))
  }

  private detectWavveAd(): boolean {
    // Wavve 광고 감지 로직 개선
    const adSelectors = [
      ".ad-container",
      ".advertisement",
      '[class*="ad-"]',
      '[class*="Ad"]',
      '[class*="commercial"]',
      '[class*="Commercial"]',
      ".sponsor-container",
      // Wavve 특정 광고 클래스들
      ".player-ad-container",
      ".vod-ad-wrapper",
      ".live-ad-overlay"
    ]

    for (const selector of adSelectors) {
      const element = document.querySelector(selector)
      if (element && this.isElementVisible(element)) {
        return true
      }
    }

    // 스킵 버튼 감지
    const skipSelectors = [
      ".skip-btn",
      ".skip-button",
      '[class*="skip"]',
      'button[class*="ad"]',
      ".ad-skip",
      // Wavve 스킵 버튼
      ".player-skip-button",
      ".ad-skip-container button"
    ]

    for (const selector of skipSelectors) {
      const button = document.querySelector(selector)
      if (button && this.isElementVisible(button)) {
        const text = button.textContent?.toLowerCase() || ""
        if (
          text.includes("skip") ||
          text.includes("건너뛰기") ||
          text.includes("광고")
        ) {
          return true
        }
      }
    }

    // 광고 타이머나 카운트다운 감지
    const timerSelectors = [
      ".ad-timer",
      ".ad-countdown",
      '[class*="countdown"]',
      ".remaining-time"
    ]

    for (const selector of timerSelectors) {
      const timer = document.querySelector(selector)
      if (timer && this.isElementVisible(timer)) {
        return true
      }
    }

    return false
  }

  private isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect()
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      window.getComputedStyle(element).display !== "none"
    )
  }

  private muteVideos() {
    let mutedCount = 0
    this.videos.forEach((video) => {
      if (!video.muted) {
        // 현재 볼륨 저장
        this.originalVolumes.set(video, video.volume)
        video.muted = true
        mutedCount++
        console.log(`[AdMute] 비디오 음소거됨 - 원본 볼륨: ${video.volume}`)
      }
    })

    if (mutedCount > 0) {
      // 화면에 알림 표시 (선택사항)
      this.showNotification(
        "🔇 광고 음소거 활성화",
        "광고가 감지되어 자동으로 음소거되었습니다."
      )
    }
  }

  private unmuteVideos() {
    let unmutedCount = 0
    this.videos.forEach((video) => {
      if (video.muted) {
        video.muted = false
        // 원본 볼륨 복원
        const originalVolume = this.originalVolumes.get(video)
        if (originalVolume !== undefined) {
          video.volume = originalVolume
          console.log(
            `[AdMute] 비디오 음소거 해제됨 - 복원된 볼륨: ${originalVolume}`
          )
        } else {
          console.log("[AdMute] 비디오 음소거 해제됨 - 기본 볼륨 유지")
        }
        unmutedCount++
      }
    })

    if (unmutedCount > 0) {
      // 화면에 알림 표시 (선택사항)
      this.showNotification(
        "🔊 음소거 해제",
        "광고가 종료되어 음소거가 해제되었습니다."
      )
    }
  }

  // 사용자에게 알림을 표시하는 함수 (선택사항)
  private showNotification(title: string, message: string) {
    // 알림 설정이 비활성화된 경우 표시하지 않음
    if (!this.settings.showNotifications) {
      return
    }

    // 너무 많은 알림을 방지하기 위해 간단한 토스트 스타일 알림만 표시
    const notification = document.createElement("div")
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 999999;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: opacity 0.3s ease;
    `
    notification.innerHTML = `<strong>${title}</strong><br>${message}`

    document.body.appendChild(notification)

    // 3초 후 자동 제거
    setTimeout(() => {
      notification.style.opacity = "0"
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }

  private onVideoPlay(video: HTMLVideoElement) {
    console.log("[AdMute] 비디오 재생 시작")
  }

  private onVideoPause(video: HTMLVideoElement) {
    console.log("[AdMute] 비디오 일시정지")
  }

  private onVideoEnd(video: HTMLVideoElement) {
    console.log("[AdMute] 비디오 종료")
  }

  public destroy() {
    if (this.observer) {
      this.observer.disconnect()
    }

    if (this.adDetectionInterval) {
      clearInterval(this.adDetectionInterval)
    }

    // 음소거 해제
    this.unmuteVideos()

    this.videos.clear()
  }
}

// 확장 프로그램 시작
let adMuteManager: AdMuteManager | null = null

// 페이지 로드 완료 후 실행
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAdMute)
} else {
  initAdMute()
}

function initAdMute() {
  if (!adMuteManager) {
    adMuteManager = new AdMuteManager()
  }
}

// 페이지 언로드 시 정리
window.addEventListener("beforeunload", () => {
  if (adMuteManager) {
    adMuteManager.destroy()
    adMuteManager = null
  }
})

// 메시지 리스너 (팝업에서 설정 변경 시)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({ pong: true })
    return
  }

  if (request.action === "updateSettings") {
    // 설정 업데이트 후 재시작
    if (adMuteManager) {
      adMuteManager.destroy()
    }
    adMuteManager = new AdMuteManager()
    sendResponse({ success: true })
  }

  if (request.action === "getStatus") {
    sendResponse({
      enabled: adMuteManager !== null,
      site: window.location.hostname
    })
  }
})
