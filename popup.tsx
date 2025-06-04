import { useEffect, useState } from "react"

interface AdMuteSettings {
  enabled: boolean
  muteDelay: number
  sites: string[]
  showNotifications: boolean
}

function IndexPopup() {
  const [settings, setSettings] = useState<AdMuteSettings>({
    enabled: true,
    muteDelay: 1000,
    sites: ["tving.com", "youtube.com", "netflix.com", "wavve.com"],
    showNotifications: true
  })
  const [currentSite, setCurrentSite] = useState<string>("")
  const [isActive, setIsActive] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    loadSettings()
    getCurrentTabInfo()
  }, [])

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get(["adMuteSettings"])
      if (result.adMuteSettings) {
        setSettings(result.adMuteSettings)
      }
      setLoading(false)
    } catch (error) {
      console.error("설정 로드 실패:", error)
      setLoading(false)
    }
  }

  const getCurrentTabInfo = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      if (tab.url) {
        const url = new URL(tab.url)
        setCurrentSite(url.hostname)

        // Content Script에 상태 요청
        chrome.tabs.sendMessage(
          tab.id!,
          { action: "getStatus" },
          (response) => {
            if (response) {
              setIsActive(response.enabled)
            }
          }
        )
      }
    } catch (error) {
      console.error("탭 정보 가져오기 실패:", error)
    }
  }

  const saveSettings = async (newSettings: AdMuteSettings) => {
    try {
      await chrome.storage.sync.set({ adMuteSettings: newSettings })
      setSettings(newSettings)

      // Content Script에 설정 업데이트 알림
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: "updateSettings" })
      }
    } catch (error) {
      console.error("설정 저장 실패:", error)
    }
  }

  const toggleEnabled = () => {
    const newSettings = { ...settings, enabled: !settings.enabled }
    saveSettings(newSettings)
  }

  const updateMuteDelay = (delay: number) => {
    const newSettings = { ...settings, muteDelay: delay }
    saveSettings(newSettings)
  }

  const toggleSite = (site: string) => {
    const newSites = settings.sites.includes(site)
      ? settings.sites.filter((s) => s !== site)
      : [...settings.sites, site]

    const newSettings = { ...settings, sites: newSites }
    saveSettings(newSettings)
  }

  const isSiteSupported = settings.sites.some((site) =>
    currentSite.includes(site)
  )

  if (loading) {
    return (
      <div style={{ padding: 16, width: 300, textAlign: "center" }}>
        <div>로딩 중...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, width: 300, fontSize: 14 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: "#333" }}>
          🔇 광고 음소거
        </h2>
      </div>

      {/* 현재 사이트 정보 */}
      <div
        style={{
          backgroundColor: isSiteSupported ? "#e8f5e8" : "#fff3cd",
          padding: 8,
          borderRadius: 4,
          marginBottom: 16,
          fontSize: 12
        }}>
        <div>
          <strong>현재 사이트:</strong> {currentSite}
        </div>
        <div style={{ color: isSiteSupported ? "#155724" : "#856404" }}>
          {isSiteSupported ? "✓ 지원됨" : "⚠ 지원되지 않음"}
        </div>
      </div>

      {/* 활성화/비활성화 토글 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          padding: 8,
          backgroundColor: "#f8f9fa",
          borderRadius: 4
        }}>
        <span>광고 음소거 활성화</span>
        <label
          style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={toggleEnabled}
            style={{ marginRight: 8 }}
          />
          <span style={{ color: settings.enabled ? "#28a745" : "#6c757d" }}>
            {settings.enabled ? "ON" : "OFF"}
          </span>
        </label>
      </div>

      {/* 알림 표시 설정 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          padding: 8,
          backgroundColor: "#f8f9fa",
          borderRadius: 4
        }}>
        <span>화면 알림 표시</span>
        <label
          style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={settings.showNotifications}
            onChange={(e) => {
              const newSettings = {
                ...settings,
                showNotifications: e.target.checked
              }
              saveSettings(newSettings)
            }}
            style={{ marginRight: 8 }}
          />
          <span
            style={{
              color: settings.showNotifications ? "#28a745" : "#6c757d"
            }}>
            {settings.showNotifications ? "ON" : "OFF"}
          </span>
        </label>
      </div>

      {/* 음소거 지연 시간 설정 */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
          음소거 지연 시간: {settings.muteDelay}ms
        </label>
        <input
          type="range"
          min="0"
          max="3000"
          step="100"
          value={settings.muteDelay}
          onChange={(e) => updateMuteDelay(Number(e.target.value))}
          style={{ width: "100%" }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: "#666"
          }}>
          <span>즉시</span>
          <span>3초</span>
        </div>
      </div>

      {/* 지원 사이트 목록 */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: "bold" }}>
          지원 사이트
        </h3>
        {["tving.com", "youtube.com", "netflix.com", "wavve.com"].map(
          (site) => (
            <label
              key={site}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 4,
                cursor: "pointer"
              }}>
              <input
                type="checkbox"
                checked={settings.sites.includes(site)}
                onChange={() => toggleSite(site)}
                style={{ marginRight: 8 }}
              />
              <span
                style={{
                  color: settings.sites.includes(site) ? "#333" : "#999",
                  textDecoration: settings.sites.includes(site)
                    ? "none"
                    : "line-through"
                }}>
                {site}
              </span>
            </label>
          )
        )}
      </div>

      {/* 상태 표시 */}
      {settings.enabled && (
        <div
          style={{
            fontSize: 12,
            color: "#666",
            textAlign: "center",
            padding: 8,
            backgroundColor: "#f8f9fa",
            borderRadius: 4
          }}>
          {isSiteSupported ? "🟢 광고 감지 중..." : "⚪ 지원되지 않는 사이트"}
        </div>
      )}

      {/* 도움말 */}
      <div
        style={{
          fontSize: 11,
          color: "#999",
          marginTop: 16,
          padding: 8,
          backgroundColor: "#f8f9fa",
          borderRadius: 4
        }}>
        <strong>사용법:</strong>
        <br />
        • 지원 사이트에서 광고가 감지되면 자동으로 음소거됩니다
        <br />
        • 광고가 끝나면 음소거가 자동으로 해제됩니다
        <br />• 설정은 모든 탭에 실시간으로 적용됩니다
      </div>
    </div>
  )
}

export default IndexPopup
