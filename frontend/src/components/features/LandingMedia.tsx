import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Info, Play } from 'lucide-react';
import { useLocale } from '../../providers/LocaleProvider';
import { shouldConserveMedia, type MediaConnection } from '../../utils/mediaPreferences';
import benefitsPoster from '../../assets/benefits-poster.webp';

const chapters = [
  { start: 0, end: 4, key: 'chapter1' },
  { start: 4, end: 8, key: 'chapter2' },
  { start: 8, end: 12, key: 'chapter3' },
  { start: 12, end: 18, key: 'chapter4' },
  { start: 18, end: 20, key: 'chapter1' },
];

type MotionProps = {
  documentHidden: boolean;
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setReduced(media.matches);
    media.addEventListener('change', changed);
    changed();
    return () => media.removeEventListener('change', changed);
  }, []);
  return reduced;
}

function useVisible(ref: React.RefObject<HTMLDivElement>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: 0.05 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
}

export function BenefitsVideo({ documentHidden }: MotionProps) {
  const { t } = useLocale();
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const visible = useVisible(frameRef);
  const reducedMotion = useReducedMotion();
  const [loaded, setLoaded] = useState(false);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [conserve, setConserve] = useState(() => shouldConserveMedia((navigator as Navigator & { connection?: MediaConnection }).connection));
  const [explicitPlayback, setExplicitPlayback] = useState(false);
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: MediaConnection }).connection;
    const update = () => setConserve(shouldConserveMedia(connection));
    connection?.addEventListener('change', update);
    return () => connection?.removeEventListener('change', update);
  }, []);
  const needsPlay = conserve && !explicitPlayback;
  const allowed = visible && !documentHidden && !hovered && !focused && !reducedMotion && !needsPlay;

  // Only attach a source once the illustration is visible and motion is allowed.
  useEffect(() => { if (allowed) setLoaded(true); }, [allowed]);
  const attemptPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    // A failed source stays in the media error state until it is loaded again.
    if (video.error) video.load();
    void video.play().catch(error => { if (error.name !== 'AbortError') setPlaybackFailed(true); });
  }, []);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (allowed && loaded && !playbackFailed && video.paused) attemptPlay();
    else if (!allowed) video.pause();
  }, [allowed, loaded, playbackFailed, attemptPlay]);

  const updateChapter = () => {
    const time = videoRef.current?.currentTime ?? 0;
    const index = chapters.findIndex(chapter => time >= chapter.start && time < chapter.end);
    setChapterIndex(index < 0 ? 0 : index);
  };
  const handleControl = () => {
    if (needsPlay) setExplicitPlayback(true);
    else attemptPlay();
  };
  const key = chapters[chapterIndex].key;

  return <div className="benefits-explainer">
    <div className="benefits-video-container"
      onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }}
      onPointerLeave={() => setHovered(false)}>
      <div ref={frameRef} className="benefits-video-viewport">
        {reducedMotion ? <img src={benefitsPoster} alt="" loading="lazy" decoding="async" className="benefits-video-static" /> :
        <video ref={videoRef} className="benefits-video" muted loop playsInline preload="none"
          src={loaded ? '/media/LAB-benefits-loop-v1.mp4' : undefined}
          poster={benefitsPoster} onTimeUpdate={updateChapter}
          onPlaying={() => setPlaybackFailed(false)} onError={() => setPlaybackFailed(true)} aria-hidden="true" />}
      </div>
      <div className="benefits-captions" tabIndex={reducedMotion ? undefined : 0}
        onFocus={event => { if (event.target === event.currentTarget) setFocused(true); }}
        onBlur={() => setFocused(false)}>
        <div>
          <span className="benefits-caption-eyebrow">{t('ui.landing.benefits.eyebrow')}</span>
          <h3 className="benefits-caption-title">{t(`ui.landing.benefits.${key}.title`)}</h3>
          <p className="benefits-caption-body">{t(`ui.landing.benefits.${key}.body`)}</p>
        </div>
      </div>
    </div>
    {!reducedMotion && (needsPlay || playbackFailed) && <button type="button" className="benefits-video-control" onClick={handleControl}>
      <Play size={16} aria-hidden="true" />{t(playbackFailed ? 'ui.retry_c58d068c' : 'ui.media.playVideo')}
    </button>}
    <ul className="benefits-summary">
      {chapters.slice(0, 4).map(chapter => <li key={chapter.key}>
        <h3>{t(`ui.landing.benefits.${chapter.key}.title`)}</h3>
        <p>{t(`ui.landing.benefits.${chapter.key}.body`)}</p>
      </li>)}
    </ul>
  </div>;
}

export function AnnouncementStrip({ documentHidden }: MotionProps) {
  const { t } = useLocale();
  const stripRef = useRef<HTMLDivElement>(null);
  const visible = useVisible(stripRef);
  const reducedMotion = useReducedMotion();
  const steps = [1, 2, 3, 4].map(index => t(`ui.landing.guide.step${index}`));
  const paused = documentHidden || !visible || reducedMotion;
  return <div ref={stripRef} className="announcement-strip" role="region" aria-label={t('ui.landing.guide.title')} tabIndex={reducedMotion ? undefined : 0}>
    <div className="announcement-strip-inner">
      <span className="announcement-strip-label"><Info size={16} aria-hidden="true" />{t('ui.landing.guide.title')}</span>
      <div className="announcement-strip-window" aria-hidden="true">
        <div className="announcement-strip-ticker" style={{ animationPlayState: paused ? 'paused' : 'running' }}>
          {[0, 1].map(copy => <div className="announcement-strip-track" key={copy}>
            {steps.map((step, index) => <span className="announcement-strip-step" key={index}>
              <span className="announcement-strip-number">{index + 1}</span>{step}
            </span>)}
          </div>)}
        </div>
      </div>
      <ol className="announcement-strip-static">{steps.map(step => <li key={step}>{step}</li>)}</ol>
    </div>
  </div>;
}
