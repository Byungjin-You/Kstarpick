import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/MainLayout';
import Seo from '../../components/Seo';
import { Calendar, Clock, MapPin, Music, Ticket, ExternalLink, Star } from 'lucide-react';
import { dbConnect } from '../../utils/mongodb';
import { ObjectId } from 'mongodb';
import { UpcomingComebacks, ConcertsList } from '../../components/schedule/ScheduleSidebar';
import ScheduleCard from '../../components/schedule/ScheduleCard';
import MoreNews from '../../components/MoreNews';

const TYPE_COLORS = {
  release: '#E11D6E', comeback: '#7C3AED', debut: '#2563EB', teaser: '#D97706',
  concept_photo: '#EA580C', mv: '#DC2626', tracklist: '#4F46E5', highlight_medley: '#0D9488',
  birthday: '#16A34A', anniversary: '#059669', pre_release: '#0891B2',
  concert: '#A21CAF', fan_meeting: '#65A30D', festival: '#B45309', other: '#6B7280'
};

const TYPE_LABELS = {
  release: 'Release', comeback: 'Comeback', debut: 'Debut', teaser: 'Teaser',
  concept_photo: 'Concept Photo', mv: 'MV', tracklist: 'Tracklist',
  highlight_medley: 'Highlight', birthday: 'Birthday', anniversary: 'Anniversary',
  pre_release: 'Pre-Release', concert: 'Concert', fan_meeting: 'Fan Meeting', festival: 'Festival', other: 'Other'
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const toKSTDateKey = (utcStr) => {
  const d = new Date(utcStr);
  d.setHours(d.getHours() + 9);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

const formatDateKST = (utcStr) => {
  const dk = toKSTDateKey(utcStr);
  const [y, m, d] = dk.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${MONTH_NAMES[m - 1]} ${d}, ${y} · ${dayNames[dt.getDay()]}`;
};

const toKSTTime = (utcStr) => {
  const d = new Date(utcStr);
  d.setHours(d.getHours() + 9);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  if (h === 0 && m === 0) return '';
  return `${h < 12 ? 'AM' : 'PM'} ${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, '0')} KST`;
};

function InfoRow({ icon: Icon, label, children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-3 py-4">
      <Icon size={20} className="text-[#98A2B3] flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#98A2B3] font-medium uppercase tracking-wider mb-1">{label}</p>
        <div className="text-[#000000]" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '16px', lineHeight: '1.75em' }}>{children}</div>
      </div>
    </div>
  );
}

const STREAM_LABEL_MAP = {
  '멜론': 'Melon', '지니': 'Genie', '벅스': 'Bugs', '바이브': 'VIBE',
  'FLO': 'FLO', 'VIBE': 'VIBE',
};

function renderDescription(s) {
  let desc = (s.description || '')
    .replace(/🎉\s*\[블립에서.*?\]\(blip:\/\/.*?\)/g, '').replace(/\(blip:\/\/.*?\)/g, '').trim();
  if (desc === s.title || desc === s.eventName) return null;
  if (desc.includes(' · ') && (desc.includes(s.venue) || desc.includes(s.title))) return null;
  if (!desc) return null;

  // YouTube URL 추출
  const ytUrls = desc.match(/https?:\/\/(?:youtu\.be\/|(?:www\.)?youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/g) || [];
  // 스트리밍 링크 추출 (라벨 ▶️ URL)
  const streamLinks = [];
  const textLines = [];
  desc.split('\n').filter(Boolean).forEach(line => {
    // 패턴: 다양한 화살표 + 라벨 + URL 조합
    const match = line.match(/^(.+?)\s*[▶️➫➠➜➤►➕]+\s*(https?:\/\/.+)$/) ||
                  line.match(/^[▶️➫➠➜➤►➕]+\s*(.+?)[:：]\s*(https?:\/\/.+)$/) ||
                  line.match(/^[▶️➫➠➜➤►➕]+\s+(.+?)\s+(https?:\/\/.+)$/) ||
                  line.match(/^(.+?)\s*[:：]\s*(https?:\/\/.+)$/);
    if (match && match[1] && match[1].length < 30 && !match[1].includes('http')) {
      const rawLabel = match[1].trim();
      streamLinks.push({ label: STREAM_LABEL_MAP[rawLabel] || rawLabel, url: match[2].trim() });
    } else if (!line.match(/^https?:\/\/(?:youtu\.be|(?:www\.)?youtube\.com)/)) {
      // YouTube URL만 있는 줄은 제거 (임베드로 표시)
      const cleaned = line.replace(/https?:\/\/(?:youtu\.be|(?:www\.)?youtube\.com)\/[^\s)]+/g, '').replace(/🔗[^\n]*/g, '').trim();
      if (cleaned) textLines.push(cleaned);
    }
  });
  const cleanText = textLines.join('\n').trim();

  return { cleanText, ytUrls, streamLinks };
}

export default function ScheduleDetail({ schedule, relatedSchedules, trendingNews, upcomingComebacks, upcomingConcerts }) {
  const router = useRouter();
  const sidebarRef = useRef(null);
  const [sidebarStickyTop, setSidebarStickyTop] = useState(92);

  // X/Twitter 임베드 스크립트 로드
  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('twitter-wjs')) {
      const script = document.createElement('script');
      script.id = 'twitter-wjs';
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      document.body.appendChild(script);
    } else if (window.twttr?.widgets) {
      window.twttr.widgets.load();
    }
  }, [schedule]);

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const HEADER_H = 92;
    const calcTop = () => {
      const sH = el.offsetHeight;
      const vH = window.innerHeight;
      setSidebarStickyTop(sH <= vH - HEADER_H ? HEADER_H : vH - sH - 40);
    };
    const timer = setTimeout(calcTop, 300);
    const observer = new ResizeObserver(calcTop);
    observer.observe(el);
    window.addEventListener('resize', calcTop);
    return () => { clearTimeout(timer); observer.disconnect(); window.removeEventListener('resize', calcTop); };
  }, []);

  if (!schedule) {
    return <MainLayout><div className="text-center py-20 text-[#98A2B3]">Schedule not found</div></MainLayout>;
  }

  const s = schedule;
  const color = TYPE_COLORS[s.type] || TYPE_COLORS.other;
  const heroImg = s.ogImage || s.imageUrl || (s.images && s.images[0]);
  const kstTime = toKSTTime(s.startDate);
  const isConcert = ['concert', 'fan_meeting', 'festival'].includes(s.type);

  return (
    <MainLayout>
      <Seo
        title={`${s.artistName ? s.artistName + ' - ' : ''}${s.title || s.eventName} | KstarPick`}
        description={s.description || `${s.artistName} ${TYPE_LABELS[s.type]} schedule`}
        url={`/schedule/${s._id}`}
      />

      {/* ============ MOBILE ============ */}
      <div className="lg:hidden">
        <main className="pb-16 bg-white">
          {/* Hero — matches celeb detail mobile */}
          {heroImg ? (
            <div className="relative w-full" style={{ height: '107.9vw', maxHeight: '500px' }}>
              <img src={heroImg} alt="" className="absolute top-0 left-0 w-full object-cover object-top" style={{ height: '74.1%' }}
                onError={(e) => { e.target.src = '/images/placeholder.jpg'; }} />
              <div className="absolute left-0 right-0" style={{
                top: '62.5%', height: '12.9%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)',
              }} />
              <div className="absolute left-0 right-0 pointer-events-none" style={{
                top: '34.5%', height: '65.5%',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.7) 50%, black 70%)',
                maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.7) 50%, black 70%)',
              }} />
              <div className="absolute left-0 right-0 flex flex-col justify-center" style={{
                top: '34.5%', height: '65.5%',
                padding: '100px 0 30px 16px',
                background: 'linear-gradient(0deg, rgba(255,255,255,1) 0%, rgba(196,203,216,1) 22%, rgba(88,97,113,0.88) 47%, rgba(0,7,20,0.33) 82%, rgba(0,7,20,0) 100%)',
              }}>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-[10px]">
                    <div className="flex flex-col">
                      <h1 className="font-bold text-white" style={{ fontFamily: 'Inter, sans-serif', fontSize: '22px', lineHeight: '1.5em', letterSpacing: '-0.042em' }}>
                        {s.title || s.eventName}
                      </h1>
                      {s.artistName && (
                        <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 400, fontSize: '12px', lineHeight: '1.54em', color: '#AFB7C6' }}>
                          {s.artistName}
                        </span>
                      )}
                    </div>
                    {s.albumFull && (
                      <p className="text-white line-clamp-2 pr-4" style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 400, fontSize: '12px', lineHeight: '1.54em' }}>
                        {s.albumFull}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 pt-4">
              <h1 className="font-bold text-[22px] text-[#101828] leading-tight mb-1">{s.title || s.eventName}</h1>
              {s.artistName && <p className="text-[#6A7282] text-[14px]">{s.artistName}</p>}
            </div>
          )}

          {/* Content */}
          <div className="px-4 pt-4">

            {/* Info */}
            <div className="mt-4">
              <h2 className="font-bold text-[20px] text-black mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Event Details</h2>
            </div>
            <div>
              <InfoRow icon={Calendar} label="Date">{formatDateKST(s.startDate)}</InfoRow>
              {kstTime && <InfoRow icon={Clock} label="Time">{kstTime}</InfoRow>}
              {s.albumFull && <InfoRow icon={Music} label="Album">{s.albumFull}</InfoRow>}
              {s.titleSong && <InfoRow icon={Star} label="Title Track">{s.titleSong}</InfoRow>}
              {s.venue && (
                <InfoRow icon={MapPin} label="Venue">
                  <span className="whitespace-pre-line">{(s.venue + (s.location ? `, ${s.location}` : '')).replace(/–\s*/g, '\n– ').trim()}</span>
                </InfoRow>
              )}
              {s.totalDates && s.totalDates.length > 1 && (
                <InfoRow icon={Calendar} label="All Dates">
                  <div className="flex flex-wrap gap-1.5">
                    {s.totalDates.map((d, i) => (
                      <span key={i} className="px-2 py-0.5 bg-[#F3F4F6] rounded text-[12px]">{d}</span>
                    ))}
                  </div>
                </InfoRow>
              )}
            </div>

            {/* Ticketing */}
            {s.ticketingPlatform && (
              <InfoRow icon={Ticket} label="Ticketing">
                {(() => {
                  const links = [];
                  const websiteMatch = s.ticketingPlatform.match(/Website:\s*(https?:\/\/[^\sX:]+)/);
                  const xMatch = s.ticketingPlatform.match(/X:\s*@?([\w]+?)(?=Instagram|Facebook|Website|Ticketing|$)/);
                  const igMatch = s.ticketingPlatform.match(/Instagram:\s*@?([\w]+?)(?=Facebook|Website|X:|Ticketing|$)/);
                  const fbMatch = s.ticketingPlatform.match(/Facebook:\s*@?([\w]+?)(?=Instagram|Website|X:|Ticketing|$)/);
                  if (websiteMatch) links.push({ label: 'Website', url: websiteMatch[1] });
                  if (xMatch) links.push({ label: 'X', url: `https://x.com/${xMatch[1]}` });
                  if (igMatch) links.push({ label: 'Instagram', url: `https://instagram.com/${igMatch[1]}` });
                  if (fbMatch) links.push({ label: 'Facebook', url: `https://facebook.com/${fbMatch[1].trim()}` });
                  return links.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {links.map((l, i) => (
                        <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-[#F3F4F6] text-[#344054] text-[12px] font-medium rounded-lg">{l.label}</a>
                      ))}
                    </div>
                  ) : <span>{s.ticketingPlatform}</span>;
                })()}
              </InfoRow>
            )}
            {s.liveStreaming && (
              <InfoRow icon={ExternalLink} label="Live Streaming">
                {(() => {
                  const urls = [...new Set((s.liveStreaming.match(/https?:\/\/[^\s,]+/g) || []).map(u => {
                    return u.replace(/\/[A-Z][a-z].*$/, '/');
                  }))];
                  return urls.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {urls.map((url, i) => {
                        const domain = url.match(/\/\/([^/]+)/)?.[1]?.replace('www.', '') || url;
                        return (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-[#F3F4F6] text-[#344054] text-[12px] font-medium rounded-lg">{domain}</a>
                        );
                      })}
                    </div>
                  ) : <p className="text-[14px]">{s.liveStreaming}</p>;
                })()}
              </InfoRow>
            )}
            {s.promoter && (
              <InfoRow icon={ExternalLink} label="Promoter">
                {(() => {
                  const links = [];
                  const websiteMatch = s.promoter.match(/Website:\s*(https?:\/\/[^\sX:]+)/);
                  const xMatch = s.promoter.match(/X:\s*@?([\w]+?)(?=Instagram|Facebook|Website|$)/);
                  const igMatch = s.promoter.match(/Instagram:\s*@?([\w.]+?)(?=Facebook|Website|X:|$)/);
                  if (websiteMatch) links.push({ label: 'Website', url: websiteMatch[1] });
                  if (xMatch) links.push({ label: 'X', url: `https://x.com/${xMatch[1]}` });
                  if (igMatch) links.push({ label: 'Instagram', url: `https://instagram.com/${igMatch[1]}` });
                  return links.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {links.map((l, i) => (
                        <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-[#F3F4F6] text-[#344054] text-[12px] font-medium rounded-lg">{l.label}</a>
                      ))}
                    </div>
                  ) : <span>{s.promoter}</span>;
                })()}
              </InfoRow>
            )}
            {(() => {
              const result = renderDescription(s);
              if (!result) return null;
              return (
                <>
                  {(result.cleanText || result.streamLinks.length > 0) && (
                    <InfoRow icon={Star} label="Description">
                      <div>
                        {result.cleanText && (
                          <span className="whitespace-pre-line">{result.cleanText}</span>
                        )}
                        {result.streamLinks.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {result.streamLinks.map((link, i) => (
                              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-[#F3F4F6] text-[#344054] text-[12px] font-medium rounded-lg flex items-center gap-1">
                                <ExternalLink size={12} /> {link.label}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </InfoRow>
                  )}
                  {result.ytUrls.length > 0 && !s.youtubeUrls?.length && (
                    <div className="mt-4">
                      {result.ytUrls.map((url, i) => {
                        const videoId = url.match(/(?:youtu\.be\/|watch\?v=)([a-zA-Z0-9_-]+)/)?.[1];
                        return videoId ? (
                          <div key={i} className="rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                            <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full" allowFullScreen />
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Tracklist */}
          {s.tracklist && s.tracklist.length > 0 && (
            <section style={{ padding: '24px 16px 16px' }}>
              <h2 className="font-bold text-[20px] text-black mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Tracklist</h2>
              <div className="space-y-2">
                {s.tracklist.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 bg-[#F9FAFB] rounded-lg">
                    <span className="text-[13px] font-bold text-[#98A2B3] w-6 text-center">{i + 1}</span>
                    <span className="text-[14px] text-[#101828]">{t}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Ticketing Info */}
          {(s.ticketingSchedule || s.ticketPrice || s.ticketSalesSchedule || s.liveStreaming) && (
            <section style={{ padding: '24px 16px 16px' }}>
              <h2 className="font-bold text-[20px] text-black mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Ticketing</h2>
              {s.ticketingSchedule && (
                <div className="p-3 bg-[#F9FAFB] rounded-xl mb-3">
                  <p className="text-[13px] font-bold text-[#101828] mb-3">Schedule</p>
                  <div className="space-y-2">
                    {s.ticketingSchedule
                      .replace(/\(KST\)/g, '(KST)\n')
                      .replace(/KST(?=[A-Z])/g, 'KST\n')
                      .replace(/to(?=[A-Z])/g, 'to ')
                      .split('\n')
                      .map(item => item.trim()).filter(Boolean)
                      .map((item, i) => {
                        const colonMatch = item.match(/^([^:]+?):\s*(?!\d{2})(.+)$/);
                        const label = colonMatch ? colonMatch[1].trim() : '';
                        const value = colonMatch ? colonMatch[2].trim() : item;
                        return (
                          <div key={i} className="py-2 px-3 bg-white rounded-lg">
                            {label && <p className="text-[12px] font-bold text-ksp-accent mb-0.5">{label}</p>}
                            <p className="text-[13px] text-[#6A7282]">{value}</p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
              {s.ticketPrice && (
                <div className="p-3 bg-[#F9FAFB] rounded-xl mb-3">
                  <p className="text-[13px] font-bold text-[#101828] mb-3">Price</p>
                  <div className="space-y-2">
                    {(() => {
                      if (s.ticketPrice.includes(' / ') || s.ticketPrice.length < 50) {
                        return [(
                          <div key="single" className="py-2 px-3 bg-white rounded-lg">
                            <span className="text-[13px] text-[#000000]">{s.ticketPrice}</span>
                          </div>
                        )];
                      }
                      let items = s.ticketPrice
                        .replace(/(THB|KRW|USD|JPY|SGD|MYR|TWD|HKD)(?=[A-Z])/g, '$1\n')
                        .replace(/([\d,]+)(?=[A-Z](?!T\$))/g, '$1\n')
                        .split('\n').map(item => item.trim()).filter(Boolean);
                      if (items.length <= 1) items = [s.ticketPrice];
                      return items.map((item, i) => {
                        const match = item.match(/^(.+?)[:\––]\s*(.+)$/);
                        const label = match ? match[1].trim() : item;
                        const price = match ? match[2].trim() : '';
                        return (
                          <div key={i} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
                            <span className="text-[13px] text-[#000000]">{label}</span>
                            {price && <span className="text-[13px] font-bold text-ksp-accent">{price}</span>}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
              {s.ticketSalesSchedule && (
                <div className="p-3 bg-[#F9FAFB] rounded-xl mb-3">
                  <p className="text-[13px] font-bold text-[#101828] mb-3">Sales Schedule</p>
                  <div className="space-y-2">
                    {(() => {
                      const raw = s.ticketSalesSchedule;
                      let items;
                      if (raw.includes('➤')) {
                        items = raw.split(/(?=➤)/).map(s => s.replace(/^➤\s*/, '').trim()).filter(Boolean);
                      } else {
                        items = raw
                          .replace(/\(KST\)/g, '(KST)\n')
                          .replace(/KST(?=[A-Z])/g, 'KST\n')
                          .replace(/(?=General (?:On[ -]?Sale|sales))/gi, '\n')
                          .replace(/pm([A-Z])/gi, 'PM\n$1')
                          .replace(/pm(?=[^\x00-\x7F])/g, 'pm\n')
                          .replace(/onwards(?=[A-Z])/g, 'onwards\n')
                          .replace(/onwards(?=[^\x00-\x7F])/g, 'onwards\n')
                          .split('\n').map(s => s.trim()).filter(Boolean);
                      }
                      return items.map((item, i) => {
                        const colonMatch = item.match(/^([^:]+?):\s*(?!\d{2})(.+)$/);
                        const label = colonMatch ? colonMatch[1].trim() : '';
                        const value = colonMatch ? colonMatch[2].trim() : item;
                        return (
                          <div key={i} className="py-2 px-3 bg-white rounded-lg">
                            {label && <p className="text-[12px] font-bold text-ksp-accent mb-0.5">{label}</p>}
                            <p className="text-[13px] text-[#6A7282]">{value}</p>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* YouTube MV */}
          {s.youtubeUrls && s.youtubeUrls.length > 0 && (
            <section style={{ padding: '24px 16px 16px' }}>
              <h2 className="font-bold text-[20px] text-black mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>MV / Teaser</h2>
              <div className="space-y-3">
                {s.youtubeUrls.map((url, i) => {
                  const videoId = url.match(/(?:watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1];
                  return videoId ? (
                    <div key={i} className="rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                      <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full" allowFullScreen />
                    </div>
                  ) : null;
                })}
              </div>
            </section>
          )}

          {/* X/Twitter Embeds */}
          {(() => {
            const xUrls = ((s.description || '').match(/https?:\/\/(?:x\.com|twitter\.com)\/[^\s\])]+/g) || [])
              .filter(url => url.includes('/status/'));
            if (xUrls.length === 0) return null;
            return (
              <section style={{ padding: '24px 16px 16px' }}>
                <h2 className="font-bold text-[20px] text-black mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Posts</h2>
                <div className="space-y-3">
                  {xUrls.slice(0, 4).map((url, i) => (
                    <div key={i} className="rounded-xl overflow-hidden border border-[#F3F4F6]">
                      <blockquote className="twitter-tweet" data-dnt="true" data-theme="light">
                        <a href={url.replace('x.com', 'twitter.com')}>{url}</a>
                      </blockquote>
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Photos */}
          {s.images && s.images.length > 0 && (
            <section style={{ padding: '24px 16px 16px' }}>
              <h2 className="font-bold text-[20px] text-black mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Photos</h2>
              <div className="grid grid-cols-2 gap-2">
                {s.images.map((img, i) => (
                  <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="rounded-lg overflow-hidden">
                    <img src={img} alt="" className="w-full h-[120px] object-cover" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Buy Album / Ticket */}
          {((s.buyLinks && s.buyLinks.length > 0) || (s.buyTicketUrl && s.buyTicketUrl.startsWith('http'))) && (
            <section style={{ padding: '24px 16px 16px' }}>
              <h2 className="font-bold text-[20px] text-black mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                {isConcert ? 'Buy Ticket' : 'Buy Album'}
              </h2>
              <div className="flex flex-wrap gap-2">
                {s.buyLinks?.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#101828] text-white text-[13px] font-medium rounded-lg flex items-center gap-1.5">
                    <ExternalLink size={14} /> {link.name}
                  </a>
                ))}
                {s.buyTicketUrl && s.buyTicketUrl.startsWith('http') && !s.buyLinks?.length && (
                  <a href={s.buyTicketUrl} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 bg-ksp-accent text-white text-[13px] font-medium rounded-lg flex items-center gap-1.5">
                    <Ticket size={14} /> Buy Ticket
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Official Links */}
          {s.officialLinks && s.officialLinks.length > 0 && (
            <section style={{ padding: '24px 16px 16px' }}>
              <h2 className="font-bold text-[20px] text-black mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Official Links</h2>
              <div className="flex flex-wrap gap-2">
                {s.officialLinks.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-2 bg-[#F3F4F6] text-[#344054] text-[13px] font-medium rounded-lg flex items-center gap-1.5">
                    <ExternalLink size={14} /> {link.name}
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Lineup */}
          {s.lineup && (
            <section style={{ padding: '24px 16px 16px' }}>
              <h2 className="font-bold text-[20px] text-black mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Lineup</h2>
              <p className="text-[14px] text-[#6A7282] leading-relaxed">{s.lineup}</p>
            </section>
          )}

          {/* More from Artist */}
          {relatedSchedules && relatedSchedules.length > 0 && (
            <div className="px-4 pt-6 pb-5">
              <h2 className="font-bold text-[20px] text-black mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                More from <span className="text-ksp-accent">{s.artistName || 'Artist'}</span>
              </h2>
              <div className="space-y-2">
                {relatedSchedules.map(rs => (
                  <ScheduleCard key={rs._id} schedule={rs} onNavigate={(path) => router.push(path)} />
                ))}
              </div>
            </div>
          )}

          {/* Separator */}
          <div className="h-2 bg-[#F3F4F6]" />

          {/* More News */}
          <div className="bg-white py-5 px-4">
            <MoreNews category="kpop" storageKey="schedule_detail_mobile" />
          </div>
        </main>
      </div>

      {/* ============ PC ============ */}
      <div className="hidden lg:block">
        <div className="bg-[#F8F9FA]">
          <div className="max-w-[1772px] mx-auto px-10 pt-8 pb-16">
            <div className="flex flex-row gap-[60px]">

              {/* Left: Main Content + More News */}
              <div className="flex-1 min-w-0 max-w-content">
              <div className="bg-white rounded-xl overflow-hidden border-[1.5px] border-[#E5E7EB]">

                {/* Hero — same structure as celeb detail */}
                {heroImg && (
                  <div className="relative overflow-hidden" style={{ height: '650px' }}>
                    <img
                      src={heroImg} alt={s.title || ''}
                      className="absolute left-0 w-full object-cover"
                      style={{ top: '-97px', width: '1212px', height: '968px' }}
                      onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
                    />
                    {/* Layer 1: Blur */}
                    <div
                      className="absolute left-0 right-0 bottom-0 pointer-events-none"
                      style={{
                        top: '304px',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.7) 50%, black 70%)',
                        maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.7) 50%, black 70%)',
                      }}
                    />
                    {/* Layer 2: Gradient + content */}
                    <div
                      className="absolute left-0 right-0 bottom-0 flex flex-col justify-center"
                      style={{
                        top: '304px',
                        padding: '100px 0px 30px 40px',
                        background: 'linear-gradient(0deg, rgba(255,255,255,1) 0%, rgba(196,203,216,1) 15%, rgba(88,97,113,0.88) 40%, rgba(0,7,20,0.33) 70%, rgba(0,7,20,0) 100%)',
                      }}
                    >
                      <h1 className="font-bold text-[42px] leading-[1.286em] text-white" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {s.title || s.eventName}
                      </h1>
                      {s.artistName && (
                        <p className="text-[16px]" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Roboto, sans-serif' }}>
                          {s.artistName}
                        </p>
                      )}
                      {s.description && (
                        <div className="pt-4 pb-2" style={{ maxWidth: '640px' }}>
                          <p className="text-[14px] text-white leading-[1.4em] line-clamp-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                            {s.albumFull || s.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Event Details Section */}
                <div className="px-10 py-[30px]">
                  {!heroImg && (
                    <div className="mb-[30px]">
                      <h1 className="font-black text-[32px] text-[#111111] leading-tight" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                        {s.title || s.eventName}
                      </h1>
                      {s.artistName && <p className="text-[#6A7282] text-[16px] mt-1">{s.artistName}</p>}
                    </div>
                  )}
                  <h2 className="font-black text-[26px] mb-[30px]" style={{ fontFamily: 'Pretendard, sans-serif', color: '#111111' }}>
                    Event Details
                  </h2>
                  <div>
                    <InfoRow icon={Calendar} label="Date">{formatDateKST(s.startDate)}</InfoRow>
                    {kstTime && <InfoRow icon={Clock} label="Time">{kstTime}</InfoRow>}
                    {s.albumFull && <InfoRow icon={Music} label="Album">{s.albumFull}</InfoRow>}
                    {s.titleSong && <InfoRow icon={Star} label="Title Track">{s.titleSong}</InfoRow>}
                    {s.venue && (
                      <InfoRow icon={MapPin} label="Venue">
                        <span className="whitespace-pre-line">{(s.venue + (s.location ? `, ${s.location}` : '')).replace(/–\s*/g, '\n– ').trim()}</span>
                      </InfoRow>
                    )}
                    {s.totalDates && s.totalDates.length > 1 && (
                      <InfoRow icon={Calendar} label="All Dates">
                        <div className="flex flex-wrap gap-1.5">
                          {s.totalDates.map((d, i) => (
                            <span key={i} className="px-2 py-0.5 bg-[#F3F4F6] rounded text-[12px]">{d}</span>
                          ))}
                        </div>
                      </InfoRow>
                    )}
                    {s.ticketingPlatform && (
                      <InfoRow icon={Ticket} label="Ticketing">
                        {(() => {
                          const links = [];
                          const websiteMatch = s.ticketingPlatform.match(/Website:\s*(https?:\/\/[^\sX:]+)/);
                          const xMatch = s.ticketingPlatform.match(/X:\s*@?([\w]+?)(?=Instagram|Facebook|Website|Ticketing|$)/);
                          const igMatch = s.ticketingPlatform.match(/Instagram:\s*@?([\w]+?)(?=Facebook|Website|X:|Ticketing|$)/);
                          const fbMatch = s.ticketingPlatform.match(/Facebook:\s*@?([\w]+?)(?=Instagram|Website|X:|Ticketing|$)/);
                          if (websiteMatch) links.push({ label: 'Website', url: websiteMatch[1] });
                          if (xMatch) links.push({ label: 'X', url: `https://x.com/${xMatch[1]}` });
                          if (igMatch) links.push({ label: 'Instagram', url: `https://instagram.com/${igMatch[1]}` });
                          if (fbMatch) links.push({ label: 'Facebook', url: `https://facebook.com/${fbMatch[1]}` });

                          return links.length > 0 ? (
                            <div>
                              <div className="flex flex-wrap gap-2">
                                {links.map((l, i) => (
                                  <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-[#F3F4F6] text-[#344054] text-[13px] font-medium rounded-lg hover:bg-[#E5E7EB] transition flex items-center gap-1">
                                    <ExternalLink size={12} /> {l.label}
                                  </a>
                                ))}
                              </div>
                            </div>
                          ) : <span>{s.ticketingPlatform}</span>;
                        })()}
                      </InfoRow>
                    )}
                    {s.liveStreaming && (
                      <InfoRow icon={ExternalLink} label="Live Streaming">
                        {(() => {
                          // URL 추출 (도메인만 사용)
                          const rawUrls = s.liveStreaming.match(/https?:\/\/[^\s,]+/g) || [];
                          const urls = rawUrls.map(u => {
                            const domain = u.match(/^(https?:\/\/[^/]+)\/?/)?.[1] || u;
                            return domain + '/';
                          });
                          const uniqueUrls = [...new Set(urls)];

                          if (uniqueUrls.length > 0) {
                            return (
                              <div className="flex flex-wrap gap-2">
                                {uniqueUrls.map((url, i) => {
                                  const domain = url.match(/\/\/([^/]+)/)?.[1]?.replace('www.', '') || url;
                                  return (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                      className="px-3 py-1.5 bg-[#F3F4F6] text-[#344054] text-[13px] font-medium rounded-lg hover:bg-[#E5E7EB] transition flex items-center gap-1">
                                      <ExternalLink size={12} /> {domain}
                                    </a>
                                  );
                                })}
                              </div>
                            );
                          }
                          const formatted = s.liveStreaming
                            .replace(/(?=Worldwide:|Korea:|Japan:|More details)/g, '\n')
                            .replace(/\*(?=[A-Z])/g, '\n* ')
                            .replace(/–\s*/g, '\n  – ')
                            .trim();
                          return <p className="whitespace-pre-line" style={{ fontFamily: 'Inter', fontSize: '16px', lineHeight: '1.75em' }}>{formatted}</p>;
                        })()}
                      </InfoRow>
                    )}
                    {s.promoter && (
                      <InfoRow icon={ExternalLink} label="Promoter">
                        {(() => {
                          const links = [];
                          const websiteMatch = s.promoter.match(/Website:\s*(https?:\/\/[^\sX:]+)/);
                          const xMatch = s.promoter.match(/X:\s*@?([\w]+?)(?=Instagram|Facebook|Website|$)/);
                          const igMatch = s.promoter.match(/Instagram:\s*@?([\w.]+?)(?=Facebook|Website|X:|$)/);
                          const fbMatch = s.promoter.match(/Facebook:\s*@?([\w\s]+?)(?=Instagram|Website|X:|$)/);
                          if (websiteMatch) links.push({ label: 'Website', url: websiteMatch[1] });
                          if (xMatch) links.push({ label: 'X', url: `https://x.com/${xMatch[1]}` });
                          if (igMatch) links.push({ label: 'Instagram', url: `https://instagram.com/${igMatch[1]}` });
                          if (fbMatch) links.push({ label: 'Facebook', url: `https://facebook.com/${fbMatch[1].trim()}` });

                          return links.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {links.map((l, i) => (
                                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-[#F3F4F6] text-[#344054] text-[13px] font-medium rounded-lg hover:bg-[#E5E7EB] transition flex items-center gap-1">
                                  <ExternalLink size={12} /> {l.label}
                                </a>
                              ))}
                            </div>
                          ) : <span>{s.promoter}</span>;
                        })()}
                      </InfoRow>
                    )}
                    {(() => {
                      const result = renderDescription(s);
                      if (!result) return null;
                      return (
                        <>
                          {(result.cleanText || result.streamLinks.length > 0) && (
                            <InfoRow icon={Star} label="Description">
                              <div>
                                {result.cleanText && (
                                  <span className="whitespace-pre-line">{result.cleanText}</span>
                                )}
                                {result.streamLinks.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {result.streamLinks.map((link, i) => (
                                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                        className="px-3 py-1.5 bg-[#F3F4F6] text-[#344054] text-[13px] font-medium rounded-lg hover:bg-[#E5E7EB] transition flex items-center gap-1">
                                        <ExternalLink size={12} /> {link.label}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </InfoRow>
                          )}
                          {result.ytUrls.length > 0 && !s.youtubeUrls?.length && (
                            <div className="mt-4">
                              {result.ytUrls.map((url, i) => {
                                const videoId = url.match(/(?:youtu\.be\/|watch\?v=)([a-zA-Z0-9_-]+)/)?.[1];
                                return videoId ? (
                                  <div key={i} className="rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', maxWidth: '560px' }}>
                                    <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full" allowFullScreen />
                                  </div>
                                ) : null;
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Ticketing Info */}
                {(s.ticketingSchedule || s.ticketPrice || s.ticketSalesSchedule || s.liveStreaming) && (
                  <div className="px-10 py-[30px] border-t border-[#F3F4F6]">
                    <h2 className="font-black text-[26px] mb-[30px]" style={{ fontFamily: 'Pretendard, sans-serif', color: '#111111' }}>
                      Ticketing
                    </h2>
                    {s.ticketingSchedule && (
                      <div className="p-4 bg-[#F9FAFB] rounded-xl mb-4">
                        <p className="text-[14px] font-bold text-[#101828] mb-3">Schedule</p>
                        <div className="space-y-2">
                          {s.ticketingSchedule
                            .replace(/\(KST\)/g, '(KST)\n')
                            .replace(/KST(?=[A-Z])/g, 'KST\n')
                            .replace(/to(?=[A-Z])/g, 'to ')
                            .split('\n')
                            .map(item => item.trim()).filter(Boolean)
                            .map((item, i) => {
                              const colonIdx = item.indexOf(':');
                              const label = colonIdx > -1 ? item.substring(0, colonIdx).trim() : '';
                              const value = colonIdx > -1 ? item.substring(colonIdx + 1).trim() : item;
                              return (
                                <div key={i} className="py-2.5 px-4 bg-white rounded-lg">
                                  {label && <p className="text-[13px] font-bold text-ksp-accent mb-0.5">{label}</p>}
                                  <p className="text-[#000000]" style={{ fontFamily: 'Inter', fontSize: '15px', lineHeight: '1.6em' }}>{value}</p>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                    {s.ticketPrice && (
                      <div className="p-4 bg-[#F9FAFB] rounded-xl mb-4">
                        <p className="text-[14px] font-bold text-[#101828] mb-3">Price</p>
                        <div className="space-y-2">
                          {(() => {
                            // / 구분 단순 가격 (NT$5,980 / 4,980 / ...) 은 분리하지 않음
                            if (s.ticketPrice.includes(' / ') || s.ticketPrice.length < 50) {
                              return [(
                                <div key="single" className="py-2.5 px-4 bg-white rounded-lg">
                                  <span className="text-[#000000]" style={{ fontFamily: 'Inter', fontSize: '15px' }}>{s.ticketPrice}</span>
                                </div>
                              )];
                            }
                            // 숫자 뒤에 대문자가 오면 분리 (가격 끝 → 다음 항목 시작)
                            // 단, NT$, RM, ₱ 등 통화기호 뒤 숫자는 제외
                            let items = s.ticketPrice
                              .replace(/(THB|KRW|USD|JPY|SGD|MYR|TWD|HKD)(?=[A-Z])/g, '$1\n')
                              .replace(/([\d,]+)(?=[A-Z](?!T\$))/g, '$1\n')
                              .split('\n')
                              .map(item => item.trim()).filter(Boolean);
                            if (items.length <= 1) items = [s.ticketPrice];
                            return items.map((item, i) => {
                              const match = item.match(/^(.+?)[:\––]\s*(.+)$/);
                              const label = match ? match[1].trim() : item;
                              const price = match ? match[2].trim() : '';
                              return (
                                <div key={i} className="flex items-center justify-between py-2.5 px-4 bg-white rounded-lg">
                                  <span className="text-[#000000]" style={{ fontFamily: 'Inter', fontSize: '15px' }}>{label}</span>
                                  {price && <span className="font-bold text-ksp-accent" style={{ fontFamily: 'Inter', fontSize: '15px' }}>{price}</span>}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                    {s.ticketSalesSchedule && (
                      <div className="p-4 bg-[#F9FAFB] rounded-xl mb-4">
                        <p className="text-[14px] font-bold text-[#101828] mb-3">Sales Schedule</p>
                        <div className="space-y-2">
                          {(() => {
                            const raw = s.ticketSalesSchedule;
                            let items;
                            if (raw.includes('➤')) {
                              items = raw.split(/(?=➤)/).map(s => s.replace(/^➤\s*/, '').trim()).filter(Boolean);
                            } else {
                              items = raw
                                .replace(/\(KST\)/g, '(KST)\n')
                                .replace(/KST(?=[A-Z])/g, 'KST\n')
                                .replace(/(?=General (?:On[ -]?Sale|sales))/gi, '\n')
                                .replace(/pm([A-Z])/gi, 'PM\n$1')
                                .replace(/pm(?=[^\x00-\x7F])/g, 'pm\n')
                                .replace(/onwards(?=[A-Z])/g, 'onwards\n')
                                .replace(/onwards(?=[^\x00-\x7F])/g, 'onwards\n')
                                .split('\n')
                                .map(s => s.trim()).filter(Boolean);
                            }
                            return items;
                          })().map((item, i) => {
                              // label: value 분리 — 시간 콜론(숫자:숫자)은 제외
                              const colonMatch = item.match(/^([^:]+?):\s*(?!\d{2})(.+)$/);
                              const label = colonMatch ? colonMatch[1].trim() : '';
                              const value = colonMatch ? colonMatch[2].trim() : item;
                              return (
                                <div key={i} className="py-2.5 px-4 bg-white rounded-lg">
                                  {label && <p className="text-[13px] font-bold text-ksp-accent mb-0.5">{label}</p>}
                                  <p className="text-[#000000]" style={{ fontFamily: 'Inter', fontSize: '15px', lineHeight: '1.6em' }}>{value}</p>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tracklist */}
                {s.tracklist && s.tracklist.length > 0 && (
                  <div className="px-10 py-[30px] border-t border-[#F3F4F6]">
                    <h2 className="font-black text-[26px] mb-[30px]" style={{ fontFamily: 'Pretendard, sans-serif', color: '#111111' }}>
                      Tracklist
                    </h2>
                    {(() => {
                      const half = Math.ceil(s.tracklist.length / 2);
                      const left = s.tracklist.slice(0, half);
                      const right = s.tracklist.slice(half);
                      return (
                        <div className="flex gap-4">
                          <div className="flex-1 space-y-2">
                            {left.map((t, i) => (
                              <div key={i} className="flex items-center gap-3 py-3 px-4 bg-[#F9FAFB] rounded-lg">
                                <span className="text-[14px] font-bold text-[#98A2B3] w-6 text-center">{i + 1}</span>
                                <span className="text-[#000000]" style={{ fontFamily: 'Inter', fontSize: '16px', lineHeight: '1.75em' }}>{t}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex-1 space-y-2">
                            {right.map((t, i) => (
                              <div key={i} className="flex items-center gap-3 py-3 px-4 bg-[#F9FAFB] rounded-lg">
                                <span className="text-[14px] font-bold text-[#98A2B3] w-6 text-center">{half + i + 1}</span>
                                <span className="text-[#000000]" style={{ fontFamily: 'Inter', fontSize: '16px', lineHeight: '1.75em' }}>{t}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* YouTube MV */}
                {s.youtubeUrls && s.youtubeUrls.length > 0 && (
                  <div className="px-10 py-[30px] border-t border-[#F3F4F6]">
                    <h2 className="font-black text-[26px] mb-[30px]" style={{ fontFamily: 'Pretendard, sans-serif', color: '#111111' }}>
                      MV / Teaser
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      {s.youtubeUrls.map((url, i) => {
                        const videoId = url.match(/(?:watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1];
                        return videoId ? (
                          <div key={i} className="rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                            <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full" allowFullScreen />
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* X/Twitter Embeds */}
                {(() => {
                  const xUrls = ((s.description || '').match(/https?:\/\/(?:x\.com|twitter\.com)\/[^\s\])]+/g) || [])
                    .filter(url => url.includes('/status/'));
                  if (xUrls.length === 0) return null;
                  return (
                    <div className="px-10 py-[30px] border-t border-[#F3F4F6]">
                      <h2 className="font-black text-[26px] mb-[30px]" style={{ fontFamily: 'Pretendard, sans-serif', color: '#111111' }}>
                        Posts
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        {xUrls.slice(0, 4).map((url, i) => (
                          <div key={i} className="rounded-xl overflow-hidden border border-[#F3F4F6]">
                            <blockquote className="twitter-tweet" data-dnt="true" data-theme="light">
                              <a href={url.replace('x.com', 'twitter.com')}>{url}</a>
                            </blockquote>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Photos */}
                {s.images && s.images.length > 0 && (
                  <div className="px-10 py-[30px] border-t border-[#F3F4F6]">
                    <h2 className="font-black text-[26px] mb-[30px]" style={{ fontFamily: 'Pretendard, sans-serif', color: '#111111' }}>Photos</h2>
                    <div className="grid grid-cols-3 gap-4">
                      {s.images.map((img, i) => (
                        <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="rounded-xl overflow-hidden">
                          <img src={img} alt="" className="w-full h-[200px] object-cover hover:scale-105 transition-transform duration-300" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buy Album / Ticket */}
                {((s.buyLinks && s.buyLinks.length > 0) || s.buyTicketUrl) && (
                  <div className="px-10 py-[30px] border-t border-[#F3F4F6]">
                    <h2 className="font-black text-[26px] mb-[30px]" style={{ fontFamily: 'Pretendard, sans-serif', color: '#111111' }}>
                      {isConcert ? 'Buy Ticket' : 'Buy Album'}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      {s.buyLinks?.map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                          className="px-5 py-2.5 bg-[#101828] text-white text-[14px] font-medium rounded-lg hover:bg-[#1E2939] transition flex items-center gap-2">
                          <ExternalLink size={15} /> {link.name}
                        </a>
                      ))}
                      {s.buyTicketUrl && !s.buyLinks?.length && (
                        s.buyTicketUrl.startsWith('http') ? (
                          <a href={s.buyTicketUrl} target="_blank" rel="noopener noreferrer"
                            className="px-5 py-2.5 bg-ksp-accent text-white text-[14px] font-medium rounded-lg hover:opacity-90 transition flex items-center gap-2">
                            <Ticket size={15} /> Buy Ticket
                          </a>
                        ) : (
                          <span className="text-[14px] text-[#98A2B3]">{s.buyTicketUrl}</span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Official Links */}
                {s.officialLinks && s.officialLinks.length > 0 && (
                  <div className="px-10 py-[30px] border-t border-[#F3F4F6]">
                    <h2 className="font-black text-[26px] mb-[30px]" style={{ fontFamily: 'Pretendard, sans-serif', color: '#111111' }}>Official Links</h2>
                    <div className="flex flex-wrap gap-3">
                      {s.officialLinks.map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                          className="px-4 py-2.5 bg-[#F3F4F6] text-[#344054] text-[14px] font-medium rounded-lg hover:bg-[#E5E7EB] transition flex items-center gap-2">
                          <ExternalLink size={15} /> {link.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lineup */}
                {s.lineup && (
                  <div className="px-10 py-[30px] border-t border-[#F3F4F6]">
                    <h2 className="font-black text-[26px] mb-[30px]" style={{ fontFamily: 'Pretendard, sans-serif', color: '#111111' }}>
                      Lineup
                    </h2>
                    <p className="text-[#000000]" style={{ fontFamily: 'Inter', fontSize: '16px', lineHeight: '1.75em' }}>{s.lineup}</p>
                  </div>
                )}

                {/* More from Artist */}
                {relatedSchedules && relatedSchedules.length > 0 && (
                  <div className="px-10 py-[30px] border-t border-[#F3F4F6]">
                    <h2 className="font-black text-[26px] mb-[30px]" style={{ fontFamily: 'Pretendard, sans-serif', color: '#111111' }}>
                      More from <span className="text-ksp-accent">{s.artistName || 'Artist'}</span>
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                      {relatedSchedules.map(rs => (
                        <ScheduleCard key={rs._id} schedule={rs} onNavigate={(path) => router.push(path)} />
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* More News - 별도 카드 */}
              <div className="bg-white border-[1.5px] border-ksp-border rounded-xl py-8 px-6 mt-8">
                <MoreNews category="kpop" storageKey="schedule_detail_pc" />
              </div>
              </div>

              {/* Right: Sidebar */}
              <div className="w-[500px] flex-shrink-0">
                <div ref={sidebarRef} className="sticky" style={{ top: sidebarStickyTop + 'px' }}>
                  <div className="space-y-8">
                    <UpcomingComebacks items={upcomingComebacks || []} onNavigate={(path) => router.push(path)} />
                    <ConcertsList items={upcomingConcerts || []} onNavigate={(path) => router.push(path)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const { db } = await dbConnect();
    const { id } = params;

    if (!ObjectId.isValid(id)) return { notFound: true };

    const schedule = await db.collection('schedules').findOne({ _id: new ObjectId(id) });
    if (!schedule) return { notFound: true };

    // Related schedules (same artist)
    let relatedSchedules = [];
    if (schedule.artistName) {
      relatedSchedules = await db.collection('schedules')
        .find({ artistName: schedule.artistName, _id: { $ne: schedule._id }, status: { $ne: 'hidden' } })
        .sort({ startDate: -1 })
        .limit(5)
        .toArray();
    }

    // Upcoming comebacks (kpopofficial 소스 우선, 이미지 있는 것)
    const now = new Date();
    const kstToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), -9));
    const upcomingComebacks = await db.collection('schedules')
      .find({
        type: { $in: ['comeback', 'debut', 'release'] },
        startDate: { $gte: kstToday },
        status: { $ne: 'hidden' },
        imageUrl: { $exists: true, $ne: '' }
      })
      .sort({ startDate: 1 })
      .limit(5)
      .toArray();

    // Upcoming concerts
    const upcomingConcerts = await db.collection('schedules')
      .find({
        type: { $in: ['concert', 'fan_meeting', 'festival'] },
        startDate: { $gte: kstToday },
        status: { $ne: 'hidden' }
      })
      .sort({ startDate: 1 })
      .limit(6)
      .toArray();
    // 같은 이벤트(title+venue) 중복 제거
    const seenConcerts = new Set();
    const uniqueConcerts = upcomingConcerts.filter(c => {
      const key = c.title + '|' + c.venue;
      if (seenConcerts.has(key)) return false;
      seenConcerts.add(key);
      return true;
    });

    return {
      props: {
        schedule: JSON.parse(JSON.stringify(schedule)),
        relatedSchedules: JSON.parse(JSON.stringify(relatedSchedules)),
        upcomingComebacks: JSON.parse(JSON.stringify(upcomingComebacks)),
        upcomingConcerts: JSON.parse(JSON.stringify(uniqueConcerts))
      }
    };
  } catch(e) {
    console.error('[Schedule Detail SSR]', e);
    return { notFound: true };
  }
}
