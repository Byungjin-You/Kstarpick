import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import {
  Vote,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Trophy,
  TrendingUp,
  FileText,
  Sparkles,
  AlertCircle,
  Check,
  X,
  Save,
  Loader2
} from 'lucide-react';

export default function My1PickThemeVotes() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allCampaigns, setAllCampaigns] = useState([]); // 전체 데이터 캐시
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    page: 1
  });
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const ITEMS_PER_PAGE = 15;

  // 기사 생성 모달 관련 state
  const [articleModal, setArticleModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatedArticle, setGeneratedArticle] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  // 최초 한 번만 전체 데이터 로드
  useEffect(() => {
    if (session?.user?.role === 'admin' && !dataLoaded) {
      fetchAllData();
    }
  }, [session, dataLoaded]);

  // 전체 데이터 로드 (한 번만)
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/my1pick/theme-votes?status=all&page=1&limit=1000`);
      const result = await res.json();

      if (result.success) {
        setAllCampaigns(result.data.campaigns || []);
        setError(null);
        setDataLoaded(true);
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

  // 새로고침 버튼용
  const handleRefresh = () => {
    setDataLoaded(false);
  };

  // 기사 생성 버튼 클릭
  const handleGenerateArticle = async (campaign) => {
    setSelectedCampaign(campaign);
    setArticleModal(true);
    setGenerating(true);
    setGeneratedArticle(null);

    try {
      const res = await fetch('/api/my1pick/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign,
          candidates: campaign.candidates || []
        })
      });

      const result = await res.json();

      if (result.success) {
        setGeneratedArticle(result.data);
      } else {
        alert('기사 생성 실패: ' + result.message);
      }
    } catch (err) {
      console.error(err);
      alert('기사 생성 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  // 임시 기사 저장
  const handleSaveArticle = async () => {
    if (!generatedArticle) return;

    setSaving(true);
    try {
      const res = await fetch('/api/my1pick/draft-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignIdx: selectedCampaign.idx,
          campaignTitle: selectedCampaign.title,
          artistName: generatedArticle.voteData?.artistName,
          groupName: generatedArticle.voteData?.groupName,
          voteCategory: generatedArticle.voteData?.category,
          season: generatedArticle.voteData?.season,
          title: generatedArticle.title,
          content: generatedArticle.content,
          generatedBy: generatedArticle.generatedBy,
          factCheckResult: generatedArticle.factCheckResult,
          voteData: generatedArticle.voteData
        })
      });

      const result = await res.json();

      if (result.success) {
        alert('임시 기사가 저장되었습니다.');
        setArticleModal(false);
        setGeneratedArticle(null);
        setSelectedCampaign(null);
      } else {
        alert('저장 실패: ' + result.message);
      }
    } catch (err) {
      console.error(err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setArticleModal(false);
    setGeneratedArticle(null);
    setSelectedCampaign(null);
  };

  // 클라이언트에서 필터링 및 페이지네이션
  const getFilteredData = () => {
    let filtered = allCampaigns;

    // 상태 필터링
    if (filters.status !== 'all') {
      filtered = allCampaigns.filter(c => c.computed_status === filters.status);
    }

    // 통계 계산
    const stats = {
      ongoing: allCampaigns.filter(c => c.computed_status === 'ongoing').length,
      scheduled: allCampaigns.filter(c => c.computed_status === 'scheduled').length,
      ended: allCampaigns.filter(c => c.computed_status === 'ended').length
    };

    // 페이지네이션
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const startIdx = (filters.page - 1) * ITEMS_PER_PAGE;
    const campaigns = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    return {
      campaigns,
      stats,
      pagination: {
        total: totalCount,
        page: filters.page,
        limit: ITEMS_PER_PAGE,
        totalPages
      }
    };
  };

  const data = dataLoaded ? getFilteredData() : null;

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

  const formatNumber = (num) => {
    return new Intl.NumberFormat('ko-KR').format(num || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ongoing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <PlayCircle size={12} />
            진행중
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <CheckCircle size={12} />
            종료
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Clock size={12} />
            예정
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type, label) => {
    const colors = {
      'T': 'bg-purple-100 text-purple-700',
      'S': 'bg-pink-100 text-pink-700',
      'G': 'bg-indigo-100 text-indigo-700',
      'K': 'bg-yellow-100 text-yellow-700',
      'M': 'bg-orange-100 text-orange-700',
      'L': 'bg-cyan-100 text-cyan-700',
      'C': 'bg-red-100 text-red-700',
      'U': 'bg-emerald-100 text-emerald-700'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
        {label}
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
            <Vote className="text-purple-500" />
            마이원픽 Season Chart 투표
          </h1>
          <p className="text-gray-500 mt-1">마이원픽 Season Chart 투표 현황을 확인합니다.</p>
        </div>

        {/* 통계 카드 */}
        {data?.stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">진행중</p>
                  <p className="text-2xl font-bold text-green-700">{data.stats.ongoing}</p>
                </div>
                <PlayCircle className="text-green-500" size={32} />
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">예정</p>
                  <p className="text-2xl font-bold text-blue-700">{data.stats.scheduled}</p>
                </div>
                <Clock className="text-blue-500" size={32} />
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">종료</p>
                  <p className="text-2xl font-bold text-gray-700">{data.stats.ended}</p>
                </div>
                <CheckCircle className="text-gray-500" size={32} />
              </div>
            </div>
          </div>
        )}

        {/* 필터 */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">필터:</span>
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">모든 상태</option>
              <option value="ongoing">진행중</option>
              <option value="scheduled">예정</option>
              <option value="ended">종료</option>
            </select>

            <button
              onClick={handleRefresh}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
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

        {/* 캠페인 목록 */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">기간</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">후보</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">기사</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.campaigns?.map((campaign) => (
                <>
                  <tr
                    key={campaign.idx}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                      expandedCampaign === campaign.idx ? 'bg-purple-50' : ''
                    }`}
                    onClick={() => setExpandedCampaign(
                      expandedCampaign === campaign.idx ? null : campaign.idx
                    )}
                  >
                    <td className="px-4 py-3 text-sm text-gray-600">{campaign.idx}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{campaign.title}</div>
                      {campaign.jucha && (
                        <div className="text-xs text-gray-500">{campaign.jucha}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(campaign.computed_status)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-gray-600">{formatDate(campaign.start_at)}</div>
                      <div className="text-gray-400">~ {formatDate(campaign.end_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                        <Users size={14} />
                        {campaign.candidate_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateArticle(campaign);
                        }}
                        disabled={campaign.computed_status !== 'ended' || !campaign.candidates?.length}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          campaign.computed_status === 'ended' && campaign.candidates?.length
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        기사 생성
                      </button>
                    </td>
                  </tr>

                  {/* 확장된 후보자 목록 */}
                  {expandedCampaign === campaign.idx && (
                    <tr>
                      <td colSpan={6} className="bg-purple-50 px-4 py-4">
                        <div className="text-sm font-medium text-purple-700 mb-3 flex items-center gap-2">
                          <Trophy size={16} />
                          후보자 순위 (투표수 기준)
                        </div>
                        {campaign.candidates?.length > 0 ? (
                          <div className="bg-white rounded-lg border overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 w-16">순위</th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">이름</th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">그룹</th>
                                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">득표수</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {campaign.candidates.map((candidate, index) => (
                                  <tr
                                    key={candidate.idx}
                                    className={
                                      index === 0 ? 'bg-yellow-50' :
                                      index === 1 ? 'bg-gray-50' :
                                      index === 2 ? 'bg-orange-50' :
                                      ''
                                    }
                                  >
                                    <td className="px-4 py-3 text-center">
                                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                                        index === 0 ? 'bg-yellow-500 text-white' :
                                        index === 1 ? 'bg-gray-400 text-white' :
                                        index === 2 ? 'bg-orange-400 text-white' :
                                        'bg-gray-200 text-gray-600'
                                      }`}>
                                        {index + 1}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="font-medium text-gray-800">{candidate.candidate_name}</span>
                                      {candidate.candidate_name2 && (
                                        <span className="text-gray-400 text-sm ml-2">({candidate.candidate_name2})</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                      {candidate.candidate_group_name || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <span className="font-bold text-purple-600">{formatNumber(candidate.total_vote)}</span>
                                      <span className="text-gray-400 text-xs ml-1">표</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            등록된 후보자가 없습니다.
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}

              {(!data?.campaigns || data.campaigns.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    해당하는 투표가 없습니다.
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
              <span className="text-gray-400 ml-2">
                (총 {formatNumber(data.pagination.total)}개)
              </span>
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

        {/* 기사 생성 모달 */}
        {articleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* 모달 헤더 */}
              <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-500 to-blue-500">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles size={24} />
                  AI 기사 생성
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="flex-1 overflow-y-auto p-6">
                {generating ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-purple-500 mb-4" size={48} />
                    <p className="text-gray-600 text-lg">AI가 기사를 생성하고 있습니다...</p>
                    <p className="text-gray-400 text-sm mt-2">Claude 기사 작성 → Claude 팩트체크</p>
                  </div>
                ) : generatedArticle ? (
                  <div className="space-y-6">
                    {/* 팩트체크 결과 */}
                    <div className={`p-4 rounded-xl border-2 ${
                      generatedArticle.factCheckResult?.passed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {generatedArticle.factCheckResult?.passed ? (
                          <>
                            <Check className="text-green-600" size={20} />
                            <span className="font-bold text-green-700">팩트체크 통과</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="text-yellow-600" size={20} />
                            <span className="font-bold text-yellow-700">검토 필요</span>
                          </>
                        )}
                        <span className="ml-auto text-sm font-medium">
                          점수: {generatedArticle.factCheckResult?.score || 0}/100
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {generatedArticle.factCheckResult?.summary}
                      </p>
                      {generatedArticle.factCheckResult?.issues?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">주의 사항:</p>
                          <ul className="text-sm text-gray-600 list-disc list-inside">
                            {generatedArticle.factCheckResult.issues.map((issue, i) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* 투표 정보 요약 */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <Trophy size={18} className="text-yellow-500" />
                        투표 결과 요약
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">1위 아티스트</p>
                          <p className="font-bold text-gray-800">{generatedArticle.voteData?.artistName}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">소속</p>
                          <p className="font-bold text-gray-800">{generatedArticle.voteData?.groupName || '솔로'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">득표수</p>
                          <p className="font-bold text-purple-600">{formatNumber(generatedArticle.voteData?.totalVotes)}표</p>
                        </div>
                        <div>
                          <p className="text-gray-500">득표율</p>
                          <p className="font-bold text-purple-600">{generatedArticle.voteData?.votePercentage}%</p>
                        </div>
                      </div>
                    </div>

                    {/* 생성된 기사 */}
                    <div>
                      <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <FileText size={18} className="text-blue-500" />
                        생성된 기사
                      </h3>
                      <div className="bg-white border rounded-xl p-4">
                        <h4 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">
                          {generatedArticle.title}
                        </h4>
                        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                          {generatedArticle.content}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500">
                    기사 생성 정보가 없습니다.
                  </div>
                )}
              </div>

              {/* 모달 푸터 */}
              {generatedArticle && !generating && (
                <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleGenerateArticle(selectedCampaign)}
                    className="px-4 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    다시 생성
                  </button>
                  <button
                    onClick={handleSaveArticle}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        임시 저장
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
