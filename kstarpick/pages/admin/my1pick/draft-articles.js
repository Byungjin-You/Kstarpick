import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  AlertCircle,
  Calendar,
  User,
  Edit3,
  Save,
  X,
  AlertTriangle,
  Image,
  Upload,
  Loader2,
  Languages,
  Globe
} from 'lucide-react';

export default function DraftArticles() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    page: 1
  });
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [viewModal, setViewModal] = useState(false);

  // 편집 관련 state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [saving, setSaving] = useState(false);

  // 이미지 업로드 관련 state
  const [coverImage, setCoverImage] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingContent, setUploadingContent] = useState(false);
  const coverInputRef = useRef(null);
  const contentInputRef = useRef(null);
  const textareaRef = useRef(null);

  // 번역 관련 state
  const [translateModal, setTranslateModal] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [titleEn, setTitleEn] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchData();
    }
  }, [session, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: filters.status,
        page: filters.page,
        limit: 15
      });

      const res = await fetch(`/api/my1pick/draft-articles?${params}`);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!confirm(`상태를 '${getStatusLabel(newStatus)}'(으)로 변경하시겠습니까?`)) return;

    try {
      const res = await fetch('/api/my1pick/draft-articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });

      const result = await res.json();
      if (result.success) {
        fetchData();
      } else {
        alert('상태 변경 실패: ' + result.message);
      }
    } catch (err) {
      alert('오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('이 기사를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/my1pick/draft-articles?id=${id}`, {
        method: 'DELETE'
      });

      const result = await res.json();
      if (result.success) {
        fetchData();
        if (viewModal) setViewModal(false);
      } else {
        alert('삭제 실패: ' + result.message);
      }
    } catch (err) {
      alert('오류가 발생했습니다.');
    }
  };

  // 승인 버튼 클릭 시 번역 모달 열기
  const handleApproveAndTranslate = async (article) => {
    // 커버 이미지 확인
    const articleCoverImage = coverImage || article.coverImage;
    if (!articleCoverImage) {
      alert('발행하려면 커버 이미지가 필요합니다. 먼저 수정 모드에서 커버 이미지를 업로드해주세요.');
      return;
    }

    setTranslateModal(true);
    setTranslating(true);
    setTitleEn('');
    setContentEn('');

    try {
      const res = await fetch('/api/my1pick/translate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: article.content
        })
      });

      const result = await res.json();
      if (result.success) {
        setTitleEn(result.data.titleEn);
        setContentEn(result.data.contentEn);
      } else {
        alert('번역 실패: ' + result.message);
        setTranslateModal(false);
      }
    } catch (err) {
      console.error(err);
      alert('번역 중 오류가 발생했습니다.');
      setTranslateModal(false);
    } finally {
      setTranslating(false);
    }
  };

  // 콘텐츠를 HTML로 변환하는 함수
  const convertContentToHtml = (content) => {
    if (!content) return '';

    // 1. [Image: /path] 또는 [이미지: /path] 태그를 <img> 태그로 변환
    let htmlContent = content.replace(
      /\[(Image|이미지):\s*([^\]]+)\]/gi,
      '<figure class="my-6"><img src="$2" alt="Article image" class="w-full rounded-lg" style="max-width: 100%; height: auto;" /></figure>'
    );

    // 2. 단락별로 분리 (빈 줄로 구분된 단락)
    const paragraphs = htmlContent.split(/\n\n+/);

    // 3. 각 단락을 <p> 태그로 감싸고, 단락 내 줄바꿈은 <br>로 변환
    htmlContent = paragraphs
      .map(para => {
        const trimmed = para.trim();
        if (!trimmed) return '';
        // 이미 <figure> 태그로 감싸진 이미지는 그대로 유지
        if (trimmed.startsWith('<figure')) {
          return trimmed;
        }
        // 단락 내 줄바꿈을 <br>로 변환
        const withBreaks = trimmed.replace(/\n/g, '<br />');
        return `<p class="mb-4 leading-relaxed">${withBreaks}</p>`;
      })
      .filter(Boolean)
      .join('\n');

    return htmlContent;
  };

  // 영문 기사 발행
  const handlePublishEnglish = async () => {
    if (!titleEn.trim() || !contentEn.trim()) {
      alert('영문 제목과 본문을 입력해주세요.');
      return;
    }

    const articleCoverImage = coverImage || selectedArticle.coverImage;

    setPublishing(true);
    try {
      // 영문 본문을 HTML로 변환
      const htmlContent = convertContentToHtml(contentEn);

      // 영문 본문에서 첫 2문장을 요약으로 추출 (HTML 태그 제거 후)
      const plainText = contentEn.replace(/\[(Image|이미지):\s*[^\]]+\]/gi, '').trim();
      const sentences = plainText.split(/[.!?]\s+/).filter(s => s.trim().length > 10);
      const summaryEn = sentences.slice(0, 2).join('. ') + (sentences.length > 0 ? '.' : '');

      // News API에 영문 기사 등록
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleEn,
          content: htmlContent,
          summary: summaryEn || titleEn,
          coverImage: articleCoverImage,
          category: 'season-chart',
          source: 'my1pick',
          isPublished: true
        })
      });

      const result = await res.json();
      if (result.success || result._id) {
        // 임시 기사 상태를 published로 변경하고 영문 번역 저장
        await fetch('/api/my1pick/draft-articles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedArticle._id,
            status: 'published',
            titleEn: titleEn,
            contentEn: contentEn
          })
        });

        alert('영문 기사가 발행되었습니다.');
        setTranslateModal(false);
        setViewModal(false);
        fetchData();
      } else {
        alert('발행 실패: ' + (result.message || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error(err);
      alert('발행 중 오류가 발생했습니다.');
    } finally {
      setPublishing(false);
    }
  };

  const handlePublish = async (article) => {
    // 커버 이미지 확인
    const articleCoverImage = coverImage || article.coverImage;
    if (!articleCoverImage) {
      alert('발행하려면 커버 이미지가 필요합니다. 수정 모드에서 커버 이미지를 업로드해주세요.');
      return;
    }

    if (!confirm('이 기사를 발행하시겠습니까? News에 등록됩니다.')) return;

    try {
      // 본문을 HTML로 변환
      const htmlContent = convertContentToHtml(article.content);

      // 본문에서 첫 2문장을 요약으로 추출 (이미지 태그 제거 후)
      const contentText = (article.content || '').replace(/\[(Image|이미지):\s*[^\]]+\]/gi, '').trim();
      const sentences = contentText.split(/[.!?]\s+/).filter(s => s.trim().length > 10);
      const summary = sentences.slice(0, 2).join('. ') + (sentences.length > 0 ? '.' : '');

      // News API에 기사 등록
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: htmlContent,
          summary: summary || article.title,
          coverImage: articleCoverImage,
          category: 'season-chart',
          source: 'my1pick',
          isPublished: true
        })
      });

      const result = await res.json();
      if (result.success || result._id) {
        // 임시 기사 상태를 published로 변경
        await fetch('/api/my1pick/draft-articles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: article._id, status: 'published' })
        });

        alert('기사가 발행되었습니다.');
        fetchData();
        if (viewModal) setViewModal(false);
      } else {
        alert('발행 실패: ' + (result.message || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    }
  };

  // 편집 모드 시작
  const startEditing = () => {
    setEditTitle(selectedArticle.title);
    setEditContent(selectedArticle.content);
    setIsEditing(true);
  };

  // 편집 취소
  const cancelEditing = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditContent('');
  };

  // 편집 저장
  const saveEditing = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      alert('제목과 본문을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/my1pick/draft-articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedArticle._id,
          title: editTitle,
          content: editContent,
          coverImage: coverImage || selectedArticle.coverImage,
          isModified: true // 수정됨 표시
        })
      });

      const result = await res.json();
      if (result.success) {
        // selectedArticle 업데이트
        setSelectedArticle({
          ...selectedArticle,
          title: editTitle,
          content: editContent,
          coverImage: coverImage || selectedArticle.coverImage,
          isModified: true
        });
        setIsEditing(false);
        setIsModified(true);
        fetchData(); // 목록 새로고침
        alert('저장되었습니다.');
      } else {
        alert('저장 실패: ' + result.message);
      }
    } catch (err) {
      alert('오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 커버 이미지 업로드
  const handleCoverImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/my1pick/upload-image', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      if (result.success) {
        setCoverImage(result.data.url);
        alert('커버 이미지가 업로드되었습니다.');
      } else {
        alert('업로드 실패: ' + result.message);
      }
    } catch (err) {
      console.error(err);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploadingCover(false);
    }
  };

  // 본문 이미지 업로드 (커서 위치에 삽입)
  const handleContentImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 현재 커서 위치 저장
    const textarea = textareaRef.current;
    const cursorPos = textarea ? textarea.selectionStart : editContent.length;

    setUploadingContent(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/my1pick/upload-image', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      if (result.success) {
        // 커서 위치에 이미지 태그 삽입
        const imageTag = `\n[이미지: ${result.data.url}]\n`;
        const before = editContent.substring(0, cursorPos);
        const after = editContent.substring(cursorPos);
        const newContent = before + imageTag + after;
        setEditContent(newContent);

        // 커서 위치를 이미지 태그 뒤로 이동
        setTimeout(() => {
          if (textarea) {
            const newCursorPos = cursorPos + imageTag.length;
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 100);

        alert('커서 위치에 이미지가 추가되었습니다.');
      } else {
        alert('업로드 실패: ' + result.message);
      }
    } catch (err) {
      console.error(err);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploadingContent(false);
      if (contentInputRef.current) {
        contentInputRef.current.value = '';
      }
    }
  };

  // 본문 내용에서 이미지 태그를 실제 이미지로 변환하여 렌더링
  const renderContentWithImages = (content) => {
    if (!content) return null;

    // [이미지: /path/to/image.jpg] 패턴을 찾아서 분리
    const parts = content.split(/(\[이미지:\s*[^\]]+\])/g);

    return parts.map((part, index) => {
      const imageMatch = part.match(/\[이미지:\s*([^\]]+)\]/);
      if (imageMatch) {
        const imageUrl = imageMatch[1].trim();
        return (
          <div key={index} className="my-4">
            <img
              src={imageUrl}
              alt="본문 이미지"
              className="max-w-full h-auto rounded-lg border shadow-sm"
              style={{ maxHeight: '400px', objectFit: 'contain' }}
            />
          </div>
        );
      }
      // 일반 텍스트는 그대로 출력 (줄바꿈 유지)
      return part ? <span key={index}>{part}</span> : null;
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: '초안',
      review: '검토중',
      approved: '승인됨',
      published: '발행됨',
      rejected: '반려'
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-600',
      review: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      published: 'bg-blue-100 text-blue-700',
      rejected: 'bg-red-100 text-red-700'
    };

    const icons = {
      draft: <FileText size={12} />,
      review: <Clock size={12} />,
      approved: <CheckCircle size={12} />,
      published: <Send size={12} />,
      rejected: <XCircle size={12} />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {icons[status]}
        {getStatusLabel(status)}
      </span>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
        </div>
      </AdminLayout>
    );
  }

  if (!session || session.user?.role !== 'admin') {
    return null;
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-blue-500" />
            AI 생성 기사 관리
          </h1>
          <p className="text-gray-500 mt-1">AI가 생성한 임시 기사를 검토하고 발행합니다.</p>
        </div>

        {/* 통계 카드 */}
        {data?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 border">
              <p className="text-gray-600 text-sm">초안</p>
              <p className="text-2xl font-bold text-gray-700">{data.stats.draft || 0}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <p className="text-yellow-600 text-sm">검토중</p>
              <p className="text-2xl font-bold text-yellow-700">{data.stats.review || 0}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-green-600 text-sm">승인됨</p>
              <p className="text-2xl font-bold text-green-700">{data.stats.approved || 0}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-blue-600 text-sm">발행됨</p>
              <p className="text-2xl font-bold text-blue-700">{data.stats.published || 0}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <p className="text-red-600 text-sm">반려</p>
              <p className="text-2xl font-bold text-red-700">{data.stats.rejected || 0}</p>
            </div>
          </div>
        )}

        {/* 필터 */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">상태:</span>
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체</option>
              <option value="draft">초안</option>
              <option value="review">검토중</option>
              <option value="approved">승인됨</option>
              <option value="published">발행됨</option>
              <option value="rejected">반려</option>
            </select>

            <button
              onClick={fetchData}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RefreshCw size={16} />
              새로고침
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* 기사 목록 */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">아티스트</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">팩트체크</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">생성일</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.articles?.map((article) => (
                <tr key={article._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 max-w-xl">
                    <div
                      className="font-medium text-gray-800 line-clamp-2 flex items-start gap-2 cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => {
                        setSelectedArticle(article);
                        setViewModal(true);
                      }}
                    >
                      <span className="flex-1">{article.title}</span>
                      {article.isModified && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-600 whitespace-nowrap flex-shrink-0">
                          <Edit3 size={10} />
                          수정됨
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {article.season} - {article.voteCategory}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-700">{article.artistName}</span>
                    </div>
                    {article.groupName && (
                      <div className="text-xs text-gray-500">{article.groupName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(article.status)}
                  </td>
                  <td className="px-4 py-3">
                    {article.factCheckResult ? (
                      <span className={`inline-flex items-center gap-1 text-xs ${
                        article.factCheckResult.passed ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {article.factCheckResult.passed ? (
                          <CheckCircle size={14} />
                        ) : (
                          <AlertCircle size={14} />
                        )}
                        {article.factCheckResult.score}/100
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      {formatDate(article.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedArticle(article);
                          setViewModal(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                        title="보기"
                      >
                        <Eye size={18} />
                      </button>
                      {article.status !== 'published' && (
                        <>
                          <button
                            onClick={() => handlePublish(article)}
                            className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600"
                            title="발행"
                          >
                            <Send size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(article._id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-red-600"
                            title="삭제"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {(!data?.articles || data.articles.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    저장된 기사가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              disabled={filters.page <= 1}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
            </button>

            <span className="px-4 py-2 text-sm text-gray-600">
              {filters.page} / {data.pagination.totalPages} 페이지
            </span>

            <button
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              disabled={filters.page >= data.pagination.totalPages}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* 기사 상세 모달 */}
        {viewModal && selectedArticle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">기사 상세</h2>
                <button
                  onClick={() => {
                    setViewModal(false);
                    setIsEditing(false);
                    setIsModified(false);
                    setCoverImage('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4">
                  {getStatusBadge(selectedArticle.status)}
                </div>

                {/* 팩트체크 결과 상세 */}
                {selectedArticle.factCheckResult && (
                  <div className={`rounded-xl p-4 mb-4 border-2 ${
                    selectedArticle.factCheckResult.passed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {selectedArticle.factCheckResult.passed ? (
                          <CheckCircle className="text-green-600" size={20} />
                        ) : (
                          <AlertCircle className="text-yellow-600" size={20} />
                        )}
                        <span className={`font-bold ${
                          selectedArticle.factCheckResult.passed ? 'text-green-700' : 'text-yellow-700'
                        }`}>
                          {selectedArticle.factCheckResult.passed ? '팩트체크 통과' : '검토 필요'}
                        </span>
                      </div>
                      <span className="text-lg font-bold">
                        {selectedArticle.factCheckResult.score}/100점
                      </span>
                    </div>

                    {/* 점수 상세 breakdown */}
                    {selectedArticle.factCheckResult.breakdown && (
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="bg-white rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-500">정확성</p>
                          <p className="font-bold text-blue-600">
                            {selectedArticle.factCheckResult.breakdown.accuracy}/40
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-500">템플릿</p>
                          <p className="font-bold text-blue-600">
                            {selectedArticle.factCheckResult.breakdown.template}/20
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-500">근황정보</p>
                          <p className="font-bold text-blue-600">
                            {selectedArticle.factCheckResult.breakdown.recentInfo}/30
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-500">품질</p>
                          <p className="font-bold text-blue-600">
                            {selectedArticle.factCheckResult.breakdown.quality}/10
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 요약 */}
                    {selectedArticle.factCheckResult.summary && (
                      <p className="text-sm text-gray-700 mb-3">
                        {selectedArticle.factCheckResult.summary}
                      </p>
                    )}

                    {/* 사실 오류 */}
                    {selectedArticle.factCheckResult.factErrors?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-red-600 mb-1">사실 오류:</p>
                        <ul className="text-sm text-red-700 list-disc list-inside bg-red-50 rounded p-2">
                          {selectedArticle.factCheckResult.factErrors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 문제점 */}
                    {selectedArticle.factCheckResult.issues?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-yellow-600 mb-1">주의 사항:</p>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          {selectedArticle.factCheckResult.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 수정 제안 */}
                    {selectedArticle.factCheckResult.suggestions?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-blue-600 mb-1">수정 제안:</p>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          {selectedArticle.factCheckResult.suggestions.map((sug, i) => (
                            <li key={i}>{sug}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 기사 정보 */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
                  <p><strong>아티스트:</strong> {selectedArticle.artistName} {selectedArticle.groupName && `(${selectedArticle.groupName})`}</p>
                  <p><strong>시즌:</strong> {selectedArticle.season}</p>
                  <p><strong>부문:</strong> {selectedArticle.voteCategory}</p>
                  <p><strong>생성:</strong> {selectedArticle.generatedBy} / {formatDate(selectedArticle.createdAt)}</p>
                </div>

                {/* 투표 데이터 */}
                {selectedArticle.voteData && (
                  <div className="bg-purple-50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-purple-700 mb-2">투표 데이터</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">득표수</p>
                        <p className="font-bold text-purple-600">{selectedArticle.voteData.totalVotes?.toLocaleString()}표</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">득표율</p>
                        <p className="font-bold text-purple-600">{selectedArticle.voteData.votePercentage}%</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">투표 시작</p>
                        <p className="font-medium text-gray-700">{selectedArticle.voteData.startDate}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">투표 종료</p>
                        <p className="font-medium text-gray-700">{selectedArticle.voteData.endDate}</p>
                      </div>
                    </div>
                    {/* 상위 후보자 */}
                    {selectedArticle.voteData.topCandidates?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-purple-200">
                        <p className="text-xs text-gray-500 mb-2">상위 순위:</p>
                        <div className="space-y-1">
                          {selectedArticle.voteData.topCandidates.slice(0, 5).map((c, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className={i === 0 ? 'font-bold text-purple-700' : 'text-gray-600'}>
                                {i + 1}위 {c.candidate_name} {c.candidate_group_name && `(${c.candidate_group_name})`}
                              </span>
                              <span className={i === 0 ? 'font-bold text-purple-700' : 'text-gray-600'}>
                                {c.total_vote?.toLocaleString()}표
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 수정됨 경고 */}
                {(selectedArticle.isModified || isModified) && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                    <AlertTriangle className="text-orange-500" size={18} />
                    <span className="text-sm text-orange-700">
                      이 기사는 수정되었습니다. 팩트체크 결과는 수정 전 내용 기준입니다.
                    </span>
                  </div>
                )}

                {/* 커버 이미지 */}
                <div className="border rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">커버 이미지</p>
                  {(coverImage || selectedArticle.coverImage) ? (
                    <div className="relative">
                      <img
                        src={coverImage || selectedArticle.coverImage}
                        alt="커버 이미지"
                        className="w-full max-h-64 object-cover rounded-lg"
                      />
                      {isEditing && (
                        <button
                          onClick={() => {
                            setCoverImage('');
                            setSelectedArticle({ ...selectedArticle, coverImage: '' });
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                          title="이미지 삭제"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                      <Image className="mx-auto text-gray-400 mb-2" size={32} />
                      <p className="text-sm text-gray-500">커버 이미지가 없습니다</p>
                    </div>
                  )}
                  {isEditing && (
                    <div className="mt-3">
                      <input
                        type="file"
                        ref={coverInputRef}
                        onChange={handleCoverImageUpload}
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                      />
                      <button
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingCover}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        {uploadingCover ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            업로드 중...
                          </>
                        ) : (
                          <>
                            <Upload size={16} />
                            커버 이미지 업로드
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* 기사 제목 */}
                <div className="border rounded-lg p-4 mb-4 bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-500">기사 제목</p>
                    {!isEditing && selectedArticle.status !== 'published' && (
                      <button
                        onClick={startEditing}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Edit3 size={14} />
                        수정
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full text-xl font-bold text-gray-800 border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <h2 className="text-xl font-bold text-gray-800">
                      {selectedArticle.title}
                    </h2>
                  )}
                </div>

                {/* 기사 본문 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">기사 본문</p>
                    {isEditing && (
                      <div>
                        <input
                          type="file"
                          ref={contentInputRef}
                          onChange={handleContentImageUpload}
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                        />
                        <button
                          onClick={() => contentInputRef.current?.click()}
                          disabled={uploadingContent}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                          {uploadingContent ? (
                            <>
                              <Loader2 className="animate-spin" size={14} />
                              업로드 중...
                            </>
                          ) : (
                            <>
                              <Image size={14} />
                              본문에 이미지 추가
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <>
                      <textarea
                        ref={textareaRef}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full min-h-[300px] text-gray-700 border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-pre-wrap font-mono text-sm"
                        placeholder="본문을 입력하세요. 이미지를 추가하려면 원하는 위치에 커서를 놓고 '본문에 이미지 추가' 버튼을 클릭하세요."
                      />
                      {/* 미리보기 */}
                      {editContent && editContent.includes('[이미지:') && (
                        <div className="mt-4 border-t pt-4">
                          <p className="text-sm font-medium text-gray-500 mb-2">📷 미리보기</p>
                          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 bg-gray-50 rounded-lg p-4 border">
                            {renderContentWithImages(editContent)}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
                      {renderContentWithImages(selectedArticle.content)}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
                {/* 왼쪽: 편집 버튼 */}
                <div>
                  {isEditing && (
                    <div className="flex gap-2">
                      <button
                        onClick={cancelEditing}
                        className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <X size={16} />
                        취소
                      </button>
                      <button
                        onClick={saveEditing}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 flex items-center gap-2 disabled:opacity-50"
                      >
                        <Save size={16} />
                        {saving ? '저장 중...' : '저장'}
                      </button>
                    </div>
                  )}
                </div>

                {/* 오른쪽: 상태 변경 버튼 */}
                <div className="flex gap-3">
                  {selectedArticle.status !== 'published' && !isEditing && (
                    <>
                      <button
                        onClick={() => handleStatusChange(selectedArticle._id, 'rejected')}
                        className="px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                      >
                        반려
                      </button>
                      <button
                        onClick={() => handleApproveAndTranslate(selectedArticle)}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 flex items-center gap-2"
                      >
                        <Globe size={16} />
                        승인 & 영문 번역
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 영문 번역 모달 */}
        {translateModal && selectedArticle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* 모달 헤더 */}
              <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-500 to-purple-500">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Languages size={24} />
                  영문 번역 & 발행
                </h2>
                <button
                  onClick={() => setTranslateModal(false)}
                  className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="flex-1 overflow-y-auto p-6">
                {translating ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                    <p className="text-gray-600 text-lg">AI가 영문으로 번역하고 있습니다...</p>
                    <p className="text-gray-400 text-sm mt-2">K-pop 용어와 아티스트명을 정확하게 번역합니다</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 왼쪽: 한글 원문 (참조용) */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-gray-700 font-medium">
                        <span className="px-2 py-1 bg-gray-100 rounded text-sm">🇰🇷 한글 원문</span>
                        <span className="text-xs text-gray-400">(참조용, 수정 불가)</span>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 border">
                        <p className="text-xs text-gray-500 mb-1">제목</p>
                        <p className="font-bold text-gray-800">{selectedArticle.title}</p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 border max-h-[400px] overflow-y-auto">
                        <p className="text-xs text-gray-500 mb-1">본문</p>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {renderContentWithImages(selectedArticle.content)}
                        </div>
                      </div>
                    </div>

                    {/* 오른쪽: 영문 번역 (편집 가능) */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-gray-700 font-medium">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">🇺🇸 English</span>
                        <span className="text-xs text-gray-400">(편집 가능)</span>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Title</p>
                        <input
                          type="text"
                          value={titleEn}
                          onChange={(e) => setTitleEn(e.target.value)}
                          className="w-full font-bold text-gray-800 border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="English title..."
                        />
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Content</p>
                        <textarea
                          value={contentEn}
                          onChange={(e) => setContentEn(e.target.value)}
                          className="w-full min-h-[350px] text-sm text-gray-700 border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-pre-wrap"
                          placeholder="English content..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 모달 푸터 */}
              {!translating && (
                <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
                  <button
                    onClick={() => handleApproveAndTranslate(selectedArticle)}
                    className="px-4 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    다시 번역
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setTranslateModal(false)}
                      className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handlePublishEnglish}
                      disabled={publishing || !titleEn.trim() || !contentEn.trim()}
                      className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {publishing ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          발행 중...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          영문 기사 발행
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
