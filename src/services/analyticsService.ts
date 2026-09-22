import { Platform } from 'react-native';
import { KioskProduct, KioskCategory } from '../types/kiosk';
import { getDeviceMacAddress } from '../utils/deviceInfo';
import { getSavedServerUrl, getStoredKioskToken } from './api';

export type InteractionType =
  | 'CLICK'
  | 'VIEW_DETAIL'
  | 'SPEC_TAB_CLICK'
  | 'BROCHURE_VIEW'
  | 'WHITEBOARD_OPEN'
  | 'SEARCH_SELECT'
  | 'CATEGORY_CLICK';

export interface TelemetryEvent {
  event_type: InteractionType;
  product_id?: string;
  session_id?: string;
  duration_seconds?: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface SessionData {
  session_id: string;
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  total_clicks: number;
  products_viewed_count: number;
  metadata?: Record<string, any>;
}

class AnalyticsService {
  private eventQueue: TelemetryEvent[] = [];
  private isFlushing = false;
  private flushTimer: any = null;
  private readonly MAX_QUEUE_SIZE = 60;
  private readonly BATCH_FLUSH_THRESHOLD = 5;

  // Session state
  private currentSessionId: string | null = null;
  private sessionStartTime: number = 0;
  private sessionLastActivityTime: number = 0;
  private sessionClickCount: number = 0;
  private viewedProductIds: Set<string> = new Set();

  constructor() {
    // Start periodic background flusher (every 10s)
    this.startPeriodicFlusher();
  }

  private startPeriodicFlusher() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0 || this.isSessionActive()) {
        this.flushEvents().catch(() => {});
      }
    }, 10000);
  }

  /**
   * Generates a new unique session identifier for an active customer interaction.
   */
  private generateSessionId(): string {
    const ts = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    return `sess_${ts}_${rand}`;
  }

  public isSessionActive(): boolean {
    return this.currentSessionId !== null;
  }

  public getSessionId(): string {
    if (!this.currentSessionId) {
      this.startSession();
    }
    return this.currentSessionId!;
  }

  /**
   * Starts a new user interaction session when the kiosk is touched / woken up.
   */
  public startSession(): string {
    const now = Date.now();
    this.currentSessionId = this.generateSessionId();
    this.sessionStartTime = now;
    this.sessionLastActivityTime = now;
    this.sessionClickCount = 0;
    this.viewedProductIds.clear();

    console.log('[Analytics] Started new kiosk usage session:', this.currentSessionId);
    return this.currentSessionId;
  }

  /**
   * Records user touch activity to maintain active session.
   */
  public onUserActivity(): void {
    if (!this.currentSessionId) {
      this.startSession();
    } else {
      this.sessionLastActivityTime = Date.now();
    }
  }

  /**
   * Concludes the user interaction session when the kiosk returns to screensaver / idle.
   */
  public async endSession(): Promise<void> {
    if (!this.currentSessionId) return;

    const now = Date.now();
    const durationSeconds = Math.max(1, Math.round((now - this.sessionStartTime) / 1000));
    const sessionId = this.currentSessionId;

    const sessionUpdate: SessionData = {
      session_id: sessionId,
      started_at: new Date(this.sessionStartTime).toISOString(),
      ended_at: new Date(now).toISOString(),
      duration_seconds: durationSeconds,
      total_clicks: this.sessionClickCount,
      products_viewed_count: this.viewedProductIds.size,
      metadata: {
        platform: Platform.OS,
        products_viewed: Array.from(this.viewedProductIds),
      },
    };

    console.log(`[Analytics] Ending session ${sessionId} (${durationSeconds}s, ${this.sessionClickCount} clicks)`);

    // Reset local session state
    this.currentSessionId = null;
    this.sessionStartTime = 0;
    this.sessionClickCount = 0;
    this.viewedProductIds.clear();

    // Flush immediately with session summary
    await this.flushEvents(sessionUpdate);
  }

  /**
   * Tracks a product interaction: click on card, opening full specs, brochure download, etc.
   */
  public trackProductClick(
    product: KioskProduct | { id?: string; sku?: string; name?: string },
    type: InteractionType = 'CLICK',
    metadata?: Record<string, any>
  ): void {
    this.onUserActivity();
    this.sessionClickCount++;

    const productId = product.id || product.sku || '';
    if (productId) {
      this.viewedProductIds.add(productId);
    }

    const event: TelemetryEvent = {
      event_type: type,
      product_id: productId,
      session_id: this.currentSessionId || undefined,
      metadata: {
        product_name: product.name,
        product_sku: product.sku,
        ...metadata,
      },
      timestamp: new Date().toISOString(),
    };

    this.enqueueEvent(event);
  }

  /**
   * Tracks category filter clicks.
   */
  public trackCategoryClick(category: KioskCategory | string): void {
    this.onUserActivity();
    this.sessionClickCount++;

    const catName = typeof category === 'string' ? category : category.name;
    const catCode = typeof category === 'string' ? category : category.code;

    const event: TelemetryEvent = {
      event_type: 'CATEGORY_CLICK',
      session_id: this.currentSessionId || undefined,
      metadata: {
        category_name: catName,
        category_code: catCode,
      },
      timestamp: new Date().toISOString(),
    };

    this.enqueueEvent(event);
  }

  /**
   * Tracks product search queries and results count.
   */
  public trackSearch(query: string, resultCount?: number): void {
    if (!query || query.trim().length === 0) return;
    this.onUserActivity();

    const event: TelemetryEvent = {
      event_type: 'CLICK',
      session_id: this.currentSessionId || undefined,
      metadata: {
        action: 'search_performed',
        query: query.trim(),
        results_count: resultCount,
      },
      timestamp: new Date().toISOString(),
    };

    this.enqueueEvent(event);
  }

  private enqueueEvent(event: TelemetryEvent): void {
    if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
      // Discard oldest event if buffer is full
      this.eventQueue.shift();
    }
    this.eventQueue.push(event);

    // Auto-flush if threshold is reached
    if (this.eventQueue.length >= this.BATCH_FLUSH_THRESHOLD) {
      this.flushEvents().catch(() => {});
    }
  }

  /**
   * Flushes queued events and optional session summary to the backend API.
   */
  public async flushEvents(sessionUpdate?: SessionData): Promise<boolean> {
    if (this.isFlushing) return false;
    if (this.eventQueue.length === 0 && !sessionUpdate) return true;

    this.isFlushing = true;
    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const macAddress = await getDeviceMacAddress();
      const token = await getStoredKioskToken();
      const serverUrl = await getSavedServerUrl();
      const cleanUrl = serverUrl.replace(/\/+$/, '');
      const endpoint = `${cleanUrl}/api/kiosk/analytics/events/`;

      // If active session is ongoing and no sessionUpdate provided, send interim stats
      let currentSessionUpdate = sessionUpdate;
      if (!currentSessionUpdate && this.currentSessionId && this.sessionStartTime > 0) {
        const now = Date.now();
        currentSessionUpdate = {
          session_id: this.currentSessionId,
          started_at: new Date(this.sessionStartTime).toISOString(),
          duration_seconds: Math.round((now - this.sessionStartTime) / 1000),
          total_clicks: this.sessionClickCount,
          products_viewed_count: this.viewedProductIds.size,
          metadata: { is_in_progress: true },
        };
      }

      const payload = {
        mac_address: macAddress,
        device_id: macAddress,
        events: eventsToSend,
        session_update: currentSessionUpdate,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Device-MAC': macAddress,
        'X-Device-Id': macAddress,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return true;
      } else {
        // Restore un-sent events to queue
        this.eventQueue = [...eventsToSend, ...this.eventQueue].slice(0, this.MAX_QUEUE_SIZE);
        return false;
      }
    } catch (err) {
      // Network error or timeout: restore events for next attempt
      this.eventQueue = [...eventsToSend, ...this.eventQueue].slice(0, this.MAX_QUEUE_SIZE);
      return false;
    } finally {
      this.isFlushing = false;
    }
  }
}

export const analyticsService = new AnalyticsService();
