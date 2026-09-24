import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  MegaphoneIcon,
  LinkIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

const categoryPill = {
  'รับสมัคร': 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  'ประกาศ': 'bg-purple-100 text-purple-700 border border-purple-200/60',
  'กิจกรรม': 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
  'ทั่วไป': 'bg-slate-100 text-slate-600 border border-slate-200/60',
};

const AnnouncementDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [news, setNews] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNews(null);
    api.get(`/public/announcements/${id}`)
      .then(res => {
        if (res.data.success) setNews(res.data.data);
        else setError('ไม่พบข่าวนี้');
      })
      .catch(() => setError('ไม่พบข่าวนี้ หรือลิงก์ไม่ถูกต้อง'))
      .finally(() => setLoading(false));

    api.get('/public/announcements')
      .then(res => {
        const list = (res.data.data || []).filter(a => String(a.id) !== String(id));
        setRelated(list.slice(0, 3));
      })
      .catch(() => setRelated([]));
  }, [id]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('คัดลอกลิงก์นี้:', window.location.href);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
    </div>
  );

  if (error || !news) return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center gap-4 px-4">
      <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-400 flex items-center justify-center">
        <MegaphoneIcon className="w-8 h-8" />
      </div>
      <p className="text-slate-500 font-medium">{error || 'ไม่พบข่าว'}</p>
      <Link to="/" className="text-sm font-semibold text-purple-600 hover:text-purple-800 no-underline">
        ← กลับหน้าแรก
      </Link>
    </div>
  );

  const catClass = categoryPill[news.category] || categoryPill['ทั่วไป'];
  const dateStr = new Date(news.created_at).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = new Date(news.created_at).toLocaleTimeString('th-TH', {
    hour: '2-digit', minute: '2-digit',
  });
  const authorName = news.author && news.author.toLowerCase() !== 'admin'
    ? news.author
    : 'งานฝึกประสบการณ์วิชาชีพ';
  const attachment = news.attachment_url || news.attachment || null;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
          <Link to="/" className="hover:text-purple-600 no-underline text-slate-400 transition-colors">หน้าแรก</Link>
          <ChevronRightIcon className="w-3.5 h-3.5" />
          <Link to="/news" className="hover:text-purple-600 no-underline text-slate-400 transition-colors">ข่าวสารและประกาศ</Link>
          <ChevronRightIcon className="w-3.5 h-3.5" />
          <span className="text-purple-600 font-medium">รายละเอียดข่าว</span>
        </nav>

        <Link
          to="/news"
          className="text-purple-600 hover:text-purple-800 font-medium inline-flex items-center gap-2 transition-colors text-sm no-underline mb-6"
        >
          <ArrowLeftIcon className="w-4 h-4" /> ย้อนกลับไปหน้ารวมข่าว
        </Link>

        {/* Article Card */}
        <article className="bg-white rounded-3xl shadow-xl shadow-purple-950/5 border border-purple-50/80 overflow-hidden">
          {/* Cover / Placeholder Banner */}
          {news.coverImage ? (
            <div className="rounded-none overflow-hidden">
              <img
                src={news.coverImage}
                alt={news.title}
                className="w-full h-auto max-h-[480px] object-cover"
              />
            </div>
          ) : (
            <div className="h-36 sm:h-44 bg-gradient-to-br from-purple-700 via-indigo-700 to-purple-900 relative overflow-hidden flex items-center justify-center">
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-12 -left-8 w-56 h-56 bg-fuchsia-400/20 rounded-full blur-3xl" />
              <MegaphoneIcon className="w-12 h-12 text-white/40 relative" />
            </div>
          )}

          <div className="p-6 sm:p-10">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-semibold px-3 py-1 rounded-full text-xs ${catClass}`}>
                {news.category}
              </span>
              {news.is_pinned ? (
                <span className="bg-amber-50 text-amber-700 border border-amber-200/60 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <MapPinIcon className="w-3.5 h-3.5" /> ปักหมุด
                </span>
              ) : null}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight mt-3 mb-4">
              {news.title}
            </h1>

            {/* Author & Timestamp Bar */}
            <div className="flex items-center gap-3 pb-6 mb-2 border-b border-purple-50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md shadow-purple-500/20">
                {authorName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">{authorName}</div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5" /> {dateStr}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5" /> {timeStr} น.
                  </span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="text-gray-700 text-base sm:text-lg leading-relaxed font-normal min-h-[160px] py-4 whitespace-pre-wrap">
              {news.content ? news.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                part.match(/(https?:\/\/[^\s]+)/g)
                  ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 underline underline-offset-2 break-all">{part}</a>
                  : part
              ) : null}
            </div>

            {/* Attachment Card */}
            {attachment && (
              <a
                href={attachment}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-purple-100 bg-purple-50/50 hover:bg-purple-50 p-5 mt-4 no-underline transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-purple-100 text-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                  <DocumentArrowDownIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-800 group-hover:text-purple-800 transition-colors">
                    เอกสารแนบประกอบประกาศ
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">{attachment.split('/').pop()}</div>
                </div>
                <span className="shrink-0 text-xs font-bold text-purple-700 bg-white border border-purple-200 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 px-4 py-2 rounded-xl transition-all">
                  ดาวน์โหลดเอกสาร (PDF)
                </span>
              </a>
            )}

            {/* Footer Actions */}
            <div className="border-t border-purple-50 mt-8 pt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-gray-200 hover:border-purple-300 hover:text-purple-700 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                {copied ? <CheckIcon className="w-4 h-4 text-emerald-500" /> : <LinkIcon className="w-4 h-4" />}
                {copied ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์ประกาศ'}
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-gray-200 hover:border-purple-300 hover:text-purple-700 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                <PrinterIcon className="w-4 h-4" /> พิมพ์เอกสาร
              </button>
            </div>
          </div>
        </article>

        {/* Related News */}
        {related.length > 0 && (
          <section className="mt-10">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900 m-0">ข่าวสารอื่นที่น่าสนใจ</h2>
              <div className="h-1 w-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mt-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {related.map(item => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/news/${item.id}`)}
                  className="group rounded-2xl border border-gray-100 bg-white hover:border-purple-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
                >
                  {item.coverImage ? (
                    <img src={item.coverImage} alt={item.title} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-purple-100 via-indigo-50 to-purple-50 flex items-center justify-center text-purple-400">
                      <MegaphoneIcon className="w-8 h-8" />
                    </div>
                  )}
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold px-2.5 py-0.5 rounded-full text-[10px] ${categoryPill[item.category] || categoryPill['ทั่วไป']}`}>
                        {item.category}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(item.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <h3 className="m-0 text-sm font-bold text-gray-800 group-hover:text-purple-700 line-clamp-2 leading-snug transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AnnouncementDetailPage;
