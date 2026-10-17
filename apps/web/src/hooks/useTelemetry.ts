import { useState, useEffect, useRef, useCallback } from 'react';
import type { TelemetryData } from '@/types';

function detectDevice(): 'Mobile' | 'Tablet' | 'Desktop' {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet';
  if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (/windows/i.test(ua)) return 'Windows';
  if (/mac os x/i.test(ua)) return 'MacOS';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Unknown';
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (/chrome/i.test(ua) && !/chromium|edge|opr/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/edge/i.test(ua)) return 'Edge';
  if (/opr|opera/i.test(ua)) return 'Opera';
  return 'Unknown';
}

function detectNetwork(): string {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string; type?: string } };
  if (nav.connection) return nav.connection.effectiveType || nav.connection.type || 'Unknown';
  return 'Unknown';
}

function getDeviceFingerprint(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}`,
    String(new Date().getTimezoneOffset()),
    String(navigator.hardwareConcurrency || 0),
  ].join('|');
  let hash = 0;
  for (let i = 0; i < parts.length; i++) {
    hash = ((hash << 5) - hash) + parts.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).toUpperCase();
}

function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

interface GeoData {
  ip: string; country: string; region: string; city: string;
}

export function useTelemetry() {
  const startTime = useRef(Date.now());
  const ctaClicks = useRef(0);
  const scrollDepth = useRef(0);
  const [geoData, setGeoData] = useState<GeoData>({
    ip: 'Unknown', country: 'Unknown', region: 'Unknown', city: 'Unknown',
  });

  const incrementCta = useCallback(() => { ctaClicks.current += 1; }, []);

  useEffect(() => {
    function onScroll() {
      const el = document.documentElement;
      const pct = Math.round((el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)) * 100);
      if (pct > scrollDepth.current) scrollDepth.current = Math.min(100, pct);
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    // Fetch IP + geo silently
    fetchWithTimeout('https://ipapi.co/json/', 5000)
      .then(r => r.json())
      .then((d: { ip?: string; country_name?: string; region?: string; city?: string }) => {
        setGeoData({
          ip: d.ip || 'Unknown',
          country: d.country_name || 'Unknown',
          region: d.region || 'Unknown',
          city: d.city || 'Unknown',
        });
      })
      .catch(() => {
        // Fallback: get IP only
        fetchWithTimeout('https://api.ipify.org?format=json', 3000)
          .then(r => r.json())
          .then((d: { ip?: string }) => setGeoData(prev => ({ ...prev, ip: d.ip || 'Unknown' })))
          .catch(() => {});
      });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const getTelemetry = useCallback((): TelemetryData => ({
    deviceType: detectDevice(),
    os: detectOS(),
    browser: detectBrowser(),
    networkType: detectNetwork(),
    ip: geoData.ip,
    country: geoData.country,
    region: geoData.region,
    city: geoData.city,
    timeSpentSeconds: Math.round((Date.now() - startTime.current) / 1000),
    scrollDepth: scrollDepth.current,
    ctaClicks: ctaClicks.current,
    userAgent: navigator.userAgent.slice(0, 250),
    deviceFingerprint: getDeviceFingerprint(),
    capturedAt: new Date().toISOString(),
  }), [geoData]);

  return { getTelemetry, incrementCta };
}
