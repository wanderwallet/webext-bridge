import browser, { Manifest } from 'webextension-polyfill'
import { Endpoint, RuntimeContext } from './types'

const ENDPOINT_RE = /^((?:background$)|devtools|popup|options|content-script|window|web_accessible)(?:@(\d+)(?:\.(\d+))?)?$/

export const parseEndpoint = (endpoint: string): Endpoint => {
  const [, context, tabId, frameId] = endpoint.match(ENDPOINT_RE) || []

  return {
    context: context as RuntimeContext,
    tabId: +tabId,
    frameId: frameId ? +frameId : undefined,
  }
}

export const isInternalEndpoint = ({ context: ctx }: Endpoint): boolean => ['content-script', 'background', 'devtools', 'web_accessible'].includes(ctx)

// Return true if the `browser` object has a specific namespace
export const hasAPI = (nsps: string): boolean => browser[nsps]

export const getBackgroundPageType = () => {
  if (typeof window === 'undefined') return 'background'

  const currentUrl = new URL(window.location.href);

  try {
    if (browser.extension.getBackgroundPage?.() === window) return "background";

    // Firefox MV3 default generated background page
    if (
      currentUrl.protocol === "moz-extension:" &&
      currentUrl.pathname === "/_generated_background_page.html"
    ) {
      return "background";
    }
  } catch {}

  const manifest: Manifest.WebExtensionManifest = browser.runtime.getManifest();

  const popupPage = manifest.browser_action?.default_popup || manifest.action?.default_popup
  if (popupPage) {
    const url = new URL(browser.runtime.getURL(popupPage))
    if (url.pathname === window.location.pathname) return 'popup'
  }

  if (manifest.options_ui?.page) {
    const url = new URL(browser.runtime.getURL(manifest.options_ui.page))
    if (url.pathname === window.location.pathname) return 'options'
  }

  if (currentUrl.protocol === 'chrome-extension:' || currentUrl.protocol === 'moz-extension:') {
    const extensionId =
      currentUrl.protocol === "chrome-extension:"
        ? browser.runtime.id
        : new URL(browser.runtime.getURL("")).host;
    if (extensionId === currentUrl.host) return "web_accessible";
  }

  return 'background'
}
